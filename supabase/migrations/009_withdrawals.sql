-- Add account_balance to creator_profiles
ALTER TABLE creator_profiles 
ADD COLUMN IF NOT EXISTS account_balance DECIMAL(10, 2) DEFAULT 0.00;

-- Create withdrawal_status enum
DO $$ BEGIN
  CREATE TYPE withdrawal_status AS ENUM ('pending', 'approved', 'rejected', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  status withdrawal_status DEFAULT 'pending',
  bank_account_name TEXT NOT NULL,
  bank_account_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  bank_code TEXT NOT NULL,
  admin_note TEXT,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for withdrawals
CREATE INDEX IF NOT EXISTS idx_withdrawals_creator_id ON withdrawals(creator_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);

-- Enable RLS on withdrawals
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- Creators can read their own withdrawals
CREATE POLICY "Creators can read their own withdrawals"
  ON withdrawals FOR SELECT
  USING (auth.uid() = creator_id);

-- Creators can insert their own withdrawals
CREATE POLICY "Creators can insert their own withdrawals"
  ON withdrawals FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Admins can read all withdrawals
CREATE POLICY "Admins can read all withdrawals"
  ON withdrawals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Admins can update all withdrawals
CREATE POLICY "Admins can update all withdrawals"
  ON withdrawals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_withdrawals_updated_at 
  BEFORE UPDATE ON withdrawals
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Update transaction_type enum to include withdrawal
DO $$ BEGIN
  ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'withdrawal';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
