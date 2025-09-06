const models = require('./src/models');

console.log('Available models:', Object.keys(models));

if (models.ShopClosure) {
  console.log('ShopClosure model exists');
} else {
  console.log('ShopClosure model does not exist');
}

if (models.ActivityLog) {
  console.log('ActivityLog model exists');
} else {
  console.log('ActivityLog model does not exist');
} 