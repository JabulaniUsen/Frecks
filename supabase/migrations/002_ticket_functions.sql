-- Function to increment ticket sold count
CREATE OR REPLACE FUNCTION increment_ticket_sold_count(ticket_type_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE ticket_types
  SET sold_count = sold_count + 1
  WHERE id = ticket_type_id;
END;
$$ LANGUAGE plpgsql;

