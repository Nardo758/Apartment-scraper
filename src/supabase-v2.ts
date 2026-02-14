/**
 * Supabase V2 Integration - Browser Automation Data
 * Saves PropertyData (lease rates + concessions) to normalized schema
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Env } from './types';
import type { PropertyData, LeaseRate, Concession } from './browser-automation';

/**
 * Initialize Supabase client
 */
export function initSupabase(env: Env): SupabaseClient {
  const supabaseKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY;
  const keyType = env.SUPABASE_SERVICE_KEY ? 'SERVICE_KEY' : 'ANON_KEY';
  console.log(`[Supabase] Initializing with ${keyType}`);
  console.log(`[Supabase] URL: ${env.SUPABASE_URL}`);
  
  return createClient(env.SUPABASE_URL, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Save property data to Supabase (upsert)
 * Returns the property ID for linking lease rates and concessions
 */
async function saveProperty(
  supabase: SupabaseClient,
  data: PropertyData
): Promise<string | null> {
  // Extract city/state from address if possible
  const addressParts = data.address.split(',').map(s => s.trim());
  let city = null;
  let state = null;
  let zip = null;
  
  if (addressParts.length >= 2) {
    // Try to parse "City, STATE ZIP" format
    const lastPart = addressParts[addressParts.length - 1];
    const stateZipMatch = lastPart.match(/([A-Z]{2})\s*(\d{5})?/);
    if (stateZipMatch) {
      state = stateZipMatch[1];
      zip = stateZipMatch[2] || null;
      city = addressParts[addressParts.length - 2];
    }
  }
  
  // Match actual column names and satisfy ALL NOT NULL constraints
  const propertyRecord = {
    name: data.propertyName,
    address: data.address,
    city: city || 'Unknown',
    state: state || 'XX',
    zip_code: zip,
    bedrooms: 0,           // Mixed unit types
    bathrooms: 1,          // Required
    sqft: 0,               // Mixed unit types
    original_price: 0,     // Mixed pricing
    ai_price: 0,           // Mixed pricing
    effective_price: 0,    // Mixed pricing
    
    // Enhanced property characteristics
    year_built: data.yearBuilt || null,
    year_renovated: data.yearRenovated || null,
    property_class: data.propertyClass || null,
    building_type: data.buildingType || null,
    management_company: data.managementCompany || null,
    
    // Occupancy & operations
    total_units: data.totalUnits || null,
    current_occupancy_percent: data.currentOccupancyPercent || null,
    avg_days_to_lease: data.avgDaysToLease || null,
    
    // Financial data (already in cents)
    parking_fee_monthly: data.parkingFeeMonthly || null,
    pet_rent_monthly: data.petRentMonthly || null,
    application_fee: data.applicationFee || null,
    admin_fee: data.adminFee || null,
  };
  
  // Simple insert - no upsert since old schema doesn't have unique constraint on URL
  const { data: property, error } = await supabase
    .from('properties')
    .insert(propertyRecord)
    .select('id')
    .single();
  
  if (error) {
    console.error('Error saving property:', error);
    console.error('Property record:', JSON.stringify(propertyRecord, null, 2));
    console.error('Error details:', JSON.stringify(error, null, 2));
    return null;
  }
  
  return property?.id || null;
}

/**
 * Save lease rates for a property
 */
async function saveLeaseRates(
  supabase: SupabaseClient,
  propertyId: string,
  leaseRates: LeaseRate[]
): Promise<{ success: number; failed: number }> {
  if (leaseRates.length === 0) {
    return { success: 0, failed: 0 };
  }
  
  const records = leaseRates.map(rate => ({
    property_id: propertyId,
    unit_type: rate.unitType,
    sqft: rate.sqft,
    price: rate.price, // Already in cents
    lease_term: rate.leaseTerm,
    available: rate.available,
    available_date: rate.availableDate || null,
    unit_status: rate.unitStatus || 'available',
  }));
  
  const { data, error } = await supabase
    .from('scraped_lease_rates')
    .insert(records);
  
  if (error) {
    console.error('Error saving lease rates:', error);
    return { success: 0, failed: leaseRates.length };
  }
  
  return { success: leaseRates.length, failed: 0 };
}

/**
 * Save concessions for a property
 */
async function saveConcessions(
  supabase: SupabaseClient,
  propertyId: string,
  concessions: Concession[]
): Promise<{ success: number; failed: number }> {
  if (concessions.length === 0) {
    return { success: 0, failed: 0 };
  }
  
  const records = concessions.map(conc => ({
    property_id: propertyId,
    type: conc.type,
    description: conc.description,
    value: conc.value || null,
    terms: conc.terms || null,
    scraped_at: new Date().toISOString(),
    active: true,
  }));
  
  const { data, error } = await supabase
    .from('concessions')
    .insert(records);
  
  if (error) {
    console.error('Error saving concessions:', error);
    return { success: 0, failed: concessions.length };
  }
  
  return { success: concessions.length, failed: 0 };
}

/**
 * Save amenities for a property
 */
async function saveAmenities(
  supabase: SupabaseClient,
  propertyId: string,
  amenities: string[]
): Promise<void> {
  if (amenities.length === 0) return;
  
  // First, ensure all amenities exist in the amenities table
  for (const amenityName of amenities) {
    await supabase
      .from('amenities')
      .upsert({ name: amenityName }, { onConflict: 'name', ignoreDuplicates: true });
  }
  
  // Get amenity IDs
  const { data: amenityRecords } = await supabase
    .from('amenities')
    .select('id, name')
    .in('name', amenities);
  
  if (!amenityRecords) return;
  
  // Link amenities to property
  const links = amenityRecords.map(am => ({
    property_id: propertyId,
    amenity_id: am.id,
  }));
  
  await supabase
    .from('property_amenities')
    .upsert(links, { onConflict: 'property_id,amenity_id', ignoreDuplicates: true });
}

/**
 * Save rent history records for trend tracking
 */
async function saveRentHistory(
  supabase: SupabaseClient,
  propertyId: string,
  leaseRates: LeaseRate[],
  source: string
): Promise<{ success: number; failed: number }> {
  if (leaseRates.length === 0) {
    return { success: 0, failed: 0 };
  }
  
  const records = leaseRates.map(rate => ({
    property_id: propertyId,
    unit_type: rate.unitType,
    rent_amount: rate.price, // Already in cents
    recorded_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    source: source,
  }));
  
  const { error } = await supabase
    .from('rent_history')
    .insert(records);
  
  if (error) {
    console.error('Error saving rent history:', error);
    return { success: 0, failed: leaseRates.length };
  }
  
  console.log(`[Supabase] Saved ${leaseRates.length} rent history records`);
  return { success: leaseRates.length, failed: 0 };
}

/**
 * Main function: Save complete property data to Supabase
 */
export async function savePropertyData(
  env: Env,
  data: PropertyData
): Promise<{
  success: boolean;
  propertyId: string | null;
  leaseRatesSaved: number;
  concessionsSaved: number;
  errors: string[];
}> {
  const supabase = initSupabase(env);
  const errors: string[] = [];
  
  try {
    // 1. Save property
    const propertyId = await saveProperty(supabase, data);
    if (!propertyId) {
      return {
        success: false,
        propertyId: null,
        leaseRatesSaved: 0,
        concessionsSaved: 0,
        errors: ['Failed to save property'],
      };
    }
    
    // 2. Save lease rates
    const leaseRatesResult = await saveLeaseRates(supabase, propertyId, data.leaseRates);
    if (leaseRatesResult.failed > 0) {
      errors.push(`Failed to save ${leaseRatesResult.failed} lease rates`);
    }
    
    // 3. Save concessions
    const concessionsResult = await saveConcessions(supabase, propertyId, data.concessions);
    if (concessionsResult.failed > 0) {
      errors.push(`Failed to save ${concessionsResult.failed} concessions`);
    }
    
    // 4. Save rent history (for trend tracking)
    const rentHistoryResult = await saveRentHistory(supabase, propertyId, data.leaseRates, data.websiteUrl);
    if (rentHistoryResult.failed > 0) {
      errors.push(`Failed to save ${rentHistoryResult.failed} rent history records`);
    }
    
    // 5. Save amenities
    await saveAmenities(supabase, propertyId, data.amenities);
    
    return {
      success: true,
      propertyId,
      leaseRatesSaved: leaseRatesResult.success,
      concessionsSaved: concessionsResult.success,
      errors,
    };
    
  } catch (error: any) {
    console.error('Error saving property data:', error);
    return {
      success: false,
      propertyId: null,
      leaseRatesSaved: 0,
      concessionsSaved: 0,
      errors: [error.message],
    };
  }
}

/**
 * Batch save multiple properties
 */
export async function saveMultipleProperties(
  env: Env,
  properties: PropertyData[]
): Promise<{
  success: number;
  failed: number;
  totalLeaseRates: number;
  totalConcessions: number;
  errors: any[];
}> {
  const results = {
    success: 0,
    failed: 0,
    totalLeaseRates: 0,
    totalConcessions: 0,
    errors: [] as any[],
  };
  
  for (const property of properties) {
    const result = await savePropertyData(env, property);
    
    if (result.success) {
      results.success++;
      results.totalLeaseRates += result.leaseRatesSaved;
      results.totalConcessions += result.concessionsSaved;
    } else {
      results.failed++;
      results.errors.push({
        property: property.propertyName,
        errors: result.errors,
      });
    }
  }
  
  return results;
}

/**
 * Clean old scraped data (keeps data from last N days)
 */
export async function cleanOldData(
  env: Env,
  daysToKeep: number = 7
): Promise<{ propertiesDeleted: number; leaseRatesDeleted: number; concessionsDeleted: number }> {
  const supabase = initSupabase(env);
  
  const { data, error } = await supabase
    .rpc('clean_old_scraped_data', { days_old: daysToKeep });
  
  if (error) {
    console.error('Error cleaning old data:', error);
    return { propertiesDeleted: 0, leaseRatesDeleted: 0, concessionsDeleted: 0 };
  }
  
  return data[0] || { propertiesDeleted: 0, leaseRatesDeleted: 0, concessionsDeleted: 0 };
}
