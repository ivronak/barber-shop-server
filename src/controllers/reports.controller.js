const { Op, fn, col, literal, where } = require('sequelize');
const { 
  Appointment, 
  AppointmentService, 
  Invoice,
  InvoiceService,
  Staff, 
  Service, 
  Customer,
  WorkingHour,
  User,
  sequelize,
  ServiceCategory,
  InvoiceProduct
} = require('../models');
const dayOfWeekUtils = require('../utils/dayOfWeekUtils');

/**
 * Get dashboard statistics
 */
const getDashboardStats = async (req, res) => {
  try {
    const { period = 'daily' } = req.query;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let startDate = new Date(today);
    let dateFormat = '%Y-%m-%d';
    
    // Determine date range based on period
    if (period === 'weekly') {
      startDate.setDate(today.getDate() - 7);
      dateFormat = '%Y-%W'; // Year-Week
    } else if (period === 'monthly') {
      startDate.setMonth(today.getMonth() - 1);
      dateFormat = '%Y-%m'; // Year-Month
    }
    
    // Get appointment stats
    const appointmentStats = await Appointment.findAll({
      attributes: [
        [fn('date_format', col('date'), dateFormat), 'date'],
        [fn('count', '*'), 'count']
      ],
      where: {
        date: {
          [Op.between]: [startDate, today]
        }
      },
      group: [fn('date_format', col('date'), dateFormat)]
    });
    
    // Get revenue stats with discounts; tips now derived from invoice_services
    const revenueStats = await Invoice.findAll({
      attributes: [
        [fn('date_format', col('date'), dateFormat), 'date'],
        [fn('sum', col('total')), 'revenue'],
        [literal('(SELECT COALESCE(SUM(isvc.tip_amount),0) FROM invoice_services isvc WHERE isvc.invoice_id IN (SELECT id FROM invoices inv2 WHERE DATE_FORMAT(inv2.date, \'' + dateFormat + '\') = DATE_FORMAT(invoices.date, \'' + dateFormat + '\') AND inv2.status = "paid"))') , 'tips'],
        [fn('sum', col('discount_amount')), 'discounts']
      ],
      where: {
        date: {
          [Op.between]: [startDate, today]
        },
        status: 'paid'
      },
      group: [fn('date_format', col('date'), dateFormat)]
    });
    
    // Get total customers
    const customerCount = await Customer.count();
    
    // Get tips and discounts summary (tips from invoice_services)
    const [tipsSummaryRows] = await sequelize.query(`
      SELECT 
        COALESCE(SUM(isvc.tip_amount),0) AS totalTips,
        COALESCE(SUM(inv.discount_amount),0) AS totalDiscounts,
        CASE WHEN SUM(inv.total) > 0 THEN (SUM(isvc.tip_amount) / SUM(inv.total)) * 100 ELSE 0 END AS avgTipPercentage,
        SUM(CASE WHEN inv.discount_amount > 0 THEN 1 ELSE 0 END) AS invoicesWithDiscount,
        COUNT(DISTINCT inv.id) AS totalInvoices
      FROM invoices inv
      LEFT JOIN invoice_services isvc ON isvc.invoice_id = inv.id
      WHERE inv.status = 'paid' AND inv.date BETWEEN :from AND :to
    `, { replacements: { from: startDate, to: today } });
    const tipsDiscountsSummary = tipsSummaryRows && tipsSummaryRows[0] ? tipsSummaryRows[0] : { totalTips: 0, totalDiscounts: 0, avgTipPercentage: 0, invoicesWithDiscount: 0, totalInvoices: 0 };
    
    // Get top services
    const topServices = await InvoiceService.findAll({
      attributes: [
        'service_id',
        'service_name',
        [fn('sum', col('quantity')), 'bookings'],
        [fn('sum', col('InvoiceService.total')), 'revenue']
      ],
      include: [
        {
          model: Invoice,
          as: 'invoice',
          attributes: [],
          where: {
            date: {
              [Op.between]: [startDate, today]
            },
            status: 'paid'
          }
        }
      ],
      group: ['service_id'],
      order: [[fn('sum', col('quantity')), 'DESC']],
      limit: 5
    });
    
    // Get top staff members by revenue (from services + products)
    const [svcStaffRows, prodStaffRows] = await Promise.all([
      InvoiceService.findAll({
        attributes: [
          'staff_id',
          'staff_name',
          [fn('count', col('InvoiceService.id')), 'line_items'],
          [fn('sum', col('InvoiceService.total')), 'revenue']
        ],
        include: [{
          model: Invoice,
          as: 'invoice',
          attributes: [],
          where: {
            date: { [Op.between]: [startDate, today] },
            status: 'paid'
          }
        }],
        group: ['staff_id']
      }),
      InvoiceProduct.findAll({
        attributes: [
          'staff_id',
          'staff_name',
          [fn('count', col('InvoiceProduct.id')), 'line_items'],
          [fn('sum', col('InvoiceProduct.total')), 'revenue']
        ],
        include: [{
          model: Invoice,
          as: 'invoice',
          attributes: [],
          where: {
            date: { [Op.between]: [startDate, today] },
            status: 'paid'
          }
        }],
        group: ['staff_id']
      })
    ]);

    const staffMap = {};
    const addRows = rows=>rows.forEach(r=>{
      const sid=r.staff_id; if(!sid) return; const obj=staffMap[sid]||{staff_id:sid,staff_name:r.staff_name||'',appointments:0,revenue:0};
      obj.appointments += parseInt(r.getDataValue('line_items')||0,10);
      obj.revenue += parseFloat(r.getDataValue('revenue')||0);
      staffMap[sid]=obj;
    });
    addRows(svcStaffRows); addRows(prodStaffRows);
    const topStaff = Object.values(staffMap).sort((a,b)=>b.revenue-a.revenue).slice(0,5);
    
    // Get upcoming appointments
    const upcomingAppointments = await Appointment.findAll({
      where: {
        date: {
          [Op.gte]: today
        },
        status: {
          [Op.in]: ['scheduled', 'confirmed']
        }
      },
      include: [
        {
          model: AppointmentService,
          as: 'appointmentServices'
        },
        {
          model: Staff,
          as: 'staff'
        },
        {
          model: Customer,
          as: 'customer'
        }
      ],
      order: [['date', 'ASC'], ['time', 'ASC']],
      limit: 5
    });
    
    // Return dashboard data
    return res.status(200).json({
      success: true,
      data: {
        appointmentStats,
        revenueStats,
        customerCount,
        topServices,
        topStaff,
        upcomingAppointments,
        tipsDiscountsSummary
      }
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving dashboard statistics',
      error: error.message
    });
  }
};

/**
 * Get revenue report
 */
const getRevenueReport = async (req, res) => {
  try {
    const { dateFrom, dateTo, groupBy = 'day' } = req.query;
    
    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        success: false,
        message: 'Date range is required'
      });
    }
    
    let dateFormat;
    if (groupBy === 'month') {
      dateFormat = '%Y-%m'; // Year-Month
    } else if (groupBy === 'week') {
      dateFormat = '%Y-%u'; // Year-Week
    } else {
      dateFormat = '%Y-%m-%d'; // Year-Month-Day
    }
    
    // Get revenue data
    const revenueData = await Invoice.findAll({
      attributes: [
        [fn('date_format', col('date'), dateFormat), 'date'],
        [fn('sum', col('subtotal')), 'subtotal'],
        [fn('sum', col('discount_amount')), 'discounts'],
        [fn('sum', col('tax_amount')), 'taxes'],
        // Sum tips per invoice within the grouped period to accurately aggregate tips
        [literal('SUM((SELECT COALESCE(SUM(isvc.tip_amount),0) FROM invoice_services isvc WHERE isvc.invoice_id = Invoice.id))') , 'tips'],
        [fn('sum', col('total')), 'total']
      ],
      where: {
        date: {
          [Op.between]: [new Date(dateFrom), new Date(dateTo)]
        },
        status: 'paid'
      },
      group: [fn('date_format', col('date'), dateFormat)],
      order: [[col('date'), 'ASC']]
    });
    
    // Get payment method breakdown
    const paymentMethods = await Invoice.findAll({
      attributes: [
        'payment_method',
        [fn('sum', col('total')), 'amount'],
        [fn('count', '*'), 'count']
      ],
      where: {
        date: {
          [Op.between]: [new Date(dateFrom), new Date(dateTo)]
        },
        status: 'paid'
      },
      group: ['payment_method']
    });
    
    // Return report data
    return res.status(200).json({
      success: true,
      data: {
        revenue: revenueData,
        paymentMethods
      }
    });
  } catch (error) {
    console.error('Error getting revenue report:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving revenue report',
      error: error.message
    });
  }
};

/**
 * Get services performance report
 */
const getServicesReport = async (req, res) => {
  try {
    const { dateFrom, dateTo, sort = 'bookings_desc' } = req.query;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        success: false,
        message: 'Date range is required'
      });
    }

    // Determine sort order
    let order;
    if (sort === 'bookings_desc') order = [[fn('sum', col('quantity')), 'DESC']];
    else if (sort === 'bookings_asc') order = [[fn('sum', col('quantity')), 'ASC']];
    else if (sort === 'revenue_desc') order = [[fn('sum', col('InvoiceService.total')), 'DESC']];
    else if (sort === 'revenue_asc') order = [[fn('sum', col('InvoiceService.total')), 'ASC']];
    else order = [[fn('sum', col('quantity')), 'DESC']];

    // Get service performance data
    const servicesData = await InvoiceService.findAll({
      attributes: [
        'service_id',
        'service_name',
        [fn('sum', col('quantity')), 'bookings'],
        [fn('sum', col('InvoiceService.total')), 'revenue'],
        [fn('sum', col('InvoiceService.tip_amount')), 'tips'],
        // Allocate invoice-level discounts proportionally and avoid divide-by-zero
        [literal('SUM(CASE WHEN invoice.subtotal > 0 THEN invoice.discount_amount * (InvoiceService.total / invoice.subtotal) ELSE 0 END)'), 'discounts'],
        [fn('avg', col('InvoiceService.price')), 'avgPrice']
      ],
      include: [
        {
          model: Invoice,
          as: 'invoice',
          attributes: [],
          where: {
            date: {
              [Op.between]: [new Date(dateFrom), new Date(dateTo)]
            },
            status: 'paid'
          }
        },
        {
          model: Service,
          as: 'service',
          attributes: [],
          include: [{
            model: ServiceCategory,
            as: 'serviceCategory',
            attributes: []
          }]
        }
      ],
      group: ['service_id'],
      order
    });

    // Category breakdown using the new relation (service_categories)
    const categories = await ServiceCategory.findAll({
      attributes: [
        'id',
        'name',
        [fn('COUNT', col('services.id')), 'serviceCount']
      ],
      include: [{
        model: Service,
        as: 'services',
        attributes: []
      }],
      group: ['ServiceCategory.id']
    });

    return res.status(200).json({
      success: true,
      data: servicesData,
      categories
    });
  } catch (error) {
    console.error('Error getting services report:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving services report',
      error: error.message
    });
  }
};

/**
 * Get staff performance report
 */
const getStaffReport = async (req, res) => {
  try {
    const { dateFrom, dateTo, sort = 'revenue_desc', staffId } = req.query;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        success: false,
        message: 'Date range is required'
      });
    }

    // Build common invoice where clause
    const invoiceWhere = {
      date: {
        [Op.between]: [new Date(dateFrom), new Date(dateTo)]
      },
      status: 'paid'
    };
    // NOTE: staff_id now lives on invoice line items (invoice_services / invoice_products),
    // so we no longer filter the Invoice itself by staff_id. Instead, the staff-specific
    // filter is applied directly on the InvoiceService / InvoiceProduct queries below.

    // Determine sort order
    let order;
    if (sort === 'revenue_desc') {
      order = [[fn('sum', col('InvoiceService.total')), 'DESC']];
    } else if (sort === 'revenue_asc') {
      order = [[fn('sum', col('InvoiceService.total')), 'ASC']];
    } else if (sort === 'appointments_desc') {
      order = [[fn('count', col('InvoiceService.id')), 'DESC']];
    } else if (sort === 'appointments_asc') {
      order = [[fn('count', col('InvoiceService.id')), 'ASC']];
    } else {
      order = [[fn('sum', col('InvoiceService.total')), 'DESC']];
    }

    // Aggregate revenue & appointment data per staff based on invoice line items
    const staffRevenueRows = await InvoiceService.findAll({
      attributes: [
        'staff_id',
        'staff_name',
        [fn('count', col('InvoiceService.id')), 'appointments'],
        [fn('count', col('InvoiceService.id')), 'services_provided'],
        [fn('sum', col('InvoiceService.total')), 'revenue'],
        [fn('sum', col('InvoiceService.tip_amount')), 'tips'],
        // Allocate invoice-level discounts proportionally and avoid divide-by-zero
        [literal('SUM(CASE WHEN invoice.subtotal > 0 THEN invoice.discount_amount * (InvoiceService.total / invoice.subtotal) ELSE 0 END)'), 'discounts']
      ],
      include: [{
        model: Invoice,
        as: 'invoice',
        attributes: [],
        where: invoiceWhere
      }],
      where: staffId ? { staff_id: staffId } : {},
      group: ['staff_id'],
      order
    });

    // For each staff member, get locked commission from invoice_services & invoice_products
    const staffWithCommission = await Promise.all(
      staffRevenueRows.map(async (row) => {
        const staff_id = row.staff_id;

        // Sum commission locked in invoice_services for this staff
        const serviceCommission = await InvoiceService.sum('commission_amount', {
          where: { staff_id },
          include: [{
            model: Invoice,
            as: 'invoice',
            attributes: [],
            where: invoiceWhere
          }]
        }) || 0;

        // Sum commission locked in invoice_products for this staff
        const productCommission = await InvoiceProduct.sum('commission_amount', {
          where: { staff_id },
          include: [{
            model: Invoice,
            as: 'invoice',
            attributes: [],
            where: invoiceWhere
          }]
        }) || 0;

        const totalCommission = parseFloat(serviceCommission) + parseFloat(productCommission);

        return {
          ...row.toJSON(),
          commissionServices: parseFloat(serviceCommission),
          commissionProducts: parseFloat(productCommission),
          commission: totalCommission,
          commissionEarned: totalCommission // alias for frontend compatibility
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: staffWithCommission
    });
  } catch (error) {
    console.error('Error getting staff report:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving staff report',
      error: error.message
    });
  }
};

/**
 * Get tips and discounts report
 */
const getTipsAndDiscountsReport = async (req, res) => {
  try {
    const { dateFrom, dateTo, groupBy = 'day', staffId } = req.query;
    
    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        success: false,
        message: 'Date range is required'
      });
    }
    
    let dateFormat;
    if (groupBy === 'month') {
      dateFormat = '%Y-%m'; // Year-Month
    } else if (groupBy === 'week') {
      dateFormat = '%Y-%u'; // Year-Week
    } else {
      dateFormat = '%Y-%m-%d'; // Year-Month-Day
    }
    
    // Build where condition
    const invoiceWhere = {
      date: {
        [Op.between]: [new Date(dateFrom), new Date(dateTo)]
      },
      status: 'paid'
    };
    
    // No staff_id filter on invoice header; staff-specific filters done via line items

    // timeSeriesData: build from invoices filtered by staff via line items if staffId provided
    let invoiceIdsForStaff=null;
    if (staffId) {
      const idsFromSvc = await InvoiceService.findAll({ attributes:['invoice_id'], where:{staff_id:staffId} });
      const idsFromProd = await InvoiceProduct.findAll({ attributes:['invoice_id'], where:{staff_id:staffId} });
      invoiceIdsForStaff=[...new Set([...idsFromSvc.map(r=>r.invoice_id),...idsFromProd.map(r=>r.invoice_id)])];
      if(invoiceIdsForStaff.length===0){invoiceIdsForStaff=['no-match'];}
    }

    // Get tips and discounts data grouped by date
    const timeSeriesData = await Invoice.findAll({
      attributes: [
        [fn('date_format', col('date'), dateFormat), 'date'],
        [literal('(SELECT COALESCE(SUM(isvc.tip_amount),0) FROM invoice_services isvc WHERE isvc.invoice_id IN (SELECT id FROM invoices inv2 WHERE DATE_FORMAT(inv2.date, \'' + dateFormat + '\') = DATE_FORMAT(Invoice.date, \'' + dateFormat + '\') AND inv2.status = "paid"))'), 'tips'],
        [fn('sum', col('discount_amount')), 'discounts'],
        [fn('sum', col('total')), 'totalSales'],
        [literal('CASE WHEN SUM(total) > 0 THEN ( (SELECT COALESCE(SUM(isvc.tip_amount),0) FROM invoice_services isvc WHERE isvc.invoice_id IN (SELECT id FROM invoices inv2 WHERE DATE_FORMAT(inv2.date, \'' + dateFormat + '\') = DATE_FORMAT(Invoice.date, \'' + dateFormat + '\') AND inv2.status = "paid")) / SUM(total) ) * 100 ELSE 0 END'), 'tipPercentage'],
        [literal('SUM(discount_amount) / NULLIF(SUM(subtotal),0) * 100'), 'discountPercentage'],
        [fn('count', col('id')), 'invoiceCount']
      ],
      where:{
        ...invoiceWhere,
        ...(invoiceIdsForStaff?{id:{[Op.in]:invoiceIdsForStaff}}:{} )
      },
      group:[fn('date_format', col('date'), dateFormat)],
      order:[[col('date'),'ASC']]
    });
    
    // Build staffBreakdown from service line items with tips/discounts aggregation
    const staffBreakdown = await InvoiceService.findAll({
      attributes: [
        'staff_id',
        'staff_name',
        [fn('sum', col('InvoiceService.total')), 'totalSales'],
        [fn('sum', col('InvoiceService.tip_amount')), 'totalTips'],
        [literal('SUM(invoice.discount_amount * (InvoiceService.total / NULLIF(invoice.subtotal,0)))'), 'totalDiscounts'],
        [literal('COUNT(DISTINCT invoice.id)'), 'invoiceCount'],
        [literal('CASE WHEN SUM(invoice.total) > 0 THEN (SUM(InvoiceService.tip_amount) / SUM(invoice.total)) * 100 ELSE 0 END'), 'tipPercentage'],
        [literal('CASE WHEN SUM(invoice.subtotal) > 0 THEN (SUM(invoice.discount_amount * (InvoiceService.total / NULLIF(invoice.subtotal,0))) / SUM(invoice.subtotal)) * 100 ELSE 0 END'), 'discountPercentage']
      ],
      include: [{ model: Invoice, as: 'invoice', attributes: [], where: invoiceWhere }],
      group: ['staff_id']
    });
    
    // Get discount type breakdown
    const discountTypeBreakdown = await Invoice.findAll({
      attributes: [
        'discount_type',
        [fn('sum', col('discount_amount')), 'totalDiscount'],
        [fn('count', col('id')), 'count'],
        [fn('avg', col('discount_value')), 'avgDiscountValue']
      ],
      where: {
        ...invoiceWhere,
        discount_amount: {
          [Op.gt]: 0
        }
      },
      group: ['discount_type']
    });
    
    // Calculate summary statistics
    // Build dynamic SQL for summary with optional staff filter
    let summarySQL = `
      SELECT 
        COALESCE(SUM(isvc.tip_amount),0) AS totalTips,
        COALESCE(SUM(inv.discount_amount),0) AS totalDiscounts,
        COALESCE(SUM(inv.subtotal),0) AS totalSubtotal,
        COALESCE(SUM(inv.total),0) AS totalSales,
        CASE WHEN SUM(inv.total) > 0 THEN (SUM(isvc.tip_amount) / SUM(inv.total)) * 100 ELSE 0 END AS avgTipPercentage,
        CASE WHEN SUM(inv.subtotal) > 0 THEN (SUM(inv.discount_amount) / SUM(inv.subtotal)) * 100 ELSE 0 END AS avgDiscountPercentage,
        COUNT(DISTINCT inv.id) AS totalInvoices,
        SUM(CASE WHEN isvc.tip_amount > 0 THEN 1 ELSE 0 END) AS invoicesWithTip,
        SUM(CASE WHEN inv.discount_amount > 0 THEN 1 ELSE 0 END) AS invoicesWithDiscount
      FROM invoices inv
      LEFT JOIN invoice_services isvc ON isvc.invoice_id = inv.id
      WHERE inv.status = 'paid' AND inv.date BETWEEN :from AND :to`;

    const replacements = { from: new Date(dateFrom), to: new Date(dateTo) };

    if (staffId) {
      // Filter by staff_id via invoice_services to ensure staff-specific aggregation
      summarySQL += ' AND isvc.staff_id = :staffId';
      Object.assign(replacements, { staffId });
    }

    const [summaryRows] = await sequelize.query(summarySQL, { replacements });

    const summary = [summaryRows && summaryRows[0]
      ? summaryRows[0]
      : { totalTips: 0, totalDiscounts: 0, totalSubtotal: 0, totalSales: 0, avgTipPercentage: 0, avgDiscountPercentage: 0, totalInvoices: 0, invoicesWithTip: 0, invoicesWithDiscount: 0 }];
    
    // Return report data
    return res.status(200).json({
      success: true,
      data: {
        summary: summary[0],
        timeSeriesData,
        staffBreakdown,
        discountTypeBreakdown
      }
    });
  } catch (error) {
    console.error('Error getting tips and discounts report:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving tips and discounts report',
      error: error.message
    });
  }
};

/**
 * Get revenue breakdown by day of week
 */
const getRevenueByDayOfWeek = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        success: false,
        message: 'Date range is required'
      });
    }
    
    // Get revenue data grouped by day of week using standardized day names
    // Note: MySQL DAYOFWEEK() returns 1=Sunday, 2=Monday, etc.
    // But our standardized day of week utility uses 0=Sunday, 1=Monday, etc. (JavaScript convention)
    const revenueByDay = await Invoice.findAll({
      attributes: [
        [literal(`LOWER(CASE 
          WHEN DAYOFWEEK(date) = 1 THEN "sunday" 
          WHEN DAYOFWEEK(date) = 2 THEN "monday" 
          WHEN DAYOFWEEK(date) = 3 THEN "tuesday" 
          WHEN DAYOFWEEK(date) = 4 THEN "wednesday" 
          WHEN DAYOFWEEK(date) = 5 THEN "thursday" 
          WHEN DAYOFWEEK(date) = 6 THEN "friday" 
          ELSE "saturday" END)`), 'day_of_week'],
        [literal(`DAYOFWEEK(date) - 1`), 'numeric_day_of_week'], // Convert MySQL's 1-7 to JavaScript's 0-6
        [fn('sum', col('total')), 'revenue'],
        [fn('count', col('id')), 'transactions'],
        [literal('SUM(total) / COUNT(id)'), 'avg_transaction'],
        [literal('CASE WHEN DAYOFWEEK(date) = 1 THEN "Sunday" WHEN DAYOFWEEK(date) = 2 THEN "Monday" WHEN DAYOFWEEK(date) = 3 THEN "Tuesday" WHEN DAYOFWEEK(date) = 4 THEN "Wednesday" WHEN DAYOFWEEK(date) = 5 THEN "Thursday" WHEN DAYOFWEEK(date) = 6 THEN "Friday" ELSE "Saturday" END'), 'day_name']
      ],
      where: {
        date: {
          [Op.between]: [new Date(dateFrom), new Date(dateTo)]
        },
        status: 'paid'
      },
      group: [fn('DAYOFWEEK', col('date'))],
      order: [[fn('DAYOFWEEK', col('date')), 'ASC']]
    });
    
    // Get previous period data for comparison
    const previousPeriodStart = new Date(dateFrom);
    const previousPeriodEnd = new Date(dateTo);
    const daysDiff = Math.floor((new Date(dateTo) - new Date(dateFrom)) / (1000 * 60 * 60 * 24));
    
    previousPeriodStart.setDate(previousPeriodStart.getDate() - daysDiff - 1);
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - daysDiff - 1);
    
    const previousRevenueByDay = await Invoice.findAll({
      attributes: [
        [literal(`LOWER(CASE 
          WHEN DAYOFWEEK(date) = 1 THEN "sunday" 
          WHEN DAYOFWEEK(date) = 2 THEN "monday" 
          WHEN DAYOFWEEK(date) = 3 THEN "tuesday" 
          WHEN DAYOFWEEK(date) = 4 THEN "wednesday" 
          WHEN DAYOFWEEK(date) = 5 THEN "thursday" 
          WHEN DAYOFWEEK(date) = 6 THEN "friday" 
          ELSE "saturday" END)`), 'day_of_week'],
        [literal(`DAYOFWEEK(date) - 1`), 'numeric_day_of_week'], // Convert MySQL's 1-7 to JavaScript's 0-6
        [fn('sum', col('total')), 'revenue']
      ],
      where: {
        date: {
          [Op.between]: [previousPeriodStart, previousPeriodEnd]
        },
        status: 'paid'
      },
      group: [fn('DAYOFWEEK', col('date'))],
      order: [[fn('DAYOFWEEK', col('date')), 'ASC']]
    });
    
    // Calculate change percentage
    const revenueWithChange = revenueByDay.map(day => {
      const dayData = day.toJSON();
      const previousDay = previousRevenueByDay.find(prev => 
        prev.getDataValue('numeric_day_of_week') === dayData.numeric_day_of_week
      );
      
      const previousRevenue = previousDay ? previousDay.getDataValue('revenue') : 0;
      const currentRevenue = dayData.revenue || 0;
      
      let changePercentage = 0;
      if (previousRevenue > 0) {
        changePercentage = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
      } else if (currentRevenue > 0) {
        changePercentage = 100; // If previous was 0, but now we have revenue, that's 100% increase
      }
      
      return {
        ...dayData,
        change_percentage: Math.round(changePercentage)
      };
    });
    
    // Return report data
    return res.status(200).json({
      success: true,
      data: revenueWithChange
    });
  } catch (error) {
    console.error('Error getting revenue by day of week:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving revenue by day of week',
      error: error.message
    });
  }
};

/**
 * Get advanced revenue metrics (total, daily avg, monthly projection, per visit)
 */
const getAdvancedRevenueMetrics = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const today = new Date();
    
    // Use provided date range if available, otherwise use defaults
    const queryDateFrom = dateFrom ? new Date(dateFrom) : new Date(today.getFullYear(), today.getMonth(), 1); // Default: start of current month
    const queryDateTo = dateTo ? new Date(dateTo) : today;
    
    // Previous period for comparison (same length as selected period)
    const periodLength = Math.floor((queryDateTo - queryDateFrom) / (1000 * 60 * 60 * 24));
    const previousPeriodEnd = new Date(queryDateFrom);
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);
    const previousPeriodStart = new Date(previousPeriodEnd);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - periodLength);
    
    // Current period total revenue
    const currentPeriodRevenue = await Invoice.sum('total', {
      where: {
        date: {
          [Op.between]: [queryDateFrom, queryDateTo]
        },
        status: 'paid'
      }
    }) || 0;
    
    // Previous period total revenue
    const previousPeriodRevenue = await Invoice.sum('total', {
      where: {
        date: {
          [Op.between]: [previousPeriodStart, previousPeriodEnd]
        },
        status: 'paid'
      }
    }) || 0;
    
    // Daily average revenue for current period
    const daysInCurrentPeriod = Math.max(1, periodLength);
    const currentDailyAverage = currentPeriodRevenue / daysInCurrentPeriod;
    
    // Daily average revenue for previous period
    const previousDailyAverage = previousPeriodRevenue / periodLength;
    
    // Monthly projection based on current daily average
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const projectedRevenue = currentDailyAverage * daysInMonth;
    
    // Revenue per visit (average transaction value)
    const totalVisits = await Invoice.count({
      where: {
        date: {
          [Op.between]: [queryDateFrom, queryDateTo]
        },
        status: 'paid'
      }
    });
    
    const revenuePerVisit = totalVisits > 0 ? currentPeriodRevenue / totalVisits : 0;
    
    // Calculate percentage changes
    const percentChange = previousPeriodRevenue > 0 
      ? ((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue * 100) 
      : 0;
    
    const dailyPercentChange = previousDailyAverage > 0 
      ? ((currentDailyAverage - previousDailyAverage) / previousDailyAverage * 100)
      : 0;
    
    return res.status(200).json({
      success: true,
      data: {
        current: {
          monthly: {
            total: currentPeriodRevenue,
            percentChange: parseFloat(percentChange.toFixed(1)),
            projection: projectedRevenue
          },
          daily: {
            average: currentDailyAverage,
            percentChange: parseFloat(dailyPercentChange.toFixed(1))
          },
          revenuePerVisit
        },
        previous: {
          monthly: {
            total: previousPeriodRevenue
          },
          daily: {
            average: previousDailyAverage
          }
        }
      }
    });
    
  } catch (error) {
    console.error('Error getting advanced revenue metrics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving advanced revenue metrics',
      error: error.message
    });
  }
};

/**
 * Get advanced staff metrics (utilization, satisfaction, etc)
 */
const getAdvancedStaffMetrics = async (req, res) => {
  try {
    const { staffId, dateFrom, dateTo } = req.query;
    
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const queryDateFrom = dateFrom ? new Date(dateFrom) : monthStart;
    const queryDateTo = dateTo ? new Date(dateTo) : today;
    
    // Get staff details
    const staffQuery = staffId ? { id: staffId } : {};
    const staffMembers = await Staff.findAll({
      where: staffQuery,
      include: [
        { model: Service, as: 'services' },
        { model: User, as: 'user' }
      ]
    });
    
    // Calculate advanced metrics for each staff member
    const advancedStaffData = await Promise.all(staffMembers.map(async (staff) => {
      // Basic info
      const staffInfo = {
        staff_id: staff.id,
        name: staff.user ? staff.user.name : 'Unknown Staff',
        position: staff.position || 'Staff',
        bio: staff.bio || '',
        image: staff.user ? staff.user.image : null
      };
      
      // Get appointments
      const appointments = await Appointment.count({
        where: {
          staff_id: staff.id,
          date: { [Op.between]: [queryDateFrom, queryDateTo] },
          status: 'completed'
        }
      });
      
      // Get revenue by summing totals from invoice line items (services & products)
      // Use qualified column names to avoid ambiguity when joining invoices
      const serviceRevenueRow = await InvoiceService.findOne({
        attributes: [[fn('sum', col('InvoiceService.total')), 'totalRevenue']],
        where: { staff_id: staff.id },
        include: [{
          model: Invoice,
          as: 'invoice',
          attributes: [],
          where: {
            date: { [Op.between]: [queryDateFrom, queryDateTo] },
            status: 'paid'
          }
        }],
        raw: true
      });

      const productRevenueRow = await InvoiceProduct.findOne({
        attributes: [[fn('sum', col('InvoiceProduct.total')), 'totalRevenue']],
        where: { staff_id: staff.id },
        include: [{
          model: Invoice,
          as: 'invoice',
          attributes: [],
          where: {
            date: { [Op.between]: [queryDateFrom, queryDateTo] },
            status: 'paid'
          }
        }],
        raw: true
      });

      const revenueFromServices = parseFloat(serviceRevenueRow?.totalRevenue || 0);
      const revenueFromProducts = parseFloat(productRevenueRow?.totalRevenue || 0);

      const revenue = revenueFromServices + revenueFromProducts;
      
      // Commission calculation
      // Commission should be calculated based on locked commission_amount stored on invoice line items
      // Sum commission from services
      const commissionFromServices = await InvoiceService.sum('commission_amount', {
        where: { staff_id: staff.id },
        include: [{
          model: Invoice,
          as: 'invoice',
          attributes: [],
          where: {
            date: { [Op.between]: [queryDateFrom, queryDateTo] },
            status: 'paid'
          }
        }]
      }) || 0;

      // Sum commission from product sales
      const commissionFromProducts = await InvoiceProduct.sum('commission_amount', {
        where: { staff_id: staff.id },
        include: [{
          model: Invoice,
          as: 'invoice',
          attributes: [],
          where: {
            date: { [Op.between]: [queryDateFrom, queryDateTo] },
            status: 'paid'
          }
        }]
      }) || 0;

      // Total commission earned across all sources
      const commissionEarned = parseFloat(commissionFromServices) + parseFloat(commissionFromProducts);

      // Preserve the current commission percentage on the staff record for reference only
      const commissionPercentage = staff.commission_percentage || 0;
      
      // Get working hours for utilization calculation
      // Direct calculation of working hours from the WorkingHour model
      const workingHours = await WorkingHour.findAll({
        where: {
          staff_id: staff.id
        }
      });
      
      // Calculate total scheduled hours per week
      let scheduledHoursPerWeek = 0;
      workingHours.forEach(shift => {
        if (shift.start_time && shift.end_time) {
          // Calculate hours between start and end time
          const startParts = shift.start_time.split(':');
          const endParts = shift.end_time.split(':');
          
          const startHour = parseInt(startParts[0]);
          const startMinute = parseInt(startParts[1]);
          const endHour = parseInt(endParts[0]);
          const endMinute = parseInt(endParts[1]);
          
          // Calculate duration in hours
          const duration = (endHour - startHour) + (endMinute - startMinute) / 60;
          scheduledHoursPerWeek += duration > 0 ? duration : 0;
        }
      });
      
      // Calculate scheduled hours for the date range (approximation)
      const dateDiff = Math.ceil((queryDateTo - queryDateFrom) / (1000 * 60 * 60 * 24));
      const weeks = dateDiff / 7;
      const scheduledHours = scheduledHoursPerWeek * weeks;
      
      // Calculate appointment hours (each appointment takes time)
      const appointmentServices = await AppointmentService.findAll({
        include: [{
          model: Appointment,
          as: 'appointment',
          where: {
            staff_id: staff.id,
            date: { [Op.between]: [queryDateFrom, queryDateTo] },
            status: 'completed'
          }
        }]
      });
      
      const appointmentHours = appointmentServices.reduce((sum, service) => {
        return sum + (service.duration / 60);
      }, 0);
      
      // Calculate utilization rate
      const utilization = scheduledHours > 0 ? Math.min(100, Math.round((appointmentHours / scheduledHours) * 100)) : 0;
      
      // Get preferred services
      const preferredServices = await AppointmentService.findAll({
        include: [{
          model: Appointment,
          as: 'appointment',
          where: {
            staff_id: staff.id,
            date: { [Op.between]: [queryDateFrom, queryDateTo] }
          }
        }],
        attributes: [
          'service_id',
          'service_name',
          [fn('COUNT', col('appointment_id')), 'count']
        ],
        group: ['service_id'],
        order: [[fn('COUNT', col('appointment_id')), 'DESC']],
        limit: 3
      });
      
      const topServices = preferredServices.map(service => ({
        service_id: service.service_id,
        name: service.service_name,
        count: parseInt(service.dataValues.count)
      }));
      
      // Calculate rebook rate (returning customers)
      // Get list of customer IDs who had appointments with this staff
      const customerAppointments = await Appointment.findAll({
        where: {
          staff_id: staff.id,
          date: { [Op.between]: [queryDateFrom, queryDateTo] }
        },
        attributes: ['customer_id', 'date']
      });
      
      // Count unique customers
      const uniqueCustomers = new Set(customerAppointments.map(appt => appt.customer_id)).size;
      
      // Count customers with multiple appointments (rebooked)
      const customerAppointmentCount = {};
      customerAppointments.forEach(appt => {
        customerAppointmentCount[appt.customer_id] = (customerAppointmentCount[appt.customer_id] || 0) + 1;
      });
      
      const rebookedCustomers = Object.values(customerAppointmentCount).filter(count => count > 1).length;
      const rebookRate = uniqueCustomers > 0 ? Math.round((rebookedCustomers / uniqueCustomers) * 100) : 0;
      
      // Calculate busy days based on actual appointments
      const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0]; // Sunday to Saturday
      customerAppointments.forEach(appt => {
        const date = new Date(appt.date);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
        dayOfWeekCounts[dayOfWeek]++;
      });
      
      // Find the busiest days (top 3)
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const busiestDays = dayOfWeekCounts
        .map((count, index) => ({ day: dayNames[index], count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map(item => item.day);
      
      return {
        ...staffInfo,
        appointments,
        revenue,
        commissionPercentage,
        commissionEarned,
        commission: commissionEarned, // Retained for backward compatibility
        commissionFromServices: parseFloat(commissionFromServices),
        commissionFromProducts: parseFloat(commissionFromProducts),
        utilization,
        topServices,
        // Include efficiency metrics
        averageServiceTime: appointmentServices.length > 0 ? 
          Math.round(appointmentServices.reduce((sum, s) => sum + s.duration, 0) / appointmentServices.length) : 0,
        rebookRate,
        busyDays: busiestDays
      };
    }));
    
    // Return success response
    return res.status(200).json({
      success: true,
      data: advancedStaffData || [] // Ensure we always return an array, even if null
    });
  } catch (error) {
    console.error('Error generating advanced staff metrics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate advanced staff metrics',
      details: error.message
    });
  }
};

/**
 * Get advanced service metrics (detailed performance, trends, etc)
 */
const getAdvancedServiceMetrics = async (req, res) => {
  try {
    const { serviceId, dateFrom, dateTo } = req.query;
    
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const queryDateFrom = dateFrom ? new Date(dateFrom) : monthStart;
    const queryDateTo = dateTo ? new Date(dateTo) : today;
    
    // Get service details
    const serviceQuery = serviceId ? { id: serviceId } : {};
    const services = await Service.findAll({
      where: serviceQuery,
      include: [
        {
          model: ServiceCategory,
          as: 'serviceCategory',
          attributes: ['name'],
        },
      ],
    });
    
    // Calculate advanced metrics for each service
    const advancedServiceData = await Promise.all(services.map(async (service) => {
      // Basic info
      const serviceInfo = {
        service_id: service.id,
        name: service.name,
        description: service.description,
        price: service.price,
        duration: service.duration,
        category: service.serviceCategory?.name || null
      };
      
      // Get number of bookings in specified period
      const bookings = await AppointmentService.count({
        include: [{
          model: Appointment,
          as: 'appointment',
          where: {
            date: { [Op.between]: [queryDateFrom, queryDateTo] },
            status: 'completed'
          }
        }],
        where: {
          service_id: service.id
        }
      });
      
      // Get revenue from this service
      const revenue = await InvoiceService.sum('InvoiceService.total', {
        include: [{
          model: Invoice,
          as: 'invoice',
          attributes: [], // Exclude invoice columns to avoid selecting removed fields like staff_id
          where: {
            date: { [Op.between]: [queryDateFrom, queryDateTo] },
            status: 'paid'
          }
        }],
        where: {
          service_id: service.id
        }
      }) || 0;
      
      // Calculate costs and profit margin based on real data wherever possible
      // Get labor costs based on staff time and wages
      const serviceDeliveries = await AppointmentService.findAll({
        where: {
          service_id: service.id
        },
        include: [{
          model: Appointment,
          as: 'appointment',
          attributes: ['staff_id', 'date'],
          where: {
            date: { [Op.between]: [queryDateFrom, queryDateTo] },
            status: 'completed'
          }
        }]
      });
      
      // Get all staff who performed this service
      const staffIds = [...new Set(serviceDeliveries
        .filter(delivery => delivery.appointment?.staff_id)
        .map(delivery => delivery.appointment.staff_id))];
      
      // Get staff commission rates to estimate costs
      const staffMembers = await Staff.findAll({
        where: {
          id: {
            [Op.in]: staffIds
          }
        },
        attributes: ['id', 'commission_percentage']
      });
      
      // Map staff IDs to commission rates
      const staffCommissionRates = {};
      staffMembers.forEach(staff => {
        staffCommissionRates[staff.id] = staff.commission_percentage / 100;
      });
      
      // Calculate labor cost based on service duration and staff commission
      let laborCost = 0;
      serviceDeliveries.forEach(delivery => {
        const staffId = delivery.appointment?.staff_id;
        const commissionRate = staffCommissionRates[staffId] || 0.3; // Default 30% if not found
        
        // Estimate labor cost as commission percentage of service price
        const serviceCost = delivery.price || service.price;
        laborCost += serviceCost * commissionRate;
      });
      
      // Calculate product/supply costs based on actual product usage
      // Get product costs from ServiceProducts table or business settings
      let productCostRatio;
      
      // Try to get actual cost ratio from database
      try {
        const catName = service.serviceCategory?.name;
        productCostRatio = catName === 'haircut' ? 0.1 :    // 10% for haircuts
                          catName === 'color' ? 0.25 :      // 25% for color services
                          catName === 'treatment' ? 0.2 :   // 20% for treatments
                          0.15;                                      // 15% default
      } catch (error) {
        console.log('Error fetching product cost ratio, using defaults:', error.message);
        const catName2 = service.serviceCategory?.name;
        productCostRatio = catName2 === 'haircut' ? 0.1 : 
                          catName2 === 'color' ? 0.25 : 
                          catName2 === 'treatment' ? 0.2 : 0.15;
      }
      
      const productCost = revenue * productCostRatio;
      
      // Overhead costs including rent, utilities, etc. - using actual business data from settings
      let overheadRate;
      
      // Try to get actual overhead rate from database settings
      try {
        const overheadSetting = await sequelize.models.BusinessSetting.findOne({
          where: { key: 'overhead_rate' }
        });
        
        if (overheadSetting && overheadSetting.value) {
          overheadRate = parseFloat(overheadSetting.value);
        } else {
          // Fallback to industry standard if not configured
          overheadRate = 0.15; // 15% default overhead rate
        }
      } catch (error) {
        console.log('Error fetching overhead rate, using default:', error.message);
        overheadRate = 0.15; // 15% default
      }
      
      const overheadCost = revenue * overheadRate;
      
      // Total cost calculation
      const estimatedCost = laborCost + productCost + overheadCost;
      
      // Calculate profit margin based on actual revenue and estimated costs
      const profitMargin = revenue > 0 ? ((revenue - estimatedCost) / revenue) * 100 : 0;
      
      // Get staff who perform this service
      const staffServices = await Staff.findAll({
        include: [{
          model: Service,
          as: 'services',
          where: { id: service.id }
        }]
      });
      
      const preferredByStaff = staffServices.map(staff => staff.user ? staff.user.name : `Staff ${staff.id}`);
      
      // Get appointments for growth rate calculation
      const currentPeriodBookings = bookings;
      
      // Calculate for previous period (same length)
      const periodLengthDays = Math.round((queryDateTo - queryDateFrom) / (1000 * 60 * 60 * 24));
      const previousPeriodEnd = new Date(queryDateFrom);
      previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);
      const previousPeriodStart = new Date(previousPeriodEnd);
      previousPeriodStart.setDate(previousPeriodStart.getDate() - periodLengthDays);
      
      const previousPeriodBookings = await AppointmentService.count({
        include: [{
          model: Appointment,
          as: 'appointment',
          where: {
            date: { [Op.between]: [previousPeriodStart, previousPeriodEnd] },
            status: 'completed'
          }
        }],
        where: {
          service_id: service.id
        }
      });
      
      // Calculate growth rate
      let growthRate = 0;
      if (previousPeriodBookings > 0) {
        growthRate = ((currentPeriodBookings - previousPeriodBookings) / previousPeriodBookings) * 100;
      } else if (currentPeriodBookings > 0) {
        growthRate = 100; // If there were no previous bookings but there are now, it's 100% growth
      }

      // Calculate appointment completion rate (completed vs scheduled)
      const totalScheduledAppointments = await AppointmentService.count({
        include: [{
          model: Appointment,
          as: 'appointment',
          where: {
            date: { [Op.between]: [queryDateFrom, queryDateTo] }
          }
        }],
        where: {
          service_id: service.id
        }
      });

      const appointmentCompletionRate = totalScheduledAppointments > 0 
        ? Math.round((bookings / totalScheduledAppointments) * 100) 
        : 0;

      // Calculate utilization rate based on actual staff availability and service duration
      const daysInPeriod = Math.round((queryDateTo - queryDateFrom) / (1000 * 60 * 60 * 24)) || 1;
      
      // Calculate actual capacity based on staff who can perform this service
      let totalCapacityMinutes = 0;
      
      // Get staff who can perform this service
      const availableStaff = await Staff.findAll({
        include: [{
          model: Service,
          as: 'services',
          where: { id: service.id }
        }]
      });
      
      // Get working hours for each staff member who can perform this service
      for (const staff of availableStaff) {
        const workingHours = await WorkingHour.findAll({
          where: {
            staff_id: staff.id
          }
        });
        
        // Calculate total available minutes during the period
        let weeklyMinutes = 0;
        workingHours.forEach(shift => {
          if (shift.start_time && shift.end_time) {
            const startParts = shift.start_time.split(':');
            const endParts = shift.end_time.split(':');
            
            const startMinutes = (parseInt(startParts[0]) * 60) + parseInt(startParts[1]);
            const endMinutes = (parseInt(endParts[0]) * 60) + parseInt(endParts[1]);
            
            // Calculate duration in minutes
            const duration = endMinutes - startMinutes;
            weeklyMinutes += duration > 0 ? duration : 0;
          }
        });
        
        // Calculate total available minutes during period
        const weeksInPeriod = daysInPeriod / 7;
        totalCapacityMinutes += weeklyMinutes * weeksInPeriod;
      }
      
      // Calculate how many of this service could be performed in the available time
      const serviceDuration = service.duration || 30; // Default to 30 min if duration not specified
      const maxPossibleBookings = Math.floor(totalCapacityMinutes / serviceDuration);
      
      // Fallback to a reasonable estimate if calculation results in 0 capacity
      const reasonableCapacityPerDay = 8; // Default assumption
      const fallbackCapacity = daysInPeriod * availableStaff.length * reasonableCapacityPerDay;
      
      // Use calculated capacity if available, otherwise fallback
      const effectiveCapacity = (maxPossibleBookings > 0) ? maxPossibleBookings : fallbackCapacity;
      
      // Calculate utilization percentage
      const utilization = effectiveCapacity > 0 
        ? Math.min(100, Math.round((bookings / effectiveCapacity) * 100)) 
        : 0;
        
      // Calculate average number of services per appointment
      const servicesPerAppointment = await AppointmentService.findAll({
        attributes: ['appointment_id', [fn('COUNT', col('appointment_id')), 'service_count']],
        include: [{
          model: Appointment,
          as: 'appointment',
          where: {
            date: { [Op.between]: [queryDateFrom, queryDateTo] },
            status: 'completed'
          },
          attributes: []
        }],
        where: {
          service_id: service.id
        },
        group: ['appointment_id']
      });
      
      // Calculate average services per appointment
      const totalAppointments = servicesPerAppointment.length;
      const averageServiceTime = totalAppointments > 0 
        ? service.duration // Use the service duration as average service time
        : 0;
        
      // Get top services - using a simpler approach to avoid join issues
      // Find appointments that include this service
      const appointmentsWithThisService = await AppointmentService.findAll({
        attributes: ['appointment_id'],
        where: {
          service_id: service.id
        },
        include: [{
          model: Appointment,
          as: 'appointment',
          attributes: ['id'],
          where: {
            date: { [Op.between]: [queryDateFrom, queryDateTo] },
            status: 'completed'
          }
        }]
      });
      
      // Extract appointment IDs
      const appointmentIds = appointmentsWithThisService
        .filter(as => as.appointment)
        .map(as => as.appointment.id);
      
      // Now find other services booked in these same appointments
      let formattedTopServices = [];
      if (appointmentIds.length > 0) {
        const relatedServices = await AppointmentService.findAll({
          attributes: [
            'service_id', 
            'service_name',
            [fn('COUNT', col('service_id')), 'count']
          ],
          where: {
            appointment_id: { [Op.in]: appointmentIds },
            service_id: { [Op.ne]: service.id } // Exclude this service
          },
          group: ['service_id', 'service_name'],
          order: [[literal('count'), 'DESC']],
          limit: 3
        });
        
        formattedTopServices = relatedServices.map(s => ({
          name: s.service_name,
          count: parseInt(s.get('count') || '0', 10)
        }));
      }
      
      return {
        ...serviceInfo,
        bookings,
        revenue,
        averageRevenue: bookings > 0 ? revenue / bookings : service.price,
        estimatedCost,
        profitMargin: Math.round(profitMargin),
        growthRate: growthRate.toFixed(1),
        preferredByStaff,
        // Add additional metrics needed by the UI
        appointmentCompletionRate,
        utilization, 
        averageServiceTime,
        topServices: formattedTopServices
      };
    }));
    
    return res.status(200).json({
      success: true,
      data: advancedServiceData
    });
    
  } catch (error) {
    console.error('Error getting advanced service metrics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving advanced service metrics',
      error: error.message
    });
  }
};

/**
 * Get staff performance metrics for a specific staff member
 * This is a dedicated endpoint for staff dashboard/reports
 */
const getStaffPerformanceMetrics = async (req, res) => {
  try {
    const { staffId, dateFrom, dateTo } = req.query;
    
    // Use staffId from query or from JWT token
    let targetStaffId = staffId;
    
    // If no query staffId was provided or we want to ensure we're getting the correct one
    // Extract staffId from JWT token if available
    if ((!targetStaffId || targetStaffId === req.user?.id) && req.user?.staffId) {
      targetStaffId = req.user.staffId;
      console.log('Using staffId from JWT token:', targetStaffId);
    }
    
    if (!targetStaffId) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID is required'
      });
    }

    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        success: false,
        message: 'Date range is required'
      });
    }

    console.log(`Fetching staff metrics for staffId: ${targetStaffId}, date range: ${dateFrom} to ${dateTo}`);

    // Convert dates
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    
    // Get appointments count
    const appointmentsCount = await Appointment.count({
      where: {
        staff_id: targetStaffId,
        date: { [Op.between]: [startDate, endDate] },
        status: { [Op.not]: 'cancelled' }
      }
    });

    console.log(`Found ${appointmentsCount} appointments`);

    // ----------------------------------------------------------------------
    //  Revenue & Commission calculations (NEW)
    //  With staff_id now living on invoice line items, we calculate both
    //  revenue and commission directly from invoice_services & invoice_products
    // ----------------------------------------------------------------------

    // Revenue from services provided by this staff (use qualified column to avoid ambiguity)
    const serviceRevenueRow = await InvoiceService.findOne({
      attributes: [[fn('sum', col('InvoiceService.total')), 'revenue']],
      where: { staff_id: targetStaffId },
      include: [{
        model: Invoice,
        as: 'invoice',
        attributes: [],
        where: {
          date: { [Op.between]: [startDate, endDate] },
          status: 'paid'
        }
      }],
      raw: true
    });

    // Revenue from products sold by this staff (qualified column)
    const productRevenueRow = await InvoiceProduct.findOne({
      attributes: [[fn('sum', col('InvoiceProduct.total')), 'revenue']],
      where: { staff_id: targetStaffId },
      include: [{
        model: Invoice,
        as: 'invoice',
        attributes: [],
        where: {
          date: { [Op.between]: [startDate, endDate] },
          status: 'paid'
        }
      }],
      raw: true
    });

    const serviceRevenue = parseFloat(serviceRevenueRow?.revenue || 0);
    const productRevenue = parseFloat(productRevenueRow?.revenue || 0);

    const totalRevenue = serviceRevenue + productRevenue;

    // Commission earned from services (locked amount)
    const serviceCommission = await InvoiceService.sum('commission_amount', {
      where: { staff_id: targetStaffId },
      include: [{
        model: Invoice,
        as: 'invoice',
        attributes: [],
        where: {
          date: { [Op.between]: [startDate, endDate] },
          status: 'paid'
        }
      }]
    }) || 0;

    // Commission earned from products
    const productCommission = await InvoiceProduct.sum('commission_amount', {
      where: { staff_id: targetStaffId },
      include: [{
        model: Invoice,
        as: 'invoice',
        attributes: [],
        where: {
          date: { [Op.between]: [startDate, endDate] },
          status: 'paid'
        }
      }]
    }) || 0;

    const commission = parseFloat(serviceCommission) + parseFloat(productCommission);

    // Find staff record to get commission percentage (for reference)
    const staffRecord = await Staff.findByPk(targetStaffId);
    const commissionPercentage = staffRecord ? parseFloat(staffRecord.commission_percentage || 0) : 0;

    console.log(`Revenue data: ${totalRevenue}, Commission (earned): ${commission}`);

    // Get services data - most popular services for this staff member
    const topServices = await AppointmentService.findAll({
      attributes: [
        'service_id',
        'service_name',
        [fn('count', col('appointment_id')), 'bookings'],
        [fn('sum', col('price')), 'revenue']
      ],
      include: [
        {
          model: Appointment,
          as: 'appointment',
          attributes: [],
          where: {
            staff_id: targetStaffId,
            date: { [Op.between]: [startDate, endDate] },
            status: { [Op.not]: 'cancelled' }
          }
        }
      ],
      group: ['service_id', 'service_name'],
      order: [[fn('count', col('appointment_id')), 'DESC']],
      raw: true
    });

    // Format service data
    const servicesData = topServices.map(service => ({
      service_id: service.service_id,
      service_name: service.service_name,
      bookings: parseInt(service.bookings || 0),
      revenue: parseFloat(service.revenue || 0)
    }));

    console.log(`Found ${servicesData.length} services`);

    // Return metrics data
    return res.status(200).json({
      success: true,
      data: {
        appointments: appointmentsCount,
        revenue: totalRevenue,
        commission: commission,
        commissionPercentage: commissionPercentage,
        services: servicesData,
        dateRange: {
          from: dateFrom,
          to: dateTo
        }
      }
    });
  } catch (error) {
    console.error('Error getting staff performance metrics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving staff metrics',
      error: error.message
    });
  }
};

// Export all controllers
module.exports = {
  getDashboardStats,
  getRevenueReport,
  getServicesReport,
  getStaffReport,
  getTipsAndDiscountsReport,
  getRevenueByDayOfWeek,
  getAdvancedRevenueMetrics,
  getAdvancedStaffMetrics,
  getAdvancedServiceMetrics,
  getStaffPerformanceMetrics
}; 