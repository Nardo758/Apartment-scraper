# Human-Like Scraping Behavior Features

**Deployed:** February 13, 2026, 1:30 PM EST  
**Version:** 34d9afbe-1385-40d3-9226-f04ff0c402f6

---

## 🎯 New Features Implemented

### 1. **Slower Scraping Speed** ⏱️

**Before:**
- Fast, robotic scraping
- No delays between actions
- ~15-20 seconds per property

**After:**
- Human-like delays throughout
- Random pauses between actions
- **~30-60 seconds per property** (intentionally slower)

**Implementation:**
```typescript
// Random delay function
async function humanDelay(minMs: number = 500, maxMs: number = 2000) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await new Promise(resolve => setTimeout(resolve, delay));
}

// Used throughout:
await humanDelay(1000, 2000);  // 1-2 second pause
await humanDelay(1500, 3000);  // 1.5-3 second pause
await humanDelay(800, 1500);   // 0.8-1.5 second pause
```

**Delays added:**
- ✅ Before navigation (1-2s)
- ✅ After page load (1.5-3s)
- ✅ Between mouse movements (0.2-0.8s)
- ✅ During scrolling (random 200-500ms per scroll)
- ✅ Before data extraction (0.8-1.5s)
- ✅ Between batch requests (3-6s)

---

### 2. **Random Mouse Movements** 🖱️

**Purpose:** Mimic human browsing patterns

**Implementation:**
```typescript
async function randomMouseMovements(page: Page, count: number = 3) {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * 1920);
    const y = Math.floor(Math.random() * 1080);
    
    await page.mouse.move(x, y, { steps: 10 });  // Smooth movement
    await humanDelay(200, 800);  // Random pause
  }
}
```

**When triggered:**
- ✅ After page loads (3 movements)
- ✅ After scrolling (2 movements)
- ✅ Smooth motion with 10 steps (not instant jump)

**Why this matters:**
- Bot detection systems track mouse movement patterns
- Instant jumps = bot
- Smooth, random movements = human

---

### 3. **Human-Like Scrolling** 📜

**Before:**
- Fast, consistent 300px jumps
- 100ms between scrolls
- Instant scroll to top

**After:**
- Smaller 150px scrolls (more natural)
- Random 200-500ms delays between scrolls
- Pauses at bottom (1-2 seconds)
- Slow scroll back to top (200px increments, 100ms delays)

**Implementation:**
```typescript
async function scrollPage(page: Page) {
  // Scroll down slowly
  await page.evaluate(async () => {
    const distance = 150;  // Smaller scrolls
    const scrollDelay = 200 + Math.random() * 300;  // Variable timing
    
    // Scroll gradually
    // ... (see code for full implementation)
  });
  
  // Pause at bottom (1-2 seconds)
  await humanDelay(1000, 2000);
  
  // Scroll back to top slowly
  // ...
}
```

**Benefits:**
- Triggers lazy-loaded content naturally
- Appears more human to detection systems
- Gives page time to load additional data

---

### 4. **Concession Data Extraction** 💰

**New feature:** Extract special offers, discounts, and promotions

**Data captured:**
```typescript
interface Concession {
  type: string;        // "free_rent", "discount", "waived_fee", "gift_card"
  description: string; // Full text of the offer
  value: string;       // "$500", "1 month free", etc.
  terms?: string;      // Fine print/conditions
}
```

**Extraction strategies:**
1. **Banner/card elements** - Special offer banners
2. **Modal/popup content** - Promotional popups
3. **Structured data** - JSON-LD offers metadata
4. **Keyword detection** - Searches for:
   - "special", "offer", "promotion", "deal"
   - "free rent", "waived fee", "move-in"
   - "concession", "incentive", "savings"
   - "gift card", "complimentary", "reduced"

**Concession types detected:**
- `free_rent` - "1 month free", "half month free"
- `waived_fee` - "No admin fee", "Fee waived"
- `discount` - "10% off", "Reduced rent"
- `gift_card` - "$500 gift card"
- `other` - Other promotions

**Where stored:**
- Property-wide concessions: `PropertyData.concessions[]`
- Unit-specific concessions: `LeaseRate.concessions[]`

---

## 🚀 Complete Scraping Flow

### Step-by-Step with Timing

1. **Launch browser** (~2s)
2. **Pause** (1-2s) - Human-like delay before browsing
3. **Navigate to URL** (~5-10s)
4. **Pause** (1.5-3s) - React time after page loads
5. **Random mouse movements** (3 moves, ~2s total)
6. **Wait for dynamic content** (5-10s)
   - Network idle detection
   - Selector waiting
   - Additional buffer
7. **Pause** (1-2s)
8. **Slow scroll down** (~5-8s depending on page length)
9. **Pause at bottom** (1-2s)
10. **Slow scroll back to top** (~3-5s)
11. **Pause** (1-2s)
12. **More mouse movements** (2 moves, ~1s)
13. **Detect PMS type** (<1s)
14. **Extract property info** (~1s)
15. **Pause** (0.8-1.5s)
16. **Extract concessions** (~1-2s)
17. **Pause** (0.8-1.5s)
18. **Extract lease rates** (~2-3s)
19. **Close browser**

**Total time: 30-60 seconds** (highly variable due to random delays)

---

## 📊 Comparison: Before vs After

| Feature | Before | After |
|---------|--------|-------|
| **Total Time** | 15-20s | 30-60s |
| **Mouse Movements** | None | 5 random movements |
| **Scroll Speed** | Fast (300px/100ms) | Slow (150px/200-500ms) |
| **Delays** | Minimal | Throughout (0.5-3s) |
| **Concessions** | ❌ Not extracted | ✅ Extracted |
| **Appears Human** | ⚠️ Robotic | ✅ Natural |

---

## ⚙️ Configuration Options

### Speed Control

```typescript
// Default settings (human-like)
const options = {
  waitTime: 10000,      // 10s for dynamic content
  scrollPage: true,     // Enable scrolling
};

// Faster (less human-like)
const options = {
  waitTime: 5000,       // 5s wait
  scrollPage: false,    // Skip scrolling
};

// Slower (more cautious)
const options = {
  waitTime: 15000,      // 15s wait
  scrollPage: true,
};
```

### Batch Processing

```typescript
// Batch with random delays between properties
const results = await scrapePropertiesBatch(env, urls, 3);

// Delays:
// - Between batches: 3-6 seconds (random)
// - Per property: 30-60 seconds
```

---

## 🎯 Why These Changes Matter

### Bot Detection Bypass
1. **Timing analysis** - Random delays defeat timing fingerprints
2. **Mouse tracking** - Movement patterns appear human
3. **Scroll behavior** - Natural scrolling triggers lazy loading correctly
4. **Speed** - Slower = less suspicious

### Data Quality
1. **Lazy-loaded content** - Slow scrolling ensures all content loads
2. **Concessions captured** - Important pricing data for users
3. **Better extraction** - More time = more complete data

### Rate Limiting
1. **Slower requests** - Less likely to trigger rate limits
2. **Random intervals** - Harder to detect patterns
3. **Batch delays** - 3-6 seconds between batches prevents spikes

---

## 📝 Usage Examples

### Single Property (Slow & Human-like)
```bash
curl -X POST https://apartment-scraper.m-dixon5030.workers.dev/scrape-full-browser \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.eloraatbuckhead.com/floor-plans/",
    "options": {
      "waitTime": 10000,
      "scrollPage": true
    }
  }'
```

**Expected time:** 30-60 seconds

### Batch (Multiple Properties)
```bash
curl -X POST https://apartment-scraper.m-dixon5030.workers.dev/scrape-batch \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://property1.com",
      "https://property2.com",
      "https://property3.com"
    ],
    "concurrency": 3
  }'
```

**Expected time:** 
- 3 properties in parallel: ~30-60s
- Next 3 properties: +3-6s delay, then ~30-60s
- Total: ~1-2 minutes for 6 properties

---

## 🔒 Anti-Detection Features Summary

✅ **Random timing** - All delays are randomized  
✅ **Mouse movements** - Smooth, random movements  
✅ **Natural scrolling** - Variable speed and pauses  
✅ **Realistic viewport** - Standard 1920x1080  
✅ **Proper user agent** - Cloudflare Browser uses real Chrome  
✅ **Wait strategies** - Multiple wait methods (network idle, selectors, timeouts)  
✅ **Pauses between actions** - Mimics human "thinking time"  

---

## 🎉 What's Extracted Now

### Property Data
- ✅ Name, address, phone
- ✅ Property management system
- ✅ Amenities list

### Lease Rates
- ✅ Unit type (Studio, 1BR, 2BR, etc.)
- ✅ Square footage
- ✅ Monthly rent (in cents)
- ✅ Lease term (12 month, etc.)
- ✅ Availability date
- ✅ Unit number (if available)
- ✅ **Unit-specific concessions**

### **NEW: Concessions** 💰
- ✅ Type (free_rent, discount, waived_fee, etc.)
- ✅ Description (full text)
- ✅ Value ($500, 1 month free, etc.)
- ✅ Terms/conditions (if available)
- ✅ Property-wide and unit-specific

---

## 📈 Expected Success Rates

**With human-like behavior:**
- Individual properties: **80-90%** (up from 40%)
- Aggregators: **50-60%** (up from 33%)
- Tough sites (Apartments.com): Still difficult, but improved chances

**Why improvement expected:**
- Less likely to trigger bot detection
- More time for content to load
- Better extraction due to complete page rendering

---

## 🚀 Next Steps

### Immediate
1. ✅ Test new behavior on Elora (running now)
2. ⏳ Test on more properties
3. ⏳ Monitor for bot detection blocks
4. ⏳ Measure success rate improvement

### Short-term
1. Add captcha detection and handling
2. Implement retry logic with exponential backoff
3. Add screenshot capture for debugging
4. Build property-specific extractors (Entrata, RealPage, etc.)

### Long-term
1. Machine learning for natural behavior patterns
2. A/B test different timing strategies
3. Adaptive speed based on site response
4. Build "browsing session" simulation

---

**Status:** 🟢 DEPLOYED and TESTING  
**Version:** 34d9afbe-1385-40d3-9226-f04ff0c402f6  
**Test Script:** `./test-human-behavior.sh`
