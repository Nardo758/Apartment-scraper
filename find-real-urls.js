#!/usr/bin/env node
// Find real apartment URLs from Supabase

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jdymvpasjsdbryatscux.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkeW12cGFzanNkYnJ5YXRzY3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1ODc1NTgsImV4cCI6MjA3NDE2MzU1OH0.Y88-nn2LDE6qZ4p69rFuOCjM6ES027WXs-T_4g7DTso';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findRealUrls() {
  console.log('Searching for real apartment listing URLs...\n');
  
  // Check properties table for non-test URLs
  const { data: properties, error } = await supabase
    .from('properties')
    .select('source_url, name, address, city, state')
    .not('source_url', 'like', '%example.com%')
    .not('source_url', 'like', '%test%')
    .limit(20);
  
  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }
  
  if (!properties || properties.length === 0) {
    console.log('❌ No non-test URLs found in properties table');
    console.log('\nWe only have 2 test URLs:');
    console.log('1. https://example.com/u1');
    console.log('2. https://www.eloraatbuckhead.com/');
    console.log('\nLet me create a test list with common apartment sites...\n');
    
    // Return common apartment listing URLs to test
    const testUrls = [
      'https://www.apartments.com/alpharetta-ga/',
      'https://www.zillow.com/alpharetta-ga/rentals/',
      'https://www.rent.com/georgia/alpharetta-apartments',
      'https://www.avaloncommunities.com/georgia/atlanta/avalon-alpharetta',
      'https://www.camdenliving.com/atlanta-ga-apartments'
    ];
    
    console.log('=== TEST URLS ===');
    testUrls.forEach((url, i) => {
      console.log(`${i + 1}. ${url}`);
    });
    
    return testUrls;
  }
  
  console.log(`✅ Found ${properties.length} properties with URLs\n`);
  
  const urls = properties
    .filter(p => p.source_url)
    .slice(0, 5)
    .map(p => ({
      url: p.source_url,
      name: p.name,
      location: `${p.city}, ${p.state}`
    }));
  
  console.log('=== FOUND URLs ===');
  urls.forEach((item, i) => {
    console.log(`\n${i + 1}. ${item.name} (${item.location})`);
    console.log(`   ${item.url}`);
  });
  
  return urls.map(u => u.url);
}

findRealUrls()
  .then(urls => {
    if (urls) {
      console.log('\n\n=== URLs FOR TESTING ===');
      urls.forEach((url, i) => {
        console.log(`URL${i + 1}="${url}"`);
      });
    }
  })
  .catch(console.error);
