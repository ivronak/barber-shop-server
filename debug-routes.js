const express = require('express');
const app = express();
const shopClosuresRoutes = require('./src/routes/shopClosures.routes');

console.log('ShopClosures routes stack:', shopClosuresRoutes.stack);

// Check if the routes are properly defined
const routes = shopClosuresRoutes.stack.map(layer => {
  return {
    path: layer.route?.path,
    methods: layer.route?.methods,
    handle: typeof layer.route?.stack[0]?.handle === 'function'
  };
});

console.log('Routes:', routes); 