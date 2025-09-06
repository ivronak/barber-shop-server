require('dotenv').config();
const fs = require('fs');
const path = require('path');



// Read the updated controller file
const controllerPath = path.join(__dirname, 'src', 'controllers', 'appointments.controller.js');
const controllerContent = fs.readFileSync(controllerPath, 'utf8');




// Extract the getStaffAppointments function
const functionRegex = /exports\.getStaffAppointments\s*=\s*async\s*\(req,\s*res\)\s*=>\s*{[\s\S]*?};/;
const functionMatch = controllerContent.match(functionRegex);

if (!functionMatch) {
  console.error('Could not find getStaffAppointments function in the controller file');
  process.exit(1);
}

const functionCode = functionMatch[0];


// Create deployment instructions
const deploymentInstructions = `
# Staff Appointments Controller Fix

## Issue
The staff appointments endpoint is returning "Access denied. Staff profile not found" because it's trying to access \`req.user.staffId\` which doesn't exist.

## Fix
1. Updated the \`getStaffAppointments\` controller to properly look up the staff record using the user ID.
2. Added additional logging to help diagnose issues.

## Updated Code
\`\`\`javascript
${functionCode}
\`\`\`

## Implementation Steps
1. Replace the \`getStaffAppointments\` function in \`src/controllers/appointments.controller.js\` with the updated code above.
2. Restart the server.

## Testing
1. Log in as a staff member.
2. Navigate to the staff appointments page.
3. Verify that appointments are loaded correctly.
`;

// Write the deployment instructions to a file
const deploymentPath = path.join(__dirname, 'STAFF-APPOINTMENTS-FIX.md');
fs.writeFileSync(deploymentPath, deploymentInstructions);


 