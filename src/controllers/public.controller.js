const { v4: uuidv4 } = require('uuid');
const { 
  BusinessSetting, 
  BusinessHour, 
  GalleryImage, 
  Service, 
  Staff, 
  Review,
  Customer,
  Appointment,
  AppointmentService,
  ActivityLog,
  WorkingHour,
  ShopClosure,
  Break,
  User,
  ContactRequest,
  ServiceCategory
} = require('../models');
const { Op } = require('sequelize');
const { 
  generateTimeSlots, 
  convertTimeToMinutes, 
  convertMinutesToTime,
  getConsistentDayOfWeek
} = require('../utils/appointment.utils');
const dayOfWeekUtils = require('../utils/dayOfWeekUtils');
const moment = require('moment-timezone');

/**
 * Get public business information
 */
const getBusinessInfo = async (req, res) => {
  try {
    // Get business settings
    const settings = await BusinessSetting.findOne({
      where: { id: 1 }
    });
    
    // Get business hours
    const hours = await BusinessHour.findAll({
      order: [['day_of_week', 'ASC']]
    });
    
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Business information not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      business: {
        name: settings.name,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        logo: settings.logo,
        facebook_url: settings.facebook_url,
        instagram_url: settings.instagram_url,
        twitter_url: settings.twitter_url,
        youtube_url: settings.youtube_url,
        hours
      }
    });
  } catch (error) {
    console.error('Error getting business info:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving business information',
      error: error.message
    });
  }
};

/**
 * Get gallery images for public display
 */
const getGallery = async (req, res) => {
  try {
    const images = await GalleryImage.findAll({
      where: {
        is_active: true
      },
      order: [['display_order', 'ASC']],
      attributes: ['id', 'title', 'description', 'url', 'category']
    });
    
    return res.status(200).json({
      success: true,
      images
    });
  } catch (error) {
    console.error('Error getting gallery:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving gallery images',
      error: error.message
    });
  }
};

/**
 * Get services for public display
 */
const getServices = async (req, res) => {
  try {
    const { category } = req.query;
    
    const services = await Service.findAll({
      where: { is_active: true, is_deleted: false },
      order: [['name', 'ASC']],
      attributes: ['id', 'name', 'description', 'price', 'duration', 'imageUrl'],
      include: [
        {
          model: ServiceCategory,
          as: 'serviceCategory',
          attributes: ['name', 'imageUrl'],
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
    console.error('Error getting services:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving services',
      error: error.message
    });
  }
};

/**
 * Get staff for public display
 */
const getStaff = async (req, res) => {
  try {
    const staff = await Staff.findAll({
      where: {
        is_available: true
      },
      include: [
        {
          model: Service,
          as: 'services',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'user',
          attributes: ['name', 'email', 'phone', 'image']
        }
      ],
      attributes: {
        exclude: ['commission_percentage', 'user_id']
      }
    });
    
    return res.status(200).json({
      success: true,
      staff
    });
  } catch (error) {
    console.error('Error getting staff:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving staff',
      error: error.message
    });
  }
};

/**
 * Get approved reviews for public display
 */
const getReviews = async (req, res) => {
  try {
    const reviews = await Review.findAll({
      where: {
        is_approved: true
      },
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['name']
        },
        {
          model: Staff,
          as: 'staff',
          attributes: ['id', 'position']
        }
      ],
      order: [['date', 'DESC']],
      limit: 10
    });
    
    return res.status(200).json({
      success: true,
      reviews
    });
  } catch (error) {
    console.error('Error getting reviews:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving reviews',
      error: error.message
    });
  }
};

/**
 * Submit contact form
 */
const submitContact = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    
    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required'
      });
    }
    
    // Persist to database
    await ContactRequest.create({
      id: uuidv4(),
      name,
      email,
      phone,
      subject,
      message,
    });
    
    // Optionally, send email / notification here
    
    return res.status(200).json({
      success: true,
      message: 'Contact form submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    return res.status(500).json({
      success: false,
      message: 'Error submitting contact form',
      error: error.message
    });
  }
};

/**
 * Create a booking from public website
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
    
    // Get service details
    const service = await Service.findByPk(service_id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    // Calculate end time based on service duration
    const startTime = new Date(`${date}T${time}`);
    const endTime = new Date(startTime.getTime() + service.duration * 60000);
    const endTimeStr = endTime.toTimeString().split(' ')[0].substring(0, 5);
    
    // Check if time is available
    const existingOverlapQuery = {
      date,
      status: { [Op.notIn]: ['cancelled', 'no-show'] },
      [Op.or]: [
        {
          time: { [Op.lt]: endTimeStr },
          end_time: { [Op.gt]: time }
        }
      ]
    };
    
    // If staff_id is provided, check staff-specific availability
    if (staff_id) {
      existingOverlapQuery.staff_id = staff_id;
    }
    
    const existingAppointment = await Appointment.findOne({
      where: existingOverlapQuery
    });
    
    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: 'The selected time slot is not available'
      });
    }
    
    // Get staff details if staff_id is provided
    let staffName = 'Unassigned';
    if (staff_id) {
      const staff = await Staff.findByPk(staff_id, {
        include: [{ model: User, attributes: ['name'] }]
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
          { email: customer_email },
          { phone: customer_phone }
        ]
      }
    });
    
    if (!customer) {
      customer = await Customer.create({
        id: uuidv4(),
        name: customer_name,
        email: customer_email,
        phone: customer_phone,
        visit_count: 0,
        total_spent: 0
      });
    }
    
    // Create appointment
    const appointmentId = uuidv4();
    const appointment = await Appointment.create({
      id: appointmentId,
      customer_id: customer.id,
      staff_id, // Can be null now
      date,
      time,
      end_time: endTimeStr,
      status: 'scheduled',
      total_amount: service.price,
      notes,
      customer_name,
      customer_phone,
      customer_email,
      staff_name: staffName
    });
    
    // Create appointment service
    await AppointmentService.create({
      id: uuidv4(),
      appointment_id: appointmentId,
      service_id,
      service_name: service.name,
      price: service.price,
      duration: service.duration
    });
    
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
      details: `Appointment #${appointmentId} created for ${customer_name}`
    });
    
    return res.status(201).json({
      success: true,
      appointment: {
        id: appointment.id,
        date: appointment.date,
        time: appointment.time,
        staff_name: staffName,
        service_name: service.name
      }
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating booking',
      error: error.message
    });
  }
};

/**
 * Get available time slots for public booking
 */
const getAvailableSlots = async (req, res) => {
  try {
    const { date, serviceId } = req.query;
    
    // Validate required params
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }
    
    // Get service duration
    let serviceDuration = 30; // Default duration
    if (serviceId) {
      const service = await Service.findByPk(serviceId);
      if (service) {
        serviceDuration = service.duration;
      }
    }
    
    // Get business settings for slot duration
    const businessSettings = await BusinessSetting.findOne();
    const businessTimezone = businessSettings ? businessSettings.timezone || 'UTC' : 'UTC';
    const slotDuration = businessSettings ? businessSettings.slot_duration : 30;
    
    // Get the day of week using the consistent helper function
    const { dayOfWeek, numericDayOfWeek } = getConsistentDayOfWeek(date);
    
    const businessHours = await BusinessHour.findOne({
      where: { day_of_week: dayOfWeek }
    });
    
    if (!businessHours || !businessHours.open_time || !businessHours.close_time) {
      return res.status(200).json({
        success: true,
        slots: [],
        message: 'The shop is closed on this day'
      });
    }
    
    // Check if shop is closed on the requested date
    const shopClosure = await ShopClosure.findOne({
      where: { date, is_full_day: true }
    });
    
    if (shopClosure) {
      return res.status(200).json({
        success: true,
        slots: [],
        message: `The shop is closed on this day: ${shopClosure.reason}`
      });
    }
    
    // Get partial shop closures for the date
    const partialClosures = await ShopClosure.findAll({
      where: { date, is_full_day: false }
    });
    
    // Get admin breaks for the day
    const adminBreaks = await Break.findAll({
      where: { 
        business_hour_id: businessHours.id,
        staff_id: null,
        day_of_week: dayOfWeek
      }
    });
    
    // Get existing appointments for the date
    const existingAppointments = await Appointment.findAll({
      where: {
        date,
        status: {
          [Op.notIn]: ['cancelled', 'no-show']
        }
      },
      attributes: ['time', 'end_time']
    });
    
    // Generate time slots
    const slots = generateTimeSlots(
      businessHours.open_time,
      businessHours.close_time,
      slotDuration,
      serviceDuration,
      [], // Empty array for staffWorkingHours (no staff-specific hours)
      adminBreaks,
      existingAppointments,
      partialClosures,
      date
    );
    
    // If selected date is today, mark past time slots as unavailable
    const todayStr = moment().tz(businessTimezone).format('YYYY-MM-DD');
    if (date === todayStr) {
      const nowMinutes = convertTimeToMinutes(moment().tz(businessTimezone).format('HH:mm:ss'));
      slots.forEach(slot => {
        const slotStartMin = convertTimeToMinutes(slot.time);
        if (slotStartMin <= nowMinutes) {
          slot.available = false;
          slot.unavailableReason = 'Past time';
        }
      });
    }
    
    return res.status(200).json({
      success: true,
      slots
    });
  } catch (error) {
    console.error('Get available slots error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getBusinessInfo,
  getGallery,
  getServices,
  getStaff,
  getReviews,
  submitContact,
  createBooking,
  getAvailableSlots
}; 