const {
  Appointment,
  AppointmentService,
  Customer,
  Staff,
  Service,
  WorkingHour,
  ShopClosure,
  BusinessHour,
  BusinessSetting,
  ActivityLog,
  Break,
  User,
  Invoice,
  InvoiceService,
  TaxComponent,
  GSTRate,
} = require("../models");
const { Op } = require("sequelize");
const { sequelize } = require("../models");
const {
  checkAvailability,
  generateTimeSlots,
  convertTimeToMinutes,
  convertMinutesToTime,
  getConsistentDayOfWeek,
} = require("../utils/appointment.utils");
const { format } = require("date-fns");
const dayOfWeekUtils = require("../utils/dayOfWeekUtils");
const uuidv4 = require("uuid").v4;
const { generateInvoiceId } = require("../utils/generateId");
const { calculateAvailableSlots } = require("../utils/appointment.utils");

/**
 * Get all appointments with optional filtering and pagination
 */
exports.getAllAppointments = async (req, res) => {
  try {
    const {
      date,
      staffId,
      customerId,
      status,
      sort,
      page = 1,
      limit = 10,
    } = req.query;

    // Prepare query options
    const queryOptions = {
      where: {},
      order: [],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      include: [
        { association: "customer" },
        { association: "staff", include: ["user", { association: "breaks" }] },
        { association: "appointmentServices", include: ["service"] },
      ],
    };

    // Add filters if provided
    if (date) queryOptions.where.date = date;
    if (staffId) queryOptions.where.staff_id = staffId;
    if (customerId) queryOptions.where.customer_id = customerId;
    if (status) queryOptions.where.status = status;

    // Add sorting if provided
    if (sort) {
      const [field, direction] = sort.split("_");
      queryOptions.order = [[field, direction === "desc" ? "DESC" : "ASC"]];
    } else {
      queryOptions.order = [
        ["date", "ASC"],
        ["time", "ASC"],
      ];
    }

    // Get appointments with count
    const { count, rows: appointments } = await Appointment.findAndCountAll(
      queryOptions
    );

    return res.status(200).json({
      success: true,
      appointments,
      totalCount: count,
      pages: Math.ceil(count / parseInt(limit)),
    });
  } catch (error) {
    console.error("Get appointments error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get appointment by ID
 */
exports.getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findByPk(id, {
      include: [
        { association: "customer" },
        { association: "staff", include: ["user"] },
        { association: "appointmentServices", include: ["service"] },
      ],
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    return res.status(200).json({
      success: true,
      appointment,
    });
  } catch (error) {
    console.error("Get appointment error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Create new appointment
 */
exports.createAppointment = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { customer_id, staff_id, date, time, services, notes } = req.body;

    // Validate required fields
    if (
      !customer_id ||
      !staff_id ||
      !date ||
      !time ||
      !services ||
      !services.length
    ) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Customer, staff, date, time, and services are required",
      });
    }

    // Find customer and staff
    const [customer, staff] = await Promise.all([
      Customer.findByPk(customer_id),
      Staff.findByPk(staff_id, { include: ["user"] }),
    ]);

    if (!customer || !staff) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: !customer ? "Customer not found" : "Staff not found",
      });
    }

    // Calculate total duration and amount
    let totalDuration = 0;
    let totalAmount = 0;
    const serviceDetails = [];

    for (const serviceId of services) {
      const service = await Service.findByPk(serviceId);
      if (!service) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Service with ID ${serviceId} not found`,
        });
      }

      totalDuration += service.duration;
      totalAmount += parseFloat(service.price);
      serviceDetails.push(service);
    }

    // Calculate end time
    const [hours, minutes] = time.split(":").map(Number);
    const startTime = new Date();
    startTime.setHours(hours, minutes, 0, 0);

    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + totalDuration);

    const endTimeString = `${endTime
      .getHours()
      .toString()
      .padStart(2, "0")}:${endTime
      .getMinutes()
      .toString()
      .padStart(2, "0")}:00`;

    // ********** New availability validation **********
    // Ensure the selected slot is still available taking the accumulated service duration into account
    const slotAvailable = await checkAvailability(
      staff_id,
      date,
      time,
      endTimeString
    );
    if (!slotAvailable) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message:
          "The selected time slot is no longer available. Please choose a different slot.",
      });
    }
    // ********** End availability validation **********

    // Create appointment
    const appointment = await Appointment.create(
      {
        customer_id,
        staff_id,
        date,
        time,
        end_time: endTimeString,
        status: "scheduled",
        total_amount: totalAmount,
        notes,
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_email: customer.email,
        staff_name: staff.user.name,
      },
      { transaction }
    );

    // Create appointment services
    const appointmentServices = await Promise.all(
      serviceDetails.map((service) =>
        AppointmentService.create(
          {
            appointment_id: appointment.id,
            service_id: service.id,
            service_name: service.name,
            price: service.price,
            duration: service.duration,
          },
          { transaction }
        )
      )
    );

    // Log activity if user is authenticated
    if (req.user) {
      await ActivityLog.create(
        {
          user_id: req.user.id,
          user_name: req.user.name,
          user_role: req.user.role,
          action: "Create Appointment",
          details: `Created appointment for ${customer.name} with ${staff.user.name} on ${date} at ${time}`,
        },
        { transaction }
      );
    }

    await transaction.commit();

    return res.status(201).json({
      success: true,
      appointment: {
        ...appointment.toJSON(),
        appointmentServices: serviceDetails.map((service) => ({
          service_id: service.id,
          service_name: service.name,
          price: service.price,
          duration: service.duration,
        })),
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Create appointment error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Update appointment
 */
exports.updateAppointment = async (req, res) => {
  let transaction;

  try {
    transaction = await sequelize.transaction();

    const { id } = req.params;
    const {
      status,
      notes,
      services: newServiceIds,
      products: newProductIds,
      tipAmount,
      paymentMethod,
    } = req.body;

   

    // Find appointment
    const appointment = await Appointment.findByPk(id, {
      include: [
        { association: "customer" },
        { association: "staff", include: ["user"] },
        { association: "appointmentServices", include: ["service"] },
      ],
    });

    if (!appointment) {
      await transaction.rollback();
      
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Store the original status before updating
    const originalStatus = appointment.status;
   
    /*********************************************************************
     * 1.  Optional service replacement
     * If the client sends an array of service IDs we replace the existing
     * AppointmentService rows with this exact set.  We leave date / time /
     * end_time untouched – only the services and total_amount change.
     *********************************************************************/
    let updatedServiceDetails = null;
    if (Array.isArray(newServiceIds)) {
      // Remove old rows
      await AppointmentService.destroy({
        where: { appointment_id: appointment.id },
        transaction,
      });

      // Recreate rows and calculate new subtotal
      updatedServiceDetails = [];
      for (const serviceId of newServiceIds) {
        const svc = await Service.findByPk(serviceId);
        if (!svc) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Service ${serviceId} not found`,
          });
        }

        await AppointmentService.create(
          {
            appointment_id: appointment.id,
            service_id: svc.id,
            service_name: svc.name,
            price: svc.price,
            duration: svc.duration,
          },
          { transaction }
        );

        updatedServiceDetails.push(svc);
      }

      // Recalculate total_amount based on new services
      const newTotalAmount = updatedServiceDetails.reduce(
        (t, s) => t + parseFloat(s.price),
        0
      );
      await appointment.update(
        { total_amount: newTotalAmount },
        { transaction }
      );
    }

    // Update status / notes after service replacement so we keep latest info
    await appointment.update(
      {
        status: status || appointment.status,
        notes: notes !== undefined ? notes : appointment.notes,
      },
      { transaction }
    );

   

    // If marking as completed, update customer visit stats and create invoice
    // Compare with originalStatus to ensure we only create invoice when status is newly changed to completed
    if (status === "completed" && originalStatus !== "completed") {
     
      try {
        // Update customer visit stats
        await Customer.update(
          {
            last_visit: appointment.date,
            visit_count: sequelize.literal("visit_count + 1"),
          },
          {
            where: { id: appointment.customer_id },
            transaction,
          }
        );

       

        // Create invoice automatically when appointment is marked as completed
        // First check if an invoice already exists for this appointment
        const existingInvoice = await Invoice.findOne({
          where: { appointment_id: appointment.id },
          attributes: { exclude: ["staff_id", "staff_name"] },
        });

    

        if (!existingInvoice) {
          

          // Get business settings for tax rate
          const businessSettings = await BusinessSetting.findOne();
          const taxRate = businessSettings?.tax_rate || 0;
        

          // Get GST rates if available
          let gstComponents = [];
          const activeGSTRate = await GSTRate.findOne({
            where: { is_active: true },
            include: ["components"],
          });

      

          // Calculate invoice details
          const invoiceServices = [];
          let subtotal = 0;

          const servicesForInvoice =
            updatedServiceDetails || appointment.appointmentServices;
         
          // Build service invoice lines
          for (const svc of servicesForInvoice) {
            // When updatedServiceDetails is present, svc is a Service model (id = service id)
            // Otherwise, svc is an AppointmentService model instance (service_id = service id)
            const serviceId =
              svc && typeof svc === "object" && "service_id" in svc
                ? svc.service_id
                : svc.id;

            // price can be number or string depending on source model
            const priceNum = parseFloat(String(svc.price));
            const price = isNaN(priceNum) ? 0 : priceNum;

            const serviceItem = {
              id: uuidv4(),
              service_id: serviceId,
              service_name: svc.service_name || svc.name,
              price: price.toFixed(2),
              quantity: 1,
              total: price.toFixed(2),
              staff_id: appointment.staff_id,
              staff_name: appointment.staff_name,
            };

            invoiceServices.push(serviceItem);
            subtotal += price;
          }

          /***********************  PRODUCTS  ***************************/
          const productRecords = [];
          if (Array.isArray(newProductIds) && newProductIds.length > 0) {
           
            for (const prodId of newProductIds) {
              const product = await sequelize.models.Product.findByPk(prodId);
              if (!product) continue; // skip invalid id silently

              const rec = {
                id: uuidv4(),
                product_id: product.id,
                product_name: product.name,
                price: parseFloat(product.price).toFixed(2),
                quantity: 1,
                total: parseFloat(product.price).toFixed(2),
                staff_id: appointment.staff_id,
                staff_name: appointment.staff_name,
              };
              productRecords.push(rec);
              subtotal += parseFloat(product.price);
            }
          }

          // Calculate tax amount (after products added)
          const finalTaxRate = activeGSTRate
            ? parseFloat(activeGSTRate.total_rate)
            : parseFloat(taxRate);
          const taxAmount = (subtotal * finalTaxRate) / 100;
          const tipAmtNum = tipAmount ? parseFloat(tipAmount) : 0;
          const total = subtotal + taxAmount + 0; // header tip removed; allocation happens on services

        

          // Prepare tax components if we have GST rate details
          const taxComponents = [];
          if (activeGSTRate && activeGSTRate.components) {
            activeGSTRate.components.forEach((comp) => {
              const componentAmount = (subtotal * parseFloat(comp.rate)) / 100;
              taxComponents.push({
                id: uuidv4(),
                name: comp.name,
                rate: parseFloat(comp.rate).toFixed(2),
                amount: parseFloat(componentAmount).toFixed(2),
              });
            });
            
          } else if (finalTaxRate > 0) {
            // Create a default tax component if no GST components
            taxComponents.push({
              id: uuidv4(),
              name: "Standard Tax",
              rate: parseFloat(finalTaxRate).toFixed(2),
              amount: parseFloat(taxAmount).toFixed(2),
            });
          }

          // Create invoice with a single transaction
          const invoiceId = generateInvoiceId();
          

          // Create the main invoice record
          const invoice = await Invoice.create(
            {
              id: invoiceId,
              appointment_id: appointment.id,
              customer_id: appointment.customer_id,
              date: appointment.date,
              customer_name: appointment.customer_name,
              subtotal: parseFloat(subtotal).toFixed(2),
              discount_type: null,
              discount_value: null,
              discount_amount: 0,
              tax: parseFloat(finalTaxRate).toFixed(2),
              tax_amount: parseFloat(taxAmount).toFixed(2),
              total: parseFloat(total).toFixed(2),
              payment_method: paymentMethod || "cash",
              status: "paid", // Set as paid since appointment is completed
              notes: `Auto-generated from completed appointment #${appointment.id}`,
            },
            { transaction }
          );

         
          // Create all invoice services in a single bulk operation
          if (invoiceServices.length > 0) {
           
            // Prepare all invoice service records with invoice_id
            const serviceRecords = invoiceServices.map((service) => ({
              id: service.id,
              invoice_id: invoiceId,
              service_id: service.service_id,
              service_name: service.service_name,
              price: service.price,
              quantity: service.quantity || 1,
              total: service.total || service.price,
              staff_id: service.staff_id,
              staff_name: service.staff_name,
              tip_amount: 0,
            }));
            // Allocate tip equally among unique staff on service lines
            const uniqueStaff = [
              ...new Set(
                invoiceServices.map((s) => s.staff_id).filter(Boolean)
              ),
            ];
            if (tipAmtNum > 0 && uniqueStaff.length > 0) {
              const equalShare = +(tipAmtNum / uniqueStaff.length).toFixed(2);
              let allocatedStaff = 0;
              for (let i = 0; i < uniqueStaff.length; i++) {
                const isLast = i === uniqueStaff.length - 1;
                const staffShare = isLast
                  ? +(tipAmtNum - allocatedStaff).toFixed(2)
                  : equalShare;
                allocatedStaff = +(allocatedStaff + staffShare).toFixed(2);
                const staffLines = await InvoiceService.findAll({
                  where: { invoice_id: invoiceId, staff_id: uniqueStaff[i] },
                  transaction,
                });
                const linesTotal = staffLines.reduce(
                  (s, l) => s + Number(l.total || 0),
                  0
                );
                if (linesTotal <= 0) {
                  const perLine = +(
                    staffShare / Math.max(1, staffLines.length)
                  ).toFixed(2);
                  let allocLine = 0;
                  for (let j = 0; j < staffLines.length; j++) {
                    const lastLine = j === staffLines.length - 1;
                    const amount = lastLine
                      ? +(staffShare - allocLine).toFixed(2)
                      : perLine;
                    await staffLines[j].update(
                      { tip_amount: amount },
                      { transaction }
                    );
                    allocLine = +(allocLine + amount).toFixed(2);
                  }
                } else {
                  let allocLine = 0;
                  for (let j = 0; j < staffLines.length; j++) {
                    const lastLine = j === staffLines.length - 1;
                    const portion = lastLine
                      ? +(staffShare - allocLine).toFixed(2)
                      : +(
                          staffShare *
                          (Number(staffLines[j].total || 0) / linesTotal)
                        ).toFixed(2);
                    await staffLines[j].update(
                      { tip_amount: portion },
                      { transaction }
                    );
                    allocLine = +(allocLine + portion).toFixed(2);
                  }
                }
              }
              // Update invoice total with allocated tip
              const [sumRow] = await InvoiceService.findAll({
                where: { invoice_id: invoiceId },
                attributes: [
                  [
                    Invoice.sequelize.fn(
                      "sum",
                      Invoice.sequelize.col("tip_amount")
                    ),
                    "tipSum",
                  ],
                ],
                raw: true,
                transaction,
              });
              const tipSum = parseFloat(sumRow?.tipSum || 0);
              await invoice.update(
                {
                  total: parseFloat((subtotal + taxAmount + tipSum).toFixed(2)),
                },
                { transaction }
              );
            }

            // Bulk create all invoice services
            await InvoiceService.bulkCreate(serviceRecords, { transaction });
           
          }

          // Create all tax components in a single bulk operation
          if (taxComponents.length > 0) {
           

            // Prepare all tax component records with invoice_id
            const componentRecords = taxComponents.map((component) => ({
              id: component.id,
              invoice_id: invoiceId,
              name: component.name,
              rate: component.rate,
              amount: component.amount,
            }));

            // Bulk create all tax components
            await TaxComponent.bulkCreate(componentRecords, { transaction });
           
          }

          // Create all invoice products in a single bulk operation
          if (productRecords.length > 0) {
            await sequelize.models.InvoiceProduct.bulkCreate(
              productRecords.map((p) => ({
                ...p,
                invoice_id: invoiceId,
              })),
              { transaction }
            );
           
          }

          // Update customer total_spent in the same transaction
         
          await Customer.update(
            {
              total_spent: sequelize.literal(
                `total_spent + ${parseFloat(total).toFixed(2)}`
              ),
              last_visit: appointment.date,
            },
            {
              where: { id: appointment.customer_id },
              transaction,
            }
          );
         
        }
      } catch (invoiceError) {
        console.error(
          `[INVOICE-DEBUG] Error in invoice generation process:`,
          invoiceError
        );
        throw invoiceError; // Re-throw to trigger the transaction rollback
      }
    } else {
      console.log(
        `[INVOICE-DEBUG] Status condition not met for invoice generation: status=${status}, originalStatus=${originalStatus}`
      );
    }

    // Log activity
    if (req.user) {
      await ActivityLog.create(
        {
          user_id: req.user.id,
          user_name: req.user.name,
          user_role: req.user.role,
          action: "Update Appointment",
          details: `Updated appointment #${id} status to ${
            status || appointment.status
          }`,
        },
        { transaction }
      );
      
    }

    
    await transaction.commit();
    

    // Reload the appointment to get the updated data with all associations
   
    const updatedAppointment = await Appointment.findByPk(id, {
      include: [
        { association: "customer" },
        { association: "staff", include: ["user"] },
        { association: "appointmentServices", include: ["service"] },
        {
          association: "invoice",
          attributes: { exclude: ["staff_id", "staff_name"] },
        }, // Also include the invoice if it was created
      ],
    });

   

    return res.status(200).json({
      success: true,
      appointment: updatedAppointment,
      updated: true,
    });
  } catch (error) {
    try {
      if (transaction) await transaction.rollback();
      console.error("[INVOICE-DEBUG] Update appointment error:", error);
    } catch (rollbackError) {
      console.error(
        "[INVOICE-DEBUG] Transaction rollback error:",
        rollbackError
      );
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Cancel appointment
 */
exports.cancelAppointment = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    // Find appointment
    const appointment = await Appointment.findByPk(id);
    if (!appointment) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Cancel appointment
    await appointment.update(
      {
        status: "cancelled",
      },
      { transaction }
    );

    // Log activity
    if (req.user) {
      await ActivityLog.create(
        {
          user_id: req.user.id,
          user_name: req.user.name,
          user_role: req.user.role,
          action: "Cancel Appointment",
          details: `Cancelled appointment #${id}`,
        },
        { transaction }
      );
    }

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Cancel appointment error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get available time slots for a specific date and staff
 */
exports.getAvailableSlots = async (req, res) => {
  try {
    const { date, staffId, serviceId } = req.query;

    if (!date || !staffId) {
      return res.status(400).json({
        success: false,
        message: "Date and staff ID are required",
      });
    }

    // Get service duration if serviceId is provided
    let serviceDuration = 30; // Default duration
    if (serviceId) {
      const service = await Service.findByPk(serviceId);
      if (service) {
        serviceDuration = service.duration;
      }
    }

    // Get business settings for slot duration
    const businessSettings = await BusinessSetting.findOne();
    const slotDuration = businessSettings?.slot_duration || 30;

    // Get the day of week using the consistent helper function
    const { dayOfWeek, numericDayOfWeek } = getConsistentDayOfWeek(date);

    const businessHours = await BusinessHour.findOne({
      where: { day_of_week: dayOfWeek },
    });

    if (
      !businessHours ||
      !businessHours.open_time ||
      !businessHours.close_time
    ) {
      return res.status(200).json({
        success: true,
        slots: [],
        message: "The shop is closed on this day",
      });
    }

    // Check if shop is closed on the requested date
    const shopClosure = await ShopClosure.findOne({
      where: { date, is_full_day: true },
    });

    if (shopClosure) {
      return res.status(200).json({
        success: true,
        slots: [],
        message: `The shop is closed on this day: ${shopClosure.reason}`,
      });
    }

    // Get partial shop closures for the date
    const partialClosures = await ShopClosure.findAll({
      where: { date, is_full_day: false },
    });
    let staffWorkingHours = [];
    // Get staff working hours for the day
    if (staffId == "any_staff") {
      staffWorkingHours = await WorkingHour.findAll({
        where: {
          day_of_week: dayOfWeek,
          is_break: false,
        },
      });
    } else {
      staffWorkingHours = await WorkingHour.findAll({
        where: {
          staff_id: staffId,
          day_of_week: dayOfWeek,
          is_break: false,
        },
      });
    }

    

    if (!staffWorkingHours.length) {
      return res.status(200).json({
        success: true,
        slots: [],
        message: "The staff is not working on this day",
      });
    }

    // Get staff breaks for the day
    // Get staff-specific breaks from the Break model
    const staffBreaks = await Break.findAll({
      where: {
        staff_id: staffId,
        day_of_week: dayOfWeek,
      },
    });

    // Get existing appointments for the staff on the date
    const existingAppointments = await Appointment.findAll({
      where: {
        staff_id: staffId,
        date,
        status: {
          [Op.notIn]: ["cancelled", "no-show"],
        },
      },
      attributes: ["time", "end_time"],
    });

    // Generate time slots
    const slots = generateTimeSlots(
      businessHours.open_time,
      businessHours.close_time,
      slotDuration,
      serviceDuration,
      staffWorkingHours,
      staffBreaks,
      existingAppointments,
      partialClosures,
      date
    );
    
    return res.status(200).json({
      success: true,
      slots,
    });
  } catch (error) {
    console.error("Get available slots error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Reschedule appointment
 */
exports.rescheduleAppointment = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { date, time } = req.body;

    // Validate required fields
    if (!date || !time) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Date and time are required",
      });
    }

    // Find appointment
    const appointment = await Appointment.findByPk(id, {
      include: [{ association: "appointmentServices" }],
    });

    if (!appointment) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Calculate total duration
    let totalDuration = 0;
    for (const service of appointment.appointmentServices) {
      totalDuration += service.duration;
    }

    // Calculate end time
    const [hours, minutes] = time.split(":").map(Number);
    const startTime = new Date();
    startTime.setHours(hours, minutes, 0, 0);

    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + totalDuration);

    const endTimeString = `${endTime
      .getHours()
      .toString()
      .padStart(2, "0")}:${endTime
      .getMinutes()
      .toString()
      .padStart(2, "0")}:00`;

    // Update appointment
    await appointment.update(
      {
        date,
        time,
        end_time: endTimeString,
      },
      { transaction }
    );

    // Log activity
    if (req.user) {
      await ActivityLog.create(
        {
          user_id: req.user.id,
          user_name: req.user.name,
          user_role: req.user.role,
          action: "Reschedule Appointment",
          details: `Rescheduled appointment #${id} to ${date} at ${time}`,
        },
        { transaction }
      );
    }

    await transaction.commit();

    // Reload the appointment to get the updated data with all associations
    const updatedAppointment = await Appointment.findByPk(id, {
      include: [
        { association: "customer" },
        { association: "staff", include: ["user"] },
        { association: "appointmentServices", include: ["service"] },
      ],
    });

    return res.status(200).json({
      success: true,
      appointment: updatedAppointment,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Reschedule appointment error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get all data needed for admin appointments page in a single request
 */
exports.getAdminAppointments = async (req, res) => {
  try {
    const {
      date,
      startDate,
      endDate,
      staffId,
      customerId,
      status,
      sort,
      page = 1,
      limit = 100,
      searchTerm,
      timeOfDay,
      serviceId,
    } = req.query;

    // Prepare queries for appointments, staff, and services
    const appointmentsQuery = {
      where: {},
      order: [],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      include: [
        { association: "customer" },
        { association: "staff", include: ["user"] },
        { association: "appointmentServices", include: ["service"] },
      ],
    };

    // Add date filters - support both single date and date range
    if (startDate && endDate) {
      // Date range filter
      appointmentsQuery.where.date = {
        [Op.between]: [startDate, endDate],
      };
    } else if (startDate) {
      // Single date filter
      appointmentsQuery.where.date = startDate;
    } else if (date) {
      // Legacy single date filter
      appointmentsQuery.where.date = date;
    }

    // Add staff filter
    if (staffId) appointmentsQuery.where.staff_id = staffId;

    // Add customer filter
    if (customerId) appointmentsQuery.where.customer_id = customerId;

    // Add status filter
    if (status) appointmentsQuery.where.status = status;

    // Add time of day filter
    if (timeOfDay) {
      let timeRange;
      switch (timeOfDay) {
        case "morning":
          timeRange = { start: "06:00:00", end: "12:00:00" };
          break;
        case "afternoon":
          timeRange = { start: "12:00:00", end: "17:00:00" };
          break;
        case "evening":
          timeRange = { start: "17:00:00", end: "23:59:59" };
          break;
        default:
          // No filter applied
          break;
      }

      if (timeRange) {
        appointmentsQuery.where.time = {
          [Op.between]: [timeRange.start, timeRange.end],
        };
      }
    }

    // Add search functionality
    if (searchTerm) {
      appointmentsQuery.where[Op.or] = [
        { customer_name: { [Op.like]: `%${searchTerm}%` } },
        { customer_phone: { [Op.like]: `%${searchTerm}%` } },
        { customer_email: { [Op.like]: `%${searchTerm}%` } },
        { staff_name: { [Op.like]: `%${searchTerm}%` } },
      ];
    }

    // Add service filter
    const serviceIds = Array.isArray(serviceId)
      ? serviceId
      : serviceId
      ? [serviceId]
      : null;

    if (serviceIds && serviceIds.length > 0) {
      appointmentsQuery.include[2] = {
        association: "appointmentServices",
        include: ["service"],
        where: {
          service_id: {
            [Op.in]: serviceIds,
          },
        },
      };
    }

    // Add sorting if provided
    if (sort) {
      const [field, direction] = sort.split("_");
      appointmentsQuery.order = [
        [field, direction === "desc" ? "DESC" : "ASC"],
      ];
    } else {
      appointmentsQuery.order = [
        ["date", "ASC"],
        ["time", "ASC"],
      ];
    }

    // Execute all queries in parallel
    const [appointmentsResult, staffList, servicesList] = await Promise.all([
      Appointment.findAndCountAll(appointmentsQuery),
      Staff.findAll({
        include: ["user"],
        where: { is_available: true },
        order: [["id", "ASC"]],
      }),
      Service.findAll({
        order: [["name", "ASC"]],
      }),
    ]);

    // Format the response data
    const { count, rows: appointments } = appointmentsResult;

    const staff = staffList.map((staffMember) => ({
      id: staffMember.id,
      name: staffMember.user ? staffMember.user.name : "Unknown",
      email: staffMember.user ? staffMember.user.email : "",
      phone: staffMember.phone || "",
      position: staffMember.position || "",
      avatar: staffMember.avatar || null,
    }));

    const services = servicesList.map((service) => ({
      id: service.id,
      name: service.name,
      price: service.price,
      duration: service.duration,
      description: service.description || "",
    }));

    return res.status(200).json({
      success: true,
      appointments,
      staff,
      services,
      totalCount: count,
      pages: Math.ceil(count / parseInt(limit)),
    });
  } catch (error) {
    console.error("Get admin appointments error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get all data needed for staff appointments page in a single request
 */
exports.getStaffAppointments = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      customerId,
      status,
      sort,
      page = 1,
      limit = 100,
      searchTerm,
      timeOfDay,
      serviceId,
    } = req.query;

    
    // First, check if the user exists and has a valid role
    if (!req.user || req.user.role !== "staff") {
      
      return res.status(403).json({
        success: false,
        message: "Access denied. Staff role required.",
      });
    }

    // Find the staff record for this user
    const staffMember = await Staff.findOne({
      where: { user_id: req.user.id },
    });
    console.log(
      "Staff lookup result:",
      staffMember ? `Found staff ID: ${staffMember.id}` : "Not found"
    );

    if (!staffMember) {
      
      return res.status(403).json({
        success: false,
        message: "Access denied. Staff profile not found.",
      });
    }

    const staffId = staffMember.id;

    // Prepare queries for appointments, staff, and services
    const appointmentsQuery = {
      where: { staff_id: staffId }, // Filter by the authenticated staff member
      order: [],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      include: [
        { association: "customer" },
        { association: "staff", include: ["user"] },
        { association: "appointmentServices", include: ["service"] },
      ],
    };

    // Add date filters
    if (startDate && endDate) {
      // Date range filter
      appointmentsQuery.where.date = {
        [Op.between]: [startDate, endDate],
      };
    } else if (startDate) {
      // Single date filter
      appointmentsQuery.where.date = startDate;
    }

    // Add customer filter
    if (customerId) appointmentsQuery.where.customer_id = customerId;

    // Add status filter
    if (status) appointmentsQuery.where.status = status;

    // Add time of day filter
    if (timeOfDay) {
      let timeRange;
      switch (timeOfDay) {
        case "morning":
          timeRange = { start: "06:00:00", end: "12:00:00" };
          break;
        case "afternoon":
          timeRange = { start: "12:00:00", end: "17:00:00" };
          break;
        case "evening":
          timeRange = { start: "17:00:00", end: "23:59:59" };
          break;
        default:
          // No filter applied
          break;
      }

      if (timeRange) {
        appointmentsQuery.where.time = {
          [Op.between]: [timeRange.start, timeRange.end],
        };
      }
    }

    // Add search functionality
    if (searchTerm) {
      appointmentsQuery.where[Op.or] = [
        { customer_name: { [Op.like]: `%${searchTerm}%` } },
        { customer_phone: { [Op.like]: `%${searchTerm}%` } },
        { customer_email: { [Op.like]: `%${searchTerm}%` } },
      ];
    }

    // Add service filter
    const serviceIds = Array.isArray(serviceId)
      ? serviceId
      : serviceId
      ? [serviceId]
      : null;

    if (serviceIds && serviceIds.length > 0) {
      appointmentsQuery.include = [
        { association: "customer" },
        { association: "staff", include: ["user"] },
        {
          association: "appointmentServices",
          include: ["service"],
          where: {
            service_id: {
              [Op.in]: serviceIds,
            },
          },
        },
      ];
    }

    // Add sorting if provided
    if (sort) {
      const [field, direction] = sort.split("_");
      appointmentsQuery.order = [
        [field, direction === "desc" ? "DESC" : "ASC"],
      ];
    } else {
      appointmentsQuery.order = [
        ["date", "ASC"],
        ["time", "ASC"],
      ];
    }

  

    // Execute queries
    const [appointmentsResult, servicesList] = await Promise.all([
      Appointment.findAndCountAll(appointmentsQuery),
      Service.findAll({
        order: [["name", "ASC"]],
      }),
    ]);

    // Format the response data
    const { count, rows: appointments } = appointmentsResult;
    

    const services = servicesList.map((service) => ({
      id: service.id,
      name: service.name,
      price: service.price,
      duration: service.duration,
      description: service.description || "",
    }));

    return res.status(200).json({
      success: true,
      appointments,
      services,
      totalCount: count,
      pages: Math.ceil(count / parseInt(limit)),
    });
  } catch (error) {
    console.error("Get staff appointments error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get appointments for admin calendar view with date range support
 */
exports.getCalendarAppointments = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Validate required fields
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required",
      });
    }

    // Prepare query options
    const queryOptions = {
      where: {
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [
        ["date", "ASC"],
        ["time", "ASC"],
      ],
      include: [
        { association: "customer" },
        { association: "staff", include: ["user",{association:'breaks'}] },
        { association: "appointmentServices", include: ["service"] },
      ],
    };

    // Execute queries in parallel for appointments, staff, and services
    const [appointments, staffList, servicesList] = await Promise.all([
      Appointment.findAll(queryOptions),
      Staff.findAll({
        include: ["user"],
        where: { is_available: true },
        order: [["id", "ASC"]],
      }),
      Service.findAll({
        order: [["name", "ASC"]],
      }),
    ]);

    // const breaklist = await Break.findAll({
    //   // include: ["user"],
    //   // where: { is_available: true },
    //   // order: [["id", "ASC"]],
    // });
    // 
    // Format the staff and services data
    const staff = staffList.map((staffMember) => ({
      id: staffMember.id,
      name: staffMember.user ? staffMember.user.name : "Unknown",
      email: staffMember.user ? staffMember.user.email : "",
      phone: staffMember.phone || "",
      position: staffMember.position || "",
      avatar: staffMember.avatar || null,
    }));

    const services = servicesList.map((service) => ({
      id: service.id,
      name: service.name,
      price: service.price,
      duration: service.duration,
      description: service.description || "",
    }));

    return res.status(200).json({
      success: true,
      appointments,
      staff,
      services,
      dateRange: {
        startDate,
        endDate,
      },
    });
  } catch (error) {
    console.error("Get calendar appointments error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
