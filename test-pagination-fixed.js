// Test script for pagination functionality with fixed 10 items per page
const controller = require('./src/controllers/staff.controller');

// Test with different page numbers
async function testPagination() {
  
  
  // Test with page 1
  await testPage(1);
  
  // Test with page 2
  await testPage(2);
  
  // Test with page 3
  await testPage(3);
  
  
}

// Test a specific page
async function testPage(pageNum) {
  
  
  // Mock request with different page numbers but same limit
  const mockReq = { 
    query: { 
      page: pageNum.toString(),
      limit: '20' // This should be ignored, always using 10 items
    } 
  };
  
  // Create a promise to wait for the response
  return new Promise((resolve) => {
    const mockRes = { 
      status: (code) => {
        
        return {
          json: (data) => {
            
            
            
            
            
            
            
            // Verify that we have exactly 10 items per page (or less for the last page)
            if (data.staff.length > 10) {
              console.error(`ERROR: Page ${pageNum} has ${data.staff.length} items, which is more than 10!`);
            } else {
              
            }
            
            resolve();
          }
        };
      }
    };
    
    // Call the controller
    controller.getAllStaff(mockReq, mockRes)
      .catch(error => {
        console.error('Test failed with error:', error);
        resolve();
      });
  });
}

// Run the tests
testPagination(); 