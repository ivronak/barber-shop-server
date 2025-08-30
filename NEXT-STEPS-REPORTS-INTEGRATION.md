# Next Steps for Reports Integration

The basic integration of the Reports page with the backend API has been set up. Here are the next steps to complete the integration:

## 1. Test API Endpoints

Run the `test-reports-api.js` script to verify that all API endpoints are working correctly:

```bash
# First add a valid JWT token to your .env file
echo "TEST_AUTH_TOKEN=your_jwt_token_here" >> .env

# Then run the test script
node test-reports-api.js
```

## 2. Fix Remaining UI Components

The following UI components in the Reports pages still need updating:

### Admin Reports Page (`src/pages/Reports.tsx`)

1. Update mock data references in the StaffDetailAnalytics component
2. Fix the staff dialog to use real API data
3. Fix the service dialog to use real API data
4. Update the Tips & Discounts tab to display proper API data
5. Fix all remaining linter errors by removing unused imports
6. Implement proper API error handling with toast notifications for all sections

### Staff Reports Page (`src/pages/staff/Reports.tsx`)

1. Make sure the staff ID is properly retrieved from the authentication context
2. Add missing data for service revenue comparison charts
3. Fix any remaining UI issues related to API data integration

## 3. Implement Export Functionality

The export buttons currently do not function. Implement export functionality for:

- CSV export
- PDF export
- Excel export

Example implementation for CSV export:

```typescript
const handleCsvExport = (data, filename) => {
  // Convert data to CSV format
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => Object.values(row).join(',')).join('\n');
  const csvContent = `${headers}\n${rows}`;
  
  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
```

## 4. Complete Filter Implementation

The filter functionality in the Reports page needs to be completed:

1. Make sure selected staff filters are properly applied to API requests
2. Make sure selected service filters are properly applied to API requests
3. Implement date range filtering (custom date picker)
4. Add filter UI indicators to show active filters

## 5. Add Loading States

Ensure proper loading states are implemented for all API requests:

1. Add skeleton loaders for all data sections
2. Handle empty states with appropriate messages
3. Add proper error states with retry options

## 6. Optimize Performance

Consider performance optimizations:

1. Add pagination for large datasets
2. Implement caching for recently fetched data
3. Consider lazy loading for components that are not immediately visible

## 7. Add Print View

Implement a print-friendly view for reports:

1. Create a dedicated print layout
2. Add "Print Report" button
3. Make sure charts and tables render correctly in print view

## 8. Mobile Responsiveness

Ensure reports are fully responsive on mobile devices:

1. Adjust table layouts for small screens
2. Make charts responsive
3. Ensure filters work correctly on touch devices

## 9. Further Integration Tasks

1. Integrate the Dashboard page with the API
2. Update the staff dashboard reports
3. Link reports to related pages (e.g., clicking on a service should navigate to service details)
4. Add permissions checks to ensure users only see reports they have access to 