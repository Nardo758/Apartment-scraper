# Scraper Enhancement Plan - Phase 3

**Goal:** Extract additional property data needed for admin panel and JEDI RE integration

---

## Current State

**What's Being Captured:**
- ✅ Property name, address, phone, website
- ✅ Lease rates (unit type, sqft, price, lease term, availability)
- ✅ Concessions (type, description, value, terms)
- ✅ Amenities (list of features)
- ✅ PMS type detection (Entrata, RealPage, etc.)

**What's Missing:**
- ❌ Property characteristics (year built, renovated, class, building type)
- ❌ Occupancy data (total units, occupancy %, avg days to lease)
- ❌ Financial data (parking fees, pet rent, application fees, admin fees)
- ❌ Availability dates on lease_rates table
- ❌ Unit status (available/coming_soon/leased)
- ❌ Rent history tracking

---

## Enhancement Strategy

### 1. Property Characteristics Extraction

**Fields to Add:**
- `yearBuilt` (INTEGER) - Construction year
- `yearRenovated` (INTEGER) - Last renovation year
- `propertyClass` ('A' | 'B' | 'C' | 'D') - Market classification
- `buildingType` (VARCHAR) - Garden, mid-rise, high-rise, etc.
- `managementCompany` (VARCHAR) - Property management firm

**Extraction Methods:**

**Year Built:**
```typescript
// Common patterns:
- "Built in 2018"
- "Construction: 2018"
- "Year Built: 2018"
- Schema.org: <meta property="datePublished">
- JSON-LD: { "@type": "Apartment", "yearBuilt": 2018 }
```

**Year Renovated:**
```typescript
- "Renovated 2022"
- "Recently updated in 2022"
- "Modernized 2022"
```

**Property Class:**
```typescript
// Infer from features and pricing:
- Class A: Luxury, premium amenities, high rent/sqft
- Class B: Mid-range, standard amenities, moderate rent
- Class C: Older, basic amenities, lower rent
- Class D: Needs renovation, minimal amenities, budget

Scoring algorithm:
- avgRentPerSqft, yearBuilt, amenityCount, concessionRate
- Class A: >$2.00/sqft, <10 years old, 10+ amenities, <20% concessions
- Class B: $1.50-$2.00/sqft, 10-30 years, 5-10 amenities, 20-40% concessions
- Class C: $1.00-$1.50/sqft, 30-50 years, <5 amenities, >40% concessions
- Class D: <$1.00/sqft, >50 years, minimal amenities, high vacancy
```

**Building Type:**
```typescript
// Extract from text:
- "garden-style apartments"
- "mid-rise community"
- "high-rise luxury"
- "townhome-style"
- "low-rise walk-up"
```

**Management Company:**
```typescript
// Look for:
- Footer text: "Managed by XYZ Properties"
- Contact pages
- "Property Management" sections
- PMS type can hint (Entrata → Greystar, Cushman & Wakefield, etc.)
```

---

### 2. Occupancy & Operations Data

**Fields to Add:**
- `totalUnits` (INTEGER) - Total unit count
- `currentOccupancyPercent` (DECIMAL) - Current occupancy rate
- `avgDaysToLease` (INTEGER) - Average time to lease units

**Extraction Methods:**

**Total Units:**
```typescript
// Common patterns:
- "150 units available"
- "Community of 200 apartments"
- Count lease rates (estimate)
- Schema.org: { "numberOfUnits": 150 }
```

**Occupancy:**
```typescript
// Infer from availability:
- availableUnits / totalUnits = vacancy rate
- occupancy = 100 - vacancy
- Flag if <85% (red flag for JEDI RE)
```

**Avg Days to Lease:**
```typescript
// Difficult to extract directly
// Can track over time:
- Store availability snapshots
- Track when units move from "available" → "leased"
- Calculate average time delta
```

---

### 3. Financial Data Extraction

**Fields to Add:**
- `parkingFeeMonthly` (DECIMAL) - Monthly parking cost
- `petRentMonthly` (DECIMAL) - Monthly pet rent
- `applicationFee` (DECIMAL) - One-time application fee
- `adminFee` (DECIMAL) - Administrative fees

**Extraction Methods:**

**Parking Fees:**
```typescript
// Look for:
- "Parking: $150/month"
- "Reserved parking available for $100"
- "Garage parking: $200/mo"
// Store in cents: 15000 = $150.00
```

**Pet Rent:**
```typescript
// Look for:
- "Pet rent: $25/month"
- "Dogs allowed ($50/pet)"
- Usually in pet policy section
```

**Application Fee:**
```typescript
// Look for:
- "Application fee: $75"
- "$50 non-refundable application fee"
- Usually in lease terms or FAQ
```

**Admin Fee:**
```typescript
// Look for:
- "Administrative fee: $250"
- "$100 one-time admin charge"
- "Move-in fee: $150"
```

---

### 4. Enhanced Lease Rate Tracking

**Fields to Update:**
- `availableDate` (DATE) - When unit becomes available
- `unitStatus` (ENUM) - 'available' | 'coming_soon' | 'leased'

**Extraction Methods:**

**Available Date:**
```typescript
// Parse availability text:
- "Available Now" → CURRENT_DATE
- "Available 3/15/2026" → 2026-03-15
- "Available March 15" → CURRENT_YEAR-03-15
- "Coming Soon" → null (mark as coming_soon status)
```

**Unit Status:**
```typescript
// Determine from text:
- "Available Now" → 'available'
- "Coming Soon" → 'coming_soon'
- "Leased" / "Not Available" → 'leased'
- Default → 'available' if price shown
```

---

### 5. Rent History Tracking

**New Table:** rent_history
- Track every scrape to build trend data
- Insert on every successful property scrape

**Implementation:**
```typescript
// After saving lease rates, also insert to rent_history
for (const rate of leaseRates) {
  await supabase.from('rent_history').insert({
    property_id: propertyId,
    unit_type: rate.unitType,
    rent_amount: rate.price,
    recorded_date: new Date().toISOString(),
    source: data.websiteUrl
  });
}
```

**Benefits:**
- Rent growth trends (90d, 180d)
- Seasonal pricing patterns
- Market heating/cooling signals
- JEDI RE underwriting data

---

## Implementation Steps

### Step 1: Update Type Definitions (10 min)
File: `src/browser-automation.ts`

Add to `PropertyData` interface:
```typescript
export interface PropertyData {
  // ... existing fields ...
  
  // Property characteristics
  yearBuilt?: number;
  yearRenovated?: number;
  propertyClass?: 'A' | 'B' | 'C' | 'D';
  buildingType?: string;
  managementCompany?: string;
  
  // Occupancy & operations
  totalUnits?: number;
  currentOccupancyPercent?: number;
  avgDaysToLease?: number;
  
  // Financial data
  parkingFeeMonthly?: number;  // in cents
  petRentMonthly?: number;     // in cents
  applicationFee?: number;     // in cents
  adminFee?: number;           // in cents
}
```

Add to `LeaseRate` interface:
```typescript
export interface LeaseRate {
  // ... existing fields ...
  availableDate?: string;  // ISO date string
  unitStatus?: 'available' | 'coming_soon' | 'leased';
}
```

---

### Step 2: Extraction Functions (60-90 min)
File: `src/browser-automation.ts`

**Add new extraction functions:**

```typescript
/**
 * Extract property characteristics
 */
async function extractPropertyCharacteristics(page: Page): Promise<{
  yearBuilt?: number;
  yearRenovated?: number;
  buildingType?: string;
  managementCompany?: string;
}> {
  return await page.evaluate(() => {
    const text = document.body.innerText;
    
    // Year Built patterns
    const builtMatch = text.match(/(?:built|constructed)(?:\s+in)?\s+(\d{4})/i);
    const yearBuilt = builtMatch ? parseInt(builtMatch[1]) : undefined;
    
    // Year Renovated patterns
    const renovatedMatch = text.match(/(?:renovated|updated|modernized)(?:\s+in)?\s+(\d{4})/i);
    const yearRenovated = renovatedMatch ? parseInt(renovatedMatch[1]) : undefined;
    
    // Building Type patterns
    const buildingTypeMatch = text.match(/(garden-style|mid-rise|high-rise|townhome|low-rise|walk-up)/i);
    const buildingType = buildingTypeMatch ? buildingTypeMatch[1] : undefined;
    
    // Management Company
    const mgmtMatch = text.match(/(?:managed by|property management[:\s]+)([A-Z][A-Za-z\s&]+(?:Properties|Management|Realty|Group))/i);
    const managementCompany = mgmtMatch ? mgmtMatch[1].trim() : undefined;
    
    return { yearBuilt, yearRenovated, buildingType, managementCompany };
  });
}

/**
 * Calculate property class from features
 */
function calculatePropertyClass(data: {
  avgRentPerSqft?: number;
  yearBuilt?: number;
  amenityCount: number;
  concessionRate?: number;
}): 'A' | 'B' | 'C' | 'D' | undefined {
  const { avgRentPerSqft, yearBuilt, amenityCount, concessionRate } = data;
  
  if (!avgRentPerSqft && !yearBuilt) return undefined;
  
  const age = yearBuilt ? new Date().getFullYear() - yearBuilt : 999;
  const rent = avgRentPerSqft || 0;
  const amenities = amenityCount || 0;
  const concessions = concessionRate || 0;
  
  // Class A: Premium
  if (rent > 2.0 && age < 10 && amenities >= 10 && concessions < 20) {
    return 'A';
  }
  
  // Class B: Mid-range
  if (rent >= 1.5 && age < 30 && amenities >= 5 && concessions < 40) {
    return 'B';
  }
  
  // Class C: Older/Budget
  if (rent >= 1.0 && age < 50) {
    return 'C';
  }
  
  // Class D: Needs work
  return 'D';
}

/**
 * Extract financial data (fees)
 */
async function extractFinancialData(page: Page): Promise<{
  parkingFeeMonthly?: number;
  petRentMonthly?: number;
  applicationFee?: number;
  adminFee?: number;
}> {
  return await page.evaluate(() => {
    const text = document.body.innerText;
    
    // Parking fee
    const parkingMatch = text.match(/parking[:\s]+\$?(\d+)(?:\/mo|per month)?/i);
    const parkingFeeMonthly = parkingMatch ? parseInt(parkingMatch[1]) * 100 : undefined;
    
    // Pet rent
    const petRentMatch = text.match(/pet rent[:\s]+\$?(\d+)(?:\/mo|per month)?/i);
    const petRentMonthly = petRentMatch ? parseInt(petRentMatch[1]) * 100 : undefined;
    
    // Application fee
    const appFeeMatch = text.match(/application fee[:\s]+\$?(\d+)/i);
    const applicationFee = appFeeMatch ? parseInt(appFeeMatch[1]) * 100 : undefined;
    
    // Admin fee
    const adminFeeMatch = text.match(/(?:admin|administrative|move-in) fee[:\s]+\$?(\d+)/i);
    const adminFee = adminFeeMatch ? parseInt(adminFeeMatch[1]) * 100 : undefined;
    
    return { parkingFeeMonthly, petRentMonthly, applicationFee, adminFee };
  });
}

/**
 * Extract total units
 */
async function extractTotalUnits(page: Page, leaseRateCount: number): Promise<number | undefined> {
  const extractedUnits = await page.evaluate(() => {
    const text = document.body.innerText;
    const unitsMatch = text.match(/(\d+)\s+(?:units|apartments)/i);
    return unitsMatch ? parseInt(unitsMatch[1]) : undefined;
  });
  
  // Fallback: estimate from lease rate count (rough approximation)
  return extractedUnits || (leaseRateCount > 0 ? leaseRateCount * 2 : undefined);
}

/**
 * Parse availability date from text
 */
function parseAvailabilityDate(availText: string | null): {
  date?: string;
  status: 'available' | 'coming_soon' | 'leased';
} {
  if (!availText) return { status: 'available' };
  
  const lower = availText.toLowerCase();
  
  if (lower.includes('available now') || lower.includes('immediate')) {
    return { date: new Date().toISOString().split('T')[0], status: 'available' };
  }
  
  if (lower.includes('coming soon')) {
    return { status: 'coming_soon' };
  }
  
  if (lower.includes('leased') || lower.includes('not available')) {
    return { status: 'leased' };
  }
  
  // Try to parse date: "3/15", "March 15", "Mar 15, 2026"
  const dateMatch = availText.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?|([A-Za-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?/);
  if (dateMatch) {
    let year, month, day;
    
    if (dateMatch[1]) {
      // MM/DD or MM/DD/YYYY
      month = parseInt(dateMatch[1]);
      day = parseInt(dateMatch[2]);
      year = dateMatch[3] ? parseInt(dateMatch[3]) : new Date().getFullYear();
    } else if (dateMatch[4]) {
      // "March 15" or "March 15, 2026"
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                          'july', 'august', 'september', 'october', 'november', 'december'];
      month = monthNames.indexOf(dateMatch[4].toLowerCase()) + 1;
      day = parseInt(dateMatch[5]);
      year = dateMatch[6] ? parseInt(dateMatch[6]) : new Date().getFullYear();
    }
    
    if (month && day && year) {
      const date = new Date(year, month - 1, day).toISOString().split('T')[0];
      return { date, status: 'available' };
    }
  }
  
  return { status: 'available' };
}
```

---

### Step 3: Update Main Extraction Function (20 min)
File: `src/browser-automation.ts`

Update `scrapePropertyWithBrowser` to call new functions:

```typescript
// After existing extractions...

// Extract property characteristics
const characteristics = await extractPropertyCharacteristics(page);

// Extract financial data
const financialData = await extractFinancialData(page);

// Calculate occupancy from availability
const availableUnits = leaseRates.filter(r => r.unitStatus === 'available').length;
const totalUnits = await extractTotalUnits(page, leaseRates.length);
const currentOccupancyPercent = totalUnits && availableUnits 
  ? ((totalUnits - availableUnits) / totalUnits) * 100 
  : undefined;

// Calculate property class
const avgRentPerSqft = leaseRates.length > 0
  ? leaseRates.reduce((sum, r) => sum + (r.sqft && r.price ? r.price / r.sqft / 100 : 0), 0) / leaseRates.length
  : undefined;
const propertyClass = calculatePropertyClass({
  avgRentPerSqft,
  yearBuilt: characteristics.yearBuilt,
  amenityCount: amenities.length,
  concessionRate: concessions.length > 0 ? (concessions.length / leaseRates.length) * 100 : 0
});

// Update PropertyData
const propertyData: PropertyData = {
  // ... existing fields ...
  ...characteristics,
  ...financialData,
  propertyClass,
  totalUnits,
  currentOccupancyPercent,
  // ... rest of data ...
};
```

Update lease rate extraction to include availability:

```typescript
// In extractLeaseRates function, for each rate:
const availInfo = parseAvailabilityDate(availText);

leaseRates.push({
  // ... existing fields ...
  availableDate: availInfo.date,
  unitStatus: availInfo.status,
});
```

---

### Step 4: Update Supabase Save Logic (30 min)
File: `src/supabase-v2.ts`

Update `saveProperty` function:

```typescript
const propertyRecord = {
  name: data.propertyName,
  address: data.address,
  city: city || 'Unknown',
  state: state || 'XX',
  
  // NEW FIELDS:
  year_built: data.yearBuilt || null,
  year_renovated: data.yearRenovated || null,
  property_class: data.propertyClass || null,
  building_type: data.buildingType || null,
  management_company: data.managementCompany || null,
  
  total_units: data.totalUnits || null,
  current_occupancy_percent: data.currentOccupancyPercent || null,
  avg_days_to_lease: data.avgDaysToLease || null,
  
  parking_fee_monthly: data.parkingFeeMonthly || null,
  pet_rent_monthly: data.petRentMonthly || null,
  application_fee: data.applicationFee || null,
  admin_fee: data.adminFee || null,
  
  // Keep existing required fields
  bedrooms: 0,
  bathrooms: 1,
  sqft: 0,
  original_price: 0,
  ai_price: 0,
  effective_price: 0,
};
```

Update `saveLeaseRates` function:

```typescript
const records = leaseRates.map(rate => ({
  property_id: propertyId,
  unit_type: rate.unitType,
  sqft: rate.sqft,
  price: rate.price,
  lease_term: rate.leaseTerm,
  available: rate.available,
  available_date: rate.availableDate || null,  // NEW
  unit_status: rate.unitStatus || 'available', // NEW
}));
```

Add `saveRentHistory` function:

```typescript
/**
 * Save rent history records for trend tracking
 */
async function saveRentHistory(
  supabase: SupabaseClient,
  propertyId: string,
  leaseRates: LeaseRate[],
  source: string
): Promise<void> {
  const records = leaseRates.map(rate => ({
    property_id: propertyId,
    unit_type: rate.unitType,
    rent_amount: rate.price,
    recorded_date: new Date().toISOString().split('T')[0],
    source: source,
  }));
  
  const { error } = await supabase
    .from('rent_history')
    .insert(records);
  
  if (error) {
    console.error('Error saving rent history:', error);
  }
}
```

Update `savePropertyData` to call rent history:

```typescript
// After saving lease rates...

// 4. Save rent history
await saveRentHistory(supabase, propertyId, data.leaseRates, data.websiteUrl);

// 5. Save amenities
await saveAmenities(supabase, propertyId, data.amenities);
```

---

### Step 5: Testing (30 min)

**Test Properties:**
1. Elora at Buckhead (known to work)
2. New property with clear year built
3. Property with parking/pet fees
4. Property with "coming soon" units

**Verification:**
- Check `properties` table for new fields populated
- Check `lease_rates` has available_date and unit_status
- Check `rent_history` table has records
- Verify property_class calculation
- Test admin API endpoints return new data

---

## Deployment

1. **Deploy to Cloudflare Workers:**
   ```bash
   cd /home/leon/clawd/apartment-scraper-worker
   npm run deploy
   ```

2. **Run database migration:**
   ```bash
   cd /home/leon/clawd/apartment-locator-ai
   npm run db:push
   ```

3. **Test endpoints:**
   ```bash
   # Scrape test property
   curl -X POST https://apartment-scraper.WORKER-ID.workers.dev/scrape-and-save \
     -H "Content-Type: application/json" \
     -d '{"url": "https://elora-atlanta.com/"}'
   
   # Verify admin API
   curl http://localhost:5000/api/admin/properties?city=Atlanta&state=GA
   ```

---

## Success Criteria

✅ All new fields extracted and saved  
✅ Property class calculated correctly  
✅ Availability dates parsed  
✅ Rent history tracking working  
✅ Admin panel displays new data  
✅ JEDI RE API returns complete market intelligence  

---

## Timeline

- **Step 1-2:** 90 minutes (type definitions + extraction functions)
- **Step 3:** 20 minutes (integrate extractions)
- **Step 4:** 30 minutes (Supabase updates)
- **Step 5:** 30 minutes (testing)

**Total:** ~3 hours

---

## Next Steps After Enhancement

1. **Scraper Automation** - Schedule regular scrapes (daily/weekly)
2. **Data Quality Monitoring** - Track extraction success rates
3. **Coverage Expansion** - Add more property sources
4. **Performance Optimization** - Parallel scraping, caching
5. **Admin Panel Integration** - Display all new fields in UI
