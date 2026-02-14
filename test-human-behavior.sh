#!/bin/bash
# Test human-like scraping behavior with concessions extraction

WORKER_URL="https://apartment-scraper.m-dixon5030.workers.dev"

echo "======================================================================="
echo "HUMAN-LIKE SCRAPING TEST"
echo "======================================================================="
echo ""
echo "Testing enhanced scraping with:"
echo "  • Slow, human-like speed"
echo "  • Random mouse movements"
echo "  • Variable delays (0.5-3 seconds)"
echo "  • Concession/special offers extraction"
echo ""
echo "Note: This will take 30-60 seconds (slow on purpose!)"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST: Elora at Buckhead (with concessions)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "URL: https://www.eloraatbuckhead.com/floor-plans/"
echo ""

START_TIME=$(date +%s)

curl -s -m 120 "$WORKER_URL/scrape-full-browser" \
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
            print(f"\nStack trace:\n{data['stack'][:500]}...")
        sys.exit(1)
    
    result = data['data']
    
    print("✅ SUCCESS! Human-like scraping complete!")
    print()
    print("=" * 70)
    print("PROPERTY INFORMATION")
    print("=" * 70)
    print(f"Name: {result.get('propertyName', 'N/A')}")
    print(f"Address: {result.get('address', 'N/A')[:80]}...")
    print(f"Phone: {result.get('phone', 'N/A')}")
    print(f"PMS Type: {result.get('pmsType', 'unknown')}")
    
    # Concessions/Specials
    concessions = result.get('concessions', [])
    print()
    print("=" * 70)
    print(f"CONCESSIONS & SPECIALS: {len(concessions)} found")
    print("=" * 70)
    
    if concessions:
        for i, c in enumerate(concessions, 1):
            print(f"\n{i}. Type: {c.get('type', 'N/A').upper()}")
            if c.get('value'):
                print(f"   Value: {c.get('value')}")
            desc = c.get('description', '')
            if len(desc) > 100:
                desc = desc[:100] + "..."
            print(f"   Description: {desc}")
            if c.get('terms'):
                print(f"   Terms: {c.get('terms')}")
    else:
        print("\n⚠️  No concessions found on this page")
        print("   (Property may not have current specials)")
    
    # Lease Rates
    lease_rates = result.get('leaseRates', [])
    print()
    print("=" * 70)
    print(f"LEASE RATES: {len(lease_rates)} found")
    print("=" * 70)
    
    if lease_rates:
        print()
        print("Unit Type           Rent/Month    Sqft    Term        Available")
        print("─" * 70)
        for rate in lease_rates[:10]:
            unit = rate.get('unitType', 'Unknown')[:19]
            price_cents = rate.get('price', 0)
            price = f"${price_cents / 100:,.0f}"
            sqft = str(rate.get('sqft') or 'N/A')[:6]
            term = rate.get('leaseTerm', 'N/A')[:10]
            avail = (rate.get('available') or 'N/A')[:12]
            
            print(f"{unit:<20} {price:<13} {sqft:<7} {term:<11} {avail}")
            
            # Show unit-specific concessions if any
            unit_concessions = rate.get('concessions', [])
            if unit_concessions:
                print(f"   └─ Specials: {len(unit_concessions)}")
                for uc in unit_concessions[:2]:
                    print(f"      • {uc.get('description', 'N/A')[:60]}")
    else:
        print("\n⚠️  No lease rates found")
    
    # Amenities
    amenities = result.get('amenities', [])
    if amenities:
        print()
        print("=" * 70)
        print(f"AMENITIES: {len(amenities)} found")
        print("=" * 70)
        for i, amenity in enumerate(amenities[:10], 1):
            print(f"{i}. {amenity}")
    
    print()
    print("=" * 70)
    print(f"Scraped at: {result.get('scrapedAt', 'N/A')}")
    print("=" * 70)
    
except json.JSONDecodeError as e:
    print(f"❌ JSON parse error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
EOF

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⏱️  Total scraping time: ${DURATION} seconds"
echo ""
echo "✅ Human-like behavior features:"
echo "   • Random delays added (0.5-3 seconds)"
echo "   • Mouse movements simulated"
echo "   • Slow scrolling implemented"
echo "   • Pauses between actions"
echo "   • Concession data extracted"
echo ""
echo "This slower speed helps avoid bot detection and rate limits."
echo ""
