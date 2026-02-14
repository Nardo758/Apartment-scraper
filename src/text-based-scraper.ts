/**
 * Text-based scraper - Extracts data from page content
 * More robust than CSS selectors when HTML structure changes
 */

import puppeteer from '@cloudflare/puppeteer';
import type { Env } from './types';

export interface PropertyData {
  propertyName: string | null;
  address: string | null;
  phone: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  beds: number[];
  baths: number[];
  sqft: number[];
  amenities: string[];
}

export async function scrapeProperty(env: Env, url: string): Promise<PropertyData> {
  console.log('🚀 Scraping:', url);
  
  const browser = await puppeteer.launch(env.MYBROWSER);
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    console.log('📄 Loading page...');
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000,
    });
    
    // Wait for content
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Extract all data from page text
    const data = await page.evaluate(() => {
      const text = document.body.textContent || '';
      const html = document.body.innerHTML;
      
      const result: any = {
        propertyName: null,
        address: null,
        phone: null,
        minPrice: null,
        maxPrice: null,
        beds: [],
        baths: [],
        sqft: [],
        amenities: [],
      };
      
      // Extract property name from title
      result.propertyName = document.title.split('|')[0].split('-')[0].trim();
      
      // Extract address (pattern: number + street)
      const addrMatch = text.match(/(\d+\s+[A-Z][a-zA-Z\s]+(?:Road|Rd|Street|St|Avenue|Ave|Drive|Dr|Boulevard|Blvd|Parkway|Pkwy|Lane|Ln)[^,]*,\s*[A-Z][a-zA-Z\s]+,\s*[A-Z]{2}\s*\d{5})/);
      if (addrMatch) {
        result.address = addrMatch[1].trim();
      }
      
      // Extract phone
      const phoneMatch = text.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
      if (phoneMatch) {
        result.phone = phoneMatch[1];
      }
      
      // Extract all prices
      const priceMatches = text.match(/\$\s*[\d,]+/g) || [];
      const prices = priceMatches
        .map(p => parseInt(p.replace(/[^\d]/g, '')))
        .filter(p => p > 500 && p < 15000);
      
      if (prices.length > 0) {
        result.minPrice = Math.min(...prices);
        result.maxPrice = Math.max(...prices);
      }
      
      // Extract beds
      const bedMatches = text.match(/(\d+)\s*(?:Bed|bed|BR|Bedroom)/g) || [];
      result.beds = [...new Set(bedMatches.map(b => parseInt(b)))].sort();
      
      // Extract baths
      const bathMatches = text.match(/(\d+(?:\.\d+)?)\s*(?:Bath|bath|BA|Bathroom)/g) || [];
      result.baths = [...new Set(bathMatches.map(b => parseFloat(b)))].sort();
      
      // Extract sqft
      const sqftMatches = text.match(/(\d{3,5})\s*(?:Sq\.?\s*Ft|sqft|Square\s*Feet)/gi) || [];
      result.sqft = [...new Set(sqftMatches.map(s => parseInt(s.match(/\d{3,5}/)?.[0] || '0')))].filter(n => n > 0).sort();
      
      // Extract amenities from common patterns
      const amenityPatterns = [
        /pool/i,
        /gym|fitness/i,
        /parking|garage/i,
        /pet\s*friendly/i,
        /washer|dryer|laundry/i,
        /dishwasher/i,
        /air\s*conditioning|a\/c|ac/i,
        /balcony|patio/i,
        /hardwood/i,
        /stainless/i,
      ];
      
      amenityPatterns.forEach(pattern => {
        if (pattern.test(text)) {
          const match = text.match(pattern);
          if (match) {
            result.amenities.push(match[0]);
          }
        }
      });
      
      return result;
    });
    
    console.log(`✅ Extracted: ${data.propertyName}`);
    console.log(`   Price: $${data.minPrice}-$${data.maxPrice}`);
    console.log(`   Beds: ${data.beds.join(', ')}`);
    console.log(`   Sqft: ${data.sqft.join(', ')}`);
    
    return data;
    
  } finally {
    await browser.close();
  }
}
