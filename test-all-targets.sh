#!/bin/bash
# Comprehensive test of all apartment website categories
# Tests both ScrapingBee and Bright Data Scraping Browser

WORKER_URL="https://apartment-scraper.m-dixon5030.workers.dev"

echo "=================================================="
echo "APARTMENT SCRAPER - COMPREHENSIVE TEST"
echo "=================================================="
echo ""

# Category 1: AGGREGATOR WEBSITES
echo "=== CATEGORY 1: AGGREGATOR WEBSITES ==="
echo ""

echo "1.1 Testing Apartments.com (ScrapingBee stealth)..."
curl -s -m 60 "$WORKER_URL/test-scrapingbee" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.apartments.com/alpharetta-ga/"}' | head -200
echo -e "\n"

echo "1.2 Testing Zillow Rentals (ScrapingBee)..."
curl -s -m 30 "$WORKER_URL/test-scrapingbee" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.zillow.com/alpharetta-ga/rentals/"}' | head -200
echo -e "\n"

echo "1.3 Testing Rent.com (ScrapingBee)..."
curl -s -m 30 "$WORKER_URL/test-scrapingbee" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.rent.com/georgia/alpharetta-apartments"}' | head -200
echo -e "\n"

# Category 2: INDIVIDUAL PROPERTY WEBSITES
echo "=== CATEGORY 2: INDIVIDUAL PROPERTY WEBSITES ==="
echo ""

echo "2.1 Testing Avalon Communities (ScrapingBee)..."
curl -s -m 30 "$WORKER_URL/test-scrapingbee" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.avaloncommunities.com/georgia/atlanta/avalon-alpharetta"}' | head -200
echo -e "\n"

echo "2.2 Testing Camden Property (ScrapingBee)..."
curl -s -m 30 "$WORKER_URL/test-scrapingbee" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.camdenliving.com/atlanta-ga-apartments"}' | head -200
echo -e "\n"

echo "2.3 Testing MAA Communities (ScrapingBee)..."
curl -s -m 30 "$WORKER_URL/test-scrapingbee" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.maac.com/georgia/atlanta"}' | head -200
echo -e "\n"

# Category 3: PROPERTY MANAGEMENT SOFTWARE PLATFORMS
echo "=== CATEGORY 3: PROPERTY MANAGEMENT SOFTWARE ==="
echo ""

echo "3.1 Testing Entrata Platform Site (ScrapingBee)..."
curl -s -m 30 "$WORKER_URL/test-scrapingbee" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.avaloncommunities.com/georgia/atlanta/avalon-alpharetta"}' | head -200
echo -e "\n"

echo "3.2 Testing RealPage/Propertyware Site (ScrapingBee)..."
curl -s -m 30 "$WORKER_URL/test-scrapingbee" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.camdenliving.com/atlanta-ga-apartments"}' | head -200
echo -e "\n"

# BRIGHT DATA TESTS (Scraping Browser)
echo ""
echo "=== TESTING WITH BRIGHT DATA SCRAPING BROWSER ==="
echo ""

echo "4.1 Testing Apartments.com (Bright Data Browser)..."
curl -s -m 60 "$WORKER_URL/test-browser" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.apartments.com/alpharetta-ga/"}' | head -200
echo -e "\n"

echo "4.2 Testing Individual Property (Bright Data Browser)..."
curl -s -m 60 "$WORKER_URL/test-browser" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.avaloncommunities.com/georgia/atlanta/avalon-alpharetta"}' | head -200
echo -e "\n"

# BRIGHT DATA WEB UNLOCKER TEST
echo "=== TESTING WITH BRIGHT DATA WEB UNLOCKER ==="
echo ""

echo "5.1 Testing Apartments.com (Web Unlocker)..."
curl -s -m 30 "$WORKER_URL/test-unlocker" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.apartments.com/alpharetta-ga/", "country": "us"}' | head -200
echo -e "\n"

echo "5.2 Testing Individual Property (Web Unlocker)..."
curl -s -m 30 "$WORKER_URL/test-unlocker" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.avaloncommunities.com/georgia/atlanta/avalon-alpharetta", "country": "us"}' | head -200
echo -e "\n"

echo "=================================================="
echo "TEST COMPLETE"
echo "=================================================="
