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
    console.log(`Status Code: ${code}`);
    return {
      json: (data) => {
        console.log('Response Data:');
        console.log(JSON.stringify(data, null, 2));
      }
    };
  }
};

// Test the getAllStaff function
console.log('Testing getAllStaff with page=2, limit=5');
controller.getAllStaff(mockReq, mockRes)
  .then(() => {
    console.log('Test completed successfully');
  })
  .catch(error => {
    console.error('Test failed with error:', error);
  }); 