-- Backfill creator account balances from existing paid orders
-- This migration calculates the total revenue for each creator and updates their account_balance
-- Service charge (200 naira per order) is excluded from creator earnings

DO $$
DECLARE
  creator_record RECORD;
  total_revenue DECIMAL(10, 2);
  SERVICE_CHARGE CONSTANT DECIMAL(10, 2) := 200.00;
BEGIN
  -- Loop through all creators
  FOR creator_record IN 
    SELECT DISTINCT creator_id 
    FROM events 
    WHERE creator_id IS NOT NULL
  LOOP
    -- Calculate total revenue from paid orders for this creator's events
    -- Subtract service charge from each order (creator gets order amount minus 200 naira)
    SELECT COALESCE(SUM(GREATEST(o.total_amount - SERVICE_CHARGE, 0)), 0)
    INTO total_revenue
    FROM orders o
    INNER JOIN events e ON o.event_id = e.id
    WHERE e.creator_id = creator_record.creator_id
    AND o.payment_status = 'paid';

    -- Update or insert creator profile with calculated balance
    INSERT INTO creator_profiles (user_id, account_balance)
    VALUES (creator_record.creator_id, total_revenue)
    ON CONFLICT (user_id) 
    DO UPDATE SET account_balance = total_revenue;

    -- Create wallet transaction records for existing paid orders (if not already exists)
    -- Amount is order total minus service charge
    INSERT INTO wallet_transactions (creator_id, event_id, order_id, type, amount, status, description, created_at)
    SELECT 
      creator_record.creator_id,
      o.event_id,
      o.id,
      'earning',
      GREATEST(o.total_amount - SERVICE_CHARGE, 0),
      'completed',
      'Ticket sales - Order #' || SUBSTRING(o.id::text, 1, 8),
      o.created_at
    FROM orders o
    INNER JOIN events e ON o.event_id = e.id
    WHERE e.creator_id = creator_record.creator_id
    AND o.payment_status = 'paid'
    AND NOT EXISTS (
      SELECT 1 FROM wallet_transactions wt 
      WHERE wt.order_id = o.id 
      AND wt.type = 'earning'
    );

  END LOOP;
END $$;
