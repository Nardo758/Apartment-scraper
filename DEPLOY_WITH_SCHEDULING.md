# Deploy Enhanced Scraper with Scheduling

**Quick deployment guide with cost-optimized scheduling**

---

## Step 1: Deploy Enhanced Scraper (2 min)

```bash
cd /home/leon/clawd/apartment-scraper-worker

# Deploy to Cloudflare Workers
npm run deploy

# Or use wrangler directly:
npx wrangler deploy
```

**Expected output:**
```
✨  Built successfully
📤  Published apartment-scraper
   https://apartment-scraper.WORKER-ID.workers.dev
✨  Cron Triggers:
   - "0 7 * * 0" (Sunday 7 AM UTC = 2 AM EST)
   - "0 7 * * 1-6" (Mon-Sat 7 AM UTC = 2 AM EST)
```

---

## Step 2: Test Enhanced Extraction (3 min)

Test that the enhanced scraper works with new fields:

```bash
# Test property scraping
curl -X POST "https://apartment-scraper.WORKER-ID.workers.dev/scrape-full-browser" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://elora-atlanta.com/",
    "waitTime": 10000,
    "scrollPage": true
  }' | jq '.data | {
    propertyName,
    yearBuilt,
    propertyClass,
    totalUnits,
    currentOccupancyPercent,
    parkingFeeMonthly,
    petRentMonthly,
    leaseRates: .leaseRates[0] | {unitType, price, availableDate, unitStatus}
  }'
```

**Expected output:**
```json
{
  "propertyName": "Elora at Buckhead",
  "yearBuilt": 2018,
  "propertyClass": "A",
  "totalUnits": 250,
  "currentOccupancyPercent": 94.5,
  "parkingFeeMonthly": 15000,
  "petRentMonthly": 2500,
  "leaseRates": {
    "unitType": "Studio",
    "price": 150000,
    "availableDate": "2026-03-15",
    "unitStatus": "available"
  }
}
```

---

## Step 3: Get 500 Atlanta Property URLs (15-30 min)

### Option A: Manual Collection from Listing Sites

**1. Apartments.com:**
```
https://www.apartments.com/atlanta-ga/
- Search with filters (zip codes, neighborhoods)
- Click through to individual property pages
- Copy property URLs
```

**2. Zillow Rentals:**
```
https://www.zillow.com/atlanta-ga/apartments/
- Browse listings
- Copy property URLs
```

**3. Property Management Company Sites:**
- MAA: https://maac.com/properties/?location=atlanta
- Camden: https://www.camdenliving.com/find-an-apartment/atlanta
- Greystar: https://www.greystar.com/find-rentals/atlanta
- Equity Residential: https://www.equityapartments.com/atlanta

### Option B: Automated Discovery (Coming Soon)

Create a property discovery script:

```typescript
// discover-atlanta-properties.ts
// Scrapes listing sites to find property URLs
// Saves to JSON file for batch processing
```

---

## Step 4: Create Property URL List

**File:** `atlanta-properties-500.json`

```json
{
  "properties": [
    {
      "url": "https://elora-atlanta.com/",
      "name": "Elora at Buckhead",
      "priority": 1
    },
    {
      "url": "https://property2.com/",
      "name": "Property 2",
      "priority": 1
    },
    ...
    // 500 total properties
  ]
}
```

---

## Step 5: Initial Bulk Scrape (1-2 hours)

### Option A: Gradual via Cron (Recommended for Cost)

Let the cron triggers handle it:
- **Free tier approach:** Gradual scraping every 4 hours
  - 10 properties per run = 60 properties/day
  - Reaches 500 in ~8 days
  - Cost: **$0** ✅
  
- **Balanced approach:** Daily partial scrapes
  - 100 properties/day
  - Reaches 500 in 5 days
  - Cost: **~$5-10** ✅

### Option B: Manual Bulk Trigger (Faster)

Scrape all 500 immediately (costs more):

```bash
# Create batch request
curl -X POST "https://apartment-scraper.WORKER-ID.workers.dev/scrape-batch" \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://property1.com/",
      "https://property2.com/",
      ...
    ],
    "batchSize": 50,
    "delayMs": 5000,
    "saveToDatabase": true
  }'
```

**Cost estimate:**
- 500 properties
- Smart scraping (70% simple, 20% ScrapingBee, 10% browser)
- **Cost: ~$2-5** for one-time bulk scrape

---

## Step 6: Verify Cron Triggers (1 min)

Check that cron triggers are active:

```bash
# View worker configuration
npx wrangler tail apartment-scraper

# Wait for next scheduled run (check logs)
# Sunday 2 AM EST = full scrape
# Mon-Sat 2 AM EST = partial scrape
```

Or check Cloudflare dashboard:
1. Go to Workers & Pages
2. Click on `apartment-scraper`
3. Click "Triggers" tab
4. Verify cron schedules are listed

---

## Step 7: Monitor Scraping (Ongoing)

### Cloudflare Dashboard

1. **Workers & Pages** → `apartment-scraper`
2. **Analytics** tab:
   - Requests per day
   - CPU time usage
   - Error rate
3. **Logs** (Real-time):
   ```bash
   npx wrangler tail apartment-scraper
   ```

### Supabase Database

Check scraped property count:

```sql
-- Total properties
SELECT COUNT(*) FROM properties;

-- Properties by last scrape date
SELECT 
  DATE(last_scraped) as scrape_date,
  COUNT(*) as property_count
FROM properties
GROUP BY DATE(last_scraped)
ORDER BY scrape_date DESC;

-- Properties with new enhanced fields
SELECT 
  name,
  year_built,
  property_class,
  total_units,
  current_occupancy_percent
FROM properties
WHERE year_built IS NOT NULL
LIMIT 10;
```

---

## Scheduling Options

### Current Setup (wrangler.toml):

```toml
[triggers]
crons = [
  "0 7 * * 0",    # Sunday 2 AM EST: Full scrape (500 properties)
  "0 7 * * 1-6",  # Mon-Sat 2 AM EST: Partial scrape (100 properties/day)
]
```

### Alternative Schedules:

**Option 1: Free Tier Only (Gradual)**
```toml
crons = ["0 */4 * * *"]  # Every 4 hours: 10 properties
# 60 properties/day, 1800/month (stays within free tier)
# Cost: $0/month
```

**Option 2: Daily Full Scrape**
```toml
crons = ["0 7 * * *"]  # Every day at 2 AM EST: 500 properties
# Fresh data daily
# Cost: ~$90/month (expensive)
```

**Option 3: Twice Weekly**
```toml
crons = ["0 7 * * 0,3"]  # Sunday & Wednesday: 500 properties
# Data max 3-4 days old
# Cost: ~$20/month (balanced)
```

**Option 4: Custom Hours**
```toml
crons = ["0 2,8,14,20 * * *"]  # 4 times per day: 125 properties each
# Distributed throughout day
# Cost: ~$90/month
```

---

## Cost Tracking

### Monitor in Cloudflare Dashboard

1. **Workers & Pages** → `apartment-scraper`
2. **Usage** tab:
   - Requests (should be under 100k/day for free)
   - Browser Rendering usage
   - Costs breakdown

### Expected Costs (Monthly):

| Schedule | Properties/Month | Browser Renders | Cost |
|----------|-----------------|-----------------|------|
| Free Tier (4hr) | 1,800 | 200-400 | $0 |
| Conservative (Weekly) | 2,000 | 200-400 | ~$5 |
| Balanced (Daily Partial) | 3,000 | 300-600 | ~$10 |
| Aggressive (Daily Full) | 15,000 | 1,500-3,000 | ~$90 |

---

## Troubleshooting

### Cron triggers not firing

**Check:**
1. Triggers configured in wrangler.toml
2. Worker deployed after adding triggers
3. Scheduled handler implemented in index.ts

**Fix:**
```bash
# Redeploy
npm run deploy
```

### Scraping failures

**Check worker logs:**
```bash
npx wrangler tail apartment-scraper --format pretty
```

**Common issues:**
- Browser automation timeout (increase waitTime)
- Anti-bot detection (add more human-like delays)
- Invalid URLs (validate property list)

### High costs

**Solutions:**
1. Reduce scraping frequency
2. Use smart scraping (fallback tiers)
3. Stay within free tier (gradual scraping)
4. Monitor Browser Rendering usage

---

## Success Metrics

✅ **Deployment successful**  
✅ **Enhanced fields extracting** (yearBuilt, propertyClass, etc.)  
✅ **Cron triggers active**  
✅ **500 properties scraped**  
✅ **Cost under budget** (<$10/month)  
✅ **Data staying fresh** (<7 days old)  

---

## Next Steps

1. ✅ Deploy enhanced scraper
2. ✅ Verify cron triggers active
3. ⏳ Collect 500 Atlanta property URLs
4. ⏳ Initial bulk scrape OR let cron handle gradually
5. ⏳ Monitor costs and adjust schedule if needed
6. ⏳ Add more markets (expand beyond Atlanta)

---

**Ready to deploy!** 🚀📅
