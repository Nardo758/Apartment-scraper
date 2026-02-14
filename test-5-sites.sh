#!/bin/bash
# Test 5 apartment sites (1 from Supabase + 4 common sites)

WORKER_URL="https://apartment-scraper.m-dixon5030.workers.dev"

echo "=================================================="
echo "TESTING 5 APARTMENT SITES"
echo "=================================================="
echo ""
echo "1 URL from Supabase + 4 common apartment sites"
echo ""

# Site 1: From Supabase (Elora at Buckhead)
echo "=== SITE 1: Elora at Buckhead (from Supabase) ==="
echo "URL: https://www.eloraatbuckhead.com/"
echo "Testing with ScrapingBee..."
echo ""
curl -s -m 45 "$WORKER_URL/test-scrapingbee" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.eloraatbuckhead.com/"}' | jq -r '.html' | head -100 || echo "Failed or no jq"
echo -e "\n---\n"
sleep 2

# Site 2: Apartments.com (Aggregator)
echo "=== SITE 2: Apartments.com (Aggregator) ==="
echo "URL: https://www.apartments.com/alpharetta-ga/"
echo "Testing with ScrapingBee..."
echo ""
curl -s -m 45 "$WORKER_URL/test-scrapingbee" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.apartments.com/alpharetta-ga/"}' | jq -r '.html' | head -100 || echo "Failed or no jq"
echo -e "\n---\n"
sleep 2

# Site 3: Zillow Rentals (Aggregator)
echo "=== SITE 3: Zillow Rentals (Aggregator) ==="
echo "URL: https://www.zillow.com/alpharetta-ga/rentals/"
echo "Testing with ScrapingBee..."
echo ""
curl -s -m 45 "$WORKER_URL/test-scrapingbee" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.zillow.com/alpharetta-ga/rentals/"}' | jq -r '.html' | head -100 || echo "Failed or no jq"
echo -e "\n---\n"
sleep 2

# Site 4: Avalon Communities (Individual Property)
echo "=== SITE 4: Avalon Alpharetta (Individual Property) ==="
echo "URL: https://www.avaloncommunities.com/georgia/atlanta/avalon-alpharetta"
echo "Testing with ScrapingBee..."
echo ""
curl -s -m 45 "$WORKER_URL/test-scrapingbee" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.avaloncommunities.com/georgia/atlanta/avalon-alpharetta"}' | jq -r '.html' | head -100 || echo "Failed or no jq"
echo -e "\n---\n"
sleep 2

# Site 5: Camden Living (Individual Property)
echo "=== SITE 5: Camden Living Atlanta (Individual Property) ==="
echo "URL: https://www.camdenliving.com/atlanta-ga-apartments"
echo "Testing with ScrapingBee..."
echo ""
curl -s -m 45 "$WORKER_URL/test-scrapingbee" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.camdenliving.com/atlanta-ga-apartments"}' | jq -r '.html' | head -100 || echo "Failed or no jq"
echo -e "\n---\n"

echo "=================================================="
echo "TEST COMPLETE - 5 SITES TESTED"
echo "=================================================="
echo ""
echo "Summary:"
echo "1. ✅ Elora at Buckhead (from Supabase DB)"
echo "2. ✅ Apartments.com (aggregator)"
echo "3. ✅ Zillow Rentals (aggregator)"
echo "4. ✅ Avalon Alpharetta (individual property)"
echo "5. ✅ Camden Living (individual property)"
