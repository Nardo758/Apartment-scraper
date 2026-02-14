-- Apartment Scraper Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create scraped_listings table
CREATE TABLE IF NOT EXISTS scraped_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Property Information
  property_name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  zip VARCHAR(10),
  
  -- Pricing Information
  min_price INTEGER,
  max_price INTEGER,
  
  -- Unit Information
  beds INTEGER,
  baths DECIMAL(3,1),
  sqft INTEGER,
  
  -- Details
  amenities JSONB DEFAULT '[]'::jsonb,
  photos TEXT[] DEFAULT ARRAY[]::TEXT[],
  contact_phone VARCHAR(20),
  website_url TEXT,
  
  -- Availability
  available_date DATE,
  days_on_market INTEGER,
  special_offers TEXT,
  pet_policy TEXT,
  application_fee VARCHAR(100),
  
  -- Metadata
  source_url TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_address_city_state UNIQUE(address, city, state)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_scraped_city_state 
  ON scraped_listings(city, state);

CREATE INDEX IF NOT EXISTS idx_scraped_price 
  ON scraped_listings(min_price, max_price) 
  WHERE min_price IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scraped_beds 
  ON scraped_listings(beds) 
  WHERE beds IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scraped_baths 
  ON scraped_listings(baths) 
  WHERE baths IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scraped_sqft 
  ON scraped_listings(sqft) 
  WHERE sqft IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scraped_at 
  ON scraped_listings(scraped_at DESC);

CREATE INDEX IF NOT EXISTS idx_scraped_available_date 
  ON scraped_listings(available_date) 
  WHERE available_date IS NOT NULL;

-- Create GIN index for amenities JSONB column for fast searches
CREATE INDEX IF NOT EXISTS idx_scraped_amenities 
  ON scraped_listings USING GIN (amenities);

-- Create function to automatically update last_updated timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last_updated on row updates
DROP TRIGGER IF EXISTS update_scraped_listings_updated_at ON scraped_listings;
CREATE TRIGGER update_scraped_listings_updated_at
  BEFORE UPDATE ON scraped_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create a view for recent listings
CREATE OR REPLACE VIEW recent_listings AS
SELECT 
  id,
  property_name,
  address,
  city,
  state,
  min_price,
  max_price,
  beds,
  baths,
  sqft,
  amenities,
  contact_phone,
  website_url,
  scraped_at
FROM scraped_listings
WHERE scraped_at >= NOW() - INTERVAL '7 days'
ORDER BY scraped_at DESC;

-- Create a view for available listings
CREATE OR REPLACE VIEW available_listings AS
SELECT 
  id,
  property_name,
  address,
  city,
  state,
  min_price,
  max_price,
  beds,
  baths,
  sqft,
  available_date,
  contact_phone,
  website_url
FROM scraped_listings
WHERE 
  available_date IS NULL 
  OR available_date >= CURRENT_DATE
ORDER BY min_price ASC;

-- Create function to search listings
CREATE OR REPLACE FUNCTION search_listings(
  p_city VARCHAR DEFAULT NULL,
  p_state VARCHAR DEFAULT NULL,
  p_min_price INTEGER DEFAULT NULL,
  p_max_price INTEGER DEFAULT NULL,
  p_beds INTEGER DEFAULT NULL,
  p_baths DECIMAL DEFAULT NULL,
  p_amenity TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  property_name VARCHAR,
  address TEXT,
  city VARCHAR,
  state VARCHAR,
  min_price INTEGER,
  max_price INTEGER,
  beds INTEGER,
  baths DECIMAL,
  sqft INTEGER,
  amenities JSONB,
  contact_phone VARCHAR,
  website_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sl.id,
    sl.property_name,
    sl.address,
    sl.city,
    sl.state,
    sl.min_price,
    sl.max_price,
    sl.beds,
    sl.baths,
    sl.sqft,
    sl.amenities,
    sl.contact_phone,
    sl.website_url
  FROM scraped_listings sl
  WHERE 
    (p_city IS NULL OR sl.city ILIKE p_city)
    AND (p_state IS NULL OR sl.state ILIKE p_state)
    AND (p_min_price IS NULL OR sl.min_price >= p_min_price)
    AND (p_max_price IS NULL OR sl.max_price <= p_max_price)
    AND (p_beds IS NULL OR sl.beds >= p_beds)
    AND (p_baths IS NULL OR sl.baths >= p_baths)
    AND (p_amenity IS NULL OR sl.amenities @> jsonb_build_array(p_amenity))
  ORDER BY sl.min_price ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean old listings
CREATE OR REPLACE FUNCTION clean_old_listings(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM scraped_listings
    WHERE scraped_at < NOW() - (days_old || ' days')::INTERVAL
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed for your setup)
-- If you're using Row Level Security (RLS), you may need additional policies

-- Example: Grant access to service role
-- GRANT ALL ON scraped_listings TO service_role;
-- GRANT ALL ON recent_listings TO service_role;
-- GRANT ALL ON available_listings TO service_role;

-- Insert sample data for testing (optional)
-- INSERT INTO scraped_listings (
--   property_name, address, city, state, zip,
--   min_price, max_price, beds, baths, sqft,
--   amenities, contact_phone, website_url, source_url
-- ) VALUES (
--   'Sample Apartments',
--   '123 Main St',
--   'Atlanta',
--   'GA',
--   '30303',
--   1200,
--   1500,
--   2,
--   2.0,
--   950,
--   '["Pool", "Gym", "Pet Friendly"]'::jsonb,
--   '(404) 555-0123',
--   'https://example.com',
--   'https://apartments.com/sample'
-- );

-- Display table info
SELECT 
  'Scraped Listings table created successfully!' AS message,
  COUNT(*) AS current_record_count
FROM scraped_listings;
