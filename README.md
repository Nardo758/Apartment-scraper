# 🏢 Apartment Scraper Worker

A production-ready Cloudflare Worker that scrapes rental listings from Apartments.com at scale, with built-in job queuing, browser automation, and Supabase integration.

## 🚀 Features

- **Cloudflare Browser Rendering** - Headless Puppeteer for JavaScript-heavy sites
- **Job Queue System** - Durable Objects for long-running scraping tasks
- **Anti-Bot Evasion** - Random user agents, viewport randomization, stealth mode
- **Supabase Integration** - Automatic data persistence with deduplication
- **Pagination Support** - Scrape multiple pages with rate limiting
- **RESTful API** - Simple endpoints for job management
- **Error Handling** - Retry logic and graceful degradation
- **CORS Enabled** - Ready for frontend integration

## 📋 Prerequisites

- Node.js 18+ installed
- Cloudflare account with Workers paid plan (for Browser Rendering)
- Supabase project
- Wrangler CLI: `npm install -g wrangler`

## 🛠️ Setup

### 1. Clone and Install

```bash
cd /path/to/apartment-scraper-worker
npm install
```

### 2. Configure Supabase

1. Create a Supabase project at https://supabase.com
2. Run the schema in Supabase SQL Editor:

```bash
# Copy schema.sql contents and run in Supabase SQL Editor
cat schema.sql
```

3. Get your credentials:
   - Project URL: `https://your-project.supabase.co`
   - Anon Key: Settings → API → anon/public
   - Service Role Key: Settings → API → service_role (keep secret!)

### 3. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `wrangler.toml` and update:

```toml
[vars]
SUPABASE_URL = "https://your-project.supabase.co"
SUPABASE_ANON_KEY = "your-anon-key-here"
```

### 4. Set Secrets

```bash
wrangler secret put SUPABASE_SERVICE_KEY
# Paste your service role key when prompted
```

### 5. Authenticate with Cloudflare

```bash
wrangler login
```

## 🚀 Deployment

### Development (Local)

```bash
npm run dev
# Or
wrangler dev
```

Worker will be available at `http://localhost:8787`

### Production

```bash
npm run deploy
# Or
wrangler deploy
```

Your worker will be deployed to: `https://apartment-scraper.<your-subdomain>.workers.dev`

## 📡 API Reference

### Health Check

```bash
GET /health
```

**Response:**
```json
{
  "service": "Apartment Scraper Worker",
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Start Scraping Job

```bash
POST /api/scrape/start
Content-Type: application/json

{
  "city": "atlanta",
  "state": "ga",
  "filters": {
    "minPrice": 1000,
    "maxPrice": 3000,
    "beds": [1, 2],
    "pets": "allowed"
  },
  "maxPages": 5
}
```

**Response:**
```json
{
  "jobId": "job_1705319400000_abc123",
  "status": "pending",
  "message": "Job started successfully"
}
```

### Get Job Status

```bash
GET /api/scrape/status/:jobId
```

**Response:**
```json
{
  "jobId": "job_1705319400000_abc123",
  "status": "processing",
  "progress": {
    "currentPage": 2,
    "totalPages": 5,
    "listingsScraped": 47
  },
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:31:30.000Z"
}
```

**Status Values:**
- `pending` - Job queued, not started yet
- `processing` - Actively scraping
- `completed` - Finished successfully
- `failed` - Error occurred
- `cancelled` - Job was cancelled

### Get Job Results

```bash
GET /api/scrape/results/:jobId
```

**Response:**
```json
{
  "jobId": "job_1705319400000_abc123",
  "status": "completed",
  "results": [
    {
      "propertyName": "The Pinnacle at Midtown",
      "address": "1234 Peachtree St NE",
      "city": "Atlanta",
      "state": "GA",
      "minPrice": 1500,
      "maxPrice": 2500,
      "beds": 2,
      "baths": 2,
      "sqft": 950,
      "amenities": ["Pool", "Gym", "Pet Friendly"],
      "photos": ["https://...", "https://..."],
      "contactPhone": "(404) 555-0123",
      "websiteUrl": "https://apartments.com/...",
      "sourceUrl": "https://www.apartments.com/atlanta-ga/",
      "scrapedAt": "2024-01-15T10:32:00.000Z"
    }
  ],
  "progress": {
    "currentPage": 5,
    "totalPages": 5,
    "listingsScraped": 103
  }
}
```

### Cancel Job

```bash
POST /api/scrape/cancel/:jobId
```

**Response:**
```json
{
  "message": "Job cancelled successfully"
}
```

### List All Jobs

```bash
GET /api/scrape/list
```

**Response:**
```json
{
  "jobs": [
    {
      "jobId": "job_1705319400000_abc123",
      "status": "completed",
      "request": {
        "city": "atlanta",
        "state": "ga"
      },
      "progress": {
        "listingsScraped": 103
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

## 🧪 Testing

### Run Test Suite

```bash
# Start local dev server first
npm run dev

# In another terminal
./test.sh
```

### Manual Testing with cURL

```bash
# Start a job
curl -X POST http://localhost:8787/api/scrape/start \
  -H "Content-Type: application/json" \
  -d '{
    "city": "austin",
    "state": "tx",
    "maxPages": 3
  }'

# Check status (replace with your job ID)
curl http://localhost:8787/api/scrape/status/job_1705319400000_abc123

# Get results
curl http://localhost:8787/api/scrape/results/job_1705319400000_abc123
```

## 📊 Database Queries

### Search Listings

```sql
-- Find 2-bedroom apartments in Atlanta under $2000
SELECT * FROM search_listings(
  p_city := 'Atlanta',
  p_state := 'GA',
  p_max_price := 2000,
  p_beds := 2
);
```

### View Recent Listings

```sql
SELECT * FROM recent_listings 
WHERE city = 'Atlanta' 
LIMIT 20;
```

### Clean Old Data

```sql
-- Remove listings older than 30 days
SELECT clean_old_listings(30);
```

## ⚙️ Configuration

### Scraper Settings

Edit `src/utils.ts` to customize:

- **User Agents** - Add/remove browser signatures
- **Delay Times** - Adjust `randomDelay()` ranges
- **Viewport Sizes** - Modify `getRandomViewport()`

### Selectors

If Apartments.com changes their HTML structure, update selectors in `src/scraper.ts`:

```typescript
const SELECTORS: ScraperSelectors = {
  listings: 'article.placard, li.mortar-wrapper',
  propertyName: '.property-title, .property-name',
  // ... add alternative selectors
};
```

## 💰 Cost Estimates

### Cloudflare Workers

- **Workers Plan**: $5/month
- **Browser Rendering**: ~$5 per 1M requests (each scrape = ~5-10 requests)
- **Durable Objects**: $0.15 per 1M requests + $0.20 per GB-hour storage

**Example:**
- Scraping 100 cities × 5 pages = 500 jobs/month
- ~5,000 browser requests = ~$0.03
- DO requests: ~$0.0001
- **Total: ~$5.03/month**

### Supabase

- **Free Tier**: 500MB database, 2GB transfer (sufficient for testing)
- **Pro**: $25/month for 8GB database (recommended for production)

## 🔒 Security Best Practices

1. **Use Service Role Key** for production writes
2. **Enable RLS** on Supabase tables if exposing to frontend
3. **Rate Limit** your endpoints (Cloudflare Workers supports this)
4. **Rotate Secrets** regularly via `wrangler secret put`
5. **Monitor Logs** via Cloudflare dashboard

## 🚨 Troubleshooting

### "Browser binding not found"

**Solution:** Make sure you're on a paid Cloudflare Workers plan and have Browser Rendering enabled.

```bash
wrangler whoami
# Check your plan includes Browser Rendering
```

### Selector Not Found

**Solution:** Apartments.com changed their HTML. Update selectors in `src/scraper.ts`.

```bash
# Test selectors manually
wrangler dev
# Navigate to a listing page and inspect elements
```

### Timeout Errors

**Solution:** Reduce `maxPages` or increase worker timeout limits.

```toml
# wrangler.toml
[limits]
cpu_ms = 50000  # 50 seconds
```

### Database Connection Failed

**Solution:** Verify Supabase credentials and enable service role access.

```bash
# Test connection
curl -X GET "https://your-project.supabase.co/rest/v1/scraped_listings?select=count" \
  -H "apikey: your-service-key" \
  -H "Authorization: Bearer your-service-key"
```

## 📈 Scaling Tips

1. **Batch Processing**: Limit to 10-20 listings per worker invocation
2. **Multiple Workers**: Deploy region-specific workers for faster scraping
3. **Caching**: Cache search results in KV storage for repeated queries
4. **Queue Management**: Use separate Durable Object instances per city

## 🛣️ Roadmap

- [ ] Add Zillow scraper
- [ ] Implement webhook notifications
- [ ] Add screenshot capture for listings
- [ ] Support custom CSS selectors via API
- [ ] Email alerts for new listings
- [ ] Telegram bot integration

## 📝 License

MIT License - feel free to use in your projects!

## 🤝 Contributing

Contributions welcome! Please open an issue first to discuss changes.

## 📧 Support

For issues or questions, open a GitHub issue or contact the maintainer.

---

**Built with ❤️ using Cloudflare Workers & Puppeteer**
