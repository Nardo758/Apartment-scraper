/**
 * ScrapingBee API Integration
 * 
 * Simple REST API for scraping without browser automation
 * Documentation: https://www.scrapingbee.com/documentation/
 */

import type { Env } from './types';

export interface ScrapingBeeRequest {
  url: string;
  renderJs?: boolean;
  premiumProxy?: boolean;
  country?: string;
  blockAds?: boolean;
  blockResources?: boolean;
  waitFor?: number;
}

export interface ScrapingBeeResponse {
  success: boolean;
  html: string;
  statusCode: number;
  url: string;
  error?: string;
}

/**
 * Fetch HTML using ScrapingBee API
 * 
 * This bypasses all anti-bot protection:
 * - CAPTCHAs
 * - IP blocking
 * - Fingerprinting
 * - Rate limiting
 * 
 * @param env - Worker environment with SCRAPINGBEE_API_KEY
 * @param request - URL and options
 */
export async function fetchWithScrapingBee(
  env: Env,
  request: ScrapingBeeRequest
): Promise<ScrapingBeeResponse> {
  const {
    url,
    renderJs = true,
    premiumProxy = false,
    country = 'us',
    blockAds = true,
    blockResources = false,
    waitFor = 0,
  } = request;
  
  // Build ScrapingBee API URL
  const apiUrl = new URL('https://app.scrapingbee.com/api/v1/');
  
  // Add parameters
  apiUrl.searchParams.set('api_key', env.SCRAPINGBEE_API_KEY);
  apiUrl.searchParams.set('url', url);
  apiUrl.searchParams.set('render_js', renderJs.toString());
  apiUrl.searchParams.set('premium_proxy', premiumProxy.toString());
  apiUrl.searchParams.set('country_code', country);
  apiUrl.searchParams.set('block_ads', blockAds.toString());
  apiUrl.searchParams.set('block_resources', blockResources.toString());
  
  if (waitFor > 0) {
    apiUrl.searchParams.set('wait', waitFor.toString());
  }
  
  console.log(`ScrapingBee: Fetching ${url}`);
  
  try {
    const response = await fetch(apiUrl.toString());
    const html = await response.text();
    const statusCode = response.status;
    
    console.log(`ScrapingBee: Status ${statusCode}, HTML length: ${html.length}`);
    
    if (!response.ok) {
      return {
        success: false,
        statusCode,
        html,
        url,
        error: `HTTP ${statusCode}: ${response.statusText}`,
      };
    }
    
    return {
      success: true,
      statusCode,
      html,
      url,
    };
    
  } catch (error: any) {
    console.error('ScrapingBee error:', error);
    
    return {
      success: false,
      statusCode: 0,
      html: '',
      url,
      error: error.message,
    };
  }
}

/**
 * Parse apartments.com HTML to extract listings
 */
export function parseApartmentsComHTML(html: string): any[] {
  const listings: any[] = [];
  
  try {
    // Extract property cards using regex
    const propertyPattern = /<article[^>]*class="[^"]*placard[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
    const matches = html.matchAll(propertyPattern);
    
    for (const match of matches) {
      const cardHtml = match[1];
      
      // Extract property name
      const nameMatch = cardHtml.match(/class="[^"]*property-title[^"]*"[^>]*>([^<]+)/i);
      const name = nameMatch ? nameMatch[1].trim() : null;
      
      // Extract address
      const addressMatch = cardHtml.match(/class="[^"]*property-address[^"]*"[^>]*>([^<]+)/i);
      const address = addressMatch ? addressMatch[1].trim() : null;
      
      // Extract price range
      const priceMatch = cardHtml.match(/\$([0-9,]+)/i);
      const minPrice = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : null;
      
      // Extract beds
      const bedsMatch = cardHtml.match(/(\d+)\s*bed/i);
      const beds = bedsMatch ? parseInt(bedsMatch[1]) : null;
      
      // Extract URL
      const urlMatch = cardHtml.match(/href="([^"]+)"/i);
      const url = urlMatch ? urlMatch[1] : null;
      
      if (name || address) {
        listings.push({
          propertyName: name,
          address,
          city: 'Atlanta', // TODO: Extract from context
          state: 'GA',
          minPrice,
          beds,
          websiteUrl: url,
          scrapedAt: new Date().toISOString(),
        });
      }
    }
    
    console.log(`Parsed ${listings.length} listings from HTML`);
    
  } catch (error) {
    console.error('HTML parsing error:', error);
  }
  
  return listings;
}

/**
 * Scrape apartments.com using ScrapingBee
 */
export async function scrapeApartmentsCom(
  env: Env,
  city: string,
  state: string,
  maxPages: number = 1
): Promise<any[]> {
  const allListings: any[] = [];
  
  try {
    // Build apartments.com URL
    const citySlug = city.toLowerCase().replace(/\s+/g, '-');
    const stateSlug = state.toLowerCase();
    const url = `https://www.apartments.com/${citySlug}-${stateSlug}/`;
    
    console.log(`Scraping apartments.com: ${url}`);
    
    // Fetch HTML via ScrapingBee
    const result = await fetchWithScrapingBee(env, {
      url,
      renderJs: true,
      premiumProxy: false,
      country: 'us',
      blockAds: true,
      waitFor: 2000, // Wait 2s for JS to render
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch page');
    }
    
    // Parse listings from HTML
    const listings = parseApartmentsComHTML(result.html);
    allListings.push(...listings);
    
    console.log(`Found ${listings.length} listings on page 1`);
    
  } catch (error: any) {
    console.error('Scraping error:', error);
    throw error;
  }
  
  return allListings;
}

/**
 * Scrape a property website using ScrapingBee
 */
export async function scrapePropertyWebsite(
  env: Env,
  url: string
): Promise<{
  success: boolean;
  html: string;
  htmlPreview: string;
  propertyName: string | null;
  prices: string[];
  amenities: string[];
}> {
  try {
    console.log(`Scraping property: ${url}`);
    
    // Fetch HTML via ScrapingBee
    const result = await fetchWithScrapingBee(env, {
      url,
      renderJs: true,
      premiumProxy: false,
      country: 'us',
      blockAds: true,
      waitFor: 2000,
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch page');
    }
    
    // Extract basic info from HTML
    const html = result.html;
    
    // Extract property name (look for h1)
    const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const propertyName = nameMatch ? nameMatch[1].trim() : null;
    
    // Extract prices
    const prices: string[] = [];
    const priceMatches = html.matchAll(/\$([0-9,]+)/gi);
    for (const match of priceMatches) {
      prices.push(match[0]);
      if (prices.length >= 10) break;
    }
    
    // Extract amenities (simple heuristic)
    const amenities: string[] = [];
    const amenityMatches = html.matchAll(/<li[^>]*>([^<]+)<\/li>/gi);
    for (const match of amenityMatches) {
      const text = match[1].trim();
      if (text.length > 5 && text.length < 100) {
        amenities.push(text);
        if (amenities.length >= 20) break;
      }
    }
    
    return {
      success: true,
      html,
      htmlPreview: html.substring(0, 5000),
      propertyName,
      prices: Array.from(new Set(prices)),
      amenities: Array.from(new Set(amenities)),
    };
    
  } catch (error: any) {
    console.error('Property scraping error:', error);
    throw error;
  }
}

/**
 * Example usage:
 * 
 * ```ts
 * const listings = await scrapeApartmentsCom(env, 'Atlanta', 'GA', 1);
 * console.log(`Found ${listings.length} listings`);
 * 
 * const property = await scrapePropertyWebsite(env, 'https://example.com/property');
 * console.log(`Property: ${property.propertyName}`);
 * ```
 */
