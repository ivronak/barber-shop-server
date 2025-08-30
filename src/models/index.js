const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
// Explicitly require mysql2 to ensure it's bundled with the deployment
require('mysql2');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';

// For Vercel deployment, use special optimized config when in production
let config;
if (env === 'production' && process.env.VERCEL) {
  console.log('Using Vercel-optimized database configuration');
  config = require('../config/vercel-db.js');
} else {
  console.log(`Using standard ${env} database configuration`);
  config = require('../config/database.js')[env];
}

const db = {};

// Initialize Sequelize with the configuration
let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

// Load all model files in this directory
fs
  .readdirSync(__dirname)
  .filter(file => {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// Associate models if associations exist
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Add sequelize instance and Sequelize class to db object
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db; 