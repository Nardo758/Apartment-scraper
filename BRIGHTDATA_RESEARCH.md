# BrightData API Options Research

## Problem
Cloudflare Workers' `fetch()` doesn't support HTTP proxy configuration (CONNECT method), so we can't use traditional proxy-based approaches.

## BrightData Products We Tried

### 1. ❌ Residential Proxies + Puppeteer
- **Status**: Blocked by apartments.com  
- **Issue**: Cloudflare Browser Rendering API may not respect proxy args
- **Cost**: $500+/month

### 2. ❌ Web Unlocker (Proxy-based)
- **Status**: 403 Forbidden
- **Issue**: Workers don't support Proxy-Authorization header properly
- **Cost**: $10-50/month

### 3. ⏳ Scraper API (Dataset API)
- **Status**: Async only (requires polling)
- **Issue**: POST → get snapshot_id → poll for results (complex)
- **Cost**: Pay per request

## Alternative Approaches

### Option A: BrightData Scraping Browser (Recommended)
**Product**: https://docs.brightdata.com/scraping-automation/scraping-browser/introduction

**How it works**:
```bash
# Connect via CDP (Chrome DevTools Protocol)
ws://brd-customer-{id}:api_key@brd.superproxy.io:9222
```

**Pros**:
- Managed browser with built-in anti-detection
- Synchronous (connect and scrape)
- Handles CAPTCHAs, fingerprinting automatically

**Cons**:
- More expensive ($50-500/month)
- Requires WebSocket support (Cloudflare Workers DO support WebSockets!)

**Implementation**:
- Use Puppeteer's `puppeteer.connect()` instead of `.launch()`
- Connect to BrightData's browser endpoint
- No need for local browser binary

### Option B: Third-Party Scraping Services
- **ScrapingBee**: $49/month, 50k requests
- **ScraperAPI**: $49/month, 100k requests  
- **Apify**: Pay-as-you-go, pre-built actors

**Pros**:
- Simple REST API
- Synchronous responses
- Built-in retry logic

**Cons**:
- Another vendor dependency
- May be more expensive per request

### Option C: Apartments.com API/Partnerships
- **Official API**: Check if apartments.com has partner API
- **RSS Feeds**: Some sites offer RSS/XML feeds
- **CoStar Data**: apartments.com owned by CoStar (may have data licensing)

**Pros**:
- Legal, reliable, fast
- Structured data (no HTML parsing)

**Cons**:
- Requires business relationship
- Likely expensive
- May not have all data

### Option D: Scrape Individual Property Sites
- **Target**: Property management software sites (Entrata, Yardi, RealPage)
- **Why**: Less aggressive anti-bot than aggregators
- **How**: Each PMS has similar HTML structure across all properties

**Pros**:
- More reliable (less aggressive blocking)
- Higher quality data (from source)
- Can build scrapers per PMS platform

**Cons**:
- Need to discover property websites first
- More scrapers to maintain (one per PMS)

## Recommendation

**Short term (this week)**:
- **Option B (ScrapingBee/ScraperAPI)**: Get data flowing quickly
- Cost: $49-99/month for testing
- Easy integration: simple REST API

**Medium term (next sprint)**:
- **Option A (BrightData Scraping Browser)**: Better long-term solution
- More cost-effective at scale
- Full control over scraping logic

**Long term (production)**:
- **Option D (Property sites)**: Most reliable and scalable
- Build library of PMS-specific scrapers
- Use Option A or B for discovery/fallback

## Next Steps

1. Try ScrapingBee (5-min integration test)
2. If successful, use for MVP data
3. Plan BrightData Scraping Browser implementation
4. Research property website scraping for Q2

## Cost Comparison

| Solution | Setup Time | Monthly Cost | Reliability | Scalability |
|----------|-----------|--------------|-------------|-------------|
| BrightData Proxy | ❌ Blocked | $500+ | Low | High |
| Web Unlocker | ❌ Blocked | $10-50 | Low | Medium |
| Scraping Browser | 2-4 hours | $50-500 | High | High |
| ScrapingBee | 5 minutes | $49-299 | High | Medium |
| Property Sites | 1-2 weeks | $50-200 | Very High | High |

---

**Current Status**: Web Unlocker blocked, need to pivot to Scraping Browser or third-party service.

**Waiting for Leon's decision**: Quick win (ScrapingBee) or invest in Scraping Browser?
