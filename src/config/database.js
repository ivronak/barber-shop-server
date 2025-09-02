require("dotenv").config();

module.exports = {
  development: {
    username: process.env.DB_USERNAME || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "barber_shop_dev",
    host: process.env.DB_HOST || "127.0.0.1",
    dialect: "mysql",
    dialectModule: require("mysql2"),
    logging: console.log,
  },
  test: {
    username: process.env.DB_USERNAME || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "barber_shop_test",
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT ||  3307,
    dialect: "mysql",
    dialectModule: require("mysql2"),
    logging: false,
  },
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: "mysql",
    dialectModule: require("mysql2"),
    logging: false,
    pool: {
      max: 2,
      min: 0,
      acquire: 60000, // Increased timeout for serverless environment
      idle: 10000,
      evict: 1000, // Run eviction checks more frequently
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
      connectTimeout: 60000, // Increased connect timeout
    },
  },
};
