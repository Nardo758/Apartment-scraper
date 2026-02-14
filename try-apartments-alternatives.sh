#!/bin/bash
WORKER_URL="https://apartment-scraper.m-dixon5030.workers.dev"

echo "======================================================"
echo "APARTMENTS.COM - ALTERNATIVE APPROACHES"
echo "======================================================"

# Try mobile site
echo -e "\n1️⃣  Trying mobile site (m.apartments.com)"
curl -s -m 45 "$WORKER_URL/test-scrapingbee" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://m.apartments.com/alpharetta-ga/"}' > mobile.json
python3 << 'EOF'
import json
with open('mobile.json') as f:
    data = json.load(f)
    print(f"   Success: {data.get('success')}")
    print(f"   HTML: {len(data.get('html', ''))}")
EOF
sleep 2

# Try with different location format
echo -e "\n2️⃣  Trying different URL format"
curl -s -m 45 "$WORKER_URL/test-scrapingbee" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.apartments.com/atlanta-ga/"}' > atlanta.json
python3 << 'EOF'
import json
with open('atlanta.json') as f:
    data = json.load(f)
    print(f"   Success: {data.get('success')}")
    print(f"   HTML: {len(data.get('html', ''))}")
EOF
sleep 2

# Try sitemap
echo -e "\n3️⃣  Checking sitemap"
curl -s -m 30 "$WORKER_URL/test-scrapingbee" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.apartments.com/sitemap.xml"}' > sitemap.json
python3 << 'EOF'
import json
with open('sitemap.json') as f:
    data = json.load(f)
    print(f"   Success: {data.get('success')}")
    if data.get('success'):
        print(f"   Sitemap accessible: YES")
EOF

echo -e "\n======================================================"
echo "ALTERNATIVES TEST COMPLETE"
echo "======================================================"
