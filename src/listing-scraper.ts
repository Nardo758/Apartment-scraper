/**
 * Listing Site Scraper
 * Scrapes apartments.com, Zillow, RentCafe, etc. for pricing data
 * Uses Puppeteer with Browser Rendering to bypass anti-scraping
 */

import puppeteer, { Browser, Page } from '@cloudflare/puppeteer';
import type { Env } from './types';

export interface ListingData {
  propertyName: string | null;
  address: string | null;
  phone: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  leaseTerm: string;
  amenities: string[];
  units: Array<{
    beds: number;
    baths: number;
    sqft: number | null;
    price: number | null;
  }>;
  source: string;
  scrapedAt: string;
}

/**
 * Scrape listing site for property data
 */
export async function scrapeListingSite(env: Env, url: string): Promise<ListingData> {
  console.log('🚀 Scraping listing site:', url);
  
  let browser: Browser | null = null;
  
  try {
    // Launch browser
    browser = await puppeteer.launch(env.MYBROWSER);
    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Navigate to page
    console.log('📄 Loading page...');
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000,
    });
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Determine site type and extract data
    if (url.includes('apartments.com')) {
      return await scrapeApartmentsCom(page, url);
    } else if (url.includes('zillow.com')) {
      return await scrapeZillow(page, url);
    } else if (url.includes('rentcafe.com')) {
      return await scrapeRentCafe(page, url);
    } else if (url.includes('redfin.com')) {
      return await scrapeRedfin(page, url);
    } else {
      throw new Error('Unsupported listing site');
    }
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Scrape Apartments.com
 */
async function scrapeApartmentsCom(page: Page, url: string): Promise<ListingData> {
  console.log('🏢 Scraping Apartments.com...');
  
  const data: ListingData = {
    propertyName: null,
    address: null,
    phone: null,
    minPrice: null,
    maxPrice: null,
    leaseTerm: '12 months',
    amenities: [],
    units: [],
    source: 'Apartments.com',
    scrapedAt: new Date().toISOString(),
  };
  
  // Extract property name
  try {
    data.propertyName = await page.$eval('h1.propertyName, h1[data-tag_item="property_name"]', el => el.textContent?.trim() || null);
  } catch (e) {
    console.log('⚠️ Property name not found');
  }
  
  // Extract address
  try {
    data.address = await page.$eval('.propertyAddress, [data-tag_item="property_address"]', el => el.textContent?.trim() || null);
  } catch (e) {
    console.log('⚠️ Address not found');
  }
  
  // Extract phone
  try {
    data.phone = await page.$eval('a[href^="tel:"]', el => el.textContent?.trim() || null);
  } catch (e) {
    console.log('⚠️ Phone not found');
  }
  
  // Extract pricing - look for 12-month lease specifically
  try {
    const prices = await page.$$eval('.pricingColumn, .priceRange, [data-tag_item="rent"]', els => {
      const priceTexts: string[] = [];
      els.forEach(el => {
        const text = el.textContent || '';
        // Look for prices near "12 month" or just general prices
        const matches = text.match(/\$\s*[\d,]+/g);
        if (matches) {
          priceTexts.push(...matches);
        }
      });
      return priceTexts;
    });
    
    if (prices.length > 0) {
      const numericPrices = prices
        .map(p => parseInt(p.replace(/[^\d]/g, '')))
        .filter(p => p > 500 && p < 15000);
      
      if (numericPrices.length > 0) {
        data.minPrice = Math.min(...numericPrices);
        data.maxPrice = Math.max(...numericPrices);
      }
    }
  } catch (e) {
    console.log('⚠️ Pricing not found');
  }
  
  // Extract amenities
  try {
    data.amenities = await page.$$eval('.amenitiesContainer li, .amenity', els => 
      els.map(el => el.textContent?.trim()).filter(Boolean).slice(0, 30) as string[]
    );
  } catch (e) {
    console.log('⚠️ Amenities not found');
  }
  
  // Extract unit information
  try {
    const units = await page.$$eval('.pricingColumn, .floorPlanContainer', els => {
      return els.map(el => {
        const text = el.textContent || '';
        
        const bedsMatch = text.match(/(\d+)\s*(?:Bed|bed|BR)/);
        const bathsMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:Bath|bath|BA)/);
        const sqftMatch = text.match(/(\d+)\s*(?:Sq\.?\s*Ft|sqft)/i);
        const priceMatch = text.match(/\$\s*([\d,]+)/);
        
        return {
          beds: bedsMatch ? parseInt(bedsMatch[1]) : 0,
          baths: bathsMatch ? parseFloat(bathsMatch[1]) : 0,
          sqft: sqftMatch ? parseInt(sqftMatch[1]) : null,
          price: priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : null,
        };
      }).filter(u => u.beds > 0 || u.price);
    });
    
    data.units = units;
  } catch (e) {
    console.log('⚠️ Units not found');
  }
  
  console.log(`✅ Extracted: ${data.propertyName} - $${data.minPrice}-$${data.maxPrice}`);
  return data;
}

/**
 * Scrape Zillow
 */
async function scrapeZillow(page: Page, url: string): Promise<ListingData> {
  console.log('🏡 Scraping Zillow...');
  
  const data: ListingData = {
    propertyName: null,
    address: null,
    phone: null,
    minPrice: null,
    maxPrice: null,
    leaseTerm: '12 months',
    amenities: [],
    units: [],
    source: 'Zillow',
    scrapedAt: new Date().toISOString(),
  };
  
  // Zillow has different selectors - extract what we can
  try {
    const pageText = await page.evaluate(() => document.body.textContent || '');
    
    // Extract prices
    const priceMatches = pageText.match(/\$\s*[\d,]+/g);
    if (priceMatches) {
      const prices = priceMatches
        .map(p => parseInt(p.replace(/[^\d]/g, '')))
        .filter(p => p > 500 && p < 15000);
      
      if (prices.length > 0) {
        data.minPrice = Math.min(...prices);
        data.maxPrice = Math.max(...prices);
      }
    }
    
    // Try to get property name from title
    data.propertyName = await page.title();
    
  } catch (e) {
    console.log('⚠️ Error scraping Zillow');
  }
  
  console.log(`✅ Zillow: $${data.minPrice}-$${data.maxPrice}`);
  return data;
}

/**
 * Scrape RentCafe
 */
async function scrapeRentCafe(page: Page, url: string): Promise<ListingData> {
  console.log('🏘️ Scraping RentCafe...');
  
  const data: ListingData = {
    propertyName: null,
    address: null,
    phone: null,
    minPrice: null,
    maxPrice: null,
    leaseTerm: '12 months',
    amenities: [],
    units: [],
    source: 'RentCafe',
    scrapedAt: new Date().toISOString(),
  };
  
  try {
    const pageText = await page.evaluate(() => document.body.textContent || '');
    
    const priceMatches = pageText.match(/\$\s*[\d,]+/g);
    if (priceMatches) {
      const prices = priceMatches
        .map(p => parseInt(p.replace(/[^\d]/g, '')))
        .filter(p => p > 500 && p < 15000);
      
      if (prices.length > 0) {
        data.minPrice = Math.min(...prices);
        data.maxPrice = Math.max(...prices);
      }
    }
    
    data.propertyName = await page.title();
    
  } catch (e) {
    console.log('⚠️ Error scraping RentCafe');
  }
  
  console.log(`✅ RentCafe: $${data.minPrice}-$${data.maxPrice}`);
  return data;
}

/**
 * Scrape Redfin
 */
async function scrapeRedfin(page: Page, url: string): Promise<ListingData> {
  console.log('🏠 Scraping Redfin...');
  
  const data: ListingData = {
    propertyName: null,
    address: null,
    phone: null,
    minPrice: null,
    maxPrice: null,
    leaseTerm: '12 months',
    amenities: [],
    units: [],
    source: 'Redfin',
    scrapedAt: new Date().toISOString(),
  };
  
  try {
    const pageText = await page.evaluate(() => document.body.textContent || '');
    
    const priceMatches = pageText.match(/\$\s*[\d,]+/g);
    if (priceMatches) {
      const prices = priceMatches
        .map(p => parseInt(p.replace(/[^\d]/g, '')))
        .filter(p => p > 500 && p < 15000);
      
      if (prices.length > 0) {
        data.minPrice = Math.min(...prices);
        data.maxPrice = Math.max(...prices);
      }
    }
    
    data.propertyName = await page.title();
    
  } catch (e) {
    console.log('⚠️ Error scraping Redfin');
  }
  
  console.log(`✅ Redfin: $${data.minPrice}-$${data.maxPrice}`);
  return data;
}
