-- Add avatar_name column to users table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'avatar_name'
  ) THEN
    ALTER TABLE users ADD COLUMN avatar_name TEXT;
  END IF;
END $$;

