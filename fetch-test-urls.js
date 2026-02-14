#!/usr/bin/env node
// Fetch 5 apartment URLs from Supabase for testing

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jdymvpasjsdbryatscux.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkeW12cGFzanNkYnJ5YXRzY3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1ODc1NTgsImV4cCI6MjA3NDE2MzU1OH0.Y88-nn2LDE6qZ4p69rFuOCjM6ES027WXs-T_4g7DTso';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchTestUrls() {
  console.log('Connecting to Supabase...\n');
  
  // Try different possible table names
  const tables = ['properties', 'apartments', 'listings', 'apartment_listings'];
  
  for (const table of tables) {
    console.log(`Checking table: ${table}...`);
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(5);
    
    if (!error && data && data.length > 0) {
      console.log(`✅ Found ${data.length} records in ${table}\n`);
      console.log('Sample records:');
      data.forEach((record, i) => {
        console.log(`\n${i + 1}. Record ID: ${record.id || 'N/A'}`);
        console.log(JSON.stringify(record, null, 2));
      });
      
      // Look for URL fields
      const urlFields = ['url', 'listing_url', 'property_url', 'website', 'link'];
      const urls = [];
      
      data.forEach(record => {
        for (const field of urlFields) {
          if (record[field]) {
            urls.push(record[field]);
            break;
          }
        }
      });
      
      if (urls.length > 0) {
        console.log('\n\n=== EXTRACTED URLs ===');
        urls.forEach((url, i) => {
          console.log(`${i + 1}. ${url}`);
        });
      }
      
      return;
    } else if (error) {
      console.log(`❌ Error: ${error.message}`);
    } else {
      console.log(`⚠️  Table exists but is empty`);
    }
  }
  
  console.log('\n❌ No apartment data found in common table names');
  console.log('Available tables might have different names.');
}

fetchTestUrls().catch(console.error);
