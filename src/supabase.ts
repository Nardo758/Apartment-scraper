import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Env, ScrapedListing } from './types';

/**
 * Initialize Supabase client
 */
export function initSupabase(env: Env): SupabaseClient {
  const supabaseKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY;
  return createClient(env.SUPABASE_URL, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Convert ScrapedListing to database format
 */
function listingToDbFormat(listing: ScrapedListing) {
  return {
    property_name: listing.propertyName,
    address: listing.address,
    city: listing.city,
    state: listing.state,
    zip: listing.zip,
    min_price: listing.minPrice,
    max_price: listing.maxPrice,
    beds: listing.beds,
    baths: listing.baths,
    sqft: listing.sqft,
    amenities: listing.amenities || [],
    photos: listing.photos || [],
    contact_phone: listing.contactPhone,
    website_url: listing.websiteUrl,
    available_date: listing.availableDate,
    days_on_market: listing.daysOnMarket,
    special_offers: listing.specialOffers,
    pet_policy: listing.petPolicy,
    application_fee: listing.applicationFee,
    source_url: listing.sourceUrl,
    scraped_at: listing.scrapedAt,
    last_updated: new Date().toISOString(),
  };
}

/**
 * Save listings to Supabase (upsert on address)
 */
export async function saveListings(
  env: Env,
  listings: ScrapedListing[]
): Promise<{ success: number; failed: number; errors: any[] }> {
  if (listings.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }
  
  const supabase = initSupabase(env);
  const errors: any[] = [];
  let success = 0;
  let failed = 0;
  
  // Process in batches of 50
  const batchSize = 50;
  for (let i = 0; i < listings.length; i += batchSize) {
    const batch = listings.slice(i, i + batchSize);
    const dbRecords = batch.map(listingToDbFormat);
    
    try {
      const { data, error } = await supabase
        .from('scraped_listings')
        .upsert(dbRecords, {
          onConflict: 'address,city,state',
          ignoreDuplicates: false,
        });
      
      if (error) {
        console.error('Batch insert error:', error);
        errors.push({ batch: i / batchSize, error: error.message });
        failed += batch.length;
      } else {
        success += batch.length;
      }
    } catch (error: any) {
      console.error('Batch insert exception:', error);
      errors.push({ batch: i / batchSize, error: error.message });
      failed += batch.length;
    }
  }
  
  return { success, failed, errors };
}

/**
 * Get existing listings count for a city
 */
export async function getListingCount(
  env: Env,
  city: string,
  state: string
): Promise<number> {
  const supabase = initSupabase(env);
  
  const { count, error } = await supabase
    .from('scraped_listings')
    .select('*', { count: 'exact', head: true })
    .eq('city', city)
    .eq('state', state);
  
  if (error) {
    console.error('Error getting listing count:', error);
    return 0;
  }
  
  return count || 0;
}

/**
 * Delete old listings (older than specified days)
 */
export async function cleanOldListings(
  env: Env,
  daysOld: number = 30
): Promise<number> {
  const supabase = initSupabase(env);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  const { data, error } = await supabase
    .from('scraped_listings')
    .delete()
    .lt('scraped_at', cutoffDate.toISOString()) as { data: any; error: any };
  
  if (error) {
    console.error('Error cleaning old listings:', error);
    return 0;
  }
  
  return (data && Array.isArray(data)) ? data.length : 0;
}
