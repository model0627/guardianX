-- Add sync_target column to api_connections table for multi-sync support
ALTER TABLE api_connections 
ADD COLUMN sync_target VARCHAR(50) DEFAULT 'libraries';

-- Add comment for clarity
COMMENT ON COLUMN api_connections.sync_target IS 'Synchronization target: libraries, devices, contacts (default: libraries)';

-- Update existing records to have explicit sync_target
UPDATE api_connections 
SET sync_target = 'libraries'
WHERE sync_target IS NULL;

-- Create index for better performance
CREATE INDEX idx_api_connections_sync_target ON api_connections(sync_target);