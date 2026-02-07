-- Create deleted_events table to store soft-deleted events
CREATE TABLE IF NOT EXISTS deleted_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_event_id UUID NOT NULL,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  image_url TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT NOT NULL,
  is_featured BOOLEAN DEFAULT FALSE,
  status event_status DEFAULT 'cancelled',
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_deleted_events_creator_id ON deleted_events(creator_id);
CREATE INDEX IF NOT EXISTS idx_deleted_events_original_event_id ON deleted_events(original_event_id);

-- Enable RLS
ALTER TABLE deleted_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Creators can read their own deleted events
CREATE POLICY "Creators can read their own deleted events"
  ON deleted_events FOR SELECT
  USING (auth.uid() = creator_id);

-- RLS Policy: Creators can insert their own deleted events
CREATE POLICY "Creators can insert their own deleted events"
  ON deleted_events FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

