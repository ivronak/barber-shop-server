# Review System Update

This update allows users to enter customer and staff information as text instead of selecting from dropdowns. This makes the review system more flexible for users.

## Changes Made

1. **Database Changes**:
   - Added `customer_name` and `staff_name` columns to the `reviews` table
   - Made `customer_id` and `staff_id` columns nullable

2. **API Changes**:
   - Updated the review creation endpoint to accept either ID-based or name-based customer and staff information
   - Added validation to ensure either ID or name is provided

3. **Frontend Changes**:
   - Updated the CreateReviewForm component to use text inputs instead of dropdowns
   - Modified the review display to show either ID-based or name-based information

4. **Migration Changes**:
   - Updated the original reviews table migration (`20231201000014-create-reviews-table.js`) to include customer_name and staff_name fields from the start
   - Set ON DELETE SET NULL for foreign key constraints to avoid data loss

## Database Setup

### For New Databases

If you're setting up a new database from scratch:

1. Make sure your environment variables are set up correctly in `.env` file
2. Run the standard migrations:

```bash
npx sequelize-cli db:migrate
```

The reviews table will be created with the customer_name and staff_name fields, and the customer_id and staff_id columns will be nullable.

### For Existing Databases

If you're updating an existing database that already has the reviews table, use the fix script:

```bash
node fix-foreign-keys.js
```

This script will:
1. Add the customer_name and staff_name columns if they don't exist
2. Make customer_id and staff_id nullable
3. Update the foreign key constraints to use ON DELETE SET NULL

## Troubleshooting

### Foreign Key Constraint Errors

If you encounter an error like this when creating reviews:

```
Error creating review: Cannot add or update a child row: a foreign key constraint fails
```

It means the database schema needs to be updated. You can fix this by:

1. Running the automated fix script (recommended):

```bash
node fix-foreign-keys.js
```

2. Or manually executing these SQL commands in your database:

```sql
-- Drop existing foreign key constraints
ALTER TABLE reviews DROP FOREIGN KEY reviews_ibfk_23;
-- Or whatever your constraint name is

-- Add customer_name and staff_name columns if they don't exist
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255) NULL AFTER customer_id;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS staff_name VARCHAR(255) NULL AFTER staff_id;

-- Make customer_id and staff_id nullable
ALTER TABLE reviews MODIFY COLUMN customer_id VARCHAR(36) NULL;
ALTER TABLE reviews MODIFY COLUMN staff_id VARCHAR(36) NULL;

-- Re-add foreign key constraints with ON DELETE SET NULL
ALTER TABLE reviews ADD CONSTRAINT reviews_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES customers(id)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE reviews ADD CONSTRAINT reviews_staff_id_fkey
  FOREIGN KEY (staff_id) REFERENCES staff(id)
  ON DELETE SET NULL ON UPDATE CASCADE;
```

## Using the New Review System

### Creating Reviews

When creating a new review, you can now:
- Enter the customer name directly instead of selecting from a dropdown
- Enter the staff name directly instead of selecting from a dropdown

The system will store this information in the new `customer_name` and `staff_name` fields.

### Viewing Reviews

The system will display reviews with the following priority:
1. If `customer_name`/`staff_name` is available, it will be displayed
2. Otherwise, it will show the name from the related customer/staff record
3. If neither is available, it will show "Unknown Customer"/"Unknown Staff"

## Technical Details

### API Endpoints

The review creation endpoint (`POST /reviews`) now accepts the following fields:
- `customer_id` (optional if customer_name is provided)
- `staff_id` (optional if staff_name is provided)
- `customer_name` (optional if customer_id is provided)
- `staff_name` (optional if staff_id is provided)
- `rating` (required)
- `text` (optional)
- `date` (required)
- `is_approved` (optional)

### Database Schema

The updated `reviews` table schema now includes:
```
id: string (primary key)
customer_id: string (nullable, foreign key to customers.id)
customer_name: string (nullable)
staff_id: string (nullable, foreign key to staff.id)
staff_name: string (nullable)
rating: integer
text: text (nullable)
date: date
is_approved: boolean
created_at: datetime
updated_at: datetime
``` 