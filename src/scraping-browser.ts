/**
 * BrightData Scraping Browser Integration
 * 
 * Uses WebSocket connection to BrightData's managed browser
 * This bypasses Cloudflare Workers' HTTP proxy limitations
 * 
 * Documentation: https://docs.brightdata.com/scraping-automation/scraping-browser/getting-started
 */

import puppeteer, { Browser, Page } from '@cloudflare/puppeteer';
import type { Env } from './types';

/**
 * Launch browser using Cloudflare Browser Rendering
 * 
 * Uses Cloudflare's native browser binding (MYBROWSER) instead of external service
 * This is more reliable within Cloudflare Workers environment
 * 
 * @param env - Worker environment with MYBROWSER binding
 */
export async function connectToBrightDataBrowser(
  env: Env
): Promise<Browser> {
  console.log('Launching Cloudflare Browser...');
  
  try {
    // Launch browser using Cloudflare Browser Rendering
    const browser = await puppeteer.launch(env.MYBROWSER);
    
    console.log('Browser launched successfully');
    return browser;
    
  } catch (error: any) {
    console.error('Failed to launch browser:', error);
    throw new Error(`Browser launch failed: ${error.message}`);
  }
}

/**
 * Scrape apartments.com using BrightData Scraping Browser
 * 
 * @param env - Worker environment
 * @param city - City to search
 * @param state - State abbreviation
 * @param maxPages - Maximum pages to scrape
 */
export async function scrapeApartmentsComWithBrowser(
  env: Env,
  city: string,
  state: string,
  maxPages: number = 1
): Promise<any[]> {
  let browser: Browser | null = null;
  const listings: any[] = [];
  
  try {
    // Connect to BrightData browser
    browser = await connectToBrightDataBrowser(env);
    
    // Open new page
    const page = await browser.newPage();
    
    // Build apartments.com URL
    const citySlug = city.toLowerCase().replace(/\s+/g, '-');
    const stateSlug = state.toLowerCase();
    const url = `https://www.apartments.com/${citySlug}-${stateSlug}/`;
    
    console.log(`Navigating to: ${url}`);
    
    // Navigate to apartments.com
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    
    console.log('Page loaded successfully');
    
    // Wait for listings to load
    await page.waitForSelector('article.placard, li.mortar-wrapper', {
      timeout: 10000,
    }).catch(() => {
      console.warn('Listings selector not found');
    });
    
    // Extract listings from page
    const pageListings = await page.evaluate(() => {
      const results: any[] = [];
      
      // Find all listing cards
      const cards = document.querySelectorAll('article.placard, li.mortar-wrapper');
      
      cards.forEach(card => {
        try {
          // Extract property name
          const nameEl = card.querySelector('.property-title, .property-name, h2.title');
          const propertyName = nameEl?.textContent?.trim() || null;
          
          // Extract address
          const addressEl = card.querySelector('.property-address, .property-location');
          const address = addressEl?.textContent?.trim() || null;
          
          // Extract price
          const priceEl = card.querySelector('.property-pricing, .price-range, .rent');
          const priceText = priceEl?.textContent?.trim() || null;
          
          // Extract beds
          const bedsEl = card.querySelector('.bed-range, .beds');
          const bedsText = bedsEl?.textContent?.trim() || null;
          
          // Extract URL
          const linkEl = card.querySelector('a');
          const url = linkEl?.href || null;
          
          // Only add if we have basic info
          if (propertyName || address) {
            results.push({
              propertyName,
              address,
              price: priceText,
              beds: bedsText,
              url,
            });
          }
        } catch (e) {
          console.error('Error extracting listing:', e);
        }
      });
      
      return results;
    });
    
    listings.push(...pageListings);
    console.log(`Extracted ${pageListings.length} listings`);
    
    // Close page
    await page.close();
    
  } catch (error: any) {
    console.error('Scraping error:', error);
    throw error;
  } finally {
    // Disconnect from browser
    if (browser) {
      await browser.close();
      console.log('Disconnected from BrightData browser');
    }
  }
  
  return listings;
}

/**
 * Scrape a property website using BrightData Scraping Browser
 * 
 * @param env - Worker environment
 * @param url - Property website URL
 */
export async function scrapePropertyWebsite(
  env: Env,
  url: string
): Promise<{
  propertyName: string | null;
  pricing: any[];
  amenities: string[];
  photos: string[];
  html: string;
}> {
  let browser: Browser | null = null;
  
  try {
    // Connect to BrightData browser
    browser = await connectToBrightDataBrowser(env);
    
    // Open new page
    const page = await browser.newPage();
    
    console.log(`Navigating to: ${url}`);
    
    // Navigate to property website
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    
    console.log('Property page loaded');
    
    // Extract data from page
    const data = await page.evaluate(() => {
      // Extract property name
      const nameSelectors = [
        'h1',
        '[class*="property-name"]',
        '[class*="community-name"]',
        '.hero-title',
      ];
      
      let propertyName = null;
      for (const selector of nameSelectors) {
        const el = document.querySelector(selector);
        if (el?.textContent) {
          propertyName = el.textContent.trim();
          break;
        }
      }
      
      // Extract pricing
      const pricing: any[] = [];
      const priceElements = document.querySelectorAll(
        '[class*="price"], [class*="rent"], .floor-plan'
      );
      
      priceElements.forEach(el => {
        const text = el.textContent || '';
        const match = text.match(/\$[\d,]+/);
        if (match) {
          pricing.push({
            text: text.trim(),
            price: match[0],
          });
        }
      });
      
      // Extract amenities
      const amenities: string[] = [];
      const amenityElements = document.querySelectorAll(
        '[class*="amenity"], [class*="feature"], li'
      );
      
      amenityElements.forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length < 100 && text.length > 3) {
          amenities.push(text);
        }
      });
      
      // Extract photos
      const photos: string[] = [];
      const imageElements = document.querySelectorAll('img');
      
      imageElements.forEach(img => {
        const src = img.src || img.getAttribute('data-src');
        if (src && (src.includes('photo') || src.includes('image'))) {
          photos.push(src);
        }
      });
      
      return {
        propertyName,
        pricing: pricing.slice(0, 10), // First 10 prices
        amenities: Array.from(new Set(amenities)).slice(0, 20), // Unique, first 20
        photos: photos.slice(0, 5), // First 5 photos
      };
    });
    
    // Get full HTML for debugging
    const html = await page.content();
    
    // Close page
    await page.close();
    
    return {
      ...data,
      html: html.substring(0, 5000), // First 5KB of HTML
    };
    
  } catch (error: any) {
    console.error('Property scraping error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
