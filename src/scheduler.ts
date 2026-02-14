/**
 * Scheduler for Cost-Optimized Scraping
 * Handles cron triggers and batch processing
 */

import type { Env } from './types';
import { scrapePropertyFullBrowser } from './browser-automation';
import { savePropertyData } from './supabase-v2';

// =============================================
// PROPERTY URL MANAGEMENT
// =============================================

/**
 * Get properties to scrape from Supabase
 * Prioritizes properties that haven't been scraped recently
 */
async function getPropertiesToScrape(
  env: Env,
  limit: number = 100
): Promise<string[]> {
  // TODO: Query Supabase for property URLs
  // Prioritize by: last_scraped (oldest first)
  // For now, return empty array (implement when property catalog exists)
  return [];
}

/**
 * Store property URL in scraping queue
 */
async function addPropertyToQueue(
  env: Env,
  url: string,
  priority: number = 0
): Promise<void> {
  // TODO: Add to Durable Objects job queue
  console.log(`Added to queue: ${url} (priority: ${priority})`);
}

// =============================================
// BATCH SCRAPING
// =============================================

/**
 * Scrape a batch of properties with rate limiting
 */
async function scrapeBatch(
  urls: string[],
  env: Env,
  options: {
    delayMs?: number;
    saveToDatabase?: boolean;
  } = {}
): Promise<{
  success: number;
  failed: number;
  errors: Array<{ url: string; error: string }>;
}> {
  const { delayMs = 5000, saveToDatabase = true } = options;
  
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ url: string; error: string }>,
  };
  
  for (const url of urls) {
    try {
      console.log(`Scraping: ${url}`);
      
      // Scrape property
      const propertyData = await scrapePropertyFullBrowser(env, url, {
        waitTime: 10000,
        scrollPage: true,
      });
      
      // Save to database if requested
      if (saveToDatabase) {
        const saveResult = await savePropertyData(env, propertyData);
        
        if (saveResult.success) {
          console.log(`✅ Saved: ${propertyData.propertyName} (${saveResult.leaseRatesSaved} rates)`);
          results.success++;
        } else {
          console.error(`❌ Save failed: ${propertyData.propertyName}`);
          results.failed++;
          results.errors.push({ url, error: 'Database save failed' });
        }
      } else {
        results.success++;
      }
      
      // Rate limiting: wait between requests
      if (delayMs > 0 && urls.indexOf(url) < urls.length - 1) {
        console.log(`Waiting ${delayMs}ms before next scrape...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      
    } catch (error: any) {
      console.error(`❌ Scrape failed: ${url}`, error.message);
      results.failed++;
      results.errors.push({ url, error: error.message });
    }
  }
  
  return results;
}

// =============================================
// CRON HANDLERS
// =============================================

/**
 * Daily full scrape (500 properties)
 * Recommended: Sunday at 2 AM EST (7 AM UTC)
 */
export async function handleDailyFullScrape(env: Env): Promise<void> {
  console.log('🕐 Daily full scrape started');
  
  // Get all properties to scrape
  const urls = await getPropertiesToScrape(env, 500);
  
  if (urls.length === 0) {
    console.log('No properties to scrape');
    return;
  }
  
  console.log(`Scraping ${urls.length} properties...`);
  
  // Scrape in batches of 50
  const batchSize = 50;
  let totalSuccess = 0;
  let totalFailed = 0;
  
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(urls.length / batchSize);
    
    console.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} properties)`);
    
    const result = await scrapeBatch(batch, env, {
      delayMs: 5000, // 5 seconds between properties
      saveToDatabase: true,
    });
    
    totalSuccess += result.success;
    totalFailed += result.failed;
    
    // Wait between batches (10 seconds)
    if (i + batchSize < urls.length) {
      console.log('Waiting 10s before next batch...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  console.log(`✅ Daily scrape complete: ${totalSuccess} success, ${totalFailed} failed`);
}

/**
 * Partial scrape (100 properties rotating)
 * Recommended: Daily at 2 AM EST (7 AM UTC) Mon-Sat
 */
export async function handlePartialScrape(env: Env): Promise<void> {
  console.log('🕐 Partial scrape started');
  
  // Get 100 properties (oldest scraped first)
  const urls = await getPropertiesToScrape(env, 100);
  
  if (urls.length === 0) {
    console.log('No properties to scrape');
    return;
  }
  
  console.log(`Scraping ${urls.length} properties...`);
  
  const result = await scrapeBatch(urls, env, {
    delayMs: 5000,
    saveToDatabase: true,
  });
  
  console.log(`✅ Partial scrape complete: ${result.success} success, ${result.failed} failed`);
}

/**
 * Gradual scrape (small batch every 4 hours)
 * Recommended: For staying within free tier
 */
export async function handleGradualScrape(env: Env): Promise<void> {
  console.log('🕐 Gradual scrape started');
  
  // Get 10 properties (oldest scraped first)
  const urls = await getPropertiesToScrape(env, 10);
  
  if (urls.length === 0) {
    console.log('No properties to scrape');
    return;
  }
  
  console.log(`Scraping ${urls.length} properties...`);
  
  const result = await scrapeBatch(urls, env, {
    delayMs: 3000,
    saveToDatabase: true,
  });
  
  console.log(`✅ Gradual scrape complete: ${result.success} success, ${result.failed} failed`);
}

// =============================================
// MAIN SCHEDULED HANDLER
// =============================================

/**
 * Main scheduled event handler
 * Determines which scraping strategy to use based on cron pattern
 */
export async function handleScheduledEvent(
  event: ScheduledEvent,
  env: Env
): Promise<void> {
  const cron = event.cron;
  console.log(`Cron trigger fired: ${cron}`);
  
  // Detect which schedule triggered
  // Daily full scrape: "0 7 * * 0" (Sunday 7 AM UTC = 2 AM EST)
  // Partial scrape: "0 7 * * 1-6" (Mon-Sat 7 AM UTC)
  // Gradual scrape: "0 */4 * * *" (Every 4 hours)
  
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const hour = now.getUTCHours();
  
  // Check if it's Sunday at 7 AM UTC (full scrape)
  if (dayOfWeek === 0 && hour === 7) {
    await handleDailyFullScrape(env);
  }
  // Check if it's Mon-Sat at 7 AM UTC (partial scrape)
  else if (dayOfWeek >= 1 && dayOfWeek <= 6 && hour === 7) {
    await handlePartialScrape(env);
  }
  // Otherwise, gradual scrape (every 4 hours)
  else {
    await handleGradualScrape(env);
  }
}

// =============================================
// EXPORTS
// =============================================

export default {
  handleScheduledEvent,
  handleDailyFullScrape,
  handlePartialScrape,
  handleGradualScrape,
  scrapeBatch,
};
