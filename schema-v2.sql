-- Apartment Scraper V2 Schema (Browser Automation)
-- Supports individual unit lease rates + concessions
-- Run this in your Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Properties table (one row per property)
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Property info
  property_name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100),
  state VARCHAR(2),
  zip VARCHAR(10),
  phone VARCHAR(20),
  
  -- Metadata
  pms_type VARCHAR(50), -- 'entrata', 'realpage', 'yardi', etc.
  website_url TEXT NOT NULL,
  
  -- Tracking
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_website_url UNIQUE(website_url)
);

-- Lease rates table (one row per available unit)
CREATE TABLE IF NOT EXISTS lease_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Unit details
  unit_type VARCHAR(100) NOT NULL, -- "Studio", "1 Bed 1 Bath", etc.
  unit_number VARCHAR(50), -- "A101", etc. (if available)
  sqft INTEGER,
  
  -- Pricing
  price INTEGER NOT NULL, -- Monthly rent in cents (e.g., 172800 = $1,728)
  lease_term VARCHAR(50) DEFAULT '12 month',
  
  -- Availability
  available VARCHAR(100), -- "Now", "Feb 15", "03/01/2026", etc.
  
  -- Tracking
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for fast queries
  CONSTRAINT check_price_positive CHECK (price > 0)
);

-- Concessions table (special offers/discounts)
CREATE TABLE IF NOT EXISTS concessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Concession details
  type VARCHAR(50) NOT NULL, -- 'free_rent', 'waived_fee', 'discount', 'gift_card', 'other'
  description TEXT NOT NULL,
  value VARCHAR(100), -- "$500", "1 month free", "10%", etc.
  terms TEXT, -- Fine print/conditions
  
  -- Tracking
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  active BOOLEAN DEFAULT true
);

-- Amenities table (many-to-many with properties)
CREATE TABLE IF NOT EXISTS amenities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS property_amenities (
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  amenity_id UUID NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
  PRIMARY KEY (property_id, amenity_id)
);

-- ===== INDEXES =====

-- Properties
CREATE INDEX IF NOT EXISTS idx_properties_city_state ON properties(city, state);
CREATE INDEX IF NOT EXISTS idx_properties_pms_type ON properties(pms_type);
CREATE INDEX IF NOT EXISTS idx_properties_scraped_at ON properties(scraped_at DESC);

-- Lease rates
CREATE INDEX IF NOT EXISTS idx_lease_rates_property ON lease_rates(property_id);
CREATE INDEX IF NOT EXISTS idx_lease_rates_price ON lease_rates(price);
CREATE INDEX IF NOT EXISTS idx_lease_rates_sqft ON lease_rates(sqft) WHERE sqft IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lease_rates_unit_type ON lease_rates(unit_type);
CREATE INDEX IF NOT EXISTS idx_lease_rates_scraped_at ON lease_rates(scraped_at DESC);

-- Concessions
CREATE INDEX IF NOT EXISTS idx_concessions_property ON concessions(property_id);
CREATE INDEX IF NOT EXISTS idx_concessions_type ON concessions(type);
CREATE INDEX IF NOT EXISTS idx_concessions_active ON concessions(active) WHERE active = true;

-- ===== TRIGGERS =====

-- Auto-update last_updated on properties
CREATE OR REPLACE FUNCTION update_properties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_properties_updated_at();

-- ===== VIEWS =====

-- Current listings with price range
CREATE OR REPLACE VIEW property_listings AS
SELECT 
  p.id,
  p.property_name,
  p.address,
  p.city,
  p.state,
  p.phone,
  p.pms_type,
  p.website_url,
  MIN(lr.price) as min_price,
  MAX(lr.price) as max_price,
  COUNT(DISTINCT lr.id) as available_units,
  p.scraped_at,
  p.last_updated
FROM properties p
LEFT JOIN lease_rates lr ON lr.property_id = p.id
GROUP BY p.id, p.property_name, p.address, p.city, p.state, p.phone, p.pms_type, p.website_url, p.scraped_at, p.last_updated;

-- Available units with property info
CREATE OR REPLACE VIEW available_units AS
SELECT 
  lr.id,
  p.property_name,
  p.address,
  p.city,
  p.state,
  p.phone,
  lr.unit_type,
  lr.unit_number,
  lr.price / 100.0 as monthly_rent,
  lr.sqft,
  lr.lease_term,
  lr.available,
  lr.scraped_at
FROM lease_rates lr
JOIN properties p ON p.id = lr.property_id
ORDER BY lr.price ASC;

-- Active concessions with property info
CREATE OR REPLACE VIEW active_concessions AS
SELECT 
  c.id,
  p.property_name,
  p.address,
  p.city,
  p.state,
  c.type,
  c.description,
  c.value,
  c.scraped_at
FROM concessions c
JOIN properties p ON p.id = c.property_id
WHERE c.active = true
ORDER BY c.scraped_at DESC;

-- ===== FUNCTIONS =====

-- Function to clean old data
CREATE OR REPLACE FUNCTION clean_old_scraped_data(days_old INTEGER DEFAULT 7)
RETURNS TABLE (
  properties_deleted INTEGER,
  lease_rates_deleted INTEGER,
  concessions_deleted INTEGER
) AS $$
DECLARE
  cutoff_date TIMESTAMP WITH TIME ZONE;
  props_count INTEGER;
  rates_count INTEGER;
  conc_count INTEGER;
BEGIN
  cutoff_date := NOW() - (days_old || ' days')::INTERVAL;
  
  -- Delete old lease rates
  WITH deleted_rates AS (
    DELETE FROM lease_rates
    WHERE scraped_at < cutoff_date
    RETURNING *
  )
  SELECT COUNT(*) INTO rates_count FROM deleted_rates;
  
  -- Delete old concessions
  WITH deleted_conc AS (
    DELETE FROM concessions
    WHERE scraped_at < cutoff_date
    RETURNING *
  )
  SELECT COUNT(*) INTO conc_count FROM deleted_conc;
  
  -- Delete properties with no recent data
  WITH deleted_props AS (
    DELETE FROM properties p
    WHERE NOT EXISTS (
      SELECT 1 FROM lease_rates lr 
      WHERE lr.property_id = p.id AND lr.scraped_at >= cutoff_date
    )
    AND p.last_updated < cutoff_date
    RETURNING *
  )
  SELECT COUNT(*) INTO props_count FROM deleted_props;
  
  RETURN QUERY SELECT props_count, rates_count, conc_count;
END;
$$ LANGUAGE plpgsql;

-- Function to search properties with filters
CREATE OR REPLACE FUNCTION search_properties(
  p_city VARCHAR DEFAULT NULL,
  p_state VARCHAR DEFAULT NULL,
  p_min_price INTEGER DEFAULT NULL,
  p_max_price INTEGER DEFAULT NULL,
  p_min_beds INTEGER DEFAULT NULL,
  p_amenity VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  property_id UUID,
  property_name VARCHAR,
  address TEXT,
  city VARCHAR,
  state VARCHAR,
  phone VARCHAR,
  min_price INTEGER,
  max_price INTEGER,
  available_units BIGINT,
  has_concessions BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH property_data AS (
    SELECT 
      p.id,
      p.property_name,
      p.address,
      p.city,
      p.state,
      p.phone,
      MIN(lr.price) as min_price,
      MAX(lr.price) as max_price,
      COUNT(DISTINCT lr.id) as available_units,
      EXISTS(SELECT 1 FROM concessions c WHERE c.property_id = p.id AND c.active = true) as has_concessions
    FROM properties p
    LEFT JOIN lease_rates lr ON lr.property_id = p.id
    WHERE 
      (p_city IS NULL OR p.city ILIKE p_city)
      AND (p_state IS NULL OR p.state ILIKE p_state)
      AND (p_amenity IS NULL OR EXISTS (
        SELECT 1 FROM property_amenities pa
        JOIN amenities a ON a.id = pa.amenity_id
        WHERE pa.property_id = p.id AND a.name ILIKE '%' || p_amenity || '%'
      ))
    GROUP BY p.id
  )
  SELECT 
    pd.id,
    pd.property_name,
    pd.address,
    pd.city,
    pd.state,
    pd.phone,
    pd.min_price,
    pd.max_price,
    pd.available_units,
    pd.has_concessions
  FROM property_data pd
  WHERE 
    (p_min_price IS NULL OR pd.min_price >= p_min_price)
    AND (p_max_price IS NULL OR pd.max_price <= p_max_price)
  ORDER BY pd.min_price ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Display success message
SELECT 'Apartment Scraper V2 schema created successfully!' AS message;
