# Cost Optimization Strategy for Apartment Scraper

**Goal:** Scrape 500 properties in Atlanta at minimal/zero cost

---

## Cost Analysis

### Cloudflare Workers Pricing

**Free Tier:**
- ✅ 100,000 requests/day (FREE)
- ✅ 10ms CPU time/request (FREE)
- ✅ Cron Triggers: FREE
- ✅ Durable Objects: 1M reads/writes FREE

**Browser Rendering:**
- ❌ **NOT FREE** - $5 per 1,000 requests after free tier
- Free tier: 2,000 renders/month (included with Workers Paid)
- Cost after free: $0.005 per render

**Current Strategy:** ✅ We're using browser automation sparingly

---

## Free/Low-Cost Windows

### Option 1: Cloudflare Cron Triggers (FREE!)

Cloudflare Cron Triggers are **100% FREE** and can run on any schedule.

**Recommended Schedule:**
```
# Daily scraping (spread throughout the day)
# 500 properties / 24 hours = ~21 properties/hour

# Scrape 50 properties every 2 hours (12 runs per day)
0 */2 * * *  # Runs at 00:00, 02:00, 04:00, etc.

# Or spread evenly:
# 25 properties 4 times per day (every 6 hours)
0 0,6,12,18 * * *
```

**Why This Works:**
- Cron triggers are FREE
- Stays well under 100k requests/day limit
- Browser renders can be controlled
- No peak hour costs (Cloudflare doesn't have peak pricing)

---

### Option 2: Batch Processing with Rate Limiting

**Strategy:**
- Scrape in batches of 25-50 properties
- Add delays between requests (human-like)
- Use browser rendering only when needed
- Fallback to lightweight scrapers first

**Cost Savings:**
```
500 properties/day at full browser automation:
- 500 browser renders = $2.50/day = $75/month ❌ EXPENSIVE

500 properties/day with smart fallbacks:
- 100 browser renders (20% need full automation)
- 400 lightweight scrapes (HTML fetch only)
- Cost: 100 renders = $0.50/day = $15/month ✅ AFFORDABLE

Using free tier:
- 2,000 browser renders/month (included)
- 500 properties = ~10 browser renders/property (retry logic)
- Can scrape 200 properties/month FREE
- Additional: $0.005 per render beyond free tier
```

---

### Option 3: Intelligent Scraping (RECOMMENDED)

**Tiered Approach:**
1. **Tier 1 - Simple Fetch (Free):** Try HTML fetch first
2. **Tier 2 - ScrapingBee (Paid but cheaper):** If fetch fails
3. **Tier 3 - Browser Automation (Expensive):** Only for stubborn sites

**Implementation:**
```typescript
async function smartScrape(url: string) {
  // Try 1: Simple fetch (FREE)
  try {
    return await simpleFetch(url);
  } catch {
    // Try 2: ScrapingBee (cheaper than browser)
    try {
      return await scrapingBeeWithWait(url);
    } catch {
      // Try 3: Full browser automation (expensive)
      return await browserAutomation(url);
    }
  }
}
```

**Cost Impact:**
- 70% success with simple fetch: FREE
- 20% need ScrapingBee: ~$0.01 per request
- 10% need browser: $0.005 per render
- **Total cost for 500 properties: ~$3-5/day**

---

## Recommended Schedule

### Phase 1: Initial Scrape (One-Time)
**Target:** 500 properties in Atlanta

**Approach:**
- Manual trigger OR single cron job
- Batch size: 50 properties per batch
- Delay between batches: 5 minutes
- Total time: ~1 hour
- Cost: ~$2.50 (if all use browser) or ~$0.50 (with smart fallback)

**Commands:**
```bash
# Deploy enhanced scraper
cd /home/leon/clawd/apartment-scraper-worker
npm run deploy

# Trigger initial scrape (via API)
curl -X POST https://apartment-scraper.WORKER-ID.workers.dev/scrape-batch \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [...],  # List of 500 Atlanta property URLs
    "batchSize": 50,
    "delayMs": 5000
  }'
```

---

### Phase 2: Maintenance Scraping (Ongoing)

**Target:** Keep data fresh, update prices

**Schedule Options:**

**Option A - Daily Updates (Recommended):**
```
# Cron: 0 2 * * * (runs at 2 AM daily)
# Scrapes all 500 properties once per day
# Cost: ~$3-5/day or ~$90-150/month
```

**Option B - Weekly Full + Daily Partials:**
```
# Full scrape: Sunday at 2 AM
0 2 * * 0

# Partial scrape (100 properties/day, rotating): Daily at 2 AM
0 2 * * *  # Rotate through properties, full refresh every 5 days

# Cost: ~$1/day or ~$30/month
```

**Option C - Free Tier Only (200 properties/month):**
```
# Scrape 200 properties per month (stays within free tier)
# 7 properties per day (spread throughout day)
# Cron: Every 4 hours, scrape 2 properties
0 */4 * * *

# Cost: $0/month ✅ COMPLETELY FREE
```

---

## Cloudflare Cron Triggers Setup

### Step 1: Add Cron Triggers to wrangler.toml

```toml
# Add to wrangler.toml

[triggers]
crons = [
  # Daily full scrape at 2 AM EST (7 AM UTC)
  "0 7 * * *",
  
  # OR: Every 4 hours for gradual scraping
  # "0 */4 * * *",
  
  # OR: Twice daily (morning and evening)
  # "0 7,19 * * *"
]
```

### Step 2: Implement Scheduled Handler

```typescript
// In src/index.ts

export default {
  // ... existing fetch handler ...
  
  // Scheduled handler for cron triggers
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log('Cron trigger fired:', event.cron);
    
    // Get list of properties to scrape
    const properties = await getPropertiesToScrape(env);
    
    // Scrape in batches
    const batchSize = 50;
    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = properties.slice(i, i + batchSize);
      
      // Scrape batch
      await scrapeBatch(batch, env);
      
      // Wait between batches (rate limiting)
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 sec
    }
    
    console.log(`Scraped ${properties.length} properties`);
  }
};
```

---

## Atlanta Property Sources

### Where to Get 500 Property URLs

**1. Apartments.com**
- Search: "Atlanta, GA"
- Filter: 500+ results
- Extract URLs from search results

**2. Zillow Rentals**
- Search: "Atlanta, GA apartments"
- Massive inventory
- Extract property URLs

**3. Property Management Companies**
- MAA: ~50 properties in Atlanta
- Camden: ~30 properties
- Greystar: ~40 properties
- Equity Residential: ~25 properties

**4. Direct Property Websites**
- Individual apartment websites
- Most reliable for scraping
- Already have 52+ working

### Automated Discovery

```typescript
// Discover properties from listing sites
async function discoverAtlantaProperties(limit: number = 500) {
  const sources = [
    'https://www.apartments.com/atlanta-ga/',
    'https://www.zillow.com/atlanta-ga/apartments/',
  ];
  
  const propertyUrls: string[] = [];
  
  for (const source of sources) {
    // Scrape listing page
    const listings = await scrapeListing(source);
    propertyUrls.push(...listings.slice(0, limit - propertyUrls.length));
    
    if (propertyUrls.length >= limit) break;
  }
  
  return propertyUrls;
}
```

---

## Deployment Steps

### 1. Deploy Enhanced Scraper

```bash
cd /home/leon/clawd/apartment-scraper-worker
npm run deploy
```

### 2. Set Up Cron Triggers

Add to `wrangler.toml`:
```toml
[triggers]
crons = ["0 7 * * *"]  # Daily at 2 AM EST
```

Redeploy:
```bash
npm run deploy
```

### 3. Initial Bulk Scrape

**Option A - Manual Trigger:**
```bash
# Scrape 500 properties immediately
curl -X POST https://apartment-scraper.WORKER-ID.workers.dev/scrape-batch \
  -H "Content-Type: application/json" \
  -d @atlanta-properties-500.json
```

**Option B - Via Cron (Gradual):**
Let cron handle it over several days (free, but slower)

---

## Cost Summary

### Scenario 1: Aggressive (Daily Full Scrapes)
- **500 properties/day**
- **Browser automation for all**
- **Cost:** ~$75/month ❌ Expensive

### Scenario 2: Balanced (Smart Fallbacks)
- **500 properties/day**
- **70% simple fetch, 20% ScrapingBee, 10% browser**
- **Cost:** ~$15-30/month ✅ Reasonable

### Scenario 3: Conservative (Weekly Full)
- **500 properties/week (70/day)**
- **Smart fallbacks**
- **Cost:** ~$5-10/month ✅ Cheap

### Scenario 4: Free Tier Only
- **200 properties/month**
- **Within Cloudflare free tier**
- **Cost:** $0/month ✅✅ FREE

---

## Recommendation

**Start with Scenario 3 (Conservative):**

1. ✅ Weekly full scrape (500 properties)
2. ✅ Daily rotating partial scrapes (100 properties/day)
3. ✅ Smart scraping (fallback tiers)
4. ✅ Cron triggers (FREE)
5. ✅ ~$5-10/month total cost

**Cron Schedule:**
```toml
[triggers]
crons = [
  "0 7 * * 0",    # Sunday 2 AM EST: Full scrape (500)
  "0 7 * * 1-6"   # Mon-Sat 2 AM EST: Partial (100/day)
]
```

**This gives you:**
- Fresh data (max 7 days old)
- Low cost (~$10/month)
- Stays under free tier for most operations
- Scalable to more properties

---

## Next Steps

1. Deploy enhanced scraper
2. Add cron triggers to wrangler.toml
3. Create property URL list (500 Atlanta properties)
4. Test with 50 properties first
5. Scale to 500 after validation
6. Monitor costs in Cloudflare dashboard

---

**Cost-optimized and ready to scale!** 📈💰
