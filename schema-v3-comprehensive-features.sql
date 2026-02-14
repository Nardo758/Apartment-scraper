-- Apartment Scraper V3 Schema - Comprehensive Features
-- Adds 50+ apartment features for detailed matching
-- Run this AFTER schema-v2.sql

-- =============================================
-- PHASE 1: ADD COLUMNS TO EXISTING TABLES
-- =============================================

-- Add bedroom/bathroom counts to lease_rates
ALTER TABLE lease_rates 
  ADD COLUMN IF NOT EXISTS bedrooms INTEGER,
  ADD COLUMN IF NOT EXISTS bathrooms DECIMAL(2,1),
  ADD COLUMN IF NOT EXISTS furnished BOOLEAN DEFAULT FALSE;

-- =============================================
-- PHASE 2: NEW TABLES FOR DETAILED FEATURES
-- =============================================

-- Property-level features (applies to entire building)
CREATE TABLE IF NOT EXISTS property_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Building Amenities
  pool_type VARCHAR(20) DEFAULT 'none', -- 'none', 'indoor', 'outdoor', 'both'
  has_elevator BOOLEAN DEFAULT FALSE,
  has_package_room BOOLEAN DEFAULT FALSE,
  laundry_type VARCHAR(20) DEFAULT 'none', -- 'in-unit', 'in-building', 'shared', 'none'
  has_business_center BOOLEAN DEFAULT FALSE,
  has_rooftop_deck BOOLEAN DEFAULT FALSE,
  has_courtyard BOOLEAN DEFAULT FALSE,
  has_bike_storage BOOLEAN DEFAULT FALSE,
  has_storage_units BOOLEAN DEFAULT FALSE,
  has_controlled_access BOOLEAN DEFAULT FALSE,
  has_doorman BOOLEAN DEFAULT FALSE,
  has_concierge BOOLEAN DEFAULT FALSE,
  
  -- Utilities Included (building-wide policy)
  heat_included BOOLEAN DEFAULT FALSE,
  water_included BOOLEAN DEFAULT FALSE,
  electric_included BOOLEAN DEFAULT FALSE,
  gas_included BOOLEAN DEFAULT FALSE,
  trash_included BOOLEAN DEFAULT FALSE,
  internet_included BOOLEAN DEFAULT FALSE,
  cable_included BOOLEAN DEFAULT FALSE,
  
  -- Pet Policy
  dogs_allowed BOOLEAN DEFAULT FALSE,
  cats_allowed BOOLEAN DEFAULT FALSE,
  pet_size_limit VARCHAR(20), -- 'none', 'small', 'medium', 'large', 'weight_limit'
  pet_weight_limit INTEGER, -- in lbs
  pet_deposit INTEGER, -- one-time deposit in dollars
  pet_rent INTEGER, -- monthly pet rent in dollars
  pet_breed_restrictions BOOLEAN DEFAULT FALSE,
  
  -- Parking
  parking_included BOOLEAN DEFAULT FALSE,
  parking_type VARCHAR(20), -- 'garage', 'covered', 'street', 'mixed', 'none'
  has_ev_charging BOOLEAN DEFAULT FALSE,
  parking_fee INTEGER, -- monthly fee in dollars if not included
  parking_spaces_per_unit DECIMAL(2,1), -- e.g., 1.0, 1.5, 2.0
  
  -- Accessibility
  wheelchair_accessible BOOLEAN DEFAULT FALSE,
  first_floor_available BOOLEAN DEFAULT FALSE,
  ada_compliant BOOLEAN DEFAULT FALSE,
  
  -- Safety & Security
  has_security_system BOOLEAN DEFAULT FALSE,
  has_video_surveillance BOOLEAN DEFAULT FALSE,
  is_gated_community BOOLEAN DEFAULT FALSE,
  has_onsite_security BOOLEAN DEFAULT FALSE,
  has_secure_entry BOOLEAN DEFAULT FALSE,
  
  -- Lease Terms
  short_term_available BOOLEAN DEFAULT FALSE, -- < 6 months
  month_to_month_available BOOLEAN DEFAULT FALSE,
  min_lease_term_months INTEGER DEFAULT 12,
  max_lease_term_months INTEGER,
  
  -- Location Characteristics
  walkability_score INTEGER, -- 0-100 (from Walk Score API if available)
  transit_score INTEGER, -- 0-100
  bike_score INTEGER, -- 0-100
  near_public_transit BOOLEAN,
  transit_distance_miles DECIMAL(4,2),
  near_grocery BOOLEAN,
  grocery_distance_miles DECIMAL(4,2),
  near_parks BOOLEAN,
  quiet_neighborhood BOOLEAN, -- subjective, from reviews/description
  
  -- Application Requirements
  application_fee INTEGER, -- in dollars
  admin_fee INTEGER, -- in dollars
  security_deposit_months DECIMAL(2,1), -- e.g., 1.0 = one month's rent
  
  -- Timestamps
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_property_features UNIQUE(property_id)
);

-- Unit-level features (specific to individual units)
CREATE TABLE IF NOT EXISTS unit_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_rate_id UUID NOT NULL REFERENCES lease_rates(id) ON DELETE CASCADE,
  
  -- Climate Control
  ac_type VARCHAR(20) DEFAULT 'none', -- 'central', 'window', 'portable', 'none'
  heating_type VARCHAR(20), -- 'central', 'radiator', 'heat_pump', 'electric', 'gas'
  
  -- Kitchen Appliances
  has_dishwasher BOOLEAN DEFAULT FALSE,
  has_garbage_disposal BOOLEAN DEFAULT FALSE,
  has_microwave BOOLEAN DEFAULT FALSE,
  has_refrigerator BOOLEAN DEFAULT TRUE,
  has_stove BOOLEAN DEFAULT TRUE,
  stove_type VARCHAR(20), -- 'gas', 'electric', 'induction'
  
  -- Appliances
  washer_dryer VARCHAR(20) DEFAULT 'none', -- 'in-unit', 'hookups', 'none'
  
  -- Outdoor Space
  has_balcony BOOLEAN DEFAULT FALSE,
  has_patio BOOLEAN DEFAULT FALSE,
  balcony_sqft INTEGER,
  
  -- Storage
  has_walk_in_closets BOOLEAN DEFAULT FALSE,
  num_closets INTEGER,
  has_pantry BOOLEAN DEFAULT FALSE,
  
  -- Flooring & Finishes
  has_hardwood_floors BOOLEAN DEFAULT FALSE,
  has_carpet BOOLEAN DEFAULT FALSE,
  has_tile_floors BOOLEAN DEFAULT FALSE,
  
  -- Special Features
  has_fireplace BOOLEAN DEFAULT FALSE,
  fireplace_type VARCHAR(20), -- 'gas', 'electric', 'wood'
  has_high_ceilings BOOLEAN DEFAULT FALSE,
  ceiling_height_feet DECIMAL(3,1),
  
  -- Kitchen Quality
  has_updated_kitchen BOOLEAN DEFAULT FALSE,
  has_stainless_appliances BOOLEAN DEFAULT FALSE,
  countertop_type VARCHAR(20), -- 'granite', 'quartz', 'marble', 'laminate', 'other'
  has_island BOOLEAN DEFAULT FALSE,
  
  -- Bathroom Features
  has_double_vanity BOOLEAN DEFAULT FALSE,
  bathtub_type VARCHAR(20), -- 'standard', 'garden', 'soaking', 'none'
  has_separate_shower BOOLEAN DEFAULT FALSE,
  
  -- Views
  view_type VARCHAR(50), -- 'city', 'water', 'park', 'courtyard', 'street', 'none'
  
  -- Windows
  has_large_windows BOOLEAN DEFAULT FALSE,
  natural_light_rating VARCHAR(20), -- 'excellent', 'good', 'fair', 'limited'
  
  -- Timestamps
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_unit_features UNIQUE(lease_rate_id)
);

-- =============================================
-- PHASE 3: INDEXES FOR FAST QUERIES
-- =============================================

-- Property features indexes
CREATE INDEX IF NOT EXISTS idx_property_features_property ON property_features(property_id);
CREATE INDEX IF NOT EXISTS idx_property_features_dogs ON property_features(dogs_allowed) WHERE dogs_allowed = TRUE;
CREATE INDEX IF NOT EXISTS idx_property_features_cats ON property_features(cats_allowed) WHERE cats_allowed = TRUE;
CREATE INDEX IF NOT EXISTS idx_property_features_parking ON property_features(parking_included);
CREATE INDEX IF NOT EXISTS idx_property_features_laundry ON property_features(laundry_type);
CREATE INDEX IF NOT EXISTS idx_property_features_pool ON property_features(pool_type) WHERE pool_type != 'none';
CREATE INDEX IF NOT EXISTS idx_property_features_utilities ON property_features(heat_included, water_included, electric_included);

-- Unit features indexes
CREATE INDEX IF NOT EXISTS idx_unit_features_lease_rate ON unit_features(lease_rate_id);
CREATE INDEX IF NOT EXISTS idx_unit_features_washer_dryer ON unit_features(washer_dryer) WHERE washer_dryer != 'none';
CREATE INDEX IF NOT EXISTS idx_unit_features_ac ON unit_features(ac_type);
CREATE INDEX IF NOT EXISTS idx_unit_features_balcony ON unit_features(has_balcony) WHERE has_balcony = TRUE;
CREATE INDEX IF NOT EXISTS idx_unit_features_hardwood ON unit_features(has_hardwood_floors) WHERE has_hardwood_floors = TRUE;

-- Lease rates indexes for bedroom/bathroom filters
CREATE INDEX IF NOT EXISTS idx_lease_rates_bedrooms ON lease_rates(bedrooms) WHERE bedrooms IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lease_rates_bathrooms ON lease_rates(bathrooms) WHERE bathrooms IS NOT NULL;

-- =============================================
-- PHASE 4: TRIGGERS
-- =============================================

-- Auto-update timestamp on property_features
CREATE OR REPLACE FUNCTION update_property_features_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_property_features_timestamp ON property_features;
CREATE TRIGGER update_property_features_timestamp
  BEFORE UPDATE ON property_features
  FOR EACH ROW
  EXECUTE FUNCTION update_property_features_timestamp();

-- =============================================
-- PHASE 5: ENHANCED VIEWS
-- =============================================

-- Comprehensive property view with all features
CREATE OR REPLACE VIEW property_listings_comprehensive AS
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
  MIN(lr.bedrooms) as min_bedrooms,
  MAX(lr.bedrooms) as max_bedrooms,
  MIN(lr.bathrooms) as min_bathrooms,
  MAX(lr.bathrooms) as max_bathrooms,
  MIN(lr.sqft) as min_sqft,
  MAX(lr.sqft) as max_sqft,
  COUNT(DISTINCT lr.id) as available_units,
  pf.dogs_allowed,
  pf.cats_allowed,
  pf.parking_included,
  pf.laundry_type,
  pf.pool_type,
  pf.has_elevator,
  pf.heat_included,
  pf.water_included,
  pf.electric_included,
  p.scraped_at,
  p.last_updated
FROM properties p
LEFT JOIN lease_rates lr ON lr.property_id = p.id
LEFT JOIN property_features pf ON pf.property_id = p.id
GROUP BY p.id, p.property_name, p.address, p.city, p.state, p.phone, p.pms_type, 
         p.website_url, p.scraped_at, p.last_updated, pf.dogs_allowed, pf.cats_allowed,
         pf.parking_included, pf.laundry_type, pf.pool_type, pf.has_elevator,
         pf.heat_included, pf.water_included, pf.electric_included;

-- =============================================
-- PHASE 6: ENHANCED SEARCH FUNCTION
-- =============================================

-- Search function with comprehensive filters
CREATE OR REPLACE FUNCTION search_properties_v2(
  p_city VARCHAR DEFAULT NULL,
  p_state VARCHAR DEFAULT NULL,
  p_min_price INTEGER DEFAULT NULL,
  p_max_price INTEGER DEFAULT NULL,
  p_bedrooms INTEGER DEFAULT NULL,
  p_bathrooms DECIMAL DEFAULT NULL,
  p_min_sqft INTEGER DEFAULT NULL,
  p_max_sqft INTEGER DEFAULT NULL,
  p_dogs_allowed BOOLEAN DEFAULT NULL,
  p_cats_allowed BOOLEAN DEFAULT NULL,
  p_parking_included BOOLEAN DEFAULT NULL,
  p_laundry_in_unit BOOLEAN DEFAULT NULL,
  p_has_pool BOOLEAN DEFAULT NULL,
  p_utilities_included BOOLEAN DEFAULT NULL
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
  dogs_allowed BOOLEAN,
  cats_allowed BOOLEAN,
  parking_included BOOLEAN,
  laundry_type VARCHAR,
  utilities_included_count INTEGER
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
      pf.dogs_allowed,
      pf.cats_allowed,
      pf.parking_included,
      pf.laundry_type,
      (CASE WHEN pf.heat_included THEN 1 ELSE 0 END +
       CASE WHEN pf.water_included THEN 1 ELSE 0 END +
       CASE WHEN pf.electric_included THEN 1 ELSE 0 END) as utilities_count
    FROM properties p
    LEFT JOIN lease_rates lr ON lr.property_id = p.id
    LEFT JOIN property_features pf ON pf.property_id = p.id
    WHERE 
      (p_city IS NULL OR p.city ILIKE p_city)
      AND (p_state IS NULL OR p.state ILIKE p_state)
      AND (p_bedrooms IS NULL OR lr.bedrooms = p_bedrooms)
      AND (p_bathrooms IS NULL OR lr.bathrooms >= p_bathrooms)
      AND (p_min_sqft IS NULL OR lr.sqft >= p_min_sqft)
      AND (p_max_sqft IS NULL OR lr.sqft <= p_max_sqft)
      AND (p_dogs_allowed IS NULL OR pf.dogs_allowed = p_dogs_allowed)
      AND (p_cats_allowed IS NULL OR pf.cats_allowed = p_cats_allowed)
      AND (p_parking_included IS NULL OR pf.parking_included = p_parking_included)
      AND (p_laundry_in_unit IS NULL OR (p_laundry_in_unit = TRUE AND pf.laundry_type = 'in-unit'))
      AND (p_has_pool IS NULL OR (p_has_pool = TRUE AND pf.pool_type != 'none'))
    GROUP BY p.id, p.property_name, p.address, p.city, p.state, p.phone,
             pf.dogs_allowed, pf.cats_allowed, pf.parking_included, pf.laundry_type,
             pf.heat_included, pf.water_included, pf.electric_included
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
    pd.dogs_allowed,
    pd.cats_allowed,
    pd.parking_included,
    pd.laundry_type,
    pd.utilities_count
  FROM property_data pd
  WHERE 
    (p_min_price IS NULL OR pd.min_price >= p_min_price)
    AND (p_max_price IS NULL OR pd.max_price <= p_max_price)
    AND (p_utilities_included IS NULL OR (p_utilities_included = TRUE AND pd.utilities_count >= 2))
  ORDER BY pd.min_price ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PHASE 7: DATA MIGRATION HELPERS
-- =============================================

-- Function to parse bedrooms/bathrooms from unit_type
CREATE OR REPLACE FUNCTION migrate_bedrooms_bathrooms()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
  rec RECORD;
BEGIN
  FOR rec IN SELECT id, unit_type FROM lease_rates WHERE bedrooms IS NULL LOOP
    -- Parse "1 Bed 1 Bath" → bedrooms=1, bathrooms=1
    -- Parse "Studio" → bedrooms=0, bathrooms=1
    -- Parse "2 Bed 2 Bath" → bedrooms=2, bathrooms=2
    
    IF rec.unit_type ILIKE '%studio%' THEN
      UPDATE lease_rates SET bedrooms = 0, bathrooms = 1.0 WHERE id = rec.id;
      updated_count := updated_count + 1;
    ELSIF rec.unit_type ~ '\d+\s*[Bb]ed' THEN
      UPDATE lease_rates 
      SET 
        bedrooms = substring(rec.unit_type from '(\d+)\s*[Bb]ed')::INTEGER,
        bathrooms = COALESCE(
          substring(rec.unit_type from '(\d+(?:\.\d+)?)\s*[Bb]ath')::DECIMAL,
          1.0
        )
      WHERE id = rec.id;
      updated_count := updated_count + 1;
    END IF;
  END LOOP;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Display success message
SELECT 'Apartment Scraper V3 - Comprehensive Features schema created successfully!' AS message;
SELECT 'Run: SELECT migrate_bedrooms_bathrooms(); to parse existing unit types.' AS migration_tip;
