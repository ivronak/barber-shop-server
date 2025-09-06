const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { sequelize, BusinessSetting } = require('./models');
const routes = require('./routes');
require('dotenv').config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
// Increase payload limit to handle image uploads (base64 strings up to ~5 MB)
const BODY_LIMIT = process.env.BODY_LIMIT || '5mb';
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));
console.log(process.env.NODE_ENV)
// Initialize business settings
const initializeBusinessSettings = async () => {
  try {
    // Load business settings for timezone
    const businessSettings = await BusinessSetting.findOne();
    if (businessSettings) {
      
      // Set default timezone for the application
      process.env.TZ = businessSettings.timezone;
    } else {
      
      process.env.TZ = 'UTC';
    }
  } catch (error) {
    console.error('Error loading business settings:', error);
    process.env.TZ = 'UTC';
  }
};

// Routes
app.use('/api', routes);

// Health check route for Vercel
app.get('/health', async (req, res) => {
  try {
    // Light DB check without full connection
    const dbStatus = sequelize.connectionManager.hasOwnProperty('pool') && 
                    sequelize.connectionManager.pool.hasOwnProperty('_eventsCount') ? 
                    'connected' : 'disconnected';
    
    // Add database connection info for troubleshooting
    const dbConfig = {
      host: process.env.DB_HOST || '(not set)',
      database: process.env.DB_NAME || '(not set)',
      username: process.env.DB_USERNAME || '(not set)',
     
      // Don't include password
    };
    
    // Check if we're running on Vercel
    const isVercel = process.env.VERCEL === '1';
    
    res.status(200).json({ 
      status: 'ok',
      db: dbStatus,
      db_config: dbConfig,
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
      platform: isVercel ? 'vercel' : 'other',
      node_version: process.version,
      uptime: process.uptime() + ' seconds',
      timezone: process.env.TZ || 'not set'
    });
  } catch (error) {
    res.status(200).json({ 
      status: 'api-ok',
      db: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
;
// Detailed diagnostic endpoint
app.get('/diag', async (req, res) => {
  // This route is for diagnosing deployment issues
  const dbConnectionTest = await (async () => {
    try {
      await sequelize.authenticate({ timeout: 5000 });
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return { 
        success: false, 
        message: error.message,
        code: error.original?.code,
        errno: error.original?.errno
      };
    }
  })();
  
  // Return detailed environment information
  res.status(200).json({
    server: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime() + ' seconds',
      memoryUsage: process.memoryUsage(),
      env: process.env.NODE_ENV
    },
    vercel: {
      isVercel: process.env.VERCEL === '1',
      region: process.env.VERCEL_REGION,
      env: process.env.VERCEL_ENV
    },
    database: {
      host: process.env.DB_HOST,
      name: process.env.DB_NAME,
      user: process.env.DB_USERNAME,
      connectionTest: dbConnectionTest,
      dialect: 'mysql',
      ssl: process.env.NODE_ENV === 'production' ? 'enabled' : 'disabled'
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Database connection function
const connectDB = async () => {
  try {
    
    
    
    
    
    
    
    // Set a timeout for the database connection attempt
    const connectionPromise = sequelize.authenticate();
    
    // Create a timeout promise - 20 seconds for Vercel
    const timeoutPromise = new Promise((_, reject) => {
      const timeout = process.env.VERCEL ? 20000 : 10000;
      setTimeout(() => {
        reject(new Error(`Database connection timeout after ${timeout/1000} seconds`));
      }, timeout);
    });
    
    // Race the connection against the timeout
    await Promise.race([connectionPromise, timeoutPromise]);
    
    
    
    
    // Sync database models (in development)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      
    }
    return true;
  } catch (error) {
    console.error('Unable to connect to the database1:', error);
    
    // Get more detailed error information
    const errorInfo = {
      message: error.message,
      code: error.original?.code,
      errno: error.original?.errno,
      syscall: error.original?.syscall,
      hostname: error.original?.hostname,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      username: process.env.DB_USERNAME,
      dialect: 'mysql',
      ssl: process.env.NODE_ENV === 'production' ? 'enabled' : 'disabled'
    };
    
    console.error('Detailed error info:', errorInfo);
    
    // Don't crash the server if we can't connect to the database
    return false;
  }
};

// Health check route that doesn't require DB connection
app.get('/api-status', (req, res) => {
  res.status(200).json({ 
    status: 'API server running',
    environment: process.env.NODE_ENV || 'development',
    time: new Date().toISOString()
  });
});

// Simple API routes that don't require database
app.get('/api/ping', (req, res) => {
  res.status(200).json({ 
    pong: true,
    timestamp: new Date().toISOString(),
    message: "API is functioning correctly"
  });
});

// Version info endpoint
app.get('/api/version', (req, res) => {
  res.status(200).json({
    name: "Barber Shop API",
    version: "1.0.0",
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime() + " seconds"
  });
});

// Debug route for Vercel troubleshooting - only accessible in dev mode
app.get('/debug-info', (req, res) => {
  // If not in dev mode, don't expose sensitive info
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production mode' });
  }
  
  // Get safe environment variables
  const safeEnv = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DB_HOST: process.env.DB_HOST,
    DB_NAME: process.env.DB_NAME,
    DB_USERNAME: process.env.DB_USERNAME,
    // Don't include DB_PASSWORD
  };
  
  res.status(200).json({
    environment: safeEnv,
    sequelizeConnected: sequelize.hasOwnProperty('connectionManager'),
    serverInfo: {
      platform: process.platform,
      nodeVersion: process.version,
      uptime: process.uptime()
    }
  });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const startServer = async () => {
    await connectDB();
    // Initialize business settings after DB connection
    await initializeBusinessSettings();
    app.listen(PORT, () => {
      
    });
  };
  startServer();
}

// Prepare for serverless environment
const prepareApp = async () => {
  try {
    // Only try to connect to DB if not already connected
    const result = await connectDB();
    
    
    // Initialize business settings for timezone
    if (result) {
      await initializeBusinessSettings();
    }
  } catch (err) {
    console.error('Error preparing app:', err);
    // Don't throw - we still want the app to initialize even if DB connection fails
  }
};

// Attempt to connect to database when deployed
prepareApp().catch(err => {
  console.error('Failed to prepare app:', err);
});

// For Vercel serverless deployment
module.exports = app; 