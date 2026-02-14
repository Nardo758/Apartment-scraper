# ⚡ Quick Start Guide

Get your Apartment Scraper running in under 10 minutes!

## Prerequisites

- Node.js 18+ installed
- Cloudflare account (free signup at https://cloudflare.com)
- Supabase account (free at https://supabase.com)

## 🚀 5-Minute Setup

### 1. Install Dependencies (1 min)

```bash
cd apartment-scraper-worker
npm install
npm install -g wrangler
```

### 2. Set Up Supabase (2 min)

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in project details and create
4. Go to SQL Editor
5. Copy and paste the entire contents of `schema.sql`
6. Click "Run"
7. Get your credentials from Settings → API:
   - **Project URL**: Copy this
   - **anon key**: Copy this

### 3. Configure Worker (1 min)

Edit `wrangler.toml` and replace:

```toml
[vars]
SUPABASE_URL = "https://your-project.supabase.co"  # ← Paste your URL
SUPABASE_ANON_KEY = "eyJhbGci..."                   # ← Paste your anon key
```

### 4. Test Locally (1 min)

```bash
npm run dev
```

Open another terminal and test:

```bash
curl http://localhost:8787/health
```

You should see:
```json
{
  "service": "Apartment Scraper Worker",
  "status": "healthy",
  "version": "1.0.0"
}
```

### 5. Run Your First Scrape! (30 seconds)

```bash
curl -X POST http://localhost:8787/api/scrape/start \
  -H "Content-Type: application/json" \
  -d '{
    "city": "atlanta",
    "state": "ga",
    "maxPages": 2
  }'
```

Response:
```json
{
  "jobId": "job_1705319400000_abc123",
  "status": "pending",
  "message": "Job started successfully"
}
```

### 6. Check Results

Wait ~30 seconds for scraping to complete, then:

```bash
# Replace with your actual job ID from step 5
curl http://localhost:8787/api/scrape/status/job_1705319400000_abc123
```

When status is `completed`, get results:

```bash
curl http://localhost:8787/api/scrape/results/job_1705319400000_abc123
```

**Congratulations! 🎉** You just scraped apartment listings!

## 🌍 Deploy to Production

### 1. Login to Cloudflare

```bash
wrangler login
```

### 2. Deploy

```bash
npm run deploy
```

### 3. Test Production

```bash
curl https://apartment-scraper.<your-subdomain>.workers.dev/health
```

## 📱 Use in Your App

### JavaScript/Node.js

```javascript
const client = new ApartmentScraperClient('http://localhost:8787');

const listings = await client.scrapeAndWait({
  city: 'austin',
  state: 'tx',
  maxPages: 3
});

console.log(`Found ${listings.length} listings!`);
```

### Python

```python
from client import ApartmentScraperClient, ScrapeRequest

client = ApartmentScraperClient('http://localhost:8787')

request = ScrapeRequest(
    city='denver',
    state='co',
    max_pages=3
)

listings = client.scrape_and_wait(request)
print(f"Found {len(listings)} listings!")
```

### cURL

```bash
# Start job
JOB_ID=$(curl -X POST http://localhost:8787/api/scrape/start \
  -H "Content-Type: application/json" \
  -d '{"city":"seattle","state":"wa","maxPages":2}' \
  | jq -r '.jobId')

# Wait a bit
sleep 30

# Get results
curl http://localhost:8787/api/scrape/results/$JOB_ID | jq '.results[] | .propertyName'
```

## 🎯 Common Use Cases

### Scrape with Price Filters

```bash
curl -X POST http://localhost:8787/api/scrape/start \
  -H "Content-Type: application/json" \
  -d '{
    "city": "miami",
    "state": "fl",
    "filters": {
      "minPrice": 1500,
      "maxPrice": 2500,
      "beds": [1, 2]
    },
    "maxPages": 5
  }'
```

### Monitor Progress

```bash
# Save job ID
JOB_ID="job_1705319400000_abc123"

# Watch progress (run multiple times)
watch -n 5 "curl -s http://localhost:8787/api/scrape/status/$JOB_ID | jq '.'"
```

### Cancel Running Job

```bash
curl -X POST http://localhost:8787/api/scrape/cancel/job_1705319400000_abc123
```

## 🔍 Query Scraped Data

### In Supabase Dashboard

Go to Table Editor → scraped_listings

### With SQL

```sql
-- Recent listings in Atlanta
SELECT property_name, address, min_price, max_price, beds, baths
FROM scraped_listings
WHERE city = 'Atlanta' AND state = 'GA'
ORDER BY scraped_at DESC
LIMIT 20;

-- Find pet-friendly 2BR under $2000
SELECT property_name, address, min_price, contact_phone
FROM scraped_listings
WHERE beds = 2 
  AND max_price < 2000
  AND pet_policy LIKE '%allowed%'
ORDER BY min_price ASC;
```

### With JavaScript

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const { data, error } = await supabase
  .from('scraped_listings')
  .select('*')
  .eq('city', 'Austin')
  .lte('max_price', 2000)
  .gte('beds', 2)
  .order('min_price', { ascending: true })

console.log(`Found ${data.length} matches`)
```

## 🐛 Troubleshooting

### "Browser binding not found"

**You need Cloudflare Workers Paid plan ($5/month) for Browser Rendering.**

Upgrade: Cloudflare Dashboard → Workers & Pages → Upgrade

### Scraping Fails

Check logs:

```bash
npm run tail
```

Or in Cloudflare Dashboard → Workers & Pages → apartment-scraper → Logs

### No Data in Supabase

1. Check Supabase credentials in `wrangler.toml`
2. Verify schema is installed: Supabase Dashboard → Table Editor → scraped_listings
3. Check service role key is set: `wrangler secret list`

### Worker Timeout

Reduce `maxPages` to 2-3 for faster testing:

```json
{
  "city": "atlanta",
  "state": "ga",
  "maxPages": 2
}
```

## 📚 Next Steps

1. **Read the full [README.md](README.md)** for detailed API documentation
2. **Check [DEPLOYMENT.md](DEPLOYMENT.md)** for production deployment guide
3. **Explore [examples/](examples/)** for client integration code
4. **Customize selectors** in `src/scraper.ts` if needed

## 💡 Pro Tips

### Test Without Browser Rendering

Use the direct scrape endpoint for quick testing (bypasses job queue):

```bash
curl -X POST http://localhost:8787/scrape \
  -H "Content-Type: application/json" \
  -d '{"city":"atlanta","state":"ga","maxPages":1}' | jq '.'
```

⚠️ **Not recommended for production** - use job queue endpoints instead.

### Speed Up Development

```bash
# Skip TypeScript compilation
wrangler dev --local

# Auto-reload on changes
wrangler dev --watch
```

### View Browser Logs

```bash
# Tail logs in real-time
wrangler tail --format pretty
```

## 🎓 Learning Resources

- **Cloudflare Workers**: https://developers.cloudflare.com/workers/
- **Puppeteer**: https://pptr.dev/
- **Supabase**: https://supabase.com/docs

## 🆘 Need Help?

1. Check the [README.md](README.md) FAQ section
2. View logs: `npm run tail`
3. Test health endpoint: `curl http://localhost:8787/health`
4. Review [DEPLOYMENT.md](DEPLOYMENT.md) troubleshooting section

---

**Happy Scraping! 🏢✨**

Built something cool? Share it with the community!
