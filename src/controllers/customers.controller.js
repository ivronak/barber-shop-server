const { Customer, Appointment, Invoice, ActivityLog } = require("../models");
const { Op } = require("sequelize");
const { sequelize } = require("../models");
const moment = require("moment");

/**
 * Helper function for consistent error handling
 */
const handleError = (error, res) => {
  console.error("Error:", error);

  let errorMessage = "Internal server error";
  let statusCode = 500;

  if (error.name === "SequelizeDatabaseError") {
    // Database errors (like missing columns, syntax errors)
    errorMessage = `Database error: ${
      error.original ? error.original.sqlMessage : error.message
    }`;

    // Log the SQL for debugging
    if (error.sql) {
      console.error("SQL Query:", error.sql);
    }
  } else if (error.name === "SequelizeValidationError") {
    // Validation errors
    errorMessage = error.message;
    statusCode = 400;
  } else if (error.name === "SequelizeUniqueConstraintError") {
    // Unique constraint violations
    errorMessage = "This record already exists";
    statusCode = 400;
  }

  return res.status(statusCode).json({
    success: false,
    message: errorMessage,
  });
};

/**
 * Get all customers with optional filtering and pagination
 */
exports.getAllCustomers = async (req, res) => {
  try {
    const {
      search,
      sort,
      page = 1,
      limit = 10,
      visitFrom,
      visitTo,
      minSpent,
      maxSpent,
      customerSince,
      minVisits,
    } = req.query;

   

    // Prepare query options
    const queryOptions = {
      where: {},
      order: [],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    };

    // Add search filter if provided
    if (search) {
      queryOptions.where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
      ];
    }

    // Add date range filter for last visit
    if (visitFrom && visitTo) {
      try {
        // Validate dates by attempting to create Date objects
        const fromDate = new Date(visitFrom);
        const toDate = new Date(visitTo);

        if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
          queryOptions.where.last_visit = {
            ...(queryOptions.where.last_visit || {}),
            [Op.between]: [visitFrom, visitTo],
          };
          
        } else {
          
        }
      } catch (e) {
        console.error("Error parsing date range:", e);
      }
    }

    // Add spending range filter
    if (minSpent !== undefined && maxSpent !== undefined) {
      try {
        const min = parseFloat(minSpent);
        const max = parseFloat(maxSpent);

        if (!isNaN(min) && !isNaN(max)) {
          queryOptions.where.total_spent = {
            [Op.between]: [min, max],
          };
          
        } else {
          
        }
      } catch (e) {
        console.error("Error parsing spending range:", e);
      }
    }

    // Customer since filter (created on or after date)
    if (customerSince) {
      try {
        const sinceDate = new Date(customerSince);
        if (!isNaN(sinceDate.getTime())) {
          queryOptions.where.created_at = {
            ...(queryOptions.where.created_at || {}),
            [Op.gte]: customerSince,
          };
        
        }
      } catch (e) {
        console.error("Error parsing customerSince:", e);
      }
    }

    // Minimum visit count filter
    if (minVisits !== undefined) {
      try {
        const minVisitsInt = parseInt(minVisits);
        if (!isNaN(minVisitsInt) && minVisitsInt > 0) {
          queryOptions.where.visit_count = {
            ...(queryOptions.where.visit_count || {}),
            [Op.gte]: minVisitsInt,
          };
          
        }
      } catch (e) {
        console.error("Error parsing minVisits:", e);
      }
    }

    

    // Add sorting if provided
    if (sort) {
      

      // Validate sort parameter format
      if (typeof sort !== "string") {
        console.warn("Sort parameter is not a string:", sort);
        sort = "name_asc"; // Default to name ascending
      }

      // Make sure we split correctly, handle possible format variations
      let field, direction;

      if (sort.includes("_")) {
        const lastUnderscore = sort.lastIndexOf("_");
        field = sort.substring(0, lastUnderscore);
        direction = sort.substring(lastUnderscore + 1);
      } else {
        // Default if no direction specified
        field = sort;
        direction = "asc";
      }

     

      let orderField = "";

      // Map frontend field names to actual database column names
      switch (field) {
        case "visit_count":
        case "visit": // Handle shortened field name
        case "visitCount":
          orderField = "visit_count";
          break;

        case "total_spent":
        case "total": // Handle shortened field name
        case "totalSpent":
          orderField = "total_spent";
          break;

        case "last_visit":
        case "last": // Handle shortened field name
        case "lastVisit":
          orderField = "last_visit";
          break;

        case "name":
          orderField = "name";
          break;

        default:
         
          orderField = "created_at"; // Default sort
      }

    
      queryOptions.order = [
        [orderField, direction.toLowerCase() === "desc" ? "DESC" : "ASC"],
      ];
    } else {
      queryOptions.order = [["name", "ASC"]];
    }

    // Get customers with count
    const { count, rows: customers } = await Customer.findAndCountAll(
      queryOptions
    );

    return res.status(200).json({
      success: true,
      customers,
      totalCount: count,
      pages: Math.ceil(count / parseInt(limit)),
    });
  } catch (error) {
    console.error("Get customers error:", error);
    return handleError(error, res);
  }
};

/**
 * Get customer by ID
 */
exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error("Get customer error:", error);
    return handleError(error, res);
  }
};

/**
 * Lookup customer by phone number
 */
exports.getCustomerByPhone = async (req, res) => {
  try {
    const { phone } = req.params;

    const customer = await Customer.findOne({
      where: { phone },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error("Get customer by phone error:", error);
    return handleError(error, res);
  }
};

/**
 * Create new customer
 */
exports.createCustomer = async (req, res) => {
  try {
    const { name, email, phone, notes } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name required",
      });
    }

    // Check if customer with same phone already exists
    const existingCustomer = await Customer.findOne({ where: { phone } });
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: "Customer with this phone number already exists",
      });
    }

    // Create customer
    const customer = await Customer.create({
      name,
      email,
      phone: "123",
      notes,
      visit_count: 0,
      total_spent: 0.0,
    });

    // Log activity if user is authenticated
    if (req.user) {
      await ActivityLog.create({
        user_id: req.user.id,
        user_name: req.user.name,
        user_role: req.user.role,
        action: "Create Customer",
        details: `Created new customer: ${name}`,
      });
    }

    return res.status(201).json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error("Create customer error:", error);
    return handleError(error, res);
  }
};

/**
 * Update customer
 */
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, notes } = req.body;

    // Find customer
    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Check if phone is already in use by another customer
    if (phone && phone !== customer.phone) {
      const existingCustomer = await Customer.findOne({
        where: {
          phone,
          id: { [Op.ne]: id },
        },
      });

      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          message: "Phone number is already in use by another customer",
        });
      }
    }

    // Update customer
    await customer.update({
      name: name || customer.name,
      email: email !== undefined ? email : customer.email,
      phone: phone || customer.phone,
      notes: notes !== undefined ? notes : customer.notes,
    });

    // Log activity
    if (req.user) {
      await ActivityLog.create({
        user_id: req.user.id,
        user_name: req.user.name,
        user_role: req.user.role,
        action: "Update Customer",
        details: `Updated customer: ${customer.name}`,
      });
    }

    return res.status(200).json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error("Update customer error:", error);
    return handleError(error, res);
  }
};

/**
 * Delete customer
 */
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    // Find customer
    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Check if customer has appointments
    const appointmentCount = await Appointment.count({
      where: { customer_id: id },
    });

    if (appointmentCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete customer with existing appointments",
      });
    }

    // Delete customer
    await customer.destroy();

    // Log activity
    if (req.user) {
      await ActivityLog.create({
        user_id: req.user.id,
        user_name: req.user.name,
        user_role: req.user.role,
        action: "Delete Customer",
        details: `Deleted customer: ${customer.name}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Delete customer error:", error);
    return handleError(error, res);
  }
};

/**
 * Get customer appointments
 */
exports.getCustomerAppointments = async (req, res) => {
  try {
    const { id } = req.params;

    // Find customer
    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Get appointments
    const appointments = await Appointment.findAll({
      where: { customer_id: id },
      order: [
        ["date", "DESC"],
        ["time", "DESC"],
      ],
      include: [
        {
          association: "appointmentServices",
          attributes: ["id", "service_id", "service_name", "price", "duration"],
        },
        {
          association: "staff",
          attributes: ["id", "name", "position"],
        },
      ],
    });

    return res.status(200).json({
      success: true,
      appointments,
    });
  } catch (error) {
    console.error("Get customer appointments error:", error);
    return handleError(error, res);
  }
};

/**
 * Get customer invoices
 */
exports.getCustomerInvoices = async (req, res) => {
  try {
    const { id } = req.params;

    // Find customer
    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Get invoices
    const invoices = await Invoice.findAll({
      // Exclude legacy staff_id column (removed in multi-staff implementation)
      attributes: { exclude: ["staff_id"] },
      where: { customer_id: id },
      order: [["date", "DESC"]],
      include: [
        {
          association: "invoiceServices",
          attributes: [
            "id",
            "service_id",
            "service_name",
            "price",
            "quantity",
            "total",
          ],
        },
      ],
    });

    // Format response
    const formattedInvoices = invoices.map((invoice) => {
      return {
        ...invoice.toJSON(),
        services: invoice.invoiceServices.map((service) => ({
          service_id: service.service_id,
          service_name: service.service_name,
          price: service.price,
          quantity: service.quantity,
          total: service.total,
        })),
      };
    });

    return res.status(200).json({
      success: true,
      invoices: formattedInvoices,
    });
  } catch (error) {
    console.error("Get customer invoices error:", error);
    return handleError(error, res);
  }
};

/**
 * Get customer statistics
 */
exports.getCustomerStats = async (req, res) => {
  try {
    // Get total customer count
    const totalCustomers = await Customer.count();

    // Get new customers this month
    const startOfMonth = moment().startOf("month").toDate();
    const newCustomersThisMonth = await Customer.count({
      where: {
        created_at: {
          [Op.gte]: startOfMonth,
        },
      },
    });

    // Get active/inactive customers
    const thirtyDaysAgo = moment().subtract(30, "days").toDate();
    const ninetyDaysAgo = moment().subtract(90, "days").toDate();

    const activeCustomers = await Customer.count({
      where: {
        last_visit: {
          [Op.gte]: thirtyDaysAgo,
          [Op.ne]: null,
        },
      },
    });

    const inactiveCustomers = await Customer.count({
      where: {
        last_visit: {
          [Op.lt]: ninetyDaysAgo,
          [Op.ne]: null,
        },
      },
    });

    return res.status(200).json({
      success: true,
      totalCustomers,
      newCustomersThisMonth,
      activeCustomers,
      inactiveCustomers,
    });
  } catch (error) {
    console.error("Get customer stats error:", error);
    return handleError(error, res);
  }
};
