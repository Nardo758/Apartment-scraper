#!/bin/bash
# Test direct property website scraping
# Using a known Atlanta property on a common PMS platform

# Example property on Entrata (very common PMS)
curl "https://apartment-scraper.m-dixon5030.workers.dev/test-unlocker" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.avaloncommunities.com/georgia/atlanta/avalon-alpharetta",
    "country": "us"
  }'
