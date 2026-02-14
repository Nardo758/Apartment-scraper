# 🚀 Deployment Guide

Complete guide to deploying the Apartment Scraper Worker to production.

## Prerequisites Checklist

- [ ] Cloudflare account with Workers Paid plan ($5/month)
- [ ] Browser Rendering enabled (included in Workers Paid)
- [ ] Supabase account and project created
- [ ] Database schema deployed (schema.sql)
- [ ] Wrangler CLI installed (`npm install -g wrangler`)
- [ ] Node.js 18+ installed

## Step-by-Step Deployment

### 1. Authenticate with Cloudflare

```bash
wrangler login
```

This will open a browser window to authorize wrangler with your Cloudflare account.

### 2. Verify Your Account

```bash
wrangler whoami
```

Make sure you're on the correct account and have the Workers Paid plan.

### 3. Configure Supabase

#### a) Create Database Schema

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy contents of `schema.sql` and execute

#### b) Get Credentials

1. **Project URL**: Settings → API → Project URL
   - Example: `https://abcdefghijk.supabase.co`

2. **Anon Key**: Settings → API → Project API keys → anon/public
   - Safe to embed in client-side code
   - Use for development

3. **Service Role Key**: Settings → API → Project API keys → service_role
   - **Keep secret!** Full database access
   - Use for production writes

### 4. Update wrangler.toml

Edit `wrangler.toml` and replace placeholder values:

```toml
[vars]
SUPABASE_URL = "https://your-actual-project.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 5. Set Production Secrets

**Important:** Never commit secrets to git! Use wrangler secrets:

```bash
wrangler secret put SUPABASE_SERVICE_KEY
# Paste your service role key when prompted
```

To update a secret:

```bash
wrangler secret put SUPABASE_SERVICE_KEY --force
```

To list all secrets (values hidden):

```bash
wrangler secret list
```

### 6. Deploy to Production

```bash
npm run deploy
# Or
wrangler deploy
```

**First deployment output:**
```
Uploaded apartment-scraper (X.XX sec)
Published apartment-scraper (X.XX sec)
  https://apartment-scraper.<your-subdomain>.workers.dev
```

Save this URL! This is your production endpoint.

### 7. Test Production Deployment

```bash
# Health check
curl https://apartment-scraper.<your-subdomain>.workers.dev/health

# Start a test job
curl -X POST https://apartment-scraper.<your-subdomain>.workers.dev/api/scrape/start \
  -H "Content-Type: application/json" \
  -d '{
    "city": "atlanta",
    "state": "ga",
    "maxPages": 2
  }'

# Check job status (replace with returned jobId)
curl https://apartment-scraper.<your-subdomain>.workers.dev/api/scrape/status/job_123456
```

### 8. Monitor Logs

View real-time logs:

```bash
npm run tail
# Or
wrangler tail
```

View logs in Cloudflare dashboard:
- Go to Workers & Pages → apartment-scraper → Logs

## Custom Domain (Optional)

### Option A: Workers Route (Recommended)

1. Go to Cloudflare Dashboard
2. Select your domain
3. Workers Routes → Add Route
4. Route: `api.yourdomain.com/scraper/*`
5. Worker: `apartment-scraper`

### Option B: Custom Domain

1. In Cloudflare Dashboard → Workers & Pages
2. Select `apartment-scraper`
3. Settings → Domains & Routes → Add Custom Domain
4. Enter: `scraper.yourdomain.com`
5. Cloudflare automatically configures DNS

## Environment Management

### Development vs Production

Create separate workers for different environments:

```bash
# Development
wrangler deploy --env dev --name apartment-scraper-dev

# Staging
wrangler deploy --env staging --name apartment-scraper-staging

# Production
wrangler deploy --name apartment-scraper
```

Update `wrangler.toml`:

```toml
[env.dev]
vars = { SUPABASE_URL = "https://dev-project.supabase.co" }

[env.staging]
vars = { SUPABASE_URL = "https://staging-project.supabase.co" }
```

## Post-Deployment Checklist

- [ ] Health endpoint returns 200: `/health`
- [ ] API docs accessible: `/docs`
- [ ] Test job completes successfully
- [ ] Data appears in Supabase
- [ ] Logs show no errors: `wrangler tail`
- [ ] Custom domain configured (if applicable)
- [ ] CORS works for your frontend
- [ ] Rate limiting configured (optional)

## Updating the Worker

### Standard Update

```bash
# Make your code changes
npm run deploy
```

Changes are live immediately (no downtime).

### Rollback

```bash
# View deployment history
wrangler deployments list

# Rollback to specific deployment
wrangler rollback [deployment-id]
```

### Blue-Green Deployment

```bash
# Deploy new version with different name
wrangler deploy --name apartment-scraper-v2

# Test thoroughly
curl https://apartment-scraper-v2.<subdomain>.workers.dev/health

# If good, update routes to point to v2
# If bad, delete v2 worker
```

## Monitoring & Alerts

### Cloudflare Dashboard

Monitor in real-time:
- **Requests/sec**: Workers & Pages → apartment-scraper → Analytics
- **Error Rate**: Look for 5xx responses
- **CPU Time**: Track compute usage
- **Invocation Time**: Average response time

### Set Up Notifications

1. Cloudflare Dashboard → Notifications
2. Create New Notification
3. Select: "Worker exceeds error rate threshold"
4. Configure threshold (e.g., > 5% errors)
5. Add email/webhook for alerts

### Supabase Monitoring

1. Supabase Dashboard → Database → Usage
2. Monitor:
   - Active connections
   - Database size
   - API requests
   - Storage used

## Scaling Considerations

### Workers

- **Default**: 1000 requests/sec per worker
- **Limits**: 50ms CPU time per request
- **Scaling**: Automatic, no configuration needed

### Browser Rendering

- **Limit**: 2 concurrent browser sessions per account
- **Workaround**: Queue jobs in Durable Objects (already implemented)

### Durable Objects

- **Scaling**: Automatically distributes across regions
- **Limit**: 1000 requests/sec per DO instance
- **Best Practice**: Use separate DOs per city/region

### Supabase

- **Free**: 500MB database, good for ~50K listings
- **Pro**: 8GB database, ~800K listings
- **Upgrade**: Settings → Billing → Change Plan

## Cost Optimization

### Reduce Browser Rendering Costs

```typescript
// Limit concurrent scrapers
const MAX_CONCURRENT = 2;
const queue = new PQueue({ concurrency: MAX_CONCURRENT });
```

### Implement Caching

```typescript
// Cache search results for 1 hour
const cache = await caches.open('listings');
const cachedResponse = await cache.match(request);
if (cachedResponse) return cachedResponse;
```

### Use KV for Rate Limiting

```toml
[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "your-kv-namespace-id"
```

## Security Hardening

### 1. Add Authentication

```typescript
const API_KEY = env.API_KEY;
const authHeader = request.headers.get('Authorization');
if (authHeader !== `Bearer ${API_KEY}`) {
  return new Response('Unauthorized', { status: 401 });
}
```

### 2. Rate Limiting

```typescript
const rateLimiter = new RateLimiter({
  limit: 100, // requests
  window: 60, // seconds
});
```

### 3. IP Allowlist

```typescript
const ALLOWED_IPS = ['192.168.1.1', '203.0.113.0'];
const clientIP = request.headers.get('CF-Connecting-IP');
if (!ALLOWED_IPS.includes(clientIP)) {
  return new Response('Forbidden', { status: 403 });
}
```

### 4. Request Signing

Implement HMAC request signing for webhook callbacks.

## Troubleshooting

### Deployment Fails

**Error**: "No access to Browser Rendering"

**Solution**: Upgrade to Workers Paid plan

```bash
# Check current plan
wrangler whoami
```

### Worker Timeout

**Error**: "Script exceeded CPU time limit"

**Solution**: Break scraping into smaller chunks or increase timeout

```toml
[limits]
cpu_ms = 50000
```

### Durable Object Not Found

**Error**: "Durable Object class not found"

**Solution**: Ensure migration is in wrangler.toml:

```toml
[[migrations]]
tag = "v1"
new_classes = ["ScraperJobQueue"]
```

Then redeploy:

```bash
wrangler deploy
```

## Support Resources

- **Cloudflare Workers Docs**: https://developers.cloudflare.com/workers/
- **Browser Rendering Docs**: https://developers.cloudflare.com/browser-rendering/
- **Supabase Docs**: https://supabase.com/docs
- **Wrangler CLI**: https://developers.cloudflare.com/workers/wrangler/

## Next Steps

After successful deployment:

1. **Integrate with Frontend** - Use the API endpoints in your app
2. **Set Up Monitoring** - Configure Cloudflare notifications
3. **Schedule Scraping** - Use Cloudflare Cron Triggers for daily scrapes
4. **Optimize Selectors** - Fine-tune for better data extraction
5. **Add More Cities** - Scale to multiple regions

---

**Deployed Successfully?** 🎉

Time to build amazing rental search features with your new scraping infrastructure!
