#!/bin/bash
# Test improved selector extraction

WORKER_URL="https://apartment-scraper.m-dixon5030.workers.dev"

echo "======================================================================="
echo "IMPROVED EXTRACTION TEST"
echo "======================================================================="
echo ""
echo "Changes deployed:"
echo "  ✓ Better selectors (30+ patterns instead of 7)"
echo "  ✓ Entrata-specific extraction"
echo "  ✓ Fixed concession extraction (no more CSS)"
echo "  ✓ Price range validation ($500-$10,000)"
echo "  ✓ Better text cleaning"
echo ""

# Test 1: Elora (should get more rates now)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: Elora at Buckhead (Entrata) - Improved Extraction"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Expected: Multiple lease rates (Studio, 1BR, 2BR)"
echo ""

curl -s -m 90 "$WORKER_URL/scrape-full-browser" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.eloraatbuckhead.com/floor-plans/", "options": {"waitTime": 10000, "scrollPage": true}}' \
  | python3 << 'EOF'
import json, sys

data = json.load(sys.stdin)

if not data.get('success'):
    print(f"❌ FAILED: {data.get('error')}")
    sys.exit(1)

result = data['data']

print("✅ SUCCESS!")
print()
print("=" * 70)
print("EXTRACTION RESULTS")
print("=" * 70)
print()
print(f"Property: {result.get('propertyName')}")
print(f"PMS: {result.get('pmsType')}")
print()

# Concessions
concessions = result.get('concessions', [])
print(f"💰 Concessions: {len(concessions)} found")
if concessions:
    for i, c in enumerate(concessions[:3], 1):
        print(f"\n  {i}. Type: {c.get('type').upper()}")
        if c.get('value'):
            print(f"     Value: {c.get('value')}")
        desc = c.get('description', '')[:100]
        print(f"     Description: {desc}")
else:
    print("   (None found - may not have current specials)")

# Lease rates
print()
lease_rates = result.get('leaseRates', [])
print(f"🏠 Lease Rates: {len(lease_rates)} found")
print()

if lease_rates:
    print("Unit Type              Price/Mo     Sqft    Term        Available")
    print("─" * 70)
    for rate in lease_rates[:15]:
        unit = rate.get('unitType', 'Unknown')[:21]
        price = f"${rate.get('price', 0) / 100:,.0f}"
        sqft = str(rate.get('sqft') or 'N/A')[:6]
        term = rate.get('leaseTerm', 'N/A')[:10]
        avail = (rate.get('available') or 'N/A')[:12]
        
        print(f"{unit:<22} {price:<12} {sqft:<7} {term:<11} {avail}")
else:
    print("⚠️  No rates found")

print()
print("=" * 70)
print(f"Improvement: {len(lease_rates)} rates (was 1)")
print("=" * 70)
EOF

echo ""
sleep 3

# Test 2: Different site
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: Different Property"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Trying: Post Riverside (Atlanta)"
echo ""

curl -s -m 90 "$WORKER_URL/scrape-full-browser" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.postriverside.com/atlanta/post-riverside/apartments/", "options": {"waitTime": 10000, "scrollPage": true}}' \
  | python3 << 'EOF'
import json, sys

data = json.load(sys.stdin)

if not data.get('success'):
    print(f"❌ FAILED: {data.get('error', 'Unknown')[:200]}")
    sys.exit(1)

result = data['data']

print("✅ SUCCESS!")
print()
print(f"Property: {result.get('propertyName')}")
print(f"PMS: {result.get('pmsType')}")
print(f"Address: {result.get('address', 'N/A')[:60]}")
print(f"Phone: {result.get('phone', 'N/A')}")
print()

concessions = result.get('concessions', [])
print(f"💰 Concessions: {len(concessions)}")

lease_rates = result.get('leaseRates', [])
print(f"🏠 Lease Rates: {len(lease_rates)}")

if lease_rates:
    print()
    for rate in lease_rates[:5]:
        unit = rate.get('unitType')
        price = f"${rate.get('price', 0) / 100:,.0f}"
        print(f"  • {unit}: {price}/mo")

amenities = result.get('amenities', [])
print(f"🏢 Amenities: {len(amenities)}")

print()
print("✅ Different site tested successfully!")
EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "TEST COMPLETE"
echo ""
echo "Summary:"
echo "  1. Elora - Testing improved extraction (more rates expected)"
echo "  2. Post Riverside - Testing on different property/PMS"
echo ""
