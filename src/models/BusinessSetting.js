const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BusinessSetting extends Model {
    static associate(models) {
      // No associations
    }
  }
  
  BusinessSetting.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    logo: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    slot_duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30
    },
    tax_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    allow_discounts: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    allow_tips: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    default_commission: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'USD'
    },
    timezone: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'UTC'
    },
    accept_cash: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    accept_card: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    accept_mobile: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    // Optional social media URLs
    facebook_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    instagram_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    twitter_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    youtube_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    /**
     * List of additional custom payment methods (e.g. "paypal", "upi", etc.).
     * Stored as a JSON array of strings for flexibility.
     */
    custom_payment_methods: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'BusinessSetting',
    tableName: 'business_settings',
    timestamps: false,
    underscored: true
  });
  
  return BusinessSetting;
}; 