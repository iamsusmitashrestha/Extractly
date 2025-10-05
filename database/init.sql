-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create indexes for better performance (will be handled by Prisma migrations)
-- This file is mainly for extension setup and any custom database configurations

-- Log the initialization
DO $$
BEGIN
    RAISE NOTICE 'Extractly database initialized with pgcrypto extension';
END $$;
