-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scans ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Allow users to insert their own profile during signup
CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow users to read their own profile
CREATE POLICY "Users can read their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow public to read user profiles (for event organizers, etc.)
CREATE POLICY "Public can read user profiles"
  ON users FOR SELECT
  USING (true);

-- Creator profiles policies
-- Allow creators to insert their own profile
CREATE POLICY "Creators can insert their own profile"
  ON creator_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow creators to read and update their own profile
CREATE POLICY "Creators can manage their own profile"
  ON creator_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Events policies
-- Allow creators to create events
CREATE POLICY "Creators can create events"
  ON events FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Allow public to read active events
CREATE POLICY "Public can read active events"
  ON events FOR SELECT
  USING (status = 'active' OR status = 'completed');

-- Allow creators to manage their own events
CREATE POLICY "Creators can manage their own events"
  ON events FOR ALL
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Ticket types policies
-- Allow creators to manage ticket types for their events
CREATE POLICY "Creators can manage ticket types for their events"
  ON ticket_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = ticket_types.event_id 
      AND events.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = ticket_types.event_id 
      AND events.creator_id = auth.uid()
    )
  );

-- Allow public to read ticket types for active events
CREATE POLICY "Public can read ticket types for active events"
  ON ticket_types FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = ticket_types.event_id 
      AND events.status IN ('active', 'completed')
    )
  );

-- Orders policies
-- Allow users to create orders
CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- Allow users to read their own orders
CREATE POLICY "Users can read their own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

-- Allow creators to read orders for their events
CREATE POLICY "Creators can read orders for their events"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = orders.event_id 
      AND events.creator_id = auth.uid()
    )
  );

-- Tickets policies
-- Allow users to read their own tickets
CREATE POLICY "Users can read their own tickets"
  ON tickets FOR SELECT
  USING (auth.uid() = user_id);

-- Allow creators to read tickets for their events
CREATE POLICY "Creators can read tickets for their events"
  ON tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = tickets.event_id 
      AND events.creator_id = auth.uid()
    )
  );

-- Wallet transactions policies
-- Allow creators to read their own wallet transactions
CREATE POLICY "Creators can read their own wallet transactions"
  ON wallet_transactions FOR SELECT
  USING (auth.uid() = creator_id);

-- QR scans policies
-- Allow authenticated users to insert scan records
CREATE POLICY "Authenticated users can insert scan records"
  ON qr_scans FOR INSERT
  WITH CHECK (auth.uid() = scanned_by);

-- Allow creators to read scans for their events
CREATE POLICY "Creators can read scans for their events"
  ON qr_scans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets 
      JOIN events ON tickets.event_id = events.id
      WHERE tickets.id = qr_scans.ticket_id 
      AND events.creator_id = auth.uid()
    )
  );

