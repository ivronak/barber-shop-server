const { v4: uuidv4 } = require('uuid');
const { 
  BusinessSetting, 
  BusinessHour, 
  Service, 
  Staff, 
  Customer,
  Appointment,
  AppointmentService,
  ActivityLog,
  WorkingHour,
  ShopClosure,
  User,
  Break,
  ServiceCategory
} = require('../models');
const { Op } = require('sequelize');
const { 
  generateTimeSlots, 
  convertTimeToMinutes, 
  convertMinutesToTime,
  convertTimezone,
  checkAvailability,
  formatTo12Hour,
  standardizeTimeFormat,
  getConsistentDayOfWeek
} = require('../utils/appointment.utils');
const dayOfWeekUtils = require('../utils/dayOfWeekUtils');

/**
 * Get all services for booking
 */
const getBookingServices = async (req, res) => {
  try {
    const { category } = req.query;
    
    const services = await Service.findAll({
      where: { is_active: true, is_deleted: false },
      order: [['name', 'ASC']],
      attributes: ['id', 'name', 'description', 'price', 'duration'],
      include: [
        {
          model: ServiceCategory,
          as: 'serviceCategory',
          attributes: ['name'],
          where: {
            ...(category ? { name: category } : {}),
            is_active: true,
          },
        },
      ],
    });
    
    // Group services by category name
    const servicesByCategory = services.reduce((acc, service) => {
      const catName = service.serviceCategory?.name || 'Other';
      if (!acc[catName]) {
        acc[catName] = [];
      }
      acc[catName].push(service);
      return acc;
    }, {});
    
    return res.status(200).json({
      success: true,
      services: servicesByCategory
    });
  } catch (error) {
    console.error('Error getting booking services:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving services',
      error: error.message
    });
  }
};

/**
 * Get all staff available for booking
 */
const getBookingStaff = async (req, res) => {
  try {
    const { serviceId } = req.query;

    // Base query to find available staff
    const query = {
      where: {
        is_available: true
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['name', 'email', 'phone', 'image']
        },
        {
          model: Service,
          as: 'services',
          attributes: ['id', 'name']
        }
      ],
      attributes: ['id', 'position', 'bio']
    };

    // If serviceId is provided, filter staff by that service
    if (serviceId) {
      // Check if serviceId contains multiple comma-separated IDs
      const serviceIds = serviceId.includes(',') 
        ? serviceId.split(',') 
        : [serviceId];
      
      query.include[1].where = { id: { [Op.in]: serviceIds } };
    }

    const staffMembers = await Staff.findAll(query);

    // Transform the data to a more suitable format for the frontend
    const formattedStaff = staffMembers.map(staff => ({
      id: staff.id,
      name: staff.user.name,
      position: staff.position,
      bio: staff.bio,
      image: staff.user.image,
      services: staff.services.map(service => service.id)
    }));
    
    // If we're filtering by multiple services, filter out staff who don't support all services
    if (serviceId && serviceId.includes(',')) {
      const serviceIds = serviceId.split(',');
      const filteredStaff = formattedStaff.filter(staff => 
        serviceIds.every(id => staff.services.includes(id))
      );
      
      return res.status(200).json({
        success: true,
        staff: filteredStaff
      });
    }
    
    return res.status(200).json({
      success: true,
      staff: formattedStaff
    });
  } catch (error) {
    console.error('Error getting booking staff:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving staff',
      error: error.message
    });
  }
};

/**
 * Get available booking slots
 */
const getBookingSlots = async (req, res) => {
  try {
    console.log(`[SLOTS] ========== STARTING TIME SLOT GENERATION ==========`);
    console.log(`[SLOTS] Request query params:`, req.query);
    
    const { date, service_id, staff_id } = req.query;
    console.log(`[SLOTS] Processing request for date=${date}, service_id=${service_id}, staff_id=${staff_id}`);

    if (!date || !service_id || !staff_id) {
      console.log(`[SLOTS] Missing required parameters`);
      return res.status(400).json({
        success: false,
        message: 'Date, service ID, and staff ID are required',
      });
    }

    // Check if there are multiple service IDs
    let services = [];
    let totalDuration = 0;
    
    if (service_id.includes(',')) {
      // Handle multiple services
      const serviceIds = service_id.split(',');
      console.log(`[SLOTS] Multiple services requested: ${serviceIds.length} services`);
      
      for (const id of serviceIds) {
        const service = await Service.findByPk(id);
        if (!service) {
          console.log(`[SLOTS] Service not found with ID: ${id}`);
          return res.status(404).json({
            success: false,
            message: `Service with ID ${id} not found`,
          });
        }
        services.push(service);
        totalDuration += service.duration;
      }
      console.log(`[SLOTS] Total duration for all services: ${totalDuration} minutes`);
    } else {
      // Handle single service (existing logic)
      console.log(`[SLOTS] Fetching service with ID: ${service_id}`);
      const service = await Service.findByPk(service_id);
      if (!service) {
        console.log(`[SLOTS] Service not found with ID: ${service_id}`);
        return res.status(404).json({
          success: false,
          message: 'Service not found',
        });
      }
      services.push(service);
      totalDuration = service.duration;
      console.log(`[SLOTS] Service found: ${service.name}, duration=${totalDuration} minutes`);
    }

    // Get the staff details
    console.log(`[SLOTS] Fetching staff with ID: ${staff_id}`);
    const staff = await Staff.findByPk(staff_id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!staff) {
      console.log(`[SLOTS] Staff not found with ID: ${staff_id}`);
      return res.status(404).json({
        success: false,
        message: 'Staff not found',
      });
    }
    console.log(`[SLOTS] Staff found: ${staff.user.name}`);

    // Get business settings for timezone and slot duration
    console.log(`[SLOTS] Fetching business settings`);
    const businessSettings = await BusinessSetting.findOne();
    const businessTimezone = businessSettings?.timezone || 'UTC';
    const slotDuration = businessSettings?.slot_duration || 30;
    console.log(`[SLOTS] Business settings: timezone=${businessTimezone}, slotDuration=${slotDuration}`);

    // Get the day of week using the consistent helper function
    console.log(`[SLOTS] Calculating day of week for date: ${date}`);
    const { dayOfWeek, numericDayOfWeek } = getConsistentDayOfWeek(date);
    
    console.log(`[SLOTS] Day of week result: ${dayOfWeek} (${numericDayOfWeek})`);
    console.log(`[SLOTS] Booking request for date: ${date}, day: ${dayOfWeek}, numeric day: ${numericDayOfWeek}`);
    
    // Check for full day shop closure
    console.log(`[SLOTS] Checking for full day shop closure`);
    const shopClosure = await ShopClosure.findOne({
      where: { date, is_full_day: true }
    });
    
    if (shopClosure) {
      console.log(`[SLOTS] Full day shop closure found: ${shopClosure.reason || 'No reason provided'}`);
      return res.status(200).json({
        success: true,
        slots: [],
        businessTimezone,
        slotDuration,
        message: `The shop is closed on this day: ${shopClosure.reason || 'Shop closure'}`,
      });
    }
    console.log(`[SLOTS] No full day shop closure found`);

    // Check business hours for this day
    console.log(`[SLOTS] Fetching business hours for day: ${dayOfWeek}`);
    const businessHours = await BusinessHour.findOne({
      where: { day_of_week: dayOfWeek }
    });
    
    if (!businessHours || !businessHours.open_time || !businessHours.close_time) {
      console.log(`[SLOTS] No business hours found for ${dayOfWeek} or missing open/close times`);
      return res.status(200).json({
        success: true,
        slots: [],
        businessTimezone,
        slotDuration,
        message: 'The shop is not open on this day',
      });
    }
    console.log(`[SLOTS] Business hours: ${businessHours.open_time} - ${businessHours.close_time}`);

    // Check if the staff has working hours for this day
    console.log(`[SLOTS] Fetching working hours for staff ID: ${staff_id} and day: ${dayOfWeek}`);
    const staffWorkingHours = await WorkingHour.findAll({
      where: {
        staff_id: staff_id,
        day_of_week: dayOfWeek
      }
    });
    
    console.log(`[SLOTS] Found ${staffWorkingHours.length} working hour records for staff ID: ${staff_id} on day ${dayOfWeek}`);
    
    // If no working hours are found for this staff member on this day, return appropriate message
    if (staffWorkingHours.length === 0) {
      console.log(`[SLOTS] Staff ${staff.user.name} is not available on ${dayOfWeek}`);
      return res.status(200).json({
        success: true,
        slots: [],
        businessTimezone,
        slotDuration,
        message: `${staff.user.name} is not available on ${dayOfWeek}. Please choose a different day or staff member.`,
      });
    }
    
    // Log all staff working hours for debugging
    staffWorkingHours.forEach(workHour => {
      console.log(`[SLOTS] Working hour ID: ${workHour.id}, Time: ${workHour.start_time}-${workHour.end_time}, Day: ${workHour.day_of_week}`);
    });

    // Get partial closures for this date
    console.log(`[SLOTS] Fetching partial shop closures`);
    const partialClosures = await ShopClosure.findAll({
      where: { date, is_full_day: false }
    });
    console.log(`[SLOTS] Found ${partialClosures.length} partial closures for date ${date}`);

    // Get admin breaks for this day
    console.log(`[SLOTS] Fetching admin breaks for day ${dayOfWeek}`);
    let adminBreaks = [];

    try {
      // Get admin breaks for this specific day
      if (businessHours) {
        console.log(`[SLOTS] Fetching admin breaks for business hour ID: ${businessHours.id} (day: ${dayOfWeek})`);
        
        adminBreaks = await Break.findAll({
          where: {
            business_hour_id: businessHours.id,
            staff_id: null,
            day_of_week: dayOfWeek,
          }
        });
        
        console.log(`[SLOTS] Found ${adminBreaks.length} admin breaks for day ${dayOfWeek}`);
        
        // Log all breaks for debugging
        adminBreaks.forEach(breakItem => {
          console.log(`[SLOTS] Admin break ID: ${breakItem.id}, Name: ${breakItem.name}, Time: ${breakItem.start_time}-${breakItem.end_time}, Day: ${breakItem.day_of_week}, Business Hour ID: ${breakItem.business_hour_id}`);
        });
      }
    } catch (error) {
      console.error('[SLOTS] Error fetching admin breaks:', error);
      // Continue with empty breaks array if there's an error
      adminBreaks = [];
    }

    // Get staff-specific breaks for this day
    console.log(`[SLOTS] Fetching staff-specific breaks for staff ID: ${staff_id} and day: ${dayOfWeek}`);
    let staffBreaks = [];

    try {
      staffBreaks = await Break.findAll({
        where: {
          staff_id: staff_id,
          day_of_week: dayOfWeek,
        }
      });
      
      console.log(`[SLOTS] Found ${staffBreaks.length} staff-specific breaks for staff ID: ${staff_id} on day ${dayOfWeek}`);
      
      // Log all staff breaks for debugging
      staffBreaks.forEach(breakItem => {
        console.log(`[SLOTS] Staff break ID: ${breakItem.id}, Name: ${breakItem.name}, Time: ${breakItem.start_time}-${breakItem.end_time}, Day: ${breakItem.day_of_week}, Staff ID: ${breakItem.staff_id}`);
      });
    } catch (error) {
      console.error('[SLOTS] Error fetching staff breaks:', error);
      staffBreaks = [];
    }

    // Combine admin and staff breaks
    const allBreaks = [...adminBreaks, ...staffBreaks];
    console.log(`[SLOTS] Combined ${adminBreaks.length} admin breaks and ${staffBreaks.length} staff breaks = ${allBreaks.length} total breaks`);

    // Get existing appointments for this date and staff
    console.log(`[SLOTS] Fetching existing appointments for date: ${date} and staff ID: ${staff_id}`);
    const existingAppointments = await Appointment.findAll({
      where: {
        date,
        staff_id: staff_id,
        status: {
          [Op.notIn]: ['cancelled', 'no-show']
        }
      },
    });
    console.log(`[SLOTS] Found ${existingAppointments.length} existing appointments`);

    // Generate time slots using business hours
    const businessOpenTime = businessHours.open_time || '09:00';
    const businessCloseTime = businessHours.close_time || '18:00';

    console.log(`[SLOTS] Calling generateTimeSlots with params:`);
    console.log(`[SLOTS] - businessOpenTime: ${businessOpenTime}`);
    console.log(`[SLOTS] - businessCloseTime: ${businessCloseTime}`);
    console.log(`[SLOTS] - slotDuration: ${slotDuration}`);
    console.log(`[SLOTS] - totalDuration: ${totalDuration}`);
    console.log(`[SLOTS] - staffWorkingHours: ${staffWorkingHours.length} items`);
    console.log(`[SLOTS] - breaks: ${allBreaks.length} items`);
    console.log(`[SLOTS] - existingAppointments: ${existingAppointments.length} items`);
    console.log(`[SLOTS] - partialClosures: ${partialClosures.length} items`);
    console.log(`[SLOTS] - date: ${date}`);
    console.log(`[SLOTS] - businessTimezone: ${businessTimezone}`);
    
    // Generate all possible time slots
    console.log(`[SLOTS] Generating time slots...`);
    const allSlots = generateTimeSlots(
      businessOpenTime,
      businessCloseTime,
      slotDuration,
      totalDuration,
      staffWorkingHours,
      allBreaks,
      existingAppointments,
      partialClosures,
      date,
      businessTimezone
    );

    // Check if there are any available slots
    const totalSlots = allSlots.length;
    const availableSlots = allSlots.filter(slot => slot.available).length;
    console.log(`[SLOTS] Generated ${totalSlots} slots, ${availableSlots} available`);
    
    const hasAvailableSlots = availableSlots > 0;
    
    // If no available slots, provide more detailed message
    let message = null;
    if (!hasAvailableSlots) {
      message = `No available time slots for ${staff.user.name} on the selected date.`;
    }
    
    console.log(`[SLOTS] First few available slots:`, allSlots.filter(slot => slot.available).slice(0, 3));
    console.log(`[SLOTS] ========== FINISHED TIME SLOT GENERATION ==========`);
    
    // Return appropriate response
    return res.status(200).json({
      success: true,
      slots: allSlots,
      businessTimezone,
      slotDuration,
      message,
    });
  } catch (error) {
    console.error('[SLOTS-ERROR] Error getting booking slots:', error);
    return res.status(500).json({
      success: false,
      message: 'Error getting booking slots',
      error: error.message
    });
  }
};

/**
 * Create a booking
 */
const createBooking = async (req, res) => {
  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      service_id,
      date,
      time,
      notes,
      staff_id = null // Make staff_id optional with null default
    } = req.body;
    
    // Validate required fields
    if (!customer_name || !customer_phone || !service_id || !date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Missing required booking fields'
      });
    }

    // Check if service_id contains multiple services
    const serviceIds = service_id.includes(',') ? service_id.split(',') : [service_id];
    console.log(`Booking with ${serviceIds.length} services:`, serviceIds);
    
    // Get service details and validate all services exist
    const services = [];
    let totalDuration = 0;
    let totalPrice = 0;
    
    for (const id of serviceIds) {
      const service = await Service.findByPk(id);
      if (!service) {
        return res.status(404).json({
          success: false,
          message: `Service with ID ${id} not found`
        });
      }
      services.push(service);
      totalDuration += service.duration;
      totalPrice += service.price;
    }
    
    // Use the first service for naming in logs (for backward compatibility)
    const primaryService = services[0];
    
    // Calculate booking duration and end time
    const bookingTime = time;
    const startTime = new Date(`${date}T${bookingTime}`);
    const endTime = new Date(startTime.getTime() + totalDuration * 60000);
    const endTimeStr = endTime.toTimeString().split(' ')[0].substring(0, 5);
    
    console.log(`Booking request for ${date} at ${bookingTime} (${totalDuration} minutes total)`);
    console.log(`Calculated end time: ${endTimeStr}`);
    
    // Check business hours for this day
    const { dayOfWeek } = getConsistentDayOfWeek(date);
    const businessHours = await BusinessHour.findOne({
      where: { day_of_week: dayOfWeek }
    });
    
    if (!businessHours || !businessHours.open_time || !businessHours.close_time) {
      return res.status(400).json({
        success: false,
        message: 'The shop is not open on this day'
      });
    }
    
    // Check if the shop is open at the requested time
    const businessOpenTime = businessHours.open_time;
    const businessCloseTime = businessHours.close_time;
    
    if (bookingTime < businessOpenTime || endTimeStr > businessCloseTime) {
      return res.status(400).json({
        success: false,
        message: 'The shop is not open at the requested time'
      });
    }
    
    // Check if the shop is closed on this day
    const fullDayClosure = await ShopClosure.findOne({
      where: {
        date,
        is_full_day: true
      }
    });
    
    if (fullDayClosure) {
      return res.status(400).json({
        success: false,
        message: `The shop is closed on this day: ${fullDayClosure.reason || 'Shop closure'}`
      });
    }
    
    // Check if there are any partial closures that overlap with the requested time
    const partialClosures = await ShopClosure.findAll({
      where: {
        date,
        is_full_day: false
      }
    });
    
    for (const closure of partialClosures) {
      const closureStart = new Date(`${date}T${closure.start_time}`);
      const closureEnd = new Date(`${date}T${closure.end_time}`);
      
      if (
        (startTime >= closureStart && startTime < closureEnd) ||
        (endTime > closureStart && endTime <= closureEnd) ||
        (startTime <= closureStart && endTime >= closureEnd)
      ) {
        return res.status(400).json({
          success: false,
          message: `The shop is closed at this time: ${closure.reason || 'Temporary closure'}`
        });
      }
    }
    
    // Check if there are any admin breaks that overlap with the requested time
    const adminBreaks = await Break.findAll({
      where: {
        staff_id: null,
        business_hour_id: businessHours.id,
        day_of_week: dayOfWeek
      }
    });
    
    for (const breakTime of adminBreaks) {
      const breakStart = new Date(`${date}T${breakTime.start_time}`);
      const breakEnd = new Date(`${date}T${breakTime.end_time}`);
      
      if (
        (startTime >= breakStart && startTime < breakEnd) ||
        (endTime > breakStart && endTime <= breakEnd) ||
        (startTime <= breakStart && endTime >= breakEnd)
      ) {
        console.log('Booking overlaps with admin break:', breakTime.name);
        return res.status(400).json({
          success: false,
          message: `Cannot book at this time. The shop is on break: ${breakTime.name}`
        });
      }
    }
    
    // Check time slot availability
    const isAvailable = await checkAvailability(
      staff_id, // This can be null now
      date, 
      bookingTime, 
      endTimeStr
    );
    
    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'The selected time slot is not available'
      });
    }
    
    // If staff_id is not provided, we can auto-assign or leave it null
    let staffName = 'Unassigned';
    if (staff_id) {
      // Get staff details if staff_id is provided
      const staff = await Staff.findByPk(staff_id, {
        include: [{ model: User, as: 'user', attributes: ['name'] }]
      });
      
      if (!staff) {
        return res.status(404).json({
          success: false,
          message: 'Staff not found'
        });
      }
      
      staffName = staff.user.name;
    }
    
    // Find or create customer
    let customer = await Customer.findOne({
      where: {
        [Op.or]: [
          { phone: customer_phone }
        ]
      }
    });

    // Add email to search criteria only if it's provided
    if (customer_email) {
      customer = await Customer.findOne({
        where: {
          [Op.or]: [
            { email: customer_email },
            { phone: customer_phone }
          ]
        }
      });
    }

    if (!customer) {
      // Create customer with validated fields
      const customerData = {
        id: uuidv4(),
        name: customer_name,
        phone: customer_phone,
        visit_count: 0,
        total_spent: 0
      };
      
      // Only add email if it's provided and valid
      if (customer_email && customer_email.includes('@')) {
        customerData.email = customer_email;
      }
      
      customer = await Customer.create(customerData);
    }
    
    // Create appointment
    // Do not set an explicit ID so the model default generates a human-readable ID (e.g., APT-XXXXXXXX)
    const appointmentData = {
      customer_id: customer.id,
      staff_id, // Can be null now
      date,
      time: bookingTime,
      end_time: endTimeStr,
      status: 'scheduled',
      total_amount: totalPrice,
      notes,
      customer_name,
      customer_phone,
      staff_name: staffName
    };

    // Only add email if it's provided and valid
    if (customer_email && customer_email.includes('@')) {
      appointmentData.customer_email = customer_email;
    }

    const appointment = await Appointment.create(appointmentData);
    
    // Create appointment service entries for each service
    for (const service of services) {
      await AppointmentService.create({
        id: uuidv4(),
        appointment_id: appointment.id,
        service_id: service.id,
        service_name: service.name,
        price: service.price,
        duration: service.duration
      });
    }
    
    // Increment customer visit count
    customer.visit_count += 1;
    await customer.save();
    
    // Log activity
    await ActivityLog.create({
      id: uuidv4(),
      user_id: 'system',
      user_name: 'Public Booking',
      user_role: 'system',
      action: 'PUBLIC_BOOKING_CREATED',
      details: `Appointment #${appointment.id} created for ${customer_name} with ${serviceIds.length} services`
    });
    
    // Format the time for display
    const displayTime = formatTo12Hour(bookingTime);
    
    // Create a comma-separated list of service names
    const serviceNames = services.map(s => s.name).join(', ');
    
    return res.status(201).json({
      success: true,
      appointment: {
        id: appointment.id,
        date,
        time: bookingTime,
        displayTime,
        service_name: serviceNames,
        staff_name: staffName
      },
      message: 'Booking created successfully'
    });
  } catch (error) {
    console.error('Create booking error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating booking',
      error: error.message
    });
  }
};

/**
 * Get staff services for booking
 */
const getStaffServices = async (req, res) => {
  try {
    const { staffId } = req.params;
    
    if (!staffId) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID is required'
      });
    }
    
    const staff = await Staff.findByPk(staffId, {
      include: [
        {
          model: Service,
          as: 'services',
          attributes: ['id', 'name', 'description', 'price', 'duration'],
          include: [
            {
              model: ServiceCategory,
              as: 'serviceCategory',
              attributes: ['name'],
            },
          ],
        }
      ]
    });
    
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
      });
    }
    
    // Group services by category
    const servicesByCategory = staff.services.reduce((acc, service) => {
      const catName = service.serviceCategory?.name || 'Other';
      if (!acc[catName]) {
        acc[catName] = [];
      }
      acc[catName].push(service);
      return acc;
    }, {});
    
    return res.status(200).json({
      success: true,
      services: servicesByCategory
    });
  } catch (error) {
    console.error('Error getting staff services:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving staff services',
      error: error.message
    });
  }
};

/**
 * Get service staff for booking
 */
const getServiceStaff = async (req, res) => {
  try {
    const { serviceId } = req.params;
    
    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'Service ID is required'
      });
    }
    
    const service = await Service.findByPk(serviceId, {
      include: [
        {
          model: Staff,
          as: 'staff',
          where: { is_available: true },
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['name', 'email', 'phone', 'image']
            }
          ],
          attributes: ['id', 'position', 'bio']
        }
      ]
    });
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    // Format staff data
    const formattedStaff = service.staff.map(staff => ({
      id: staff.id,
      name: staff.user.name,
      position: staff.position,
      bio: staff.bio,
      image: staff.user.image
    }));
    
    return res.status(200).json({
      success: true,
      staff: formattedStaff
    });
  } catch (error) {
    console.error('Error getting service staff:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving service staff',
      error: error.message
    });
  }
};

module.exports = {
  getBookingServices,
  getBookingStaff,
  getBookingSlots,
  createBooking,
  getStaffServices,
  getServiceStaff
}; 