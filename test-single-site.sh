#!/bin/bash
# Quick test for a single apartment website

WORKER_URL="https://apartment-scraper.m-dixon5030.workers.dev"

# Check if URL provided
if [ -z "$1" ]; then
  echo "Usage: ./test-single-site.sh <URL> [method]"
  echo ""
  echo "Methods: scrapingbee (default), browser, unlocker"
  echo ""
  echo "Examples:"
  echo "  ./test-single-site.sh https://www.apartments.com/alpharetta-ga/"
  echo "  ./test-single-site.sh https://www.avaloncommunities.com/georgia/atlanta/avalon-alpharetta browser"
  echo ""
  echo "Popular test URLs:"
  echo "  - https://www.apartments.com/alpharetta-ga/"
  echo "  - https://www.zillow.com/alpharetta-ga/rentals/"
  echo "  - https://www.rent.com/georgia/alpharetta-apartments"
  echo "  - https://www.avaloncommunities.com/georgia/atlanta/avalon-alpharetta"
  echo "  - https://www.camdenliving.com/atlanta-ga-apartments"
  exit 1
fi

URL="$1"
METHOD="${2:-scrapingbee}"

echo "=================================================="
echo "TESTING: $URL"
echo "METHOD: $METHOD"
echo "=================================================="
echo ""

case $METHOD in
  scrapingbee)
    ENDPOINT="/test-scrapingbee"
    PAYLOAD="{\"url\": \"$URL\"}"
    ;;
  browser)
    ENDPOINT="/test-browser"
    PAYLOAD="{\"url\": \"$URL\"}"
    ;;
  unlocker)
    ENDPOINT="/test-unlocker"
    PAYLOAD="{\"url\": \"$URL\", \"country\": \"us\"}"
    ;;
  *)
    echo "Unknown method: $METHOD"
    echo "Use: scrapingbee, browser, or unlocker"
    exit 1
    ;;
esac

echo "Fetching with $METHOD..."
echo ""

curl -s -m 60 "$WORKER_URL$ENDPOINT" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" | jq '.' || curl -s -m 60 "$WORKER_URL$ENDPOINT" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"

echo ""
echo "=================================================="
echo "TEST COMPLETE"
echo "=================================================="
