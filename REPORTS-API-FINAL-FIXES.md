# Reports API Integration - Final Fixes

## Completed Fixes

1. **Backend SQL Error**
   - Fixed the ambiguous `total` column reference in `getServicesReport` function
   - Added explicit table name `InvoiceService.total` to resolve SQL error

2. **Frontend Staff Table**
   - Updated field names from `staffId` to `staff_id` and `name` to `staff_name`
   - Added proper type checking and parsing for revenue and commission values

3. **Frontend Service Table**
   - Updated field names from `serviceId`/`name` to `service_id`/`service_name`
   - Added proper parsing of numeric values

4. **Chart Data Transformation**
   - Updated revenue chart data to match ComparisonChart component's required format
   - Updated tips/discounts chart to format data properly

5. **Fixed Click Handlers**
   - Updated `handleStaffRowClick` to use `staff_id` instead of `staffId`
   - Updated `handleServiceRowClick` to use `service_id` instead of `serviceId`

6. **PageHeader Fix**
   - Removed unsupported `menuItems` property from PageHeader action

## Remaining Issues to Fix

### 1. TypeScript Errors

The following TypeScript errors still need to be resolved:

#### Import Cleanup
```typescript
// Replace this import
import { format, subDays, subMonths } from "date-fns";
import {
  BarChart3,
  Calendar as CalendarIcon,
  Download,
  Filter,
  RefreshCcw,
  X,
  Users,
  Scissors,
  Clock,
  DollarSign,
  Star,
  TrendingUp,
  ChevronDown,
  Check as CheckIcon,
  UserPlus,
  Info,
  Loader2,
  TrendingDown,
  Coins,
  CreditCard,
  PercentCircle,
  DollarSign as DollarSignIcon,
} from "lucide-react";

// With this cleaned up import
import { format, subDays } from "date-fns";
import {
  BarChart3,
  Download,
  RefreshCcw,
  Users,
  Scissors,
  Clock,
  DollarSign,
  Star,
  TrendingUp,
  ChevronDown,
  Loader2,
  Coins,
} from "lucide-react";
```

#### String/Number Type Issues
There are several TypeScript errors about string/number type mismatches. These can be fixed by ensuring all numeric values are properly parsed:

```typescript
// For services table
const renderServicesTable = () => {
  // ...
  return (
    <Table>
      {/* ... */}
      <TableBody>
        {servicesData.data.map((service) => {
          // Ensure numbers are properly parsed
          const revenue = parseFloat(String(service.revenue)) || 0;
          const bookings = parseInt(String(service.bookings)) || 0;
          const avgPrice = bookings > 0 ? revenue / bookings : 0;
          
          return (
            <TableRow key={service.service_id} onClick={() => handleServiceRowClick(service.service_id)}>
              <TableCell>{service.service_name}</TableCell>
              <TableCell className="text-right">{bookings}</TableCell>
              <TableCell className="text-right">${revenue.toFixed(2)}</TableCell>
              <TableCell className="text-right">${avgPrice.toFixed(2)}</TableCell>
              {/* ... */}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

// Same approach for staff table
<TableCell className="text-right">${parseFloat(String(staff.revenue)).toFixed(2)}</TableCell>
<TableCell className="text-right">${parseFloat(String(staff.commission)).toFixed(2)}</TableCell>
```

#### Position Property Issue
In the mock data section, there's a reference to `staffInfo?.position` which doesn't exist in the API response. Replace it with appropriate code:

```typescript
// Find where this is used (around line 1611) and replace with:
<TableCell>{staffInfo?.role || "-"}</TableCell>
// Or simply remove the position column if it's not needed
```

### 2. API Response Structure Updates

The backend `getServicesReport` function currently returns a different structure than what the frontend expects. Update it as follows:

```javascript
// In barber-shop-api/src/controllers/reports.controller.js
// Find the getServicesReport function and update the return statement:
return res.status(200).json({
  success: true,
  data: servicesData  // Changed from { services: servicesData, categories }
});
```

### 3. Type Definitions

Consider updating the type definitions in `reportService.ts` to be more precise and match the actual API response format. We've already started this by adding support for both string and number types.

### 4. Testing the Fixes

After making all these changes:

1. Start the backend API:
   ```
   cd barber-shop-api
   npm run dev
   ```

2. Start the frontend:
   ```
   cd ..
   npm run dev
   ```

3. Navigate to the Reports page and check the browser console for any remaining errors.

### 5. Future Improvements

1. **Data Adapters**: Consider creating adapter functions that transform API responses to the format expected by frontend components:
   ```typescript
   function adaptStaffData(staffData: any[]): StaffPerformanceUI[] {
     return staffData.map(staff => ({
       id: staff.staff_id,
       name: staff.staff_name,
       appointments: parseInt(String(staff.appointments)) || 0,
       revenue: parseFloat(String(staff.revenue)) || 0,
       commission: parseFloat(String(staff.commission)) || 0,
     }));
   }
   ```

2. **API Consistency**: Ensure consistent naming conventions across all API endpoints. Prefer snake_case for API responses and camelCase for frontend variables.

3. **Error Handling**: Add more robust error handling for API requests with useful error messages.

4. **Loading States**: Implement skeleton loaders for better user experience during API requests.

5. **Export Functionality**: Complete the implementation of the CSV/PDF/Excel export functionality.

## Daily Revenue Breakdown Implementation

### Overview
The Daily Revenue Breakdown section in the Reports page has been updated to use real API data instead of mock data. This involved creating a new API endpoint and updating the frontend to fetch and display the data.

### Backend Changes

1. **New API Endpoint**: Added a new endpoint to fetch revenue breakdown by day of week
   - Created `getRevenueByDayOfWeek` controller function in `reports.controller.js`
   - Added route `/reports/revenue-by-day` in `reports.routes.js`
   - The endpoint returns revenue data grouped by day of week with:
     - Total revenue per day
     - Number of transactions
     - Average transaction value
     - Change percentage compared to previous period

2. **SQL Query Details**:
   - Uses `DAYOFWEEK()` MySQL function to group data by day of week
   - Calculates average transaction value using `SUM(total) / COUNT(id)`
   - Includes day name using a CASE statement for better readability
   - Compares with previous period to calculate change percentage

### Frontend Changes

1. **API Service**:
   - Added `getRevenueByDayOfWeek` function in `reportService.ts`
   - Added `DayOfWeekRevenue` interface to type the API response

2. **Reports Component**:
   - Added API hook to fetch day of week data
   - Updated `fetchInitialData`, `applyFilters`, and filter change effects to include the new API call
   - Replaced mock data in the Daily Revenue Breakdown table with real API data
   - Added loading, error, and empty state handling

3. **Data Processing**:
   - Added proper type conversion for numeric values using `parseFloat` and `parseInt`
   - Formatted currency values with `toLocaleString()` and `toFixed(2)`

### Testing Notes

- The Daily Revenue Breakdown now shows actual revenue data grouped by day of week
- The data updates automatically when date filters are changed
- Loading states are displayed while data is being fetched
- Error handling is in place for API failures

### Future Improvements

1. Consider adding more detailed metrics for each day, such as:
   - Service breakdown per day
   - Staff performance by day of week
   - Peak hours within each day

2. Add visualization options:
   - Bar chart comparing days of week
   - Trend lines showing day performance over time