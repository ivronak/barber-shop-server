const {
  Staff,
  User,
  WorkingHour,
  Service,
  Appointment,
  ActivityLog,
  Break,
  Invoice,
  InvoiceService,
  InvoiceProduct,
} = require("../models");
const moment = require("moment");
const { Op, fn, col } = require("sequelize");
const { sequelize } = require("../models");
const bcrypt = require("bcryptjs");
const { getConsistentDayOfWeek } = require("../utils/appointment.utils");
const dayOfWeekUtils = require("../utils/dayOfWeekUtils");

/**
 * Get all staff members with optional sorting and pagination
 */
exports.getAllStaff = async (req, res) => {
  try {
    const {
      sort,
      page = 1,
      search,
      isAvailable,
      services,
      minCommission,
      maxCommission,
      includeServices,
    } = req.query;

    // Force 10 items per page
    const limit = 10;
    let validPage = Math.max(1, parseInt(page, 10) || 1);

    

    // --- Step 1: Build staff query ---
    let staffQuery = {
      attributes: ["id"],
      where: {},
      order: [],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name"],
        },
      ],
    };

    if (isAvailable === "true" || isAvailable === "false") {
      staffQuery.where.is_available = isAvailable === "true";
    }

    if (minCommission || maxCommission) {
      staffQuery.where.commission_percentage = {};
      if (minCommission) staffQuery.where.commission_percentage[Op.gte] = parseFloat(minCommission);
      if (maxCommission) staffQuery.where.commission_percentage[Op.lte] = parseFloat(maxCommission);
    }

    if (search) {
      staffQuery.include[0].attributes.push("email", "phone");
      staffQuery.include[0].where = {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
        ],
      };
    }

    if (services && services.split(",").length > 0) {
      const serviceIds = services.split(",");
      staffQuery.include.push({
        model: Service,
        as: "services",
        attributes: ["id"],
        where: { id: { [Op.in]: serviceIds } },
        through: { attributes: [] },
      });
      staffQuery.group = ["Staff.id"];
      staffQuery.having = sequelize.where(
        fn("COUNT", fn("DISTINCT", col("services.id"))),
        serviceIds.length
      );
    }

    if (sort) {
      const [field, direction] = sort.split("_");
      staffQuery.order = field === "name"
        ? [[{ model: User, as: "user" }, "name", direction === "desc" ? "DESC" : "ASC"]]
        : [[field, direction === "desc" ? "DESC" : "ASC"]];
    } else {
      staffQuery.order = [[{ model: User, as: "user" }, "name", "ASC"]];
    }

    // --- Step 2: Count total staff ---
    let totalCount = 0;
    if (staffQuery.group) {
      const groupedResult = await Staff.findAll({
        attributes: ["id"],
        where: staffQuery.where,
        include: staffQuery.include,
        group: staffQuery.group,
        having: staffQuery.having,
        raw: true,
      });
      totalCount = groupedResult.length;
    } else {
      totalCount = await Staff.count({
        where: staffQuery.where,
        include: staffQuery.include,
        distinct: true,
      });
    }

    const totalPages = Math.ceil(totalCount / limit);
    if (totalPages > 0 && validPage > totalPages) validPage = 1;

    // --- Step 3: Paginated staff IDs ---
    const paginatedStaffIds = await Staff.findAll({
      ...staffQuery,
      limit,
      offset: (validPage - 1) * limit,
      distinct: true,
      subQuery: false,
    });

    // --- Step 4: Get full staff data ---
    let staffData = [];
    if (paginatedStaffIds.length > 0) {
      staffData = await Staff.findAll({
        where: { id: { [Op.in]: paginatedStaffIds.map((s) => s.id) } },
        include: [
          { model: User, as: "user", attributes: { exclude: ["password"] } },
          { association: "services" },
          { association: "workingHours" },
        ],
        order: staffQuery.order,
      });
    }

    // --- Step 5: Breaks ---
    const staffIds = staffData.map((s) => s.id);
    const allBreaks = await Break.findAll({
      where: { staff_id: { [Op.in]: staffIds } },
    });
    const breaksByStaffId = allBreaks.reduce((acc, brk) => {
      (acc[brk.staff_id] = acc[brk.staff_id] || []).push(brk);
      return acc;
    }, {});

    // --- Step 6: Appointments & Earnings ---
    const appointmentCounts = await Appointment.findAll({
      attributes: ["staff_id", [fn("count", col("id")), "count"]],
      where: { staff_id: { [Op.in]: staffIds } },
      group: ["staff_id"],
    });
    const [serviceEarnings, productEarnings] = await Promise.all([
      InvoiceService.findAll({
        attributes: ["staff_id", [fn("sum", col("InvoiceService.total")), "total"]],
        where: { staff_id: { [Op.in]: staffIds } },
        include: [{ model: Invoice, as: "invoice", attributes: [], where: { status: "paid" } }],
        group: ["staff_id"],
      }),
      InvoiceProduct.findAll({
        attributes: ["staff_id", [fn("sum", col("InvoiceProduct.total")), "total"]],
        where: { staff_id: { [Op.in]: staffIds } },
        include: [{ model: Invoice, as: "invoice", attributes: [], where: { status: "paid" } }],
        group: ["staff_id"],
      }),
    ]);

    const earningsMap = {};
    const accumulate = (arr) => {
      arr.forEach((row) => {
        const sid = row.staff_id;
        const amount = parseFloat(row.dataValues.total || 0);
        earningsMap[sid] = (earningsMap[sid] || 0) + amount;
      });
    };
    accumulate(serviceEarnings);
    accumulate(productEarnings);

    const appointmentsMap = appointmentCounts.reduce((acc, item) => {
      acc[item.staff_id] = parseInt(item.dataValues.count, 10);
      return acc;
    }, {});

    // --- Step 7: Attach computed fields ---
    const now = moment.tz("America/Edmonton");
    const staff = await Promise.all(
      staffData.map(async (staffMember) => {
        const staffJson = staffMember.toJSON();
        const staffBreaks = breaksByStaffId[staffMember.id] || [];

        const isOnBreak = staffBreaks.some((brk) => {
          const today = now.format("YYYY-MM-DD");
          const start = moment.tz(`${today} ${brk.start_time}`, "YYYY-MM-DD HH:mm:ss", "America/Edmonton");
          const end = moment.tz(`${today} ${brk.end_time}`, "YYYY-MM-DD HH:mm:ss", "America/Edmonton");
          return now.isBetween(start, end, null, "[)");
        });

        // Update if status changed (no transaction)
        if (staffMember.is_on_break !== isOnBreak) {
          await staffMember.update({ is_on_break: isOnBreak });
        }

        return {
          ...staffJson,
          breaks: staffBreaks,
          isOnBreak,
          totalAppointments: appointmentsMap[staffMember.id] || 0,
          totalEarnings: earningsMap[staffMember.id] || 0,
        };
      })
    );

    // --- Step 8: Response ---
    const responseData = {
      success: true,
      staff,
      totalCount,
      pages: totalPages,
      currentPage: validPage,
      itemsPerPage: limit,
    };

    if (includeServices === "true") {
      responseData.services = await Service.findAll({ order: [["name", "ASC"]] });
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Get staff error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};


/**
 * Get staff member by ID
 */
exports.getStaffById = async (req, res) => {
  try {
    const { id } = req.params;

    const staff = await Staff.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: { exclude: ["password"] },
        },
        {
          association: "services",
        },
        {
          association: "workingHours",
        },
      ],
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    // Get staff-specific breaks
    const breaks = await Break.findAll({
      where: { staff_id: id },
    });

    // Get total appointments count for this staff member
    const totalAppointments = await Appointment.count({
      where: { staff_id: id },
    });

    const [svcEarn, prodEarn] = await Promise.all([
      // Qualify column to avoid ambiguity when joining invoices
      InvoiceService.sum("InvoiceService.total", {
        where: { staff_id: id },
        include: [
          {
            model: Invoice,
            as: "invoice",
            attributes: [],
            where: { status: "paid" },
          },
        ],
      }),
      // Qualify column to avoid ambiguity when joining invoices
      InvoiceProduct.sum("InvoiceProduct.total", {
        where: { staff_id: id },
        include: [
          {
            model: Invoice,
            as: "invoice",
            attributes: [],
            where: { status: "paid" },
          },
        ],
      }),
    ]);
    const totalEarnings = parseFloat(svcEarn || 0) + parseFloat(prodEarn || 0);

    return res.status(200).json({
      success: true,
      staff: {
        ...staff.toJSON(),
        breaks,
        totalAppointments,
        totalEarnings,
      },
    });
  } catch (error) {
    console.error("Get staff error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Create new staff member
 */
exports.createStaff = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      name,
      email,
      password,
      phone,
      bio,
      commission_percentage,
      services,
      is_available,
      image,
      position = null,
      is_on_break = false,
    } = req.body;

    // Validate required fields
    if (!name || !email || !password || !commission_percentage) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message:
          "Name, email, password, and commission percentage are required",
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Email already in use",
      });
    }

    // Create user
    const user = await User.create(
      {
        name,
        email,
        password,
        phone,
        role: "staff",
        image,
      },
      { transaction }
    );

    // Create staff
    const staff = await Staff.create(
      {
        user_id: user.id,
        bio,
        commission_percentage,
        is_available: is_available !== undefined ? is_available : true,
        position,
        is_on_break,
      },
      { transaction }
    );

    // Add services if provided
    if (services && services.length > 0) {
      const serviceInstances = await Service.findAll({
        where: {
          id: {
            [Op.in]: services,
          },
        },
      });

      if (serviceInstances.length > 0) {
        await staff.setServices(serviceInstances, { transaction });
      }
    }

    // Log activity if user is authenticated
    if (req.user) {
      await ActivityLog.create(
        {
          user_id: req.user.id,
          user_name: req.user.name,
          user_role: req.user.role,
          action: "Create Staff",
          details: `Created new staff member: ${name}`,
        },
        { transaction }
      );
    }

    await transaction.commit();

    // Fetch the created staff with associations
    const createdStaff = await Staff.findByPk(staff.id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: { exclude: ["password"] },
        },
        {
          association: "services",
        },
      ],
    });

    return res.status(201).json({
      success: true,
      staff: createdStaff,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Create staff error:", error);
    return res.status(500).json({
      success: false,
      message: error,
    });
  }
};

/**
 * Update staff member
 */
exports.updateStaff = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      bio,
      commission_percentage,
      services,
      is_available,
      image,
      password,
    } = req.body;

    // Find staff
    const staff = await Staff.findByPk(id, {
      include: [{ model: User, as: "user" }],
    });

    if (!staff) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    // Update user
    if (name || email || phone || image || password) {
      // Check if email already exists (if changing email)
      if (email && email !== staff.user.email) {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: "Email already in use",
          });
        }
      }

      // Prepare user update payload
      const userUpdatePayload = {
        name: name || staff.user.name,
        email: email || staff.user.email,
        phone: phone !== undefined ? phone : staff.user.phone,
        image: image !== undefined ? image : staff.user.image,
      };

      // Hash and include password if provided
      if (password) {
        userUpdatePayload.password = password; // plain, let model hook hash
      }

      await staff.user.update(userUpdatePayload, { transaction });
    }

    // Update staff
    await staff.update(
      {
        bio: bio !== undefined ? bio : staff.bio,
        commission_percentage:
          commission_percentage || staff.commission_percentage,
        is_available:
          is_available !== undefined ? is_available : staff.is_available,
      },
      { transaction }
    );

    // Update services if provided
    if (services && services.length > 0) {
      const serviceInstances = await Service.findAll({
        where: {
          id: {
            [Op.in]: services,
          },
        },
      });

      if (serviceInstances.length > 0) {
        await staff.setServices(serviceInstances, { transaction });
      }
    }

    // Log activity if user is authenticated
    if (req.user) {
      await ActivityLog.create(
        {
          user_id: req.user.id,
          user_name: req.user.name,
          user_role: req.user.role,
          action: "Update Staff",
          details: `Updated staff member: ${staff.user.name}`,
        },
        { transaction }
      );
    }

    await transaction.commit();

    // Fetch the updated staff with associations
    const updatedStaff = await Staff.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: { exclude: ["password"] },
        },
        {
          association: "services",
        },
        {
          association: "workingHours",
        },
      ],
    });

    return res.status(200).json({
      success: true,
      staff: updatedStaff,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Update staff error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Delete staff member
 */
exports.deleteStaff = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    // Find staff
    const staff = await Staff.findByPk(id, {
      include: [{ model: User, as: "user" }],
    });

    if (!staff) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    // Check if staff has any appointments
    const appointmentCount = await Appointment.count({
      where: {
        staff_id: id,
        date: {
          [Op.gte]: new Date(),
        },
        status: {
          [Op.in]: ["scheduled", "confirmed"],
        },
      },
    });

    if (appointmentCount > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Cannot delete staff member with upcoming appointments",
      });
    }

    // Delete staff (this will cascade to working hours and staff services)
    await staff.destroy({ transaction });

    // Delete user
    await User.destroy({
      where: { id: staff.user_id },
      transaction,
    });

    // Log activity if user is authenticated
    if (req.user) {
      await ActivityLog.create(
        {
          user_id: req.user.id,
          user_name: req.user.name,
          user_role: req.user.role,
          action: "Delete Staff",
          details: `Deleted staff member: ${staff.user.name}`,
        },
        { transaction }
      );
    }

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Staff member deleted successfully",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Delete staff error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Update staff working hours
 */
exports.updateWorkingHours = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { workingHours, breaks } = req.body;

    // Validate request body
    if (!workingHours || !Array.isArray(workingHours)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Working hours array is required",
      });
    }

    // Find staff
    const staff = await Staff.findByPk(id);
    if (!staff) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    // Delete existing working hours
    await WorkingHour.destroy({
      where: { staff_id: id },
      transaction,
    });

    // Delete existing staff-specific breaks
    await Break.destroy({
      where: { staff_id: id },
      transaction,
    });

    // Create new working hours
    const createdHours = [];
    for (const hour of workingHours) {
      if (!hour.day_of_week || !hour.start_time || !hour.end_time) {
        continue; // Skip invalid entries
      }

      // Ensure day_of_week is a string for WorkingHour model
      let dayOfWeek = hour.day_of_week;

      // If it's a number, convert it to string day name using our utility
      if (
        typeof hour.day_of_week === "number" &&
        hour.day_of_week >= 0 &&
        hour.day_of_week <= 6
      ) {
        dayOfWeek = dayOfWeekUtils.getDayNameFromNumber(hour.day_of_week);
      }

      const workingHour = await WorkingHour.create(
        {
          staff_id: id,
          day_of_week: dayOfWeek,
          start_time: hour.start_time,
          end_time: hour.end_time,
          is_break: hour.is_break || false,
        },
        { transaction }
      );

      createdHours.push(workingHour);
    }

    // Create new staff-specific breaks if provided
    const createdBreaks = [];
    if (breaks && Array.isArray(breaks)) {
      for (const breakItem of breaks) {
        if (
          !breakItem.name ||
          !breakItem.start_time ||
          !breakItem.end_time ||
          breakItem.day_of_week === undefined
        ) {
          continue; // Skip invalid entries
        }

        // Convert day_of_week to string value for Break model using our utility
        let stringDayOfWeek;

        if (typeof breakItem.day_of_week === "number") {
          // If it's a number, convert it to string day name
          if (breakItem.day_of_week >= 0 && breakItem.day_of_week <= 6) {
            stringDayOfWeek = dayOfWeekUtils.getDayNameFromNumber(
              breakItem.day_of_week
            );
          } else {
            continue; // Skip if invalid number
          }
        } else if (typeof breakItem.day_of_week === "string") {
          // If it's already a string, ensure it's a valid day name
          const lowerDay = breakItem.day_of_week.toLowerCase();
          if (dayOfWeekUtils.DAYS_OF_WEEK.includes(lowerDay)) {
            stringDayOfWeek = lowerDay;
          } else {
            // Try parsing it as a number
            const parsed = parseInt(breakItem.day_of_week, 10);
            if (!isNaN(parsed) && parsed >= 0 && parsed <= 6) {
              stringDayOfWeek = dayOfWeekUtils.getDayNameFromNumber(parsed);
            } else {
              continue; // Skip if invalid string
            }
          }
        } else {
          continue; // Skip if not a string or number
        }

        const newBreak = await Break.create(
          {
            staff_id: id,
            day_of_week: stringDayOfWeek,
            name: breakItem.name,
            start_time: breakItem.start_time,
            end_time: breakItem.end_time,
            business_hour_id: null, // Staff-specific breaks don't need business_hour_id
          },
          { transaction }
        );

        createdBreaks.push(newBreak);
      }
    }

    // Log activity if user is authenticated
    if (req.user) {
      await ActivityLog.create(
        {
          user_id: req.user.id,
          user_name: req.user.name,
          user_role: req.user.role,
          action: "Update Staff Working Hours",
          details: `Updated working hours and breaks for staff ID: ${id}`,
        },
        { transaction }
      );
    }

    await transaction.commit();

    return res.status(200).json({
      success: true,
      workingHours: createdHours,
      breaks: createdBreaks,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Update working hours error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Update staff member's own profile
 */
exports.updateOwnProfile = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { email, phone, bio, image } = req.body;

    // Verify that the staff member is updating their own profile
    const tokenStaffId =
      req.user.staff?.id || (req.user.staffId ? req.user.staffId : null);

    if (!tokenStaffId || tokenStaffId !== id) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only update your own profile.",
      });
    }

    // Find staff
    const staff = await Staff.findByPk(id, {
      include: [{ model: User, as: "user" }],
    });

    if (!staff) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Staff profile not found",
      });
    }

    // Update user
    if (email || phone || image) {
      // Check if email already exists (if changing email)
      if (email && email !== staff.user.email) {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: "Email already in use",
          });
        }
      }

      await staff.user.update(
        {
          email: email || staff.user.email,
          phone: phone !== undefined ? phone : staff.user.phone,
          image: image !== undefined ? image : staff.user.image,
        },
        { transaction }
      );
    }

    // Update staff bio
    if (bio !== undefined) {
      await staff.update(
        {
          bio: bio,
        },
        { transaction }
      );
    }

    // Log activity
    await ActivityLog.create(
      {
        user_id: req.user.id,
        user_name: req.user.name,
        user_role: req.user.role,
        action: "Update Profile",
        details: `Updated own profile`,
      },
      { transaction }
    );

    await transaction.commit();

    // Fetch the updated staff with associations
    const updatedStaff = await Staff.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: { exclude: ["password"] },
        },
        {
          association: "services",
        },
        {
          association: "workingHours",
        },
      ],
    });

    return res.status(200).json({
      success: true,
      staff: updatedStaff,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get staff breaks
 */
exports.getStaffBreaks = async (req, res) => {
  try {
    const { id } = req.params;

    // Find staff
    const staff = await Staff.findByPk(id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    // Get staff-specific breaks
    let breaks = await Break.findAll({
      where: { staff_id: id },
      order: [
        ["day_of_week", "ASC"],
        ["start_time", "ASC"],
      ],
    });

    // Convert day_of_week from string to number for frontend consumption
    breaks = breaks.map((breakItem) => {
      const breakData = breakItem.toJSON();
      // Convert day_of_week from string to number if it's a string
      if (typeof breakData.day_of_week === "string") {
        // Use the utility to convert day name to number
        const dayNumber = dayOfWeekUtils.getDayNumberFromName(
          breakData.day_of_week
        );
        breakData.day_of_week = dayNumber;
      }
      return breakData;
    });

    return res.status(200).json({
      success: true,
      breaks,
    });
  } catch (error) {
    console.error("Get staff breaks error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Create staff break
 */
exports.createStaffBreak = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { name, start_time, end_time, day_of_week } = req.body;

    // Validate required fields
    if (!name || !start_time || !end_time || day_of_week === undefined) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Name, start time, end time, and day of week are required",
      });
    }

    // Find staff
    const staff = await Staff.findByPk(id);
    if (!staff) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    // Convert day_of_week to string value for database (the model expects a string)
    let stringDayOfWeek;

    if (typeof day_of_week === "number") {
      // If it's a number, validate and convert it to string
      if (day_of_week >= 0 && day_of_week <= 6) {
        stringDayOfWeek = dayOfWeekUtils.getDayNameFromNumber(day_of_week);
      } else {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Invalid day of week: must be between 0-6",
        });
      }
    } else if (typeof day_of_week === "string") {
      // If it's a string, make sure it's a valid day name
      const lowerDay = day_of_week.toLowerCase();
      if (dayOfWeekUtils.DAYS_OF_WEEK.includes(lowerDay)) {
        stringDayOfWeek = lowerDay;
      } else {
        // Try parsing it as a number string
        const parsed = parseInt(day_of_week, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 6) {
          stringDayOfWeek = dayOfWeekUtils.getDayNameFromNumber(parsed);
        } else {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message:
              "Invalid day of week: must be a valid day name or number between 0-6",
          });
        }
      }
    } else {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Day of week must be a string or number",
      });
    }

    // Create break
    const newBreak = await Break.create(
      {
        staff_id: id,
        name,
        start_time,
        end_time,
        day_of_week: stringDayOfWeek,
        business_hour_id: null, // Staff-specific breaks don't need business_hour_id
      },
      { transaction }
    );
    await staff.update({ is_on_break: true }, { transaction });
    // Log activity if user is authenticated
    if (req.user) {
      await ActivityLog.create(
        {
          user_id: req.user.id,
          user_name: req.user.name,
          user_role: req.user.role,
          action: "Create Staff Break",
          details: `Created break "${name}" for staff ID: ${id}`,
        },
        { transaction }
      );
    }

    await transaction.commit();

    // Convert day_of_week back to number for the frontend
    const responseBreak = newBreak.toJSON();
    responseBreak.day_of_week = dayOfWeekUtils.getDayNumberFromName(
      responseBreak.day_of_week
    );

    return res.status(201).json({
      success: true,
      break: responseBreak,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Create staff break error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Update staff break
 */
exports.updateStaffBreak = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id, breakId } = req.params;
    const { name, start_time, end_time, day_of_week } = req.body;

    // Find break
    const breakToUpdate = await Break.findOne({
      where: {
        id: breakId,
        staff_id: id,
      },
    });

    if (!breakToUpdate) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Break not found or does not belong to this staff",
      });
    }

    // Convert day_of_week to string if provided
    let stringDayOfWeek = breakToUpdate.day_of_week;

    if (day_of_week !== undefined) {
      if (typeof day_of_week === "number") {
        // If it's a number, validate and convert to string
        if (day_of_week >= 0 && day_of_week <= 6) {
          stringDayOfWeek = dayOfWeekUtils.getDayNameFromNumber(day_of_week);
        } else {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: "Invalid day of week: must be between 0-6",
          });
        }
      } else if (typeof day_of_week === "string") {
        // If it's a string, make sure it's a valid day name
        const lowerDay = day_of_week.toLowerCase();
        if (dayOfWeekUtils.DAYS_OF_WEEK.includes(lowerDay)) {
          stringDayOfWeek = lowerDay;
        } else {
          // Try parsing it as a number string
          const parsed = parseInt(day_of_week, 10);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 6) {
            stringDayOfWeek = dayOfWeekUtils.getDayNameFromNumber(parsed);
          } else {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message:
                "Invalid day of week: must be a valid day name or number between 0-6",
            });
          }
        }
      } else {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Day of week must be a string or number",
        });
      }
    }

    // Update break
    await breakToUpdate.update(
      {
        name: name || breakToUpdate.name,
        start_time: start_time || breakToUpdate.start_time,
        end_time: end_time || breakToUpdate.end_time,
        day_of_week: stringDayOfWeek,
      },
      { transaction }
    );

    // Log activity if user is authenticated
    if (req.user) {
      await ActivityLog.create(
        {
          user_id: req.user.id,
          user_name: req.user.name,
          user_role: req.user.role,
          action: "Update Staff Break",
          details: `Updated break "${breakToUpdate.name}" for staff ID: ${id}`,
        },
        { transaction }
      );
    }

    await transaction.commit();

    // Convert day_of_week to number for frontend response
    const responseBreak = breakToUpdate.toJSON();
    responseBreak.day_of_week = dayOfWeekUtils.getDayNumberFromName(
      responseBreak.day_of_week
    );

    return res.status(200).json({
      success: true,
      break: responseBreak,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Update staff break error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Delete staff break
 */
exports.deleteStaffBreak = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id, breakId } = req.params;

    // Find break
    const breakToDelete = await Break.findOne({
      where: {
        id: breakId,
        staff_id: id,
      },
    });

    if (!breakToDelete) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Break not found or does not belong to this staff",
      });
    }

    const breakName = breakToDelete.name;

    // Delete break
    await breakToDelete.destroy({ transaction });

    // Log activity if user is authenticated
    if (req.user) {
      await ActivityLog.create(
        {
          user_id: req.user.id,
          user_name: req.user.name,
          user_role: req.user.role,
          action: "Delete Staff Break",
          details: `Deleted break "${breakName}" for staff ID: ${id}`,
        },
        { transaction }
      );
    }

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Staff break deleted successfully",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Delete staff break error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
