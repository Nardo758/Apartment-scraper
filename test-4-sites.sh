#!/bin/bash
WORKER_URL="https://apartment-scraper.m-dixon5030.workers.dev"

echo "Testing 4 apartment sites for 12-month lease rates..."
echo "======================================================"

# Site 1: Apartments.com
echo -e "\n1️⃣  APARTMENTS.COM (Aggregator)"
echo "URL: https://www.apartments.com/alpharetta-ga/"
curl -s -m 45 "$WORKER_URL/test-scrapingbee" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.apartments.com/alpharetta-ga/"}' > site1.json
python3 << 'EOF'
import json, re
with open('site1.json') as f:
    data = json.load(f)
    html = data.get('html', '')
    print(f"   Success: {data.get('success')}")
    print(f"   HTML size: {len(html):,} chars")
    prices = re.findall(r'\$([0-9,]+)', html)
    lease_prices = [p for p in set(prices) if int(p.replace(',','')) > 500][:10]
    print(f"   Prices found: {len(lease_prices)} rates")
    for p in sorted(lease_prices, key=lambda x: int(x.replace(',','')))[:8]:
        print(f"      ${p}")
EOF
sleep 2

# Site 2: Zillow
echo -e "\n2️⃣  ZILLOW RENTALS (Aggregator)"
echo "URL: https://www.zillow.com/alpharetta-ga/rentals/"
curl -s -m 45 "$WORKER_URL/test-scrapingbee" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.zillow.com/alpharetta-ga/rentals/"}' > site2.json
python3 << 'EOF'
import json, re
with open('site2.json') as f:
    data = json.load(f)
    html = data.get('html', '')
    print(f"   Success: {data.get('success')}")
    print(f"   HTML size: {len(html):,} chars")
    prices = re.findall(r'\$([0-9,]+)', html)
    lease_prices = [p for p in set(prices) if int(p.replace(',','')) > 500][:10]
    print(f"   Prices found: {len(lease_prices)} rates")
    for p in sorted(lease_prices, key=lambda x: int(x.replace(',','')))[:8]:
        print(f"      ${p}")
EOF
sleep 2

# Site 3: Avalon
echo -e "\n3️⃣  AVALON ALPHARETTA (Individual Property)"
echo "URL: https://www.avaloncommunities.com/georgia/atlanta/avalon-alpharetta"
curl -s -m 45 "$WORKER_URL/test-scrapingbee" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.avaloncommunities.com/georgia/atlanta/avalon-alpharetta"}' > site3.json
python3 << 'EOF'
import json, re
with open('site3.json') as f:
    data = json.load(f)
    html = data.get('html', '')
    print(f"   Success: {data.get('success')}")
    print(f"   HTML size: {len(html):,} chars")
    prices = re.findall(r'\$([0-9,]+)', html)
    lease_prices = [p for p in set(prices) if int(p.replace(',','')) > 500][:10]
    print(f"   Prices found: {len(lease_prices)} rates")
    for p in sorted(lease_prices, key=lambda x: int(x.replace(',','')))[:8]:
        print(f"      ${p}")
    # Look for 12-month
    if '12 month' in html.lower() or '12-month' in html.lower():
        print(f"   ✅ Found '12-month' lease terms!")
EOF
sleep 2

# Site 4: Camden
echo -e "\n4️⃣  CAMDEN LIVING (Individual Property)"
echo "URL: https://www.camdenliving.com/atlanta-ga-apartments"
curl -s -m 45 "$WORKER_URL/test-scrapingbee" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.camdenliving.com/atlanta-ga-apartments"}' > site4.json
python3 << 'EOF'
import json, re
with open('site4.json') as f:
    data = json.load(f)
    html = data.get('html', '')
    print(f"   Success: {data.get('success')}")
    print(f"   HTML size: {len(html):,} chars")
    prices = re.findall(r'\$([0-9,]+)', html)
    lease_prices = [p for p in set(prices) if int(p.replace(',','')) > 500][:10]
    print(f"   Prices found: {len(lease_prices)} rates")
    for p in sorted(lease_prices, key=lambda x: int(x.replace(',','')))[:8]:
        print(f"      ${p}")
    # Look for 12-month
    if '12 month' in html.lower() or '12-month' in html.lower():
        print(f"   ✅ Found '12-month' lease terms!")
EOF

echo -e "\n======================================================"
echo "TEST COMPLETE - All 4 sites tested"
