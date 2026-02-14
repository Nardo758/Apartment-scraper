#!/bin/bash
# Diagnostic test that returns debug info

echo "🔍 Running DIAGNOSTIC test..."
echo ""

curl -s -m 90 "https://apartment-scraper.m-dixon5030.workers.dev/scrape-full-browser" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.eloraatbuckhead.com/floor-plans/", "options": {"waitTime": 10000, "scrollPage": true}}' \
  | python3 << 'PYTHON'
import json, sys

data = json.load(sys.stdin)

if not data.get('success'):
    print(f"❌ FAILED: {data.get('error', 'Unknown')}")
    sys.exit(1)

result = data['data']

print("✅ Response received")
print()
print(f"Property Name: {result.get('propertyName')}")
print(f"Address: {result.get('address', 'N/A')[:60]}")
print(f"Phone: {result.get('phone')}")
print(f"PMS Type: {result.get('pmsType')}")
print()
print(f"Amenities: {len(result.get('amenities', []))}")
print(f"Concessions: {len(result.get('concessions', []))}")
print(f"Lease Rates: {len(result.get('leaseRates', []))}")
print()

# Check if we got raw HTML
if result.get('rawHTML'):
    html = result['rawHTML'].lower()
    print("=== RAW HTML ANALYSIS ===")
    print(f"HTML length: {len(result['rawHTML'])} chars")
    print()
    
    # Look for common floor plan patterns
    patterns = [
        ('floor-plan', 'floor-plan class'),
        ('fp-card', 'fp-card class'),
        ('model', 'model class'),
        ('unit', 'unit class'),
        ('studio', 'studio text'),
        ('bedroom', 'bedroom text'),
        ('$1', 'price text'),
    ]
    
    for pattern, name in patterns:
        count = html.count(pattern)
        if count > 0:
            print(f"  ✓ Found '{pattern}': {count} occurrences ({name})")
    
    print()
    print("=== SAMPLE HTML (first 2000 chars) ===")
    print(result['rawHTML'][:2000])

PYTHON

