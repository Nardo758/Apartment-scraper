#!/usr/bin/env node
/**
 * Debug BrightData Scraping Browser Connection
 * Tests different connection methods to identify the issue
 */

const puppeteer = require('@cloudflare/puppeteer');

const BRIGHTDATA_API_KEY = '62c3bfaa-b1b9-4341-a5bd-a863606754cb';

async function testConnection() {
  console.log('='.repeat(70));
  console.log('BRIGHTDATA CONNECTION DEBUGGING');
  console.log('='.repeat(70));
  console.log('');
  
  // Test 1: Standard WebSocket endpoint
  console.log('Test 1: Standard BrightData endpoint');
  console.log('-'.repeat(70));
  
  const endpoint1 = `wss://brd-customer-${BRIGHTDATA_API_KEY}:${BRIGHTDATA_API_KEY}@brd.superproxy.io:9222`;
  console.log(`Endpoint: ${endpoint1.substring(0, 50)}...`);
  
  try {
    console.log('Attempting to connect...');
    const browser = await puppeteer.connect({
      browserWSEndpoint: endpoint1,
    });
    console.log('✅ SUCCESS! Connected to browser');
    
    const version = await browser.version();
    console.log(`Browser version: ${version}`);
    
    await browser.disconnect();
    console.log('Disconnected successfully');
    return true;
    
  } catch (error) {
    console.log('❌ FAILED');
    console.log(`Error: ${error.message}`);
    console.log(`Stack: ${error.stack}`);
  }
  
  console.log('');
  
  // Test 2: Alternative format (without auth in URL)
  console.log('Test 2: Alternative auth format');
  console.log('-'.repeat(70));
  
  const endpoint2 = `wss://brd.superproxy.io:9222`;
  console.log(`Endpoint: ${endpoint2}`);
  
  try {
    const browser = await puppeteer.connect({
      browserWSEndpoint: endpoint2,
      // Try auth as separate parameter
    });
    console.log('✅ SUCCESS!');
    await browser.disconnect();
    return true;
    
  } catch (error) {
    console.log('❌ FAILED');
    console.log(`Error: ${error.message}`);
  }
  
  console.log('');
  
  // Test 3: Check if puppeteer.connect works at all
  console.log('Test 3: Verify puppeteer.connect is available');
  console.log('-'.repeat(70));
  
  console.log(`puppeteer.connect is: ${typeof puppeteer.connect}`);
  console.log(`Available methods: ${Object.keys(puppeteer).join(', ')}`);
  
  console.log('');
  console.log('='.repeat(70));
  console.log('DEBUGGING COMPLETE');
  console.log('='.repeat(70));
}

testConnection().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
