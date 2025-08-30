const shopClosuresController = require('./src/controllers/shopClosures.controller');

console.log('ShopClosures controller methods:', Object.keys(shopClosuresController));

if (shopClosuresController.getAllShopClosures) {
  console.log('getAllShopClosures method exists');
} else {
  console.log('getAllShopClosures method does not exist');
}

if (shopClosuresController.getShopClosureById) {
  console.log('getShopClosureById method exists');
} else {
  console.log('getShopClosureById method does not exist');
} 