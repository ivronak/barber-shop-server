const { v4: uuidv4 } = require("uuid");
const { generateInvoiceId } = require("../utils/generateId");
const { Op } = require("sequelize");
const {
  Invoice,
  InvoiceService,
  TaxComponent,
  Customer,
  /* Staff removed: staff now lives per line item */
  Service,
  Product,
  ActivityLog,
  InvoiceProduct,
} = require("../models");

/**
 * Get all invoices with pagination and filtering
 */
const getAllInvoices = async (req, res) => {
  try {
    const {
      dateFrom,
      dateTo,
      staffId,
      customerId,
      status,
      search,
      sort = "date_desc",
      page = 1,
      limit = 10,
    } = req.query;

    // Build filter condition
    const where = {};

    if (dateFrom && dateTo) {
      // Use plain date strings to eliminate timezone conversion issues (date column is stored in UTC)
      where.date = {
        [Op.between]: [dateFrom, dateTo],
      };
    } else if (dateFrom) {
      where.date = { [Op.gte]: dateFrom };
    } else if (dateTo) {
      where.date = { [Op.lte]: dateTo };
    }

    // For multi-staff invoices, filter using invoice services / products instead of invoice header
    // We keep header filter for backward-compat invoices where staff_id is still populated
    if (staffId) {
      // We will apply staffId filter in include clauses below (see include array)
      // Do NOT add to invoice header where clause so we still return invoices whose header staff_id is null.
    }
    if (customerId) where.customer_id = customerId;
    if (status) where.status = status;

    // Text search over customer_name (staff_name moved to line items)
    if (search) {
      where[Op.or] = [
        { customer_name: { [Op.like]: `%${search}%` } },
        { id: { [Op.like]: `%${search}%` } },
      ];
    }

    // Determine sorting
    const order = [];
    switch (sort) {
      case "date_desc":
        order.push(["date", "DESC"]);
        break;
      case "date_asc":
        order.push(["date", "ASC"]);
        break;
      case "total_desc":
        order.push(["total", "DESC"]);
        break;
      case "total_asc":
        order.push(["total", "ASC"]);
        break;
      case "customer_name_asc":
        order.push(["customer_name", "ASC"]);
        break;
      case "customer_name_desc":
        order.push(["customer_name", "DESC"]);
        break;
      case "created_asc":
        order.push(["created_at", "ASC"]);
        break;
      case "created_desc":
      default:
        order.push(["created_at", "DESC"]);
        break;
    }

    // Calculate pagination
    const offset = (page - 1) * limit;

    // Query invoices
    const invoiceAttributes = [
      "id",
      "appointment_id",
      "customer_id",
      "date",
      "customer_name",
      "subtotal",
      "discount_type",
      "discount_value",
      "discount_amount",
      "tax",
      "tax_amount",
      "total",
      "payment_method",
      "status",
      "notes",
      "created_at",
      "updated_at",
    ];
    const { count, rows } = await Invoice.findAndCountAll({
      where,
      order,
      limit: parseInt(limit),
      offset: parseInt(offset),
      // Enable Sequelize sub-query so limit/offset apply on Invoice table before joins
      // and count distinct invoice IDs to avoid inflated page numbers when there are
      // multiple service/product lines per invoice.
      distinct: true,
      attributes: invoiceAttributes,
      include: [
        {
          model: InvoiceService,
          as: "invoiceServices",
          required: !!staffId, // if filtering by staff, must have matching service line
          where: staffId ? { staff_id: staffId } : undefined,
          include: [{ model: Service, as: "service" }],
        },
        {
          model: InvoiceProduct,
          as: "invoiceProducts",
          required: !!staffId && false, // we can’t have both includes required or we’ll need OR; leave optional unless no service match
          where: staffId ? { staff_id: staffId } : undefined,
          include: [{ model: Product, as: "product" }],
        },
        {
          model: TaxComponent,
          as: "taxComponents",
        },
      ],
    });

    // Return results
    const formattedInvoices = rows.map((inv) => {
      const plain = inv.get({ plain: true });
      // Ensure staff_name on each service / product line
      if (plain.invoiceServices) {
        plain.invoiceServices.forEach((svc) => {
          if (!svc.staff_name && svc.staff && svc.staff.user) {
            svc.staff_name = svc.staff.user.name;
          }
        });
        plain.services = plain.invoiceServices; // backward compat
      }
      if (plain.invoiceProducts) {
        plain.invoiceProducts.forEach((prd) => {
          if (!prd.staff_name && prd.staff && prd.staff.user) {
            prd.staff_name = prd.staff.user.name;
          }
        });
        plain.products = plain.invoiceProducts;
      }
      // Derive total tip from service lines for backward compatibility
      const totalTip = (plain.invoiceServices || []).reduce(
        (s, l) => s + Number(l.tip_amount || 0),
        0
      );
      plain.tip_amount = Math.round((totalTip + Number.EPSILON) * 100) / 100;
      // Derive invoice-level staff_name if missing (e.g., multi-staff invoices)
      if (!plain.staff_name || plain.staff_name === "") {
        const uniqueNames = new Set();
        (plain.invoiceServices || []).forEach((s) => {
          if (s.staff_name) uniqueNames.add(s.staff_name);
        });
        (plain.invoiceProducts || []).forEach((p) => {
          if (p.staff_name) uniqueNames.add(p.staff_name);
        });
        plain.staff_name = Array.from(uniqueNames).join(", ");
      }
      return plain;
    });
    return res.status(200).json({
      success: true,
      invoices: formattedInvoices,
      totalCount: count,
      pages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error("Error getting invoices:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving invoices",
      error: error.message,
    });
  }
};

/**
 * Get invoice by ID
 */
const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findByPk(id, {
      attributes: { exclude: ["staff_id", "staff_name"] },
      include: [
        {
          model: Customer,
          as: "customer",
        },
        // Staff include removed
      ],
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    // Get the invoice services separately
    const invoiceServicesList = await InvoiceService.findAll({
      where: { invoice_id: id },
      include: [{ model: Service, as: "service" }],
    });

    // Get the invoice products separately
    const invoiceProductsList = await InvoiceProduct.findAll({
      where: { invoice_id: id },
      include: [{ model: Product, as: "product" }],
    });

    // Get the tax components separately
    const taxComponentsList = await TaxComponent.findAll({
      where: { invoice_id: id },
    });

    // Construct the response manually
    const invoiceData = invoice.get({ plain: true });

    invoiceData.invoiceServices = invoiceServicesList.map((svc) => {
      const plainSvc = svc.get({ plain: true });
      if (!plainSvc.staff_name && plainSvc.staff && plainSvc.staff.user) {
        plainSvc.staff_name = plainSvc.staff.user.name;
      }
      return plainSvc;
    });

    invoiceData.invoiceProducts = invoiceProductsList.map((prd) => {
      const plainPrd = prd.get({ plain: true });
      if (!plainPrd.staff_name && plainPrd.staff && plainPrd.staff.user) {
        plainPrd.staff_name = plainPrd.staff.user.name;
      }
      return plainPrd;
    });

    // Derive invoice-level staff_name
    if (!invoiceData.staff_name || invoiceData.staff_name === "") {
      const unique = new Set();
      invoiceData.invoiceServices.forEach((s) => {
        if (s.staff_name) unique.add(s.staff_name);
      });
      invoiceData.invoiceProducts.forEach((p) => {
        if (p.staff_name) unique.add(p.staff_name);
      });
      invoiceData.staff_name = Array.from(unique).join(", ");
    }

    // Add the services, products and tax components to the response
    invoiceData.invoiceServices = invoiceServicesList.map((service) =>
      service.get({ plain: true })
    );
    invoiceData.invoiceProducts = invoiceProductsList.map((product) =>
      product.get({ plain: true })
    );
    invoiceData.taxComponents = taxComponentsList.map((component) =>
      component.get({ plain: true })
    );

    // For backward compatibility, duplicate the services array
    invoiceData.services = invoiceData.invoiceServices;
    invoiceData.products = invoiceData.invoiceProducts;

    // Derive header tip for backward compatibility
    invoiceData.tip_amount =
      Math.round(
        ((invoiceData.invoiceServices || []).reduce(
          (s, l) => s + Number(l.tip_amount || 0),
          0
        ) +
          Number.EPSILON) *
          100
      ) / 100;

    return res.status(200).json({
      success: true,
      invoice: invoiceData,
    });
  } catch (error) {
    console.error("Error getting invoice:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving invoice",
      error: error.message,
    });
  }
};

/**
 * Create a new invoice
 */
const createInvoice = async (req, res) => {
  try {
    const {
      appointment_id,
      customer_id,
      date,
      customer_name,
      staff_id,
      staff_name,
      subtotal,
      discount_type,
      discount_value,
      discount_amount,
      tip_amount,
      tax,
      tax_amount,
      total,
      payment_method,
      status,
      notes,
      services,
      invoiceServices,
      products,
      invoiceProducts,
      tax_components,
      // New fields for customer creation
      is_new_customer,
      customer_details,
    } = req.body;

    // Debug services data

    // Handle customer creation if needed
    let finalCustomerId = customer_id;
    let finalCustomerName = customer_name;

    if (is_new_customer && customer_details) {
      console.log(
        "Creating new customer with details:",
        JSON.stringify(customer_details, null, 2)
      );

      try {
        // Check if customer with same phone already exists
        if (customer_details.phone) {
          const existingCustomer = await Customer.findOne({
            where: { phone: customer_details.phone },
          });

          if (existingCustomer) {
            console.log(
              "Customer with this phone already exists, using existing customer"
            );
            finalCustomerId = existingCustomer.id;
            finalCustomerName = existingCustomer.name;
          } else {
            // Create new customer
            const newCustomer = await Customer.create({
              id: uuidv4(),
              name: customer_details.name,
              email: customer_details.email || null,
              phone: customer_details.phone,
              visit_count: 0,
              total_spent: 0.0,
              notes: "",
            });

            console.log("New customer created:", newCustomer.id);
            finalCustomerId = newCustomer.id;
            finalCustomerName = newCustomer.name;

            // Log activity
            await ActivityLog.create({
              id: uuidv4(),
              user_id: req.user.id,
              user_name: req.user.name,
              user_role: req.user.role,
              action: "CUSTOMER_CREATED",
              details: `Customer ${newCustomer.name} created during invoice creation`,
            });
          }
        }
      } catch (error) {
        console.error("Error creating customer:", error);
        // Continue with the original customer_id as fallback
        console.log("Using fallback customer_id due to error");
      }
    }

    // Validate required fields
    // Invoice-level staff_id is now optional. Subtotal/total will be computed server-side.
    if (!finalCustomerId || !date || !payment_method || !status) {
      return res.status(400).json({
        success: false,
        message: "Missing required invoice fields",
      });
    }

    // Build services and products arrays from whichever property was provided (prefer non-empty)
    const servicesList =
      Array.isArray(invoiceServices) && invoiceServices.length > 0
        ? invoiceServices
        : Array.isArray(services)
        ? services
        : [];
    const productsList =
      Array.isArray(invoiceProducts) && invoiceProducts.length > 0
        ? invoiceProducts
        : Array.isArray(products)
        ? products
        : [];
    console.log(
      "Selected servicesList:",
      JSON.stringify(servicesList, null, 2)
    );
    console.log(
      "Selected productsList:",
      JSON.stringify(productsList, null, 2)
    );

    // -------------------------------------------------------------
    // Validate product stock availability prior to invoice creation
    // -------------------------------------------------------------
    try {
      for (const item of productsList) {
        const prodRecord = await Product.findByPk(item.product_id);
        if (!prodRecord) {
          return res.status(400).json({
            success: false,
            message: `Product not found: ${item.product_id}`,
          });
        }
        const qtyRequested = Number(item.quantity || 1);
        if (prodRecord.stock < qtyRequested) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${prodRecord.name}. Available: ${prodRecord.stock}, requested: ${qtyRequested}`,
          });
        }
      }
    } catch (validationErr) {
      console.error("Stock validation error:", validationErr);
      return res.status(500).json({
        success: false,
        message: "Error validating product stock",
        error: validationErr.message,
      });
    }

    if (
      (!servicesList || servicesList.length === 0) &&
      (!productsList || productsList.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invoice must include at least one service or product",
      });
    }

    // Canonical monetary calculation (round to 2 decimals at each step)
    const round2 = (n) =>
      Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

    // Helper: compute a single line's total with fallbacks
    const computeLineTotal = (item) => {
      const qty = Number(item?.quantity ?? 1);
      const price = Number(item?.price ?? 0);
      const providedTotal = Number(item?.total);
      const lineTotal =
        Number.isFinite(providedTotal) && providedTotal > 0
          ? providedTotal
          : price * qty;
      return round2(lineTotal);
    };

    // Derive subtotal from provided items to ensure consistency
    const computedSubtotal = round2(
      servicesList.reduce((s, it) => s + computeLineTotal(it), 0) +
        productsList.reduce((s, it) => s + computeLineTotal(it), 0)
    );
    // Always use server-computed subtotal to avoid client discrepancies
    const finalSubtotal = computedSubtotal;

    // Discount
    let computedDiscountAmount = 0;
    if (discount_type === "percentage" && discount_value !== undefined) {
      computedDiscountAmount = round2(
        (finalSubtotal * Number(discount_value)) / 100
      );
    } else if (discount_type === "fixed" && discount_value !== undefined) {
      computedDiscountAmount = round2(discount_value);
    } else if (discount_amount !== undefined) {
      computedDiscountAmount = round2(discount_amount);
    }

    // Header-level tip no longer stored; use provided tip_amount only for allocation later
    const tipAmt = 0;
    const finalTaxRate = Number(tax || 0);
    const taxableBase = Math.max(
      0,
      round2(finalSubtotal - computedDiscountAmount)
    );

    // If tax components provided, prefer their sum; else compute from tax rate
    const providedTaxComponents =
      tax_components && Array.isArray(tax_components) ? tax_components : [];
    const providedTaxSum = round2(
      providedTaxComponents.reduce((s, c) => s + Number(c.amount || 0), 0)
    );
    const computedTaxAmount =
      providedTaxComponents.length > 0
        ? providedTaxSum
        : round2((taxableBase * finalTaxRate) / 100);

    const finalTotal = round2(taxableBase + computedTaxAmount);

    // Create invoice with canonical totals
    const invoiceId = generateInvoiceId();
    const invoice = await Invoice.create({
      id: invoiceId,
      appointment_id,
      customer_id: finalCustomerId,
      date,
      customer_name: finalCustomerName,
      // staff_name no longer stored on invoice header
      subtotal: finalSubtotal,
      discount_type,
      discount_value,
      discount_amount: computedDiscountAmount,
      tax: finalTaxRate,
      tax_amount: computedTaxAmount,
      total: finalTotal,
      payment_method,
      status,
      notes,
    });

    // Create invoice services from whichever property was provided
    let createdInvoiceServices = [];
    if (servicesList && servicesList.length > 0) {
      createdInvoiceServices = await Promise.all(
        servicesList.map(async (service) => {
          const prod = await Product.findByPk(service.service_id);
          const rate = prod ? parseFloat(prod.commission) : 0;
          const total = round2(
            Number(
              service?.total ??
                Number(service?.price || 0) * Number(service?.quantity || 1)
            )
          );
          const staffCommission = rate;
          return InvoiceService.create({
            id: uuidv4(),
            invoice_id: invoiceId,
            service_id: service.service_id,
            service_name: service.service_name,
            staff_id: service.staff_id || null,
            staff_name: service.staff_name || null,
            price: service.price,
            quantity: service.quantity,
            total: total,
            commission_rate: staffCommission,
            commission_amount: (total * staffCommission) / 100,
          });
        })
      );
    }

    // Create invoice products if provided
    let createdInvoiceProducts = [];
    if (productsList && productsList.length > 0) {
      createdInvoiceProducts = await Promise.all(
        productsList.map(async (product) => {
          const prod = await Product.findByPk(product.product_id);
          const rate = prod ? parseFloat(prod.commission) : 0;
          const total = round2(
            Number(
              product?.total ??
                Number(product?.price || 0) * Number(product?.quantity || 1)
            )
          );
          // Create the invoice-product line first
          const invoiceProductLine = await InvoiceProduct.create({
            id: uuidv4(),
            invoice_id: invoiceId,
            product_id: product.product_id,
            product_name: product.product_name,
            staff_id: product.staff_id || null,
            staff_name: product.staff_name || null,
            price: product.price,
            quantity: product.quantity,
            total: total,
            commission_rate: rate,
            commission_amount: (total * rate) / 100,
          });

          // ---------------------------------------------------------
          //  Update product inventory (decrement available stock)
          // ---------------------------------------------------------
          if (prod) {
            const currentStock = Number(prod.stock || 0);
            const quantitySold = Number(product.quantity || 1);
            // Ensure stock does not go negative just in case
            const newStock = Math.max(0, currentStock - quantitySold);
            await prod.update({ stock: newStock });
          }

          return invoiceProductLine;
        })
      );
    }

    // Create tax components if provided
    let taxComponents = [];
    if (tax_components && Array.isArray(tax_components)) {
      taxComponents = await Promise.all(
        tax_components.map((component) =>
          TaxComponent.create({
            id: uuidv4(),
            invoice_id: invoiceId,
            name: component.name,
            rate: component.rate,
            amount: component.amount,
          })
        )
      );
    }

    // Log activity
    await ActivityLog.create({
      id: uuidv4(),
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: "INVOICE_CREATED",
      details: `Invoice #${invoiceId} created for customer ${finalCustomerName}`,
    });

    // Update customer total spent and last visit
    const customer = await Customer.findByPk(finalCustomerId);
    if (customer) {
      customer.total_spent =
        parseFloat(customer.total_spent || 0) + parseFloat(total);
      customer.last_visit = date;
      await customer.save();
    }

    // Allocate tip equally among unique staff on service lines, then update invoice total

    const createdServices = await InvoiceService.findAll({
      where: { invoice_id: invoiceId },
    });

    // Service master records निकालो
    const selectedServices = await Promise.all(
      createdServices.map(async (service) => {
        const serviceRecord = await Service.findByPk(service.service_id);
        if (!serviceRecord) {
          throw new Error(`Service not found: ${service.service_id}`);
        }
        return {
          ...service.get({ plain: true }),
          is_tip_eligible: serviceRecord.is_tip_eligible, // add eligibility flag
        };
      })
    );

    const uniqueStaff = Array.from(
      new Set(createdServices.map((s) => s.staff_id).filter(Boolean))
    );

    const totalTipToAllocate = round2(Number(tip_amount || 0));

    if (totalTipToAllocate > 0 && uniqueStaff.length > 0) {
      // ✅ अगर सिर्फ 1 staff है → direct allocate कर दो उसके सारे services पर
      if (uniqueStaff.length === 1) {
        const staffId = uniqueStaff[0];
        const lines = createdServices.filter((s) => s.staff_id === staffId);

        let allocLine = 0;
        const perLine =
          Math.round(
            (totalTipToAllocate / lines.length + Number.EPSILON) * 100
          ) / 100;

        for (let j = 0; j < lines.length; j++) {
          const isLastLine = j === lines.length - 1;
          const amount = isLastLine
            ? Math.round(
                (totalTipToAllocate - allocLine + Number.EPSILON) * 100
              ) / 100
            : perLine;
          lines[j].tip_amount =
            Math.round(
              (Number(lines[j].tip_amount || 0) + amount + Number.EPSILON) * 100
            ) / 100;
          allocLine =
            Math.round((allocLine + amount + Number.EPSILON) * 100) / 100;
          await lines[j].save();
        }
      } else {
        // ✅ अगर multiple staff हैं → सिर्फ eligible services consider करो
        const eligibleLines = selectedServices.filter(
          (s) => s.is_tip_eligible === true
        );

        // staff-wise grouping (सिर्फ eligible lines)
        const staffMap = {};
        for (const line of eligibleLines) {
          if (!staffMap[line.staff_id]) staffMap[line.staff_id] = [];
          staffMap[line.staff_id].push(line);
        }

        const eligibleStaff = Object.keys(staffMap);
        const equalShare =
          Math.round(
            (totalTipToAllocate / eligibleStaff.length + Number.EPSILON) * 100
          ) / 100;

        let allocatedToStaff = 0;
        for (let i = 0; i < eligibleStaff.length; i++) {
          const staffId = eligibleStaff[i];
          const lines = staffMap[staffId];
          if (!lines || lines.length === 0) continue;

          const isLastStaff = i === eligibleStaff.length - 1;
          const staffShare = isLastStaff
            ? Math.round(
                (totalTipToAllocate - allocatedToStaff + Number.EPSILON) * 100
              ) / 100
            : equalShare;
          allocatedToStaff =
            Math.round((allocatedToStaff + staffShare + Number.EPSILON) * 100) /
            100;

          const linesTotal = lines.reduce(
            (s, l) => s + Number(l.total || 0),
            0
          );
          if (linesTotal <= 0) {
            // equal distribution among staff lines
            const perLine =
              Math.round((staffShare / lines.length + Number.EPSILON) * 100) /
              100;
            let allocLine = 0;
            for (let j = 0; j < lines.length; j++) {
              const isLastLine = j === lines.length - 1;
              const amount = isLastLine
                ? Math.round((staffShare - allocLine + Number.EPSILON) * 100) /
                  100
                : perLine;
              await InvoiceService.update(
                {
                  tip_amount:
                    Math.round(
                      (Number(lines[j].tip_amount || 0) +
                        amount +
                        Number.EPSILON) *
                        100
                    ) / 100,
                },
                { where: { id: lines[j].id } }
              );
              allocLine =
                Math.round((allocLine + amount + Number.EPSILON) * 100) / 100;
            }
          } else {
            // proportional distribution
            let allocLine = 0;
            for (let j = 0; j < lines.length; j++) {
              const isLastLine = j === lines.length - 1;
              const portion = isLastLine
                ? Math.round((staffShare - allocLine + Number.EPSILON) * 100) /
                  100
                : Math.round(
                    (staffShare * (Number(lines[j].total || 0) / linesTotal) +
                      Number.EPSILON) *
                      100
                  ) / 100;

              await InvoiceService.update(
                {
                  tip_amount:
                    Math.round(
                      (Number(lines[j].tip_amount || 0) +
                        portion +
                        Number.EPSILON) *
                        100
                    ) / 100,
                },
                { where: { id: lines[j].id } }
              );

              allocLine =
                Math.round((allocLine + portion + Number.EPSILON) * 100) / 100;
            }
          }
        }
      }

      // invoice total update with tip
      const updatedServices = await InvoiceService.findAll({
        where: { invoice_id: invoiceId },
      });
      const newTipTotal = updatedServices.reduce(
        (s, l) => s + Number(l.tip_amount || 0),
        0
      );
      const newTotal =
        Math.round(
          (taxableBase + computedTaxAmount + newTipTotal + Number.EPSILON) * 100
        ) / 100;

      await Invoice.update({ total: newTotal }, { where: { id: invoiceId } });
    }

    // Return the created invoice with manually attached services and tax components
    const createdInvoice = await Invoice.findByPk(invoiceId, {
      attributes: { exclude: ["staff_id", "staff_name"] },
    });

    // Get the invoice services separately
    const invoiceServicesList = await InvoiceService.findAll({
      where: { invoice_id: invoiceId },
    });

    // Get the tax components separately
    const taxComponentsList = await TaxComponent.findAll({
      where: { invoice_id: invoiceId },
    });

    // Construct the response manually
    const invoiceData = createdInvoice.get({ plain: true });

    // Add the services, products and tax components to the response
    invoiceData.invoiceServices = invoiceServicesList.map((service) =>
      service.get({ plain: true })
    );
    invoiceData.invoiceProducts = createdInvoiceProducts.map((p) =>
      p.get({ plain: true })
    );
    invoiceData.taxComponents = taxComponentsList.map((component) =>
      component.get({ plain: true })
    );

    // For backward compatibility, duplicate the services array
    invoiceData.services = invoiceData.invoiceServices;
    invoiceData.products = invoiceData.invoiceProducts;
    // Derive header tip for backward compatibility
    invoiceData.tip_amount =
      Math.round(
        ((invoiceData.invoiceServices || []).reduce(
          (s, l) => s + Number(l.tip_amount || 0),
          0
        ) +
          Number.EPSILON) *
          100
      ) / 100;

    return res.status(201).json({
      success: true,
      invoice: invoiceData,
    });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating invoice",
      error: error.message,
    });
  }
};

/**
 * Update an invoice
 */
const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      payment_method,
      tip_amount,
      discount_type,
      discount_value,
      discount_amount,
      notes,
    } = req.body;

    // Find invoice
    const invoice = await Invoice.findByPk(id, {
      attributes: { exclude: ["staff_id", "staff_name"] },
    });
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    // Only allow updating specific fields
    if (status) invoice.status = status;
    if (payment_method) invoice.payment_method = payment_method;

    // Handle discount updates
    let newDiscountAmount = invoice.discount_amount || 0;
    if (discount_type !== undefined) invoice.discount_type = discount_type;
    if (discount_value !== undefined) invoice.discount_value = discount_value;
    if (discount_amount !== undefined) {
      invoice.discount_amount = discount_amount;
      newDiscountAmount = parseFloat(discount_amount);
    } else if (discount_type && discount_value !== undefined) {
      // Recalculate discount amount if type and value changed but amount wasn't provided
      if (discount_type === "percentage") {
        newDiscountAmount =
          (parseFloat(invoice.subtotal) * parseFloat(discount_value)) / 100;
      } else if (discount_type === "fixed") {
        newDiscountAmount = parseFloat(discount_value);
      }
      invoice.discount_amount = newDiscountAmount;
    }

    // Tip updates handled after lines and tax computed below

    if (notes) invoice.notes = notes;

    await invoice.save();

    // Log activity
    await ActivityLog.create({
      id: uuidv4(),
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: "INVOICE_UPDATED",
      details: `Invoice #${id} updated`,
    });

    // Handle updating invoice services if provided
    if (req.body.invoiceServices && Array.isArray(req.body.invoiceServices)) {
      // Remove existing services and recreate from payload
      await InvoiceService.destroy({ where: { invoice_id: id } });
      for (const svc of req.body.invoiceServices) {
        await InvoiceService.create({
          id: uuidv4(),
          invoice_id: id,
          service_id: svc.service_id,
          staff_id: svc.staff_id || null,
          staff_name: svc.staff_name || null,
          service_name: svc.service_name,
          price: svc.price,
          quantity: svc.quantity,
          total: svc.total,
          commission_rate: svc.commission_rate || 0,
          commission_amount: svc.commission_amount || 0,
        });
      }
    }

    if (req.body.invoiceProducts && Array.isArray(req.body.invoiceProducts)) {
      // Fetch current invoice products to restore their stock first
      const previousLines = await InvoiceProduct.findAll({
        where: { invoice_id: id },
      });
      for (const line of previousLines) {
        const prod = await Product.findByPk(line.product_id);
        if (prod) {
          const restored = Number(prod.stock || 0) + Number(line.quantity || 0);
          await prod.update({ stock: restored });
        }
      }

      // Validate stock for requested updates
      for (const newLine of req.body.invoiceProducts) {
        const prodRec = await Product.findByPk(newLine.product_id);
        if (!prodRec) {
          return res.status(400).json({
            success: false,
            message: `Product not found: ${newLine.product_id}`,
          });
        }
        const qtyNeed = Number(newLine.quantity || 1);
        if (prodRec.stock < qtyNeed) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${prodRec.name}. Available: ${prodRec.stock}, requested: ${qtyNeed}`,
          });
        }
      }

      // Replace lines
      await InvoiceProduct.destroy({ where: { invoice_id: id } });
      for (const prod of req.body.invoiceProducts) {
        await InvoiceProduct.create({
          id: uuidv4(),
          invoice_id: id,
          product_id: prod.product_id,
          staff_id: prod.staff_id || null,
          staff_name: prod.staff_name || null,
          product_name: prod.product_name,
          price: prod.price,
          quantity: prod.quantity,
          total: prod.total,
          commission_rate: prod.commission_rate || 0,
          commission_amount: prod.commission_amount || 0,
        });

        // Decrement stock after successful creation
        const prodRec = await Product.findByPk(prod.product_id);
        if (prodRec) {
          const newStockVal = Math.max(
            0,
            Number(prodRec.stock || 0) - Number(prod.quantity || 1)
          );
          await prodRec.update({ stock: newStockVal });
        }
      }
    }

    // Update tax components if provided (replace all)
    if (req.body.tax_components && Array.isArray(req.body.tax_components)) {
      await TaxComponent.destroy({ where: { invoice_id: id } });
      for (const comp of req.body.tax_components) {
        await TaxComponent.create({
          id: uuidv4(),
          invoice_id: id,
          name: comp.name,
          rate: comp.rate,
          amount: comp.amount,
        });
      }
    }

    // -------------------------------------------------------------
    // After possible destruction/creation above, recalculate totals
    // -------------------------------------------------------------

    const [latestServices, latestProducts] = await Promise.all([
      InvoiceService.findAll({ where: { invoice_id: id } }),
      InvoiceProduct.findAll({ where: { invoice_id: id } }),
    ]);

    const round2u = (n) =>
      Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
    const computeLineTotalUpd = (item) => {
      const qty = Number(item?.quantity ?? 1);
      const price = Number(item?.price ?? 0);
      const providedTotal = Number(item?.total);
      const lineTotal =
        Number.isFinite(providedTotal) && providedTotal > 0
          ? providedTotal
          : price * qty;
      return round2u(lineTotal);
    };
    const latestSubtotal = round2u(
      [...latestServices, ...latestProducts].reduce(
        (sum, item) => sum + computeLineTotalUpd(item),
        0
      )
    );

    invoice.subtotal = latestSubtotal;

    // Discount amount first (affects taxable base)
    let discAmt = round2u(invoice.discount_amount || 0);
    if (invoice.discount_type && invoice.discount_value !== undefined) {
      if (invoice.discount_type === "percentage") {
        discAmt = round2u(
          (latestSubtotal * parseFloat(invoice.discount_value)) / 100
        );
      } else if (invoice.discount_type === "fixed") {
        discAmt = round2u(parseFloat(invoice.discount_value));
      }
      invoice.discount_amount = discAmt;
    }

    const taxableBaseUpd = Math.max(0, round2u(latestSubtotal - discAmt));

    // Tax amount on discounted subtotal
    let calcTaxAmount = round2u(invoice.tax_amount || 0);
    if (
      req.body.tax_components &&
      Array.isArray(req.body.tax_components) &&
      req.body.tax_components.length > 0
    ) {
      // Use provided components (already amounts)
      calcTaxAmount = round2u(
        req.body.tax_components.reduce(
          (sum, c) => sum + parseFloat(c.amount || 0),
          0
        )
      );
      invoice.tax_amount = calcTaxAmount;
    } else {
      // No components provided in request; prefer existing invoice components if present
      const existingComponents = await TaxComponent.findAll({
        where: { invoice_id: id },
      });
      if (existingComponents && existingComponents.length > 0) {
        // Recompute each component amount based on its rate and update rows for consistency
        let sum = 0;
        for (const comp of existingComponents) {
          const newAmount = round2u(
            (taxableBaseUpd * parseFloat(comp.rate || 0)) / 100
          );
          sum += newAmount;
          // Persist updated amount so components reflect recalculated values
          comp.amount = newAmount;
          await comp.save();
        }
        calcTaxAmount = round2u(sum);
        invoice.tax_amount = calcTaxAmount;
      } else if (invoice.tax) {
        // Fallback to overall invoice tax rate
        calcTaxAmount = round2u(
          (taxableBaseUpd * parseFloat(invoice.tax)) / 100
        );
        invoice.tax_amount = calcTaxAmount;
      }
    }

    // Allocate tip equally among unique staff on services lines
    const uniqueStaff = Array.from(
      new Set(latestServices.map((s) => s.staff_id).filter(Boolean))
    );
    const headerTipFromBody =
      tip_amount !== undefined ? Number(tip_amount) : undefined;
    let totalTipToAllocate = 0;
    if (headerTipFromBody !== undefined) {
      totalTipToAllocate = round2u(headerTipFromBody);
      // Reset existing tips if provided
      for (const svc of latestServices) {
        svc.tip_amount = 0;
        await svc.save();
      }
    } else {
      totalTipToAllocate = round2u(
        latestServices.reduce((sum, s) => sum + Number(s.tip_amount || 0), 0)
      );
    }

    if (totalTipToAllocate > 0 && uniqueStaff.length > 0) {
      const equalShare = round2u(totalTipToAllocate / uniqueStaff.length);
      let allocatedToStaff = 0;
      for (let i = 0; i < uniqueStaff.length; i++) {
        const staffId = uniqueStaff[i];
        const lines = latestServices.filter((s) => s.staff_id === staffId);
        if (lines.length === 0) continue;
        const isLastStaff = i === uniqueStaff.length - 1;
        const staffShare = isLastStaff
          ? round2u(totalTipToAllocate - allocatedToStaff)
          : equalShare;
        allocatedToStaff = round2u(allocatedToStaff + staffShare);
        const linesTotal = lines.reduce((s, l) => s + Number(l.total || 0), 0);
        if (linesTotal <= 0) {
          const perLine = round2u(staffShare / lines.length);
          let allocatedLine = 0;
          for (let j = 0; j < lines.length; j++) {
            const isLastLine = j === lines.length - 1;
            const amount = isLastLine
              ? round2u(staffShare - allocatedLine)
              : perLine;
            lines[j].tip_amount = round2u(
              Number(lines[j].tip_amount || 0) + amount
            );
            allocatedLine = round2u(allocatedLine + amount);
            await lines[j].save();
          }
        } else {
          let allocatedLine = 0;
          for (let j = 0; j < lines.length; j++) {
            const isLastLine = j === lines.length - 1;
            const portion = isLastLine
              ? round2u(staffShare - allocatedLine)
              : round2u(
                  staffShare * (Number(lines[j].total || 0) / linesTotal)
                );
            lines[j].tip_amount = round2u(
              Number(lines[j].tip_amount || 0) + portion
            );
            allocatedLine = round2u(allocatedLine + portion);
            await lines[j].save();
          }
        }
      }
    }

    const totalTipNow = round2u(
      latestServices.reduce((sum, s) => sum + Number(s.tip_amount || 0), 0)
    );
    invoice.total = round2u(taxableBaseUpd + calcTaxAmount + totalTipNow);

    await invoice.save();

    // Re-fetch invoice with related data
    const updatedInvoice = await Invoice.findByPk(id, {
      attributes: { exclude: ["staff_id", "staff_name"] },
      include: [
        { model: InvoiceService, as: "invoiceServices" },
        { model: InvoiceProduct, as: "invoiceProducts" },
        { model: TaxComponent, as: "taxComponents" },
      ],
    });

    const updatedInvoiceData = updatedInvoice.get({ plain: true });

    // Duplicate arrays for backward compatibility
    updatedInvoiceData.services = updatedInvoiceData.invoiceServices;
    updatedInvoiceData.products = updatedInvoiceData.invoiceProducts;

    return res.status(200).json({
      success: true,
      invoice: updatedInvoiceData,
    });
  } catch (error) {
    console.error("Error updating invoice:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating invoice",
      error: error.message,
    });
  }
};

/**
 * Send invoice by email
 */
const sendInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    // Find invoice
    const invoice = await Invoice.findByPk(id, {
      attributes: { exclude: ["staff_id", "staff_name"] },
      include: [
        {
          model: Customer,
          as: "customer",
        },
      ],
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    // Get the invoice services separately
    const invoiceServicesList = await InvoiceService.findAll({
      where: { invoice_id: id },
    });

    // Construct the response manually
    const invoiceData = invoice.get({ plain: true });

    // Add the services to the response
    invoiceData.invoiceServices = invoiceServicesList.map((service) =>
      service.get({ plain: true })
    );

    // For backward compatibility, duplicate the services array
    invoiceData.services = invoiceData.invoiceServices;

    if (!invoice.customer || !invoice.customer.email) {
      return res.status(400).json({
        success: false,
        message: "Customer email not available",
      });
    }

    // Here you would integrate with an email service like Nodemailer
    // This is just a placeholder for the actual email sending logic
    console.log(`Sending invoice #${id} to ${invoice.customer.email}`);

    // Log activity
    await ActivityLog.create({
      id: uuidv4(),
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: "INVOICE_SENT",
      details: `Invoice #${id} sent to customer ${invoice.customer_name}`,
    });

    return res.status(200).json({
      success: true,
      message: "Invoice sent successfully",
    });
  } catch (error) {
    console.error("Error sending invoice:", error);
    return res.status(500).json({
      success: false,
      message: "Error sending invoice",
      error: error.message,
    });
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  sendInvoice,
};
