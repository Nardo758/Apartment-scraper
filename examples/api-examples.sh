#!/bin/bash

# API Examples for Apartment Scraper Worker
# Make executable: chmod +x api-examples.sh

# Set your worker URL
WORKER_URL="${WORKER_URL:-http://localhost:8787}"

echo "🏢 Apartment Scraper API Examples"
echo "Using: $WORKER_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Example 1: Health Check
example_health_check() {
  echo -e "${BLUE}Example 1: Health Check${NC}"
  curl -s "$WORKER_URL/health" | jq '.'
  echo ""
}

# Example 2: API Documentation
example_docs() {
  echo -e "${BLUE}Example 2: Get API Documentation${NC}"
  curl -s "$WORKER_URL/docs" | jq '.'
  echo ""
}

# Example 3: Basic Scrape Job
example_basic_scrape() {
  echo -e "${BLUE}Example 3: Start Basic Scrape Job${NC}"
  curl -s -X POST "$WORKER_URL/api/scrape/start" \
    -H "Content-Type: application/json" \
    -d '{
      "city": "atlanta",
      "state": "ga",
      "maxPages": 2
    }' | jq '.'
  echo ""
}

# Example 4: Scrape with Filters
example_filtered_scrape() {
  echo -e "${BLUE}Example 4: Scrape with Price Filters${NC}"
  curl -s -X POST "$WORKER_URL/api/scrape/start" \
    -H "Content-Type: application/json" \
    -d '{
      "city": "austin",
      "state": "tx",
      "filters": {
        "minPrice": 1000,
        "maxPrice": 3000,
        "beds": [1, 2],
        "pets": "allowed"
      },
      "maxPages": 3
    }' | jq '.'
  echo ""
}

# Example 5: Complete Workflow
example_complete_workflow() {
  echo -e "${BLUE}Example 5: Complete Workflow (Start → Monitor → Results)${NC}"
  
  # Start job
  echo -e "${YELLOW}Starting job...${NC}"
  JOB_RESPONSE=$(curl -s -X POST "$WORKER_URL/api/scrape/start" \
    -H "Content-Type: application/json" \
    -d '{
      "city": "denver",
      "state": "co",
      "maxPages": 2
    }')
  
  echo "$JOB_RESPONSE" | jq '.'
  JOB_ID=$(echo "$JOB_RESPONSE" | jq -r '.jobId')
  
  if [ "$JOB_ID" = "null" ]; then
    echo -e "${RED}Failed to start job${NC}"
    return
  fi
  
  echo -e "\n${YELLOW}Job ID: $JOB_ID${NC}"
  
  # Monitor progress
  echo -e "\n${YELLOW}Monitoring progress...${NC}"
  MAX_ATTEMPTS=20
  ATTEMPT=0
  
  while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    sleep 3
    
    STATUS_RESPONSE=$(curl -s "$WORKER_URL/api/scrape/status/$JOB_ID")
    STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status')
    LISTINGS=$(echo "$STATUS_RESPONSE" | jq -r '.progress.listingsScraped')
    
    echo -e "Status: $STATUS | Listings: $LISTINGS"
    
    if [ "$STATUS" = "completed" ]; then
      echo -e "\n${GREEN}✓ Job completed!${NC}"
      break
    fi
    
    if [ "$STATUS" = "failed" ]; then
      echo -e "\n${RED}✗ Job failed${NC}"
      echo "$STATUS_RESPONSE" | jq '.error'
      return
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
  done
  
  # Get results
  echo -e "\n${YELLOW}Fetching results...${NC}"
  curl -s "$WORKER_URL/api/scrape/results/$JOB_ID" | jq '{
    jobId: .jobId,
    status: .status,
    totalListings: (.results | length),
    firstListing: .results[0] | {
      propertyName,
      address,
      minPrice,
      maxPrice,
      beds,
      baths
    }
  }'
  echo ""
}

# Example 6: Check Job Status
example_check_status() {
  echo -e "${BLUE}Example 6: Check Job Status${NC}"
  echo -e "${YELLOW}Enter Job ID:${NC}"
  read -r JOB_ID
  
  curl -s "$WORKER_URL/api/scrape/status/$JOB_ID" | jq '.'
  echo ""
}

# Example 7: Get Job Results
example_get_results() {
  echo -e "${BLUE}Example 7: Get Job Results${NC}"
  echo -e "${YELLOW}Enter Job ID:${NC}"
  read -r JOB_ID
  
  curl -s "$WORKER_URL/api/scrape/results/$JOB_ID" | jq '.'
  echo ""
}

# Example 8: Cancel Job
example_cancel_job() {
  echo -e "${BLUE}Example 8: Cancel Running Job${NC}"
  echo -e "${YELLOW}Enter Job ID:${NC}"
  read -r JOB_ID
  
  curl -s -X POST "$WORKER_URL/api/scrape/cancel/$JOB_ID" | jq '.'
  echo ""
}

# Example 9: List All Jobs
example_list_jobs() {
  echo -e "${BLUE}Example 9: List All Jobs${NC}"
  curl -s "$WORKER_URL/api/scrape/list" | jq '.'
  echo ""
}

# Example 10: Multiple Cities in Parallel
example_multi_city() {
  echo -e "${BLUE}Example 10: Scrape Multiple Cities in Parallel${NC}"
  
  CITIES='["atlanta,ga", "austin,tx", "denver,co"]'
  JOB_IDS=()
  
  # Start all jobs
  for CITY_STATE in "atlanta,ga" "austin,tx" "denver,co"; do
    IFS=',' read -r CITY STATE <<< "$CITY_STATE"
    
    echo -e "${YELLOW}Starting job for $CITY, $STATE...${NC}"
    JOB_RESPONSE=$(curl -s -X POST "$WORKER_URL/api/scrape/start" \
      -H "Content-Type: application/json" \
      -d "{\"city\":\"$CITY\",\"state\":\"$STATE\",\"maxPages\":2}")
    
    JOB_ID=$(echo "$JOB_RESPONSE" | jq -r '.jobId')
    JOB_IDS+=("$JOB_ID")
    echo "Job ID: $JOB_ID"
  done
  
  echo -e "\n${GREEN}Started ${#JOB_IDS[@]} jobs${NC}"
  echo "Job IDs: ${JOB_IDS[*]}"
  echo ""
}

# Example 11: Export Results to CSV
example_export_csv() {
  echo -e "${BLUE}Example 11: Export Results to CSV${NC}"
  echo -e "${YELLOW}Enter Job ID:${NC}"
  read -r JOB_ID
  
  OUTPUT_FILE="listings_${JOB_ID}.csv"
  
  curl -s "$WORKER_URL/api/scrape/results/$JOB_ID" | \
    jq -r '.results[] | [.propertyName, .address, .city, .state, .minPrice, .maxPrice, .beds, .baths, .sqft] | @csv' \
    > "$OUTPUT_FILE"
  
  echo -e "${GREEN}Exported to $OUTPUT_FILE${NC}"
  echo "First 5 rows:"
  head -5 "$OUTPUT_FILE"
  echo ""
}

# Example 12: Watch Job Progress
example_watch_progress() {
  echo -e "${BLUE}Example 12: Watch Job Progress (Live)${NC}"
  echo -e "${YELLOW}Enter Job ID:${NC}"
  read -r JOB_ID
  
  echo -e "${YELLOW}Watching job $JOB_ID (Ctrl+C to stop)...${NC}\n"
  
  while true; do
    clear
    echo -e "${BLUE}Job Progress Monitor${NC}"
    echo "=================="
    
    STATUS_RESPONSE=$(curl -s "$WORKER_URL/api/scrape/status/$JOB_ID")
    
    echo "$STATUS_RESPONSE" | jq '{
      jobId: .jobId,
      status: .status,
      progress: .progress,
      createdAt: .createdAt,
      updatedAt: .updatedAt
    }'
    
    STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status')
    
    if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
      echo -e "\n${GREEN}Job finished with status: $STATUS${NC}"
      break
    fi
    
    sleep 3
  done
  echo ""
}

# Interactive Menu
show_menu() {
  echo -e "${GREEN}===========================================${NC}"
  echo -e "${GREEN}    Apartment Scraper API Examples${NC}"
  echo -e "${GREEN}===========================================${NC}"
  echo ""
  echo "1.  Health Check"
  echo "2.  Get API Documentation"
  echo "3.  Start Basic Scrape"
  echo "4.  Start Scrape with Filters"
  echo "5.  Complete Workflow (Recommended)"
  echo "6.  Check Job Status"
  echo "7.  Get Job Results"
  echo "8.  Cancel Job"
  echo "9.  List All Jobs"
  echo "10. Multiple Cities Parallel"
  echo "11. Export Results to CSV"
  echo "12. Watch Job Progress (Live)"
  echo "0.  Exit"
  echo ""
  echo -e "${YELLOW}Enter your choice (0-12):${NC} "
}

# Main loop
main() {
  # Check if jq is installed
  if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is not installed${NC}"
    echo "Install with: apt install jq (Ubuntu) or brew install jq (Mac)"
    exit 1
  fi
  
  while true; do
    show_menu
    read -r choice
    
    case $choice in
      1) example_health_check ;;
      2) example_docs ;;
      3) example_basic_scrape ;;
      4) example_filtered_scrape ;;
      5) example_complete_workflow ;;
      6) example_check_status ;;
      7) example_get_results ;;
      8) example_cancel_job ;;
      9) example_list_jobs ;;
      10) example_multi_city ;;
      11) example_export_csv ;;
      12) example_watch_progress ;;
      0) echo "Goodbye!"; exit 0 ;;
      *) echo -e "${RED}Invalid choice${NC}" ;;
    esac
    
    echo ""
    echo -e "${YELLOW}Press Enter to continue...${NC}"
    read -r
    clear
  done
}

# Run if executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  main
fi
