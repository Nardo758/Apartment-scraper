#!/bin/bash
# Test full browser automation with proper session management

WORKER_URL="https://apartment-scraper.m-dixon5030.workers.dev"

echo "======================================================================="
echo "FULL BROWSER AUTOMATION TEST"
echo "======================================================================="
echo ""
echo "Testing enhanced browser automation with:"
echo "  • Proper session management"
echo "  • Wait for AJAX/React to load"
echo "  • Extract 12-month lease rates"
echo "  • Detect property management systems"
echo ""

# Test 1: Elora at Buckhead (Entrata system)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: Elora at Buckhead (Individual Property - Entrata PMS)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "URL: https://www.eloraatbuckhead.com/floor-plans/"
echo "Expected: 12-month lease rates for Studio, 1BR, 2BR"
echo ""

curl -s -m 90 "$WORKER_URL/scrape-full-browser" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.eloraatbuckhead.com/floor-plans/",
    "options": {
      "waitTime": 10000,
      "scrollPage": true
    }
  }' | python3 << 'EOF'
import json
import sys

try:
    data = json.load(sys.stdin)
    
    if not data.get('success'):
        print(f"❌ FAILED: {data.get('error', 'Unknown error')}")
        if 'stack' in data:
            print(f"\nStack trace:\n{data['stack']}")
        sys.exit(1)
    
    result = data['data']
    
    print(f"✅ SUCCESS!")
    print(f"\n📍 Property Information:")
    print(f"   Name: {result.get('propertyName', 'N/A')}")
    print(f"   Address: {result.get('address', 'N/A')}")
    print(f"   Phone: {result.get('phone', 'N/A')}")
    print(f"   PMS Type: {result.get('pmsType', 'unknown')}")
    
    lease_rates = result.get('leaseRates', [])
    print(f"\n💰 Lease Rates Found: {len(lease_rates)}")
    
    if lease_rates:
        print("\n   Unit Type           Rent/Month    Sqft    Term        Available")
        print("   " + "─" * 70)
        for rate in lease_rates[:10]:
            unit = rate.get('unitType', 'Unknown')
            price_cents = rate.get('price', 0)
            price = f"${price_cents / 100:,.0f}"
            sqft = str(rate.get('sqft') or 'N/A')
            term = rate.get('leaseTerm', 'N/A')
            avail = rate.get('available', 'N/A')
            
            print(f"   {unit:<20} {price:<13} {sqft:<7} {term:<11} {avail}")
    else:
        print("\n   ⚠️  No lease rates found")
        if result.get('rawHTML'):
            print(f"   📄 Captured HTML (first 500 chars):")
            print(f"   {result['rawHTML'][:500]}...")
    
    amenities = result.get('amenities', [])
    if amenities:
        print(f"\n🏢 Amenities ({len(amenities)}):")
        for amenity in amenities[:10]:
            print(f"   • {amenity}")
    
    print(f"\n🕐 Scraped at: {result.get('scrapedAt', 'N/A')}")
    
except json.JSONDecodeError as e:
    print(f"❌ JSON parse error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
sleep 3

# Test 2: Different property (optional)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: Zillow Rental Listing (Aggregator)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "URL: https://www.zillow.com/alpharetta-ga/rentals/"
echo ""

curl -s -m 90 "$WORKER_URL/scrape-full-browser" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.zillow.com/alpharetta-ga/rentals/",
    "options": {
      "waitTime": 10000,
      "scrollPage": true
    }
  }' | python3 << 'EOF'
import json
import sys

try:
    data = json.load(sys.stdin)
    
    if not data.get('success'):
        print(f"❌ FAILED: {data.get('error', 'Unknown error')}")
        sys.exit(1)
    
    result = data['data']
    lease_rates = result.get('leaseRates', [])
    
    print(f"✅ SUCCESS!")
    print(f"\n💰 Lease Rates Found: {len(lease_rates)}")
    
    if lease_rates:
        print("\n   Top 10 listings:")
        for i, rate in enumerate(lease_rates[:10], 1):
            unit = rate.get('unitType', 'Unknown')
            price_cents = rate.get('price', 0)
            price = f"${price_cents / 100:,.0f}"
            print(f"   {i}. {unit} - {price}/mo")
    else:
        print("   ⚠️  No lease rates extracted")
    
except Exception as e:
    print(f"❌ Error: {e}")
EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "======================================================================="
echo "TEST COMPLETE"
echo "======================================================================="
echo ""
echo "Summary:"
echo "  • Enhanced browser automation deployed"
echo "  • Proper AJAX/React wait implemented"
echo "  • 12-month lease rate extraction active"
echo "  • Property management system detection enabled"
echo ""
echo "Next steps:"
echo "  1. If rates found → Save to Supabase"
echo "  2. If rates not found → Review rawHTML in response"
echo "  3. Add more property-specific scrapers as needed"
echo ""
