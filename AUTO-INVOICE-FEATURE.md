# Auto-Invoice Generation Feature

## Overview

This feature automatically generates an invoice when an appointment's status is changed to "completed" by an admin or staff member. This eliminates the need to manually create invoices for completed services and ensures that all services rendered have corresponding invoices.

## How It Works

When an appointment's status is updated to "completed" via the API, the system:

1. Checks if an invoice already exists for that appointment
2. If no invoice exists, it:
   - Retrieves business settings for tax rates
   - Gets the active GST rate and components (if configured)
   - Calculates the subtotal based on all services in the appointment
   - Applies appropriate tax calculations
   - Creates a new invoice record with "paid" status and "cash" payment method
   - Creates corresponding invoice service records for each appointment service
   - Creates tax component records if applicable

The auto-generated invoice:
- Is linked to the appointment via `appointment_id`
- Contains all services from the appointment
- Is set to "paid" status with "cash" as the default payment method
- Includes a note indicating it was auto-generated

## Configuration

No additional configuration is required to use this feature. It works with:
- The default business tax rate from Business Settings
- Any configured GST rates and components
- All services associated with the appointment

## Testing

To test this feature:

1. Run the provided test script:
   ```
   node test-appointment-auto-invoice.js
   ```
   
2. Or test manually:
   - Login as an admin or staff member
   - Find an appointment with "scheduled" status
   - Change the status to "completed"
   - Navigate to the Invoices section and verify a new invoice was created

## API Details

The auto-invoice generation is handled in the `updateAppointment` function in the appointments controller. When the status is changed to "completed", the following happens:

```javascript
// If marking as completed, update customer visit stats and create invoice
if (status === 'completed' && originalStatus !== 'completed') {
  // Update customer visit stats...
  
  // Create invoice automatically
  const existingInvoice = await Invoice.findOne({
    where: { appointment_id: appointment.id }
  });
  
  if (!existingInvoice) {
    // Get business settings for tax rate
    // Calculate invoice details
    // Create invoice and related records
  }
}
```

## Recent Fixes and Improvements

The auto-invoice feature has been improved with the following fixes:

1. **Proper Number Formatting**: All monetary values are now properly formatted with `parseFloat().toFixed(2)` to ensure consistent decimal precision in SQL operations.

2. **Improved Error Handling**: Added try/catch blocks around critical sections to better handle and report errors.

3. **Bulk Database Operations**: Invoice services and tax components are now created using bulkCreate instead of individual create operations to avoid connection issues.

4. **Transaction Management**: Enhanced transaction handling with better error recovery and rollback procedures.

5. **Status Change Detection**: Fixed the status change detection to properly compare the original status with the new status before creating an invoice.

6. **Customer Total Spent Updates**: Moved the customer's total_spent field updates into the same transaction as the invoice creation to ensure data consistency.

7. **Connection Management**: Improved database connection handling to prevent "connection closed" errors during multi-step operations.

8. **Pre-generated IDs**: All records now have their UUIDs generated before database operations to ensure consistency.

## Best Practices

Staff should be aware that:
- Marking an appointment as "completed" will create an invoice automatically
- The invoice will be in "paid" status with "cash" as the default payment method
- The invoice can be modified later if needed (e.g., to add discounts or tips or change payment method)

## Limitations

- Automatic invoices do not include tips (these must be added manually)
- Discounts must be applied manually if needed
- The payment method defaults to "cash" and must be updated manually if another method was used 