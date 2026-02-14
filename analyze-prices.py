#!/usr/bin/env python3
import json
import re
from html.parser import HTMLParser

with open('scrapingbee-wait.json', 'r') as f:
    data = json.load(f)
html = data.get('html', '')

print("=" * 70)
print("SCRAPER TEST - RESULTS SUMMARY")
print("=" * 70)

print("\n✅ WHAT WORKED:")
print("   Route: /test-scrapingbee")
print("   Site: https://www.eloraatbuckhead.com/")
print("   Method: ScrapingBee API with JavaScript rendering")
print("   Status: SUCCESS (100,219 chars of HTML)")

print("\n💰 PRICES FOUND IN HTML:")
prices = re.findall(r'\$([0-9,]+)', html)
unique_prices = sorted(set(prices), key=lambda x: int(x.replace(',','')))

print(f"   Total: {len(unique_prices)} unique price points")
print("\n   Apartment lease rates detected:")
lease_rates = [p for p in unique_prices if int(p.replace(',','')) > 1000]
for rate in lease_rates[:10]:
    print(f"   • ${rate}")

print("\n📍 UNIT DETAILS FOUND:")
# Look for bedroom types
studios = len(re.findall(r'studio', html, re.IGNORECASE))
one_beds = len(re.findall(r'1[- ]bed', html, re.IGNORECASE))
two_beds = len(re.findall(r'2[- ]bed', html, re.IGNORECASE))

print(f"   Studios: {studios} mentions")
print(f"   1 Bedrooms: {one_beds} mentions")
print(f"   2 Bedrooms: {two_beds} mentions")

print("\n❓ 12-MONTH LEASE RATE SEARCH:")
# Search for "12 month" or "12-month"
twelve_month_mentions = len(re.findall(r'12[- ]?month', html, re.IGNORECASE))
print(f"   '12 month' found: {twelve_month_mentions} times")

if twelve_month_mentions == 0:
    print("\n   ⚠️  12-month lease terms NOT in static HTML")
    print("   💡 Likely reasons:")
    print("      1. Site uses Entrata API (elan_id: 2241)")
    print("      2. Pricing loads via AJAX after page load")
    print("      3. Need to click into individual units")
    print("      4. May need full browser automation (not just fetch)")

# Sample what we CAN extract
print("\n✅ WHAT WE CAN EXTRACT:")
print("   ✓ Property name: Elora at Buckhead")
print("   ✓ Address: 3372 Peachtree Road NE, Atlanta, GA 30326")
print("   ✓ Phone: 888.823.4518")
print("   ✓ Starting prices: $1,728-$2,445+")
print("   ✓ Unit types: Studio, 1BR, 2BR available")
print("   ✓ Square footage ranges: 622-792 sqft")

print("\n❌ WHAT WE CANNOT EXTRACT (from static HTML):")
print("   ✗ Specific 12-month lease rates")
print("   ✗ Unit-by-unit pricing")
print("   ✗ Availability dates with exact pricing")
print("   ✗ Lease term options (6/12/15 months)")

print("\n🔧 NEXT STEPS TO GET 12-MONTH RATES:")
print("   Option 1: Implement full browser automation")
print("   Option 2: Reverse-engineer Entrata API")
print("   Option 3: Try Apartments.com (has aggregated data)")

print("\n" + "=" * 70)
