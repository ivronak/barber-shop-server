// Test script for pagination functionality with fixed 10 items per page
const controller = require('./src/controllers/staff.controller');

// Test with different page numbers
async function testPagination() {
  console.log('Testing pagination with fixed 10 items per page');
  
  // Test with page 1
  await testPage(1);
  
  // Test with page 2
  await testPage(2);
  
  // Test with page 3
  await testPage(3);
  
  // Test with page 4
  await testPage(4);
  
  console.log('All tests completed');
}

// Test a specific page
async function testPage(pageNum) {
  console.log(`\n----- Testing page ${pageNum} -----`);
  
  // Mock request with different page numbers
  const mockReq = { 
    query: { 
      page: pageNum.toString(),
      sort: 'name_asc',
      includeServices: 'true'
    } 
  };
  
  // Create a promise to wait for the response
  return new Promise((resolve) => {
    const mockRes = { 
      status: (code) => {
        console.log(`Status Code: ${code}`);
        return {
          json: (data) => {
            console.log(`Page ${pageNum} Response:`);
            console.log(`- Total items: ${data.totalCount}`);
            console.log(`- Total pages: ${data.pages}`);
            console.log(`- Current page: ${data.currentPage}`);
            console.log(`- Items per page: ${data.itemsPerPage}`);
            console.log(`- Items in this page: ${data.staff.length}`);
            
            // Verify that we have exactly 10 items per page (or less for the last page)
            if (data.staff.length > 10) {
              console.error(`ERROR: Page ${pageNum} has ${data.staff.length} items, which is more than 10!`);
            } else if (pageNum < data.pages && data.staff.length < 10) {
              console.error(`ERROR: Page ${pageNum} has ${data.staff.length} items, which is less than 10!`);
            } else if (data.staff.length === 10 || pageNum === data.pages) {
              console.log(`✓ Page ${pageNum} has ${data.staff.length} items, which is correct`);
            }
            
            // Print staff names for verification
            console.log("\nStaff on this page:");
            data.staff.forEach((staff, index) => {
              console.log(`${index + 1}. ${staff.user.name} (ID: ${staff.id})`);
            });
            
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