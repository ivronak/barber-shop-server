-- Drop existing foreign key constraints
ALTER TABLE reviews DROP FOREIGN KEY reviews_ibfk_23;
-- Note: If the constraint name is different, you may need to adjust the name above
-- You can find the constraint name using: 
-- SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_NAME = 'reviews' AND COLUMN_NAME = 'customer_id';

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