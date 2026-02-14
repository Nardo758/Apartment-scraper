/**
 * BrightData Web Unlocker API Integration
 * 
 * Simple HTTP API for scraping without browser automation
 * Documentation: https://docs.brightdata.com/scraping-automation/web-unlocker/introduction
 */

import type { Env } from './types';

export interface WebUnlockerRequest {
  url: string;
  country?: string;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  method?: 'GET' | 'POST';
  body?: string;
}

export interface WebUnlockerResponse {
  success: boolean;
  statusCode: number;
  html: string;
  url: string;
  error?: string;
}

/**
 * Fetch HTML using BrightData Web Unlocker
 * 
 * Uses BrightData Scraper API endpoint (not proxy-based)
 * Documentation: https://docs.brightdata.com/scraping-automation/web-scraper-api/overview
 * 
 * @param env - Worker environment with BRIGHTDATA_API_KEY
 * @param request - URL and options
 */
export async function fetchWithUnlocker(
  env: Env,
  request: WebUnlockerRequest
): Promise<WebUnlockerResponse> {
  const { url, country = 'us' } = request;
  
  // BrightData Scraper API endpoint
  // This is a REST API that handles all the proxy/browser management
  const apiEndpoint = `https://api.brightdata.com/datasets/v3/trigger`;
  
  try {
    console.log(`Web Unlocker API: Fetching ${url}`);
    
    // Make request to BrightData Scraper API
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.BRIGHTDATA_API_KEY}`,
      },
      body: JSON.stringify({
        dataset_id: 'gd_l7q7dkf244hwjntr0', // Web Scraper dataset
        url: url,
        country: country,
        format: 'json',
      }),
    });
    
    const result = await response.json() as any;
    
    console.log(`Web Unlocker API response:`, result);
    
    if (!response.ok) {
      return {
        success: false,
        statusCode: response.status,
        html: '',
        url,
        error: `BrightData API error: ${response.status} - ${JSON.stringify(result)}`,
      };
    }
    
    // The API returns a snapshot_id - we need to poll for results
    // For now, return the response info
    return {
      success: false,
      statusCode: response.status,
      html: '',
      url,
      error: 'BrightData API requires async polling - not implemented yet',
    };
    
  } catch (error: any) {
    console.error('Web Unlocker API error:', error);
    
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
 * Alternative: Use BrightData's direct proxy approach
 * This is a fallback if the Proxy-Authorization header doesn't work
 */
export async function fetchViaProxyUrl(
  env: Env,
  request: WebUnlockerRequest
): Promise<WebUnlockerResponse> {
  const { url, country = 'us' } = request;
  
  // Build proxy URL
  const username = `brd-customer-${env.BRIGHTDATA_API_KEY}-zone-web_unlocker-country-${country}`;
  const password = env.BRIGHTDATA_API_KEY;
  const proxyUrl = `http://${username}:${password}@brd.superproxy.io:22225`;
  
  try {
    console.log(`Fetching via proxy URL: ${url}`);
    
    // Note: Cloudflare Workers don't support HTTP_PROXY env var
    // We need to use a different approach
    
    // Use BrightData's SERP API endpoint instead
    const apiUrl = `https://api.brightdata.com/request`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.BRIGHTDATA_API_KEY}`,
      },
      body: JSON.stringify({
        zone: 'web_unlocker',
        url,
        country,
        format: 'raw',
      }),
    });
    
    const html = await response.text();
    
    return {
      success: response.ok,
      statusCode: response.status,
      html,
      url,
    };
    
  } catch (error: any) {
    console.error('Proxy URL error:', error);
    
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
  // Simple regex-based parsing (fallback if no DOM parser)
  const listings: any[] = [];
  
  try {
    // Extract property cards using regex
    const propertyPattern = /<article[^>]*class="[^"]*placard[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
    const matches = html.matchAll(propertyPattern);
    
    for (const match of matches) {
      const cardHtml = match[1];
      
      // Extract property name
      const nameMatch = cardHtml.match(/class="[^"]*property-title[^"]*"[^>]*>([^<]+)</i);
      const name = nameMatch ? nameMatch[1].trim() : null;
      
      // Extract address
      const addressMatch = cardHtml.match(/class="[^"]*property-address[^"]*"[^>]*>([^<]+)</i);
      const address = addressMatch ? addressMatch[1].trim() : null;
      
      // Extract price
      const priceMatch = cardHtml.match(/class="[^"]*price-range[^"]*"[^>]*>\$([0-9,]+)/i);
      const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : null;
      
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
          minPrice: price,
          beds,
          websiteUrl: url,
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
 * Example usage:
 * 
 * ```ts
 * const result = await fetchWithUnlocker(env, {
 *   url: 'https://www.apartments.com/atlanta-ga/',
 *   country: 'us',
 * });
 * 
 * if (result.success) {
 *   const listings = parseApartmentsComHTML(result.html);
 *   console.log(`Found ${listings.length} listings`);
 * }
 * ```
 */
