-- Add soft delete functionality to libraries table
ALTER TABLE libraries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
ALTER TABLE libraries ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);
ALTER TABLE libraries ADD COLUMN IF NOT EXISTS deletion_reason VARCHAR(255);

-- Create index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_libraries_deleted_at ON libraries(deleted_at);

-- Update existing views to exclude deleted libraries by default
-- This ensures that deleted libraries don't appear in normal queries