#!/bin/bash
WORKER_URL="https://apartment-scraper.m-dixon5030.workers.dev"
URL="https://www.apartments.com/alpharetta-ga/"

echo "======================================================"
echo "APARTMENTS.COM - TESTING MULTIPLE METHODS"
echo "======================================================"
echo ""

# Method 1: ScrapingBee (already failed)
echo "1️⃣  METHOD: ScrapingBee (basic)"
curl -s -m 45 "$WORKER_URL/test-scrapingbee" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$URL\"}" > apt1.json
python3 << 'EOF'
import json
with open('apt1.json') as f:
    data = json.load(f)
    print(f"   Success: {data.get('success')}")
    print(f"   HTML size: {len(data.get('html', '')):,} chars")
    if data.get('error'):
        print(f"   Error: {data.get('error')[:200]}")
EOF
sleep 2

# Method 2: ScrapingBee with premium proxy
echo -e "\n2️⃣  METHOD: ScrapingBee (premium proxy + stealth)"
curl -s -m 45 "$WORKER_URL/test-scrapingbee" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$URL\", \"premium_proxy\": true, \"stealth_proxy\": true}" > apt2.json
python3 << 'EOF'
import json
with open('apt2.json') as f:
    data = json.load(f)
    print(f"   Success: {data.get('success')}")
    print(f"   HTML size: {len(data.get('html', '')):,} chars")
    if data.get('error'):
        print(f"   Error: {data.get('error')[:200]}")
EOF
sleep 2

# Method 3: Web Unlocker
echo -e "\n3️⃣  METHOD: Web Unlocker (Bright Data)"
curl -s -m 60 "$WORKER_URL/test-unlocker" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$URL\", \"country\": \"us\"}" > apt3.json
python3 << 'EOF'
import json
with open('apt3.json') as f:
    data = json.load(f)
    print(f"   Success: {data.get('success')}")
    print(f"   HTML size: {len(data.get('html', '')):,} chars")
    if data.get('error'):
        print(f"   Error: {data.get('error')[:200]}")
EOF
sleep 2

# Method 4: Try a specific property listing
echo -e "\n4️⃣  METHOD: ScrapingBee (specific property page)"
SPECIFIC_URL="https://www.apartments.com/the-reserve-at-old-milton-alpharetta-ga/z2zcqkl/"
curl -s -m 45 "$WORKER_URL/test-scrapingbee" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$SPECIFIC_URL\"}" > apt4.json
python3 << 'EOF'
import json, re
with open('apt4.json') as f:
    data = json.load(f)
    html = data.get('html', '')
    print(f"   Success: {data.get('success')}")
    print(f"   HTML size: {len(html):,} chars")
    if data.get('success'):
        prices = re.findall(r'\$([0-9,]+)', html)
        if prices:
            unique = sorted(set([p for p in prices if int(p.replace(',','')) > 500]), key=lambda x: int(x.replace(',','')))[:10]
            print(f"   Prices found: {len(unique)}")
            for p in unique[:5]:
                print(f"      ${p}")
EOF

echo -e "\n======================================================"
echo "APARTMENTS.COM TEST COMPLETE"
echo "======================================================"
