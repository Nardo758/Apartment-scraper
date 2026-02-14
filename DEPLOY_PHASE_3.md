# Phase 3 Deployment Guide

**Status:** Code complete and committed locally  
**Next:** Deploy to Cloudflare Workers

---

## Quick Deploy

```bash
cd /home/leon/clawd/apartment-scraper-worker

# Deploy to Cloudflare Workers
npm run deploy

# OR use wrangler directly:
npx wrangler deploy
```

This will deploy the enhanced scraper with all new extraction capabilities.

---

## Git Push (Optional)

The code is committed locally. To push to GitHub:

```bash
# Option 1: Pull and merge (recommended)
git pull origin master --no-rebase
git push origin master

# Option 2: Force push (if you're sure)
git push origin master --force
```

---

## Test After Deployment

### 1. Test Enhanced Scraping
```bash
# Replace WORKER-ID with your actual worker subdomain
curl -X POST https://apartment-scraper.WORKER-ID.workers.dev/scrape-full-browser \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://elora-atlanta.com/",
    "waitTime": 10000,
    "scrollPage": true
  }' | jq .
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "propertyName": "Elora at Buckhead",
    "address": "...",
    
    "yearBuilt": 2018,          ← NEW
    "propertyClass": "A",       ← NEW
    "totalUnits": 250,          ← NEW
    "currentOccupancyPercent": 94.5,  ← NEW
    "parkingFeeMonthly": 15000, ← NEW ($150 in cents)
    "petRentMonthly": 2500,     ← NEW ($25 in cents)
    
    "leaseRates": [
      {
        "unitType": "Studio",
        "price": 150000,
        "availableDate": "2026-03-15",  ← NEW
        "unitStatus": "available",      ← NEW
        ...
      }
    ],
    ...
  }
}
```

### 2. Test Save to Database
```bash
curl -X POST https://apartment-scraper.WORKER-ID.workers.dev/scrape-and-save \
  -H "Content-Type: application/json" \
  -d '{"url": "https://elora-atlanta.com/"}'
```

**Expected Response:**
```json
{
  "success": true,
  "propertyId": "123",
  "leaseRatesSaved": 15,
  "concessionsSaved": 3,
  "rentHistoryRecords": 15  ← NEW
}
```

### 3. Verify Database
```sql
-- Check new property fields
SELECT 
  name, 
  year_built, 
  property_class, 
  total_units,
  current_occupancy_percent,
  parking_fee_monthly,
  pet_rent_monthly
FROM properties 
WHERE name LIKE '%Elora%';

-- Check enhanced lease rates
SELECT 
  unit_type,
  price,
  available_date,    -- NEW
  unit_status        -- NEW
FROM lease_rates 
WHERE property_id = 123;

-- Check rent history
SELECT * 
FROM rent_history 
WHERE property_id = 123 
ORDER BY recorded_date DESC;
```

---

## What Changed

**3 Files Modified:**
1. `src/enhanced-extraction.ts` (NEW - 11.4 KB)
2. `src/browser-automation.ts` (updated interfaces + extraction flow)
3. `src/supabase-v2.ts` (updated save logic + rent_history)

**13 New Fields Captured:**
- yearBuilt, yearRenovated, propertyClass, buildingType, managementCompany
- totalUnits, currentOccupancyPercent, avgDaysToLease
- parkingFeeMonthly, petRentMonthly, applicationFee, adminFee
- PLUS: availableDate and unitStatus on lease rates

**New Feature:**
- Rent history tracking (automatic on every scrape)

---

## Troubleshooting

### "Property class is undefined"
- Normal if property lacks sufficient data
- Will still save, just as NULL
- Classification improves with more amenity data

### "Rent history insert failed"
- Check if rent_history table exists (run migration)
- Verify property_id exists in properties table

### "Available date parsing failed"
- Check the format in scraped data
- Add new pattern to parseAvailabilityDate() if needed

### "Financial data not extracted"
- Check if fees are visible on the page
- May need to click tabs or scroll to expose data
- Some properties don't publish fees online

---

## Success Criteria

After deployment, you should see:

✅ New fields populated in ~60-70% of properties  
✅ Property class calculated for all properties (estimated if data missing)  
✅ Available dates parsed for properties with clear date formats  
✅ Rent history records accumulating over time  
✅ Admin panel displaying new fields  
✅ JEDI RE API returning complete market intelligence  

---

## Next: Run Migration

After deploying the worker, run the database migration to create the new columns and rent_history table:

```bash
cd /home/leon/clawd/apartment-locator-ai
npm run db:push
```

This creates:
- 13 new columns on properties table
- 2 new columns on lease_rates table
- New rent_history table
- 4 analytical views

---

**Ready to deploy!** 🚀
