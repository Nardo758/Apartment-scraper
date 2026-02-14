#!/bin/bash
# Test scraper directly with URL inspection

curl "https://apartment-scraper.m-dixon5030.workers.dev/inspect" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.apartments.com/atlanta-ga/"
  }'
