// Test script for pagination functionality
const controller = require('./src/controllers/staff.controller');

// Mock request and response objects
const mockReq = { 
  query: { 
    page: '2', 
    limit: '5' 
  } 
};

const mockRes = { 
  status: (code) => {
    
    return {
      json: (data) => {
        
        
      }
    };
  }
};

// Test the getAllStaff function

controller.getAllStaff(mockReq, mockRes)
  .then(() => {
    
  })
  .catch(error => {
    console.error('Test failed with error:', error);
  }); 