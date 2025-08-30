# Reports API Integration

This document describes the integration of the Reports page with the API server backend.

## API Endpoints

### 1. Dashboard Statistics

**Endpoint**: `GET /api/reports/dashboard`

**Parameters**:
- `period` (string, optional): The time period for data aggregation. Options: 'daily', 'weekly', 'monthly'. Default: 'weekly'

**Response**:
```json
{
  "success": true,
  "data": {
    "appointmentStats": [...],
    "revenueStats": [...],
    "customerCount": 150,
    "topServices": [...],
    "topStaff": [...],
    "upcomingAppointments": [...],
    "tipsDiscountsSummary": {...}
  }
}
```

### 2. Revenue Reports

**Endpoint**: `GET /api/reports/revenue`

**Parameters**:
- `dateFrom` (string, required): Start date in format 'YYYY-MM-DD'
- `dateTo` (string, required): End date in format 'YYYY-MM-DD'
- `groupBy` (string, optional): Data grouping. Options: 'day', 'week', 'month'. Default: 'day'

**Response**:
```json
{
  "success": true,
  "data": {
    "revenue": [
      {
        "date": "2023-01-01",
        "subtotal": 1000,
        "discounts": 50,
        "taxes": 100,
        "tips": 150,
        "total": 1200
      },
      ...
    ],
    "paymentMethods": [
      {
        "payment_method": "cash",
        "amount": 5000,
        "count": 50
      },
      ...
    ]
  }
}
```

### 3. Services Performance Reports

**Endpoint**: `GET /api/reports/services`

**Parameters**:
- `dateFrom` (string, required): Start date in format 'YYYY-MM-DD'
- `dateTo` (string, required): End date in format 'YYYY-MM-DD'
- `sort` (string, optional): Sorting method. Options: 'revenue_desc', 'revenue_asc', 'bookings_desc', 'bookings_asc'. Default: 'revenue_desc'

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "serviceId": "service-1",
      "name": "Haircut",
      "bookings": 50,
      "revenue": 1500
    },
    ...
  ]
}
```

### 4. Staff Performance Reports

**Endpoint**: `GET /api/reports/staff`

**Parameters**:
- `dateFrom` (string, required): Start date in format 'YYYY-MM-DD'
- `dateTo` (string, required): End date in format 'YYYY-MM-DD'
- `sort` (string, optional): Sorting method. Options: 'revenue_desc', 'revenue_asc', 'appointments_desc', 'appointments_asc'. Default: 'revenue_desc'

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "staffId": "staff-1",
      "name": "John Doe",
      "appointments": 30,
      "revenue": 3000,
      "commission": 600
    },
    ...
  ]
}
```

### 5. Tips and Discounts Reports

**Endpoint**: `GET /api/reports/tips-discounts`

**Parameters**:
- `dateFrom` (string, required): Start date in format 'YYYY-MM-DD'
- `dateTo` (string, required): End date in format 'YYYY-MM-DD'
- `groupBy` (string, optional): Data grouping. Options: 'day', 'week', 'month'. Default: 'day'
- `staffId` (string, optional): Filter by staff ID

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalTips": 1500,
      "totalDiscounts": 800,
      "totalSubtotal": 10000,
      "totalSales": 10700,
      "avgTipPercentage": 15,
      "avgDiscountPercentage": 8,
      "totalInvoices": 100,
      "invoicesWithTip": 80,
      "invoicesWithDiscount": 40
    },
    "timeSeriesData": [
      {
        "date": "2023-01-01",
        "tips": 150,
        "discounts": 80,
        "totalSales": 1070,
        "tipPercentage": 15,
        "discountPercentage": 8,
        "invoiceCount": 10
      },
      ...
    ],
    "staffBreakdown": [...],
    "discountTypeBreakdown": [...]
  }
}
```

## Frontend Integration

The frontend integration has been implemented in the following files:

1. `src/api/services/reportService.ts` - Contains the API client functions for fetching report data
2. `src/pages/Reports.tsx` - The main reports page component that uses the API services
3. `src/pages/staff/Reports.tsx` - Staff-specific reports page

### Key Features

1. **Date Range Filtering**: Users can select different date ranges (today, yesterday, last 7 days, etc.)
2. **Report Types**: Support for daily, weekly, monthly, and yearly report views
3. **Comparison Options**: Compare current data with previous period
4. **Staff and Service Filtering**: Filter reports by specific staff members or services
5. **Export Functionality**: Export reports in various formats (CSV, PDF, Excel)

## Testing

To test the API endpoints, use the provided `test-reports-api.js` script:

```bash
# Set the authentication token in .env file first
# TEST_AUTH_TOKEN=your_jwt_token

# Run the test script
node test-reports-api.js
```

## Future Improvements

1. Implement caching for report data to improve performance
2. Add more detailed metrics for service and staff performance
3. Enhance visualization with more chart types
4. Add custom date range picker with hour-specific filtering 