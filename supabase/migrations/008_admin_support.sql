-- Add banned field to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT FALSE;

-- Set admin role for the admin email
UPDATE users 
SET role = 'admin' 
WHERE email = 'jabulanietokakpan@gmail.com' 
AND (role IS NULL OR role != 'admin');

-- Add index on users.role for faster queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Add index on users.email for admin email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Add index on orders.payment_status for revenue queries
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-- Add index on orders.created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Add index on events.status for status filtering
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- Add index on events.created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

-- RLS Policy: Allow admin users to read all data
-- Admin users (role='admin') can read all data from all tables

-- Admin can read all events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'events' 
    AND policyname = 'Admins can read all events'
  ) THEN
    CREATE POLICY "Admins can read all events"
      ON events FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role = 'admin'
        )
      );
  END IF;
END $$;

-- Admin can read all tickets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'tickets' 
    AND policyname = 'Admins can read all tickets'
  ) THEN
    CREATE POLICY "Admins can read all tickets"
      ON tickets FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role = 'admin'
        )
      );
  END IF;
END $$;

-- Admin can read all orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'orders' 
    AND policyname = 'Admins can read all orders'
  ) THEN
    CREATE POLICY "Admins can read all orders"
      ON orders FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role = 'admin'
        )
      );
  END IF;
END $$;

-- Admin can read all ticket types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'ticket_types' 
    AND policyname = 'Admins can read all ticket types'
  ) THEN
    CREATE POLICY "Admins can read all ticket types"
      ON ticket_types FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role = 'admin'
        )
      );
  END IF;
END $$;

-- Admin can read all creator profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'creator_profiles' 
    AND policyname = 'Admins can read all creator profiles'
  ) THEN
    CREATE POLICY "Admins can read all creator profiles"
      ON creator_profiles FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role = 'admin'
        )
      );
  END IF;
END $$;

-- Admin can read all wallet transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'wallet_transactions' 
    AND policyname = 'Admins can read all wallet transactions'
  ) THEN
    CREATE POLICY "Admins can read all wallet transactions"
      ON wallet_transactions FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role = 'admin'
        )
      );
  END IF;
END $$;

-- Admin can read all QR scans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'qr_scans' 
    AND policyname = 'Admins can read all QR scans'
  ) THEN
    CREATE POLICY "Admins can read all QR scans"
      ON qr_scans FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role = 'admin'
        )
      );
  END IF;
END $$;

-- Note: Users can already read their own profile (including banned status) through existing RLS policies
-- The "Users can read their own profile" policy from 003_rls_policies.sql covers this

