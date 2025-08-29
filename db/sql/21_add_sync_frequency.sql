-- Add sync frequency configuration to api_connections table
ALTER TABLE api_connections 
ADD COLUMN sync_frequency_minutes INTEGER DEFAULT 5,
ADD COLUMN sync_frequency_type VARCHAR(20) DEFAULT 'minutes';

-- Add comment for clarity
COMMENT ON COLUMN api_connections.sync_frequency_minutes IS 'Auto-sync frequency in minutes (default: 5)';
COMMENT ON COLUMN api_connections.sync_frequency_type IS 'Frequency type: minutes, hours, days (default: minutes)';

-- Update existing records to have explicit frequency settings
UPDATE api_connections 
SET sync_frequency_minutes = 5, sync_frequency_type = 'minutes' 
WHERE sync_frequency_minutes IS NULL;