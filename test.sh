#!/bin/bash

# Test script for Apartment Scraper Worker
# Make executable with: chmod +x test.sh

WORKER_URL="${WORKER_URL:-http://localhost:8787}"

echo "🧪 Testing Apartment Scraper Worker"
echo "Worker URL: $WORKER_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
response=$(curl -s "$WORKER_URL/health")
if echo "$response" | grep -q "healthy"; then
  echo -e "${GREEN}✓ Health check passed${NC}"
else
  echo -e "${RED}✗ Health check failed${NC}"
  echo "$response"
fi
echo ""

# Test 2: Get Documentation
echo -e "${YELLOW}Test 2: API Documentation${NC}"
response=$(curl -s "$WORKER_URL/docs")
if echo "$response" | grep -q "endpoints"; then
  echo -e "${GREEN}✓ Documentation retrieved${NC}"
else
  echo -e "${RED}✗ Documentation failed${NC}"
fi
echo ""

# Test 3: Start a scraping job
echo -e "${YELLOW}Test 3: Start Scraping Job${NC}"
job_response=$(curl -s -X POST "$WORKER_URL/api/scrape/start" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "atlanta",
    "state": "ga",
    "filters": {
      "minPrice": 1000,
      "maxPrice": 3000,
      "beds": [1, 2]
    },
    "maxPages": 2
  }')

if echo "$job_response" | grep -q "jobId"; then
  echo -e "${GREEN}✓ Job started successfully${NC}"
  job_id=$(echo "$job_response" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
  echo "Job ID: $job_id"
  
  # Test 4: Check job status
  echo ""
  echo -e "${YELLOW}Test 4: Check Job Status${NC}"
  sleep 2
  status_response=$(curl -s "$WORKER_URL/api/scrape/status/$job_id")
  echo "$status_response" | head -c 500
  echo ""
  
  if echo "$status_response" | grep -q "status"; then
    echo -e "${GREEN}✓ Status check passed${NC}"
  else
    echo -e "${RED}✗ Status check failed${NC}"
  fi
  
else
  echo -e "${RED}✗ Job start failed${NC}"
  echo "$job_response"
fi

echo ""
echo "🏁 Tests complete!"
