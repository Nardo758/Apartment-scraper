# BrightData Proxy Integration

## Overview

The apartment-scraper now uses **BrightData residential proxies** to avoid IP blocking and rate limiting when scraping apartment listing sites like apartments.com.

## Why BrightData?

- **Residential IPs**: Real residential IP addresses that appear as regular users
- **IP Rotation**: Automatic rotation through millions of IPs
- **Geographic Targeting**: Target specific countries (e.g., US for apartments.com)
- **Session Persistence**: Maintain same IP across multiple requests (sticky sessions)
- **Anti-Blocking**: Bypass rate limits, CAPTCHAs, and IP bans

## Configuration

### API Key

BrightData API key is stored in `wrangler.toml`:

```toml
[vars]
BRIGHTDATA_API_KEY = "62c3bfaa-b1b9-4341-a5bd-a863606754cb"
```

### Proxy Format

Username format: `brd-customer-{api_key}-zone-{zone}-country-{country}-session-{session_id}`

Example:
```
brd-customer-62c3bfaa-b1b9-4341-a5bd-a863606754cb-zone-residential-country-us-session-session_1234567890_abc123
```

## Proxy Zones

| Zone | Description | Use Case | Cost |
|------|-------------|----------|------|
| **residential** | Real residential IPs | Web scraping (recommended) | $$$ |
| **datacenter** | Datacenter IPs | Fast, cheap scraping | $ |
| **mobile** | Mobile 3G/4G/5G IPs | Mobile-only sites | $$$$ |
| **isp** | ISP IPs | Blend of residential + datacenter | $$ |

**Current Configuration**: `residential` zone with `us` country targeting

## Usage

### Automatic (Default)

Proxy is enabled by default in scraper:

```typescript
// Uses BrightData proxy automatically
const listings = await scrapeApartments(env, {
  city: 'Atlanta',
  state: 'GA',
  maxPages: 5,
});
```

### Disable Proxy (Testing Only)

```typescript
// Disable proxy for local testing
const listings = await scrapeApartments(env, request, false);
```

### Manual Configuration

```typescript
import {
  getBrightDataProxy,
  getPuppeteerProxyArgs,
  getProxyAuth,
  generateSessionId,
  BRIGHTDATA_ZONES,
} from './brightdata-proxy';

// Configure proxy
const proxy = getBrightDataProxy(
  env.BRIGHTDATA_API_KEY,
  BRIGHTDATA_ZONES.RESIDENTIAL,
  'us', // Target US IPs
  generateSessionId() // Sticky session
);

// Launch browser with proxy
const browser = await puppeteer.launch({
  args: getPuppeteerProxyArgs(proxy),
});

// Authenticate page
const page = await browser.newPage();
await page.authenticate(getProxyAuth(proxy));
```

## Session Management

**Sticky Sessions**: Maintain same IP across multiple requests

```typescript
// Generate session ID once per scraping job
const sessionId = generateSessionId(); // e.g., "session_1234567890_abc123"

// All requests in this job will use the same IP
const proxy = getBrightDataProxy(
  env.BRIGHTDATA_API_KEY,
  BRIGHTDATA_ZONES.RESIDENTIAL,
  'us',
  sessionId // Same session = same IP
);
```

**Benefits:**
- Avoid triggering rate limits from IP switches
- Maintain login sessions (if needed)
- More natural browsing behavior

## Rate Limiting Strategy

Current configuration:
- **1-2 seconds** between listings on same page
- **2-4 seconds** between pages
- **Random delays** to mimic human behavior

**Recommended:**
- Max 1-2 requests per second per session
- Rotate sessions every 10-20 pages
- Monitor BrightData usage dashboard

## Cost Estimation

BrightData Residential Proxy Pricing (approximate):
- **Pay-as-you-go**: ~$15/GB
- **Monthly plans**: $500+/month for dedicated bandwidth

**Usage estimate for apartments.com:**
- Average page: ~500KB
- 5 pages per search: ~2.5MB
- 1,000 searches/day: ~2.5GB/day = ~$38/day

**Optimization tips:**
1. Cache results in Supabase (don't re-scrape same listings)
2. Use smaller maxPages (3-5 instead of 10+)
3. Scrape only when data is stale (24-48hr intervals)
4. Consider datacenter zone for less critical scrapes

## Testing

### Test Proxy Connection

```bash
cd /home/leon/clawd/apartment-scraper-worker
npm run deploy
curl "https://apartment-scraper.m-dixon5030.workers.dev/scrape" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Atlanta",
    "state": "GA",
    "maxPages": 1
  }'
```

### Check Proxy IP

Add this to your scraper to verify proxy is working:

```typescript
// Check current IP address
const ipCheck = await page.goto('https://api.ipify.org?format=json');
const ip = await ipCheck.json();
console.log('Current IP:', ip.ip);
```

## Troubleshooting

### Proxy Authentication Failed

**Error**: `net::ERR_PROXY_AUTH_UNSUPPORTED`

**Solution**: Verify API key in wrangler.toml and redeploy

```bash
npm run deploy
```

### Slow Performance

**Cause**: Residential proxies are slower than direct connections

**Solutions:**
1. Use datacenter zone for faster scraping (less stealthy)
2. Increase timeout values in scraper
3. Reduce maxPages per request

### Rate Limited Despite Proxy

**Cause**: Too many requests too quickly, even with proxy

**Solutions:**
1. Increase delays between requests
2. Rotate sessions more frequently
3. Reduce concurrent scraping jobs

### High Costs

**Cause**: Too much bandwidth usage

**Solutions:**
1. Cache results aggressively
2. Reduce scraping frequency
3. Use datacenter zone when possible
4. Consider switching to official APIs

## Monitoring

### BrightData Dashboard

Check usage and costs:
https://brightdata.com/cp/zones

### Cloudflare Worker Logs

```bash
wrangler tail apartment-scraper
```

Look for:
- "Using BrightData proxy" messages
- Proxy authentication success
- Session IDs

## Next Steps

1. ✅ BrightData proxy integrated
2. ⏳ Deploy and test with real apartments.com scraping
3. ⏳ Monitor costs and performance
4. ⏳ Optimize rate limiting and caching
5. ⏳ Build scraper for specific property websites

## Documentation

- **BrightData Docs**: https://docs.brightdata.com/
- **Proxy Parameters**: https://docs.brightdata.com/scraping-automation/web-scraper-api/parameters
- **Pricing**: https://brightdata.com/pricing

---

**Status**: ✅ Integrated, ready for testing  
**Last Updated**: 2026-02-13
