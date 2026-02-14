# Apartment Scraper Test Results - 5 Sites

**Date:** February 13, 2026, 12:59 PM EST  
**Worker URL:** https://apartment-scraper.m-dixon5030.workers.dev

---

## 📊 Test Results Summary

| # | Site | URL | Status | Method | HTML Size | Prices Found |
|---|------|-----|--------|--------|-----------|--------------|
| 1 | **Elora at Buckhead** | eloraatbuckhead.com | ✅ SUCCESS | ScrapingBee | 100K | 28 unique ($1,728-$2,445) |
| 2 | **Apartments.com** | apartments.com/alpharetta-ga | ❌ FAILED | ScrapingBee | 0 | 0 |
| 3 | **Zillow Rentals** | zillow.com/alpharetta-ga/rentals | ✅ SUCCESS | ScrapingBee | 1.5MB | 137 unique ($800-$10,000) |
| 4 | **Avalon Alpharetta** | avaloncommunities.com | ❌ FAILED | ScrapingBee | 0 | 0 |
| 5 | **Camden Living** | camdenliving.com/atlanta-ga | ❌ FAILED | ScrapingBee | 0 | 0 |

**Success Rate:** 2/5 (40%)

---

## ✅ What Worked

### Route: `/test-scrapingbee`
- **Method:** ScrapingBee API with JavaScript rendering
- **Success rate:** 40% (2 out of 5 sites)
- **Best for:** Individual property websites with moderate JS

### Site #1: Elora at Buckhead ⭐
**What we extracted:**
- ✓ Property name, address, phone
- ✓ Starting prices: $1,728-$2,445+
- ✓ Unit types: Studio, 1BR, 2BR
- ✓ Square footage: 622-792 sqft
- ✓ Office hours, amenities

**12-month lease rates:** ❌ NOT FOUND
- Reason: Uses Entrata API (elan_id: 2241)
- Pricing loads dynamically via AJAX
- Static HTML only shows "From $X" prices

### Site #3: Zillow Rentals ⭐⭐
**What we extracted:**
- ✓ 1.5MB of HTML (rich content!)
- ✓ 137 unique rental prices
- ✓ 82 apartment listings
- ✓ Bedroom info (studios, 1BR, 2BR, 3BR)
- ✓ 113 JSON data blocks with pricing

**12-month lease rates:** ⚠️ PARTIALLY FOUND
- Found 2 mentions of "12-month" leases
- Prices present but need deeper parsing
- Most data loads client-side (React app)

---

## ❌ What Failed

### Apartments.com
- **Error:** Failed to fetch (likely bot detection)
- **Reason:** Heavy anti-scraping protection
- **Solution needed:** Browser automation or residential proxies

### Avalon Alpharetta
- **Error:** Failed to fetch
- **Reason:** Unknown (timeout or blocking)
- **Solution needed:** Retry with browser method

### Camden Living
- **Error:** Failed to fetch
- **Reason:** Unknown (timeout or blocking)
- **Solution needed:** Retry with browser method

---

## 🔍 12-Month Lease Rate Search

### Can we find 12-month lease rates?

**Current status:** ⚠️ **PARTIALLY**

**What we found:**
1. **Elora at Buckhead:** Starting prices only, no specific lease terms
2. **Zillow:** 2 mentions of "12-month" but needs deeper extraction
3. **Others:** Failed to fetch

**Why it's hard:**
1. Most sites load pricing dynamically via AJAX/API
2. Property management systems (Entrata, RealPage) use private APIs
3. Aggregators (Apartments.com, Zillow) are heavily protected
4. Individual properties often hide rates behind "Check Availability"

---

## 💡 Recommendations

### For 12-Month Lease Rates:

**Option 1: Full Browser Automation** (Best for dynamic sites)
- Use `/test-browser` endpoint (Bright Data Scraping Browser)
- Wait 5-10 seconds for JavaScript to load
- Click "Check Availability" buttons
- Extract dynamically loaded pricing

**Option 2: Reverse Engineer APIs** (Best for individual properties)
- Intercept Entrata/RealPage API calls
- Build direct API scrapers
- Much faster once implemented
- Example: Elora uses `elan_id: 2241`

**Option 3: Focus on Aggregators** (Best for scale)
- Fix Apartments.com scraping (biggest aggregator)
- Parse Zillow's React data more thoroughly
- These sites aggregate from hundreds of properties

**Option 4: Hybrid Approach** (Recommended)
- Use ScrapingBee for initial listing discovery
- Use Browser automation for detailed pricing
- Cache results to minimize requests

---

## 🚀 Next Steps

### Immediate (1-2 hours):
1. Fix Apartments.com scraping (try Web Unlocker or Browser method)
2. Deep parse Zillow JSON data for 12-month rates
3. Retry Avalon/Camden with longer timeouts

### Short-term (1 week):
1. Implement browser automation for Entrata sites
2. Build Entrata API reverse-engineering
3. Add retry logic and error handling
4. Create parser for common property management platforms

### Long-term (2-4 weeks):
1. Build scraper for top 10 property management systems
2. Create database of property → management system mapping
3. Implement intelligent routing (ScrapingBee vs Browser vs API)
4. Add rate limiting and proxy rotation

---

## 📝 Files Generated

- `site1.json` - Elora at Buckhead (ScrapingBee)
- `site2.json` - Zillow Rentals (ScrapingBee) - 1.5MB
- `site3.json` - Avalon (failed)
- `site4.json` - Camden (failed)
- `floor-plans.json` - Elora floor plans page
- `scrapingbee-wait.json` - Elora with 5s wait

---

**Tested by:** RocketMan 🚀  
**Location:** /home/leon/clawd/apartment-scraper-worker/
