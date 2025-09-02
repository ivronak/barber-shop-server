const { Op, fn, col, literal, where } = require("sequelize");
const {
  Appointment,
  AppointmentService,
  Invoice,
  InvoiceService,
  Staff,
  Service,
  Customer,
  Review,
  User,
  ActivityLog,
  InvoiceProduct,
  sequelize,
} = require("../models");

/**
 * Get comprehensive admin dashboard data in a single call
 * This endpoint aggregates data from multiple sources to avoid multiple API calls
 */
exports.getAdminDashboardData = async (req, res) => {
  try {
    const { period = "weekly" } = req.query;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate = new Date(today);
    let dateFormat = "%Y-%m-%d";

    // Determine date range based on period
    if (period === "weekly") {
      startDate.setDate(today.getDate() - 7);
      dateFormat = "%Y-%m-%d"; // Keep daily format for weekly view
    } else if (period === "monthly") {
      startDate.setMonth(today.getMonth() - 1);
      dateFormat = "%Y-%m-%d"; // Keep daily format for monthly view
    } else if (period === "yearly") {
      startDate.setFullYear(today.getFullYear() - 1);
      dateFormat = "%Y-%m"; // Year-Month for yearly view
    }

    // Execute all queries in parallel for better performance
    const [
      // Revenue and appointments stats
      appointmentStats,
      revenueStats,

      // Summary counts
      customerCount,
      appointmentCount,
      staffCount,
      serviceCount,

      // Financial summary
      financialSummary,

      // Top performers
      topServices,
      topStaff,

      // Recent data
      upcomingAppointments,
      recentCustomers,
      latestReviews,

      // Activity logs
      recentActivity,
    ] = await Promise.all([
      // Get appointment stats over time
      Appointment.findAll({
        attributes: [
          [fn("date_format", col("date"), dateFormat), "date"],
          [fn("count", "*"), "count"],
        ],
        where: {
          date: {
            [Op.between]: [startDate, today],
          },
        },
        group: [fn("date_format", col("date"), dateFormat)],
        order: [[fn("date_format", col("date"), dateFormat), "ASC"]],
      }),

      // Get revenue stats over time (tips from invoice_services)
      Invoice.findAll({
        attributes: [
          [fn("date_format", col("date"), dateFormat), "date"],
          [fn("sum", col("total")), "revenue"],
          // [
          //   literal(
          //     "(SELECT COALESCE(SUM(isvc.tip_amount),0) FROM invoice_services isvc WHERE isvc.invoice_id IN (SELECT id FROM invoices inv2 WHERE DATE_FORMAT(inv2.date, '" +
          //       dateFormat +
          //       "') = DATE_FORMAT(Invoice.date, '" +
          //       dateFormat +
          //       '\') AND inv2.status = "paid"))'
          //   ),
          //   "tips",
          // ],
          [fn("sum", col("discount_amount")), "discounts"],
        ],
        where: {
          date: {
            [Op.between]: [startDate, today],
          },
          status: "paid",
        },
        group: [fn("date_format", col("date"), dateFormat)],
        order: [[fn("date_format", col("date"), dateFormat), "ASC"]],
      }),

      // Get total customers
      Customer.count(),

      // Get total appointments
      Appointment.count(),

      // Get total staff
      Staff.count(),

      // Get total services
      Service.count(),

      // Get financial summary (tips from invoice_services)
      (async () => {
        const [rows] = await sequelize.query(
          `
          SELECT 
            COALESCE(SUM(inv.total),0) AS totalRevenue,
            COALESCE(SUM(isvc.tip_amount),0) AS totalTips,
            COALESCE(SUM(inv.discount_amount),0) AS totalDiscounts,
            CASE WHEN SUM(inv.total) > 0 THEN (SUM(isvc.tip_amount) / SUM(inv.total)) * 100 ELSE 0 END AS avgTipPercentage,
            SUM(CASE WHEN inv.status = 'paid' THEN 1 ELSE 0 END) AS paidInvoices,
            SUM(CASE WHEN inv.status = 'pending' THEN 1 ELSE 0 END) AS pendingInvoices
          FROM invoices inv
          LEFT JOIN invoice_services isvc ON isvc.invoice_id = inv.id
          WHERE inv.date BETWEEN :from AND :to
        `,
          { replacements: { from: startDate, to: today } }
        );
        return rows && rows[0]
          ? rows[0]
          : {
              totalRevenue: 0,
              totalTips: 0,
              totalDiscounts: 0,
              avgTipPercentage: 0,
              paidInvoices: 0,
              pendingInvoices: 0,
            };
      })(),

      // Get top services
      InvoiceService.findAll({
        attributes: [
          "service_id",
          "service_name",
          [fn("sum", col("quantity")), "bookings"],
          [fn("sum", col("InvoiceService.total")), "revenue"],
        ],
        include: [
          {
            model: Invoice,
            as: "invoice",
            attributes: [],
            where: {
              date: {
                [Op.between]: [startDate, today],
              },
              status: "paid",
            },
          },
        ],
        group: ["service_id","service_name"],
        order: [[fn("sum", col("quantity")), "DESC"]],
        limit: 5,
      }),

      // Get top staff members by revenue from invoice line items
      InvoiceService.findAll({
        attributes: [
          "staff_id",
          "staff_name",
          [fn("count", col("InvoiceService.id")), "services_provided"],
          [fn("sum", col("InvoiceService.total")), "revenue"],
        ],
        include: [
          {
            model: Invoice,
            as: "invoice",
            attributes: [],
            where: {
              date: {
                [Op.between]: [startDate, today],
              },
              status: "paid",
            },
          },
        ],
        group: ["staff_id","staff_name"],
        order: [[fn("sum", col("InvoiceService.total")), "DESC"]],
        limit: 5,
      }),

      // Get upcoming appointments
      Appointment.findAll({
        where: {
          date: {
            [Op.gte]: today,
          },
          status: {
            [Op.in]: ["scheduled", "confirmed"],
          },
        },
        include: [
          {
            model: AppointmentService,
            as: "appointmentServices",
            include: ["service"],
          },
          {
            model: Staff,
            as: "staff",
            include: ["user"],
          },
          {
            model: Customer,
            as: "customer",
          },
        ],
        order: [
          ["date", "ASC"],
          ["time", "ASC"],
        ],
        limit: 10,
      }),

      // Get recent customers
      Customer.findAll({
        order: [["createdAt", "DESC"]],
        limit: 5,
      }),

      // Get latest reviews
      Review.findAll({
        include: [
          {
            model: Customer,
            as: "customer",
          },
          {
            model: Staff,
            as: "staff",
            include: ["user"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: 5,
      }),

      // Get recent activity logs
      ActivityLog.findAll({
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email", "role"],
          },
        ],
        order: [["timestamp", "DESC"]],
        limit: 20,
      }),
    ]);

    // Get appointment status distribution
    const appointmentStatusDistribution = await Appointment.findAll({
      attributes: ["status", [fn("count", "*"), "count"]],
      where: {
        date: {
          [Op.between]: [startDate, today],
        },
      },
      group: ["status"],
    });

    // Return comprehensive dashboard data
    return res.status(200).json({
      success: true,
      data: {
        // Time series data
        appointmentStats,
        revenueStats,

        // Summary counts
        summary: {
          customerCount,
          appointmentCount,
          staffCount,
          serviceCount,
          ...financialSummary,
        },

        // Top performers
        topServices,
        topStaff,

        // Recent data
        upcomingAppointments,
        recentCustomers,
        latestReviews,

        // Status distributions
        appointmentStatusDistribution,

        // Activity logs
        recentActivity,
      },
    });
  } catch (error) {
    console.error("Error getting admin dashboard data:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving admin dashboard data",
      error: error.message,
    });
  }
};

/**
 * Get staff dashboard data for an individual staff member
 * This endpoint provides personalized dashboard data for staff members
 */
exports.getStaffDashboardData = async (req, res) => {
  try {
    const { period = "weekly" } = req.query;
    const staffId = req.user.staffId; // Get staff ID from authenticated user

    if (!staffId) {
      return res.status(400).json({
        success: false,
        message: "Staff ID not found for current user",
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate = new Date(today);
    let dateFormat = "%Y-%m-%d";

    // Determine date range based on period
    if (period === "weekly") {
      startDate.setDate(today.getDate() - 7);
      dateFormat = "%Y-%m-%d"; // Keep daily format for weekly view
    } else if (period === "monthly") {
      startDate.setMonth(today.getMonth() - 1);
      dateFormat = "%Y-%m-%d"; // Keep daily format for monthly view
    } else if (period === "yearly") {
      startDate.setFullYear(today.getFullYear() - 1);
      dateFormat = "%Y-%m"; // Year-Month for yearly view
    }

    // Get staff details
    const staffDetails = await Staff.findByPk(staffId, {
      include: [{ model: User, as: "user" }],
    });

    if (!staffDetails) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    // Build list of invoice IDs that contain this staff on any line item
    const [idsSvc, idsProd] = await Promise.all([
      InvoiceService.findAll({
        attributes: ["invoice_id"],
        where: { staff_id: staffId },
      }),
      InvoiceProduct.findAll({
        attributes: ["invoice_id"],
        where: { staff_id: staffId },
      }),
    ]);
    const invoiceIdsForStaff = [
      ...new Set([
        ...idsSvc.map((r) => r.invoice_id),
        ...idsProd.map((r) => r.invoice_id),
      ]),
    ];
    if (invoiceIdsForStaff.length === 0) invoiceIdsForStaff.push("no-match");
    const invIdsStr = invoiceIdsForStaff.map((id) => `'${id}'`).join(",");
    // Execute all queries in parallel for better performance
    const [
      // Personal stats
      appointmentStats,
      revenueStats,

      // Performance summary
      performanceSummary,

      // Service breakdown
      serviceBreakdown,

      // Upcoming appointments
      upcomingAppointments,

      // Today's appointments
      todayAppointments,

      // Customer retention
      returnCustomers,

      // Reviews for this staff
      staffReviews,

      // Commission data
      commissionData,
    ] = await Promise.all([
      // Get appointment stats over time for this staff
      Appointment.findAll({
        attributes: [
          [fn("date_format", col("date"), dateFormat), "date"],
          [fn("count", "*"), "count"],
        ],
        where: {
          staff_id: staffId,
          date: {
            [Op.between]: [startDate, today],
          },
        },
        group: [fn("date_format", col("date"), dateFormat)],
        order: [[fn("date_format", col("date"), dateFormat), "ASC"]],
      }),

      // Get revenue stats over time for this staff (tips from invoice_services)
      Invoice.findAll({
        attributes: [
          [fn("date_format", col("date"), dateFormat), "date"],
          [fn("sum", col("total")), "revenue"],
          [
            literal(
              `(SELECT COALESCE(SUM(isvc.tip_amount),0) 
      FROM invoice_services isvc 
      WHERE isvc.invoice_id IN (${invIdsStr}) 
      )`
            ),
            "tips",
          ],
        ],
        where: {
          id: { [Op.in]: invoiceIdsForStaff },
          date: { [Op.between]: [startDate, today] },
          status: "paid",
        },
        group: [fn("date_format", col("date"), dateFormat)],
        order: [[fn("date_format", col("date"), dateFormat), "ASC"]],
      }),

      // Get performance summary (tips from invoice_services)
      (async () => {
        const [rows] = await sequelize.query(
          `
          SELECT 
            COALESCE(SUM(inv.total),0) AS totalRevenue,
            COALESCE(SUM(isvc.tip_amount),0) AS totalTips,
            COUNT(DISTINCT inv.id) AS totalAppointments,
            CASE WHEN SUM(inv.total) > 0 THEN (SUM(isvc.tip_amount) / SUM(inv.total)) * 100 ELSE 0 END AS avgTipPercentage
          FROM invoices inv
          LEFT JOIN invoice_services isvc ON isvc.invoice_id = inv.id
          WHERE inv.id IN (:invIds) AND inv.date BETWEEN :from AND :to AND inv.status = 'paid'
        `,
          {
            replacements: {
              invIds: invoiceIdsForStaff,
              from: startDate,
              to: today,
            },
          }
        );
        return rows && rows[0]
          ? rows[0]
          : {
              totalRevenue: 0,
              totalTips: 0,
              totalAppointments: 0,
              avgTipPercentage: 0,
            };
      })(),

      // Get service breakdown
      InvoiceService.findAll({
        attributes: [
          "service_id",
          "service_name",
          [fn("sum", col("quantity")), "bookings"],
          [fn("sum", col("InvoiceService.total")), "revenue"],
        ],
        include: [
          {
            model: Invoice,
            as: "invoice",
            attributes: [],
            where: {
              id: { [Op.in]: invoiceIdsForStaff },
              date: { [Op.between]: [startDate, today] },
              status: "paid",
            },
          },
        ],
        group: ["service_id"],
        order: [[fn("sum", col("quantity")), "DESC"]],
        limit: 5,
      }),

      // Get upcoming appointments for this staff
      Appointment.findAll({
        where: {
          staff_id: staffId,
          date: {
            [Op.gte]: today,
          },
          status: {
            [Op.in]: ["scheduled", "confirmed"],
          },
        },
        include: [
          {
            model: AppointmentService,
            as: "appointmentServices",
            include: ["service"],
          },
          {
            model: Customer,
            as: "customer",
          },
        ],
        order: [
          ["date", "ASC"],
          ["time", "ASC"],
        ],
        limit: 10,
      }),

      // Get today's appointments for this staff
      Appointment.findAll({
        where: {
          staff_id: staffId,
          date: today.toISOString().split("T")[0],
        },
        include: [
          {
            model: AppointmentService,
            as: "appointmentServices",
            include: ["service"],
          },
          {
            model: Customer,
            as: "customer",
          },
        ],
        order: [["time", "ASC"]],
      }),

      // Get returning customers for this staff
      Invoice.findAll({
        attributes: [
          "customer_id",
          "customer_name",
          [fn("count", "*"), "visits"],
          [fn("sum", col("total")), "spent"],
        ],
        where: {
          id: { [Op.in]: invoiceIdsForStaff },
          date: {
            [Op.between]: [startDate, today],
          },
        },
        group: ["customer_id"],
        having: literal("COUNT(*) > 1"), // Only customers with more than one visit
        order: [[fn("count", "*"), "DESC"]],
        limit: 5,
      }),

      // Get reviews for this staff
      Review.findAll({
        where: {
          staff_id: staffId,
        },
        include: [
          {
            model: Customer,
            as: "customer",
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: 5,
      }),

      // Calculate commission data
      Invoice.findAll({
        attributes: [
          [fn("date_format", col("date"), dateFormat), "date"],
          [fn("sum", col("total")), "revenue"],
        ],
        where: {
          id: { [Op.in]: invoiceIdsForStaff },
          date: {
            [Op.between]: [startDate, today],
          },
          status: "paid",
        },
        group: [fn("date_format", col("date"), dateFormat)],
        order: [[fn("date_format", col("date"), dateFormat), "ASC"]],
      }),
    ]);

    // Calculate commission based on staff's commission percentage
    const commissionPercentage = staffDetails.commission_percentage || 0;
    const calculatedCommission = commissionData.map((day) => ({
      date: day.date,
      revenue: day.revenue,
      commission: (day.revenue * commissionPercentage) / 100,
    }));

    // Get appointment status distribution for this staff
    const appointmentStatusDistribution = await Appointment.findAll({
      attributes: ["status", [fn("count", "*"), "count"]],
      where: {
        staff_id: staffId,
        date: {
          [Op.between]: [startDate, today],
        },
      },
      group: ["status"],
    });

    // Process appointments to ensure end_time is populated
    const processAppointments = (appointments) => {
      return appointments.map((appointment) => {
        const appointmentObject = appointment.toJSON
          ? appointment.toJSON()
          : appointment;

        // Calculate end_time if not present
        if (
          !appointmentObject.end_time &&
          appointmentObject.appointmentServices
        ) {
          const totalDuration = appointmentObject.appointmentServices.reduce(
            (sum, service) => {
              return sum + (service.duration || 0);
            },
            0
          );

          // Parse time and add duration
          const [hours, minutes] = appointmentObject.time
            .split(":")
            .map(Number);
          const totalMinutes = hours * 60 + minutes + totalDuration;

          // Format back to time string
          const endHours = Math.floor(totalMinutes / 60) % 24;
          const endMinutes = totalMinutes % 60;

          appointmentObject.end_time = `${endHours
            .toString()
            .padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}:00`;
        }

        return appointmentObject;
      });
    };

    // Return staff dashboard data
    return res.status(200).json({
      success: true,
      data: {
        // Staff information
        staffInfo: {
          id: staffDetails.id,
          name: staffDetails.user.name,
          position: staffDetails.position || "Barber",
          commissionPercentage: staffDetails.commission_percentage || 0,
          isAvailable: staffDetails.is_available,
        },

        // Time series data
        appointmentStats,
        revenueStats,

        // Performance summary
        performanceSummary: {
          ...performanceSummary,
          commissionPercentage,
          totalCommission: performanceSummary.totalRevenue
            ? (performanceSummary.totalRevenue * commissionPercentage) / 100
            : 0,
        },

        // Service breakdown
        serviceBreakdown,

        // Upcoming appointments
        upcomingAppointments: processAppointments(upcomingAppointments),

        // Today's appointments
        todayAppointments: processAppointments(todayAppointments),

        // Customer data
        returnCustomers,

        // Reviews
        staffReviews,

        // Commission data
        commissionData: calculatedCommission,

        // Status distributions
        appointmentStatusDistribution,
      },
    });
  } catch (error) {
    console.error("Error getting staff dashboard data:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving staff dashboard data",
      error: error.message,
    });
  }
};

/**
 * Get billing dashboard metrics for today
 */
exports.getBillingDashboardData = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD

    // Query total invoices and revenue for today
    const [invoiceCount, revenueResult] = await Promise.all([
      Invoice.count({ where: { date: todayStr } }),
      Invoice.findOne({
        attributes: [[fn("sum", col("total")), "revenue"]],
        where: { date: todayStr, status: "paid" },
        raw: true,
      }),
    ]);

    const revenueToday = parseFloat(revenueResult?.revenue || 0);

    return res.status(200).json({
      success: true,
      totalInvoicesToday: invoiceCount,
      revenueToday,
      newTransactionsToday: invoiceCount, // Assuming each invoice is a POS transaction
    });
  } catch (error) {
    console.error("Billing dashboard error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
