/**
 * Apartment Scraper Worker
 * Cloudflare Worker for scraping Apartments.com listings at scale
 */

import type { Env, ScrapeRequest } from './types';
import { ScraperJobQueue } from './jobQueue';
import { handleScheduledEvent } from './scheduler';

// Export the Durable Object
export { ScraperJobQueue };

/**
 * Main worker fetch handler
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    // Handle OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      // Health check
      if (path === '/' || path === '/health') {
        return new Response(
          JSON.stringify({
            service: 'Apartment Scraper Worker',
            status: 'healthy',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      // Route API requests to Durable Object
      if (path.startsWith('/api/scrape/')) {
        const jobId = url.searchParams.get('jobId') || 'default';
        const durableObjectId = env.SCRAPER_JOBS.idFromName(jobId);
        const stub = env.SCRAPER_JOBS.get(durableObjectId);
        
        // Remove /api/scrape prefix and forward to DO
        const newPath = path.replace('/api/scrape', '');
        const newUrl = new URL(newPath, url.origin);
        newUrl.search = url.search;
        
        const doRequest = new Request(newUrl.toString(), {
          method: request.method,
          headers: request.headers,
          body: request.body,
        });
        
        const response = await stub.fetch(doRequest);
        
        // Add CORS headers to response
        const newResponse = new Response(response.body, response);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          newResponse.headers.set(key, value);
        });
        
        return newResponse;
      }
      
      // Direct scrape endpoint (for quick testing, not recommended for production)
      if (path === '/scrape' && request.method === 'POST') {
        const scrapeRequest: ScrapeRequest = await request.json();
        
        // Validate
        if (!scrapeRequest.city || !scrapeRequest.state) {
          return new Response(
            JSON.stringify({ error: 'City and state are required' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        
        // Import scraper (lazy load)
        const { scrapeApartments } = await import('./scraper');
        const listings = await scrapeApartments(env, scrapeRequest);
        
        // Save to database
        const { saveListings } = await import('./supabase');
        const saveResult = await saveListings(env, listings);
        
        return new Response(
          JSON.stringify({
            success: true,
            listingsScraped: listings.length,
            saved: saveResult.success,
            failed: saveResult.failed,
            listings: listings.slice(0, 10), // Return first 10 for preview
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      // DEBUG: Inspect page structure
      if (path === '/inspect-page' && request.method === 'POST') {
        const { url: targetUrl } = await request.json();
        
        if (!targetUrl) {
          return new Response(
            JSON.stringify({ error: 'url parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const { inspectPage } = await import('./page-inspector');
        const analysis = await inspectPage(env, targetUrl);
        
        return new Response(
          JSON.stringify({ success: true, analysis }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // NEW: Text-based scraper (more robust)
      if (path === '/scrape-property' && request.method === 'POST') {
        const { url: targetUrl } = await request.json();
        
        if (!targetUrl) {
          return new Response(
            JSON.stringify({ error: 'url parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const { scrapeProperty } = await import('./text-based-scraper');
        const data = await scrapeProperty(env, targetUrl);
        
        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // NEW: Scrape listing site for pricing (apartments.com, Zillow, etc.)
      if (path === '/scrape-listing' && request.method === 'POST') {
        const { url: targetUrl } = await request.json();
        
        if (!targetUrl) {
          return new Response(
            JSON.stringify({ error: 'url parameter is required' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        
        const { scrapeListingSite } = await import('./listing-scraper');
        const data = await scrapeListingSite(env, targetUrl);
        
        return new Response(
          JSON.stringify({
            success: true,
            data,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      // ScrapingBee test endpoint
      if (path === '/test-scrapingbee' && request.method === 'POST') {
        const { city, state, url } = await request.json();
        
        const { scrapeApartmentsCom, scrapePropertyWebsite } = await import('./scrapingbee');
        
        try {
          let result;
          
          if (city && state) {
            // Scrape apartments.com
            console.log(`ScrapingBee: Scraping apartments.com - ${city}, ${state}`);
            const listings = await scrapeApartmentsCom(env, city, state, 1);
            result = {
              success: true,
              source: 'apartments.com',
              city,
              state,
              listingsFound: listings.length,
              listings: listings.slice(0, 10),
            };
          } else if (url) {
            // Scrape property website
            console.log(`ScrapingBee: Scraping property - ${url}`);
            const data = await scrapePropertyWebsite(env, url);
            result = {
              success: true,
              source: 'property_website',
              url,
              ...data,
            };
          } else {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Either city+state or url required',
              }),
              {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }
          
          return new Response(
            JSON.stringify(result),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
          
        } catch (error: any) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error.message,
              stack: error.stack,
            }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }
      
      // BrightData Scraping Browser test endpoint
      if (path === '/test-browser' && request.method === 'POST') {
        const { city, state, url } = await request.json();
        
        const { scrapeApartmentsComWithBrowser, scrapePropertyWebsite } = await import('./scraping-browser');
        
        try {
          let result;
          
          if (city && state) {
            // Scrape apartments.com
            console.log(`Scraping apartments.com: ${city}, ${state}`);
            const listings = await scrapeApartmentsComWithBrowser(env, city, state, 1);
            result = {
              success: true,
              source: 'apartments.com',
              city,
              state,
              listingsFound: listings.length,
              listings: listings.slice(0, 5),
            };
          } else if (url) {
            // Scrape property website
            console.log(`Scraping property: ${url}`);
            const data = await scrapePropertyWebsite(env, url);
            result = {
              success: true,
              source: 'property_website',
              url,
              data,
            };
          } else {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Either city+state or url required',
              }),
              {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }
          
          return new Response(
            JSON.stringify(result),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
          
        } catch (error: any) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error.message,
              stack: error.stack,
            }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }
      
      // Web Unlocker API test endpoint
      if (path === '/test-unlocker' && request.method === 'POST') {
        const { url: targetUrl, country } = await request.json();
        
        if (!targetUrl) {
          return new Response(
            JSON.stringify({ error: 'url parameter is required' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        
        const { fetchWithUnlocker, parseApartmentsComHTML } = await import('./web-unlocker');
        
        // Fetch HTML via Web Unlocker
        const result = await fetchWithUnlocker(env, {
          url: targetUrl,
          country: country || 'us',
        });
        
        if (!result.success) {
          return new Response(
            JSON.stringify({
              success: false,
              error: result.error,
              statusCode: result.statusCode,
            }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        
        // Parse listings if it's apartments.com
        let listings: any[] = [];
        if (targetUrl.includes('apartments.com')) {
          listings = parseApartmentsComHTML(result.html);
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            statusCode: result.statusCode,
            htmlLength: result.html.length,
            htmlPreview: result.html.substring(0, 500),
            listingsFound: listings.length,
            listings: listings.slice(0, 5), // First 5 for preview
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      // Full Browser Automation endpoint
      if (path === '/scrape-full-browser' && request.method === 'POST') {
        const { url: targetUrl, options } = await request.json();
        
        if (!targetUrl) {
          return new Response(
            JSON.stringify({ error: 'url parameter is required' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        
        try {
          const { scrapePropertyFullBrowser } = await import('./browser-automation');
          const data = await scrapePropertyFullBrowser(env, targetUrl, options || {});
          
          return new Response(
            JSON.stringify({
              success: true,
              data,
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        } catch (error: any) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error.message,
              stack: error.stack,
            }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }
      
      // Scrape property and save to Supabase
      if (path === '/scrape-and-save' && request.method === 'POST') {
        const { url: targetUrl, options } = await request.json();
        
        if (!targetUrl) {
          return new Response(
            JSON.stringify({ error: 'url parameter is required' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        
        try {
          // 1. Scrape the property
          const { scrapePropertyFullBrowser } = await import('./browser-automation');
          const data = await scrapePropertyFullBrowser(env, targetUrl, options || {});
          
          // 2. Save to Supabase
          const { savePropertyData } = await import('./supabase-v2');
          const saveResult = await savePropertyData(env, data);
          
          return new Response(
            JSON.stringify({
              success: true,
              scraping: {
                propertyName: data.propertyName,
                leaseRatesFound: data.leaseRates.length,
                concessionsFound: data.concessions.length,
                amenitiesFound: data.amenities.length,
              },
              database: {
                saved: saveResult.success,
                propertyId: saveResult.propertyId,
                leaseRatesSaved: saveResult.leaseRatesSaved,
                concessionsSaved: saveResult.concessionsSaved,
                errors: saveResult.errors,
              },
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        } catch (error: any) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error.message,
              stack: error.stack,
            }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }
      
      // Batch scraping endpoint
      if (path === '/scrape-batch' && request.method === 'POST') {
        const { urls, concurrency } = await request.json();
        
        if (!urls || !Array.isArray(urls) || urls.length === 0) {
          return new Response(
            JSON.stringify({ error: 'urls array is required' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        
        try {
          const { scrapePropertiesBatch } = await import('./browser-automation');
          const results = await scrapePropertiesBatch(env, urls, concurrency || 3);
          
          return new Response(
            JSON.stringify({
              success: true,
              scrapedCount: results.length,
              totalRequested: urls.length,
              results,
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        } catch (error: any) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error.message,
            }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }
      
      // Documentation
      if (path === '/docs') {
        const docs = {
          endpoints: {
            'GET /': 'Health check',
            'GET /docs': 'API documentation',
            'POST /scrape-listing': 'Scrape listing site for pricing data',
            'POST /api/scrape/start': 'Start a new scraping job',
            'GET /api/scrape/status/:jobId': 'Get job status',
            'GET /api/scrape/results/:jobId': 'Get job results',
            'POST /api/scrape/cancel/:jobId': 'Cancel a job',
            'GET /api/scrape/list': 'List all jobs',
          },
          examples: {
            scrapeListing: {
              method: 'POST',
              url: '/scrape-listing',
              body: {
                url: 'https://www.apartments.com/arbor-gates-at-buckhead-atlanta-ga/f8v1llv/',
              },
              description: 'Scrape pricing from apartments.com, Zillow, RentCafe, or Redfin',
            },
            startJob: {
              method: 'POST',
              url: '/api/scrape/start',
              body: {
                city: 'atlanta',
                state: 'ga',
                filters: {
                  minPrice: 1000,
                  maxPrice: 3000,
                  beds: [1, 2],
                },
                maxPages: 5,
              },
            },
            getStatus: {
              method: 'GET',
              url: '/api/scrape/status/:jobId',
            },
          },
        };
        
        return new Response(JSON.stringify(docs, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response('Not found', {
        status: 404,
        headers: corsHeaders,
      });
      
    } catch (error: any) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  },

  /**
   * Scheduled event handler for cron triggers
   * Runs automated scraping at configured intervals
   */
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    await handleScheduledEvent(event, env);
  },
} satisfies ExportedHandler<Env>;
