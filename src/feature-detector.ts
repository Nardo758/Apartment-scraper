/**
 * Feature Detection Module
 * Extracts comprehensive property and unit features from scraped pages
 */

import { Page } from '@cloudflare/puppeteer';

// =============================================
// TYPE DEFINITIONS
// =============================================

export interface PropertyFeatures {
  // Building Amenities
  poolType?: 'none' | 'indoor' | 'outdoor' | 'both';
  hasElevator?: boolean;
  hasPackageRoom?: boolean;
  laundryType?: 'in-unit' | 'in-building' | 'shared' | 'none';
  hasBusinessCenter?: boolean;
  hasRooftopDeck?: boolean;
  hasCourtyard?: boolean;
  hasBikeStorage?: boolean;
  hasStorageUnits?: boolean;
  hasControlledAccess?: boolean;
  hasDoorman?: boolean;
  hasConcierge?: boolean;
  
  // Utilities Included
  heatIncluded?: boolean;
  waterIncluded?: boolean;
  electricIncluded?: boolean;
  gasIncluded?: boolean;
  trashIncluded?: boolean;
  internetIncluded?: boolean;
  cableIncluded?: boolean;
  
  // Pet Policy
  dogsAllowed?: boolean;
  catsAllowed?: boolean;
  petSizeLimit?: string;
  petWeightLimit?: number;
  petDeposit?: number;
  petRent?: number;
  petBreedRestrictions?: boolean;
  
  // Parking
  parkingIncluded?: boolean;
  parkingType?: string;
  hasEvCharging?: boolean;
  parkingFee?: number;
  parkingSpacesPerUnit?: number;
  
  // Accessibility
  wheelchairAccessible?: boolean;
  firstFloorAvailable?: boolean;
  adaCompliant?: boolean;
  
  // Safety & Security
  hasSecuritySystem?: boolean;
  hasVideoSurveillance?: boolean;
  isGatedCommunity?: boolean;
  hasOnsiteSecurity?: boolean;
  hasSecureEntry?: boolean;
  
  // Lease Terms
  shortTermAvailable?: boolean;
  monthToMonthAvailable?: boolean;
  minLeaseTermMonths?: number;
  maxLeaseTermMonths?: number;
  
  // Location
  walkabilityScore?: number;
  transitScore?: number;
  bikeScore?: number;
  nearPublicTransit?: boolean;
  transitDistanceMiles?: number;
  nearGrocery?: boolean;
  groceryDistanceMiles?: number;
  nearParks?: boolean;
  quietNeighborhood?: boolean;
  
  // Fees
  applicationFee?: number;
  adminFee?: number;
  securityDepositMonths?: number;
}

export interface UnitFeatures {
  // Climate Control
  acType?: 'central' | 'window' | 'portable' | 'none';
  heatingType?: 'central' | 'radiator' | 'heat_pump' | 'electric' | 'gas';
  
  // Kitchen Appliances
  hasDishwasher?: boolean;
  hasGarbageDisposal?: boolean;
  hasMicrowave?: boolean;
  hasRefrigerator?: boolean;
  hasStove?: boolean;
  stoveType?: string;
  
  // Appliances
  washerDryer?: 'in-unit' | 'hookups' | 'none';
  
  // Outdoor Space
  hasBalcony?: boolean;
  hasPatio?: boolean;
  balconySqft?: number;
  
  // Storage
  hasWalkInClosets?: boolean;
  numClosets?: number;
  hasPantry?: boolean;
  
  // Flooring
  hasHardwoodFloors?: boolean;
  hasCarpet?: boolean;
  hasTileFloors?: boolean;
  
  // Special Features
  hasFireplace?: boolean;
  fireplaceType?: string;
  hasHighCeilings?: boolean;
  ceilingHeightFeet?: number;
  
  // Kitchen Quality
  hasUpdatedKitchen?: boolean;
  hasStainlessAppliances?: boolean;
  countertopType?: string;
  hasIsland?: boolean;
  
  // Bathroom Features
  hasDoubleVanity?: boolean;
  bathtubType?: string;
  hasSeparateShower?: boolean;
  
  // Views
  viewType?: string;
  
  // Windows
  hasLargeWindows?: boolean;
  naturalLightRating?: string;
}

// =============================================
// FEATURE DETECTION FUNCTIONS
// =============================================

/**
 * Extract property-level features from page
 */
export async function extractPropertyFeatures(page: Page): Promise<PropertyFeatures> {
  return await page.evaluate(() => {
    const features: any = {};
    
    // Get all text content (case-insensitive)
    const bodyText = document.body.innerText.toLowerCase();
    const htmlText = document.documentElement.innerHTML.toLowerCase();
    const combinedText = bodyText + ' ' + htmlText;
    
    // Helper: Check if text contains any of the patterns
    const contains = (...patterns: string[]) => {
      return patterns.some(p => combinedText.includes(p.toLowerCase()));
    };
    
    // Helper: Extract number from text
    const extractNumber = (pattern: RegExp): number | undefined => {
      const match = combinedText.match(pattern);
      return match ? parseInt(match[1].replace(/,/g, '')) : undefined;
    };
    
    // ===== BUILDING AMENITIES =====
    
    // Pool
    if (contains('indoor pool') && contains('outdoor pool')) {
      features.poolType = 'both';
    } else if (contains('indoor pool')) {
      features.poolType = 'indoor';
    } else if (contains('outdoor pool', 'swimming pool', 'resort-style pool')) {
      features.poolType = 'outdoor';
    } else {
      features.poolType = 'none';
    }
    
    features.hasElevator = contains('elevator', 'lift access');
    features.hasPackageRoom = contains('package room', 'package locker', 'parcel locker', 'amazon hub');
    
    // Laundry
    if (contains('washer and dryer in unit', 'in-unit washer', 'washer/dryer in unit', 'w/d in unit')) {
      features.laundryType = 'in-unit';
    } else if (contains('laundry in building', 'on-site laundry', 'laundry facilities')) {
      features.laundryType = 'in-building';
    } else if (contains('shared laundry', 'common laundry')) {
      features.laundryType = 'shared';
    } else {
      features.laundryType = 'none';
    }
    
    features.hasBusinessCenter = contains('business center', 'coworking', 'co-working space', 'conference room');
    features.hasRooftopDeck = contains('rooftop', 'roof deck', 'rooftop terrace', 'sky lounge');
    features.hasCourtyard = contains('courtyard', 'garden', 'landscaped grounds');
    features.hasBikeStorage = contains('bike storage', 'bike room', 'bicycle storage');
    features.hasStorageUnits = contains('storage units', 'extra storage', 'storage available');
    features.hasControlledAccess = contains('controlled access', 'key fob', 'access control', 'secure access');
    features.hasDoorman = contains('doorman', 'door attendant');
    features.hasConcierge = contains('concierge', 'front desk');
    
    // ===== UTILITIES =====
    
    features.heatIncluded = contains('heat included', 'heating included', 'heat paid');
    features.waterIncluded = contains('water included', 'water paid', 'water/sewer included');
    features.electricIncluded = contains('electric included', 'electricity included', 'electric paid');
    features.gasIncluded = contains('gas included', 'gas paid');
    features.trashIncluded = contains('trash included', 'garbage included', 'trash removal included');
    features.internetIncluded = contains('internet included', 'wifi included', 'high-speed internet included');
    features.cableIncluded = contains('cable included', 'cable tv included');
    
    // ===== PET POLICY =====
    
    features.dogsAllowed = contains('dogs allowed', 'dog friendly', 'dogs welcome', 'pet friendly') && !contains('no dogs');
    features.catsAllowed = contains('cats allowed', 'cat friendly', 'cats welcome', 'pet friendly') && !contains('no cats');
    
    // Pet limits
    if (contains('small dogs only', 'small pets only')) {
      features.petSizeLimit = 'small';
    } else if (contains('medium dogs', 'dogs up to')) {
      features.petSizeLimit = 'medium';
    } else if (contains('large dogs', 'all breeds')) {
      features.petSizeLimit = 'large';
    }
    
    // Pet weight limit
    const weightMatch = combinedText.match(/(\d+)\s*lb[s]?\s*(?:weight\s*)?limit/i);
    if (weightMatch) {
      features.petWeightLimit = parseInt(weightMatch[1]);
    }
    
    // Pet fees
    const petDepositMatch = combinedText.match(/pet\s*deposit[:\s]*\$?(\d+)/i);
    if (petDepositMatch) {
      features.petDeposit = parseInt(petDepositMatch[1]);
    }
    
    const petRentMatch = combinedText.match(/pet\s*rent[:\s]*\$?(\d+)/i);
    if (petRentMatch) {
      features.petRent = parseInt(petRentMatch[1]);
    }
    
    features.petBreedRestrictions = contains('breed restrictions', 'restricted breeds', 'breed limit');
    
    // ===== PARKING =====
    
    features.parkingIncluded = contains('parking included', 'parking free', '1 parking space included');
    
    if (contains('garage parking', 'covered garage')) {
      features.parkingType = 'garage';
    } else if (contains('covered parking')) {
      features.parkingType = 'covered';
    } else if (contains('street parking', 'on-street parking')) {
      features.parkingType = 'street';
    } else if (contains('parking available', 'parking lot')) {
      features.parkingType = 'open';
    }
    
    features.hasEvCharging = contains('ev charging', 'electric vehicle charging', 'tesla charging', 'car charging station');
    
    // Parking fee
    const parkingFeeMatch = combinedText.match(/parking[:\s]*\$?(\d+)\s*(?:\/|per\s*)?mo/i);
    if (parkingFeeMatch) {
      features.parkingFee = parseInt(parkingFeeMatch[1]);
    }
    
    // ===== ACCESSIBILITY =====
    
    features.wheelchairAccessible = contains('wheelchair accessible', 'ada accessible', 'handicap accessible');
    features.firstFloorAvailable = contains('first floor', 'ground floor available');
    features.adaCompliant = contains('ada compliant', 'ada certified');
    
    // ===== SECURITY =====
    
    features.hasSecuritySystem = contains('security system', 'alarm system', 'security alarm');
    features.hasVideoSurveillance = contains('video surveillance', 'security cameras', '24-hour surveillance', 'cctv');
    features.isGatedCommunity = contains('gated community', 'gated access', 'gated entrance');
    features.hasOnsiteSecurity = contains('onsite security', 'on-site security', '24-hour security', 'security guard');
    features.hasSecureEntry = contains('secure entry', 'secured building', 'keyless entry');
    
    // ===== LEASE TERMS =====
    
    features.shortTermAvailable = contains('short term', 'short-term lease', 'flexible lease', '3 month lease', '6 month lease');
    features.monthToMonthAvailable = contains('month to month', 'month-to-month', 'no lease required');
    
    // Min/max lease terms
    const minLeaseMatch = combinedText.match(/(?:minimum|min)\s*lease[:\s]*(\d+)\s*month/i);
    if (minLeaseMatch) {
      features.minLeaseTermMonths = parseInt(minLeaseMatch[1]);
    } else {
      features.minLeaseTermMonths = 12; // Default assumption
    }
    
    // ===== LOCATION =====
    
    features.nearPublicTransit = contains('near metro', 'near subway', 'near train', 'walkable to transit', 'near marta');
    features.nearGrocery = contains('near grocery', 'walking distance to', 'near whole foods', 'near publix', 'near kroger');
    features.nearParks = contains('near park', 'adjacent to park', 'park nearby');
    features.quietNeighborhood = contains('quiet', 'peaceful', 'tranquil', 'serene') && !contains('nightlife', 'bars', 'clubs');
    
    // ===== FEES =====
    
    const appFeeMatch = combinedText.match(/application\s*fee[:\s]*\$?(\d+)/i);
    if (appFeeMatch) {
      features.applicationFee = parseInt(appFeeMatch[1]);
    }
    
    const adminFeeMatch = combinedText.match(/(?:admin|administrative)\s*fee[:\s]*\$?(\d+)/i);
    if (adminFeeMatch) {
      features.adminFee = parseInt(adminFeeMatch[1]);
    }
    
    const securityDepositMatch = combinedText.match(/security\s*deposit[:\s]*(?:(\d+)\s*month|(\d+(?:,\d{3})))/i);
    if (securityDepositMatch) {
      if (securityDepositMatch[1]) {
        features.securityDepositMonths = parseFloat(securityDepositMatch[1]);
      } else if (securityDepositMatch[2]) {
        // If dollar amount, assume 1 month
        features.securityDepositMonths = 1.0;
      }
    }
    
    return features;
  });
}

/**
 * Extract unit-level features from unit listing or detail page
 */
export async function extractUnitFeatures(page: Page, unitElement?: any): Promise<UnitFeatures> {
  const selector = unitElement ? 'self' : 'body';
  
  return await page.evaluate((sel) => {
    const features: any = {};
    
    // Get text from unit element or whole page
    const element = sel === 'self' ? document : document.body;
    const text = element.textContent?.toLowerCase() || '';
    const htmlText = element.innerHTML?.toLowerCase() || '';
    const combinedText = text + ' ' + htmlText;
    
    const contains = (...patterns: string[]) => {
      return patterns.some(p => combinedText.includes(p.toLowerCase()));
    };
    
    // ===== CLIMATE CONTROL =====
    
    if (contains('central air', 'central a/c', 'central ac')) {
      features.acType = 'central';
    } else if (contains('window ac', 'window unit', 'wall ac')) {
      features.acType = 'window';
    } else if (contains('portable ac')) {
      features.acType = 'portable';
    } else if (contains('no ac', 'no air conditioning')) {
      features.acType = 'none';
    }
    
    if (contains('central heat', 'forced air heat')) {
      features.heatingType = 'central';
    } else if (contains('radiator', 'steam heat')) {
      features.heatingType = 'radiator';
    } else if (contains('heat pump')) {
      features.heatingType = 'heat_pump';
    } else if (contains('electric heat', 'baseboard heat')) {
      features.heatingType = 'electric';
    } else if (contains('gas heat')) {
      features.heatingType = 'gas';
    }
    
    // ===== APPLIANCES =====
    
    features.hasDishwasher = contains('dishwasher');
    features.hasGarbageDisposal = contains('garbage disposal', 'disposal');
    features.hasMicrowave = contains('microwave');
    features.hasRefrigerator = contains('refrigerator', 'fridge');
    features.hasStove = contains('stove', 'range', 'oven');
    
    if (contains('gas stove', 'gas range')) {
      features.stoveType = 'gas';
    } else if (contains('electric stove', 'electric range')) {
      features.stoveType = 'electric';
    } else if (contains('induction')) {
      features.stoveType = 'induction';
    }
    
    if (contains('washer and dryer in unit', 'w/d in unit', 'in-unit laundry')) {
      features.washerDryer = 'in-unit';
    } else if (contains('washer/dryer hookup', 'w/d hookup', 'hookups')) {
      features.washerDryer = 'hookups';
    } else {
      features.washerDryer = 'none';
    }
    
    // ===== OUTDOOR SPACE =====
    
    features.hasBalcony = contains('balcony', 'private balcony');
    features.hasPatio = contains('patio', 'terrace');
    
    // ===== STORAGE =====
    
    features.hasWalkInClosets = contains('walk-in closet', 'walk in closet', 'large closet');
    features.hasPantry = contains('pantry', 'walk-in pantry');
    
    // ===== FLOORING =====
    
    features.hasHardwoodFloors = contains('hardwood', 'wood floors', 'hardwood flooring');
    features.hasCarpet = contains('carpet', 'carpeted');
    features.hasTileFloors = contains('tile', 'ceramic', 'porcelain');
    
    // ===== SPECIAL FEATURES =====
    
    features.hasFireplace = contains('fireplace');
    
    if (contains('gas fireplace')) {
      features.fireplaceType = 'gas';
    } else if (contains('electric fireplace')) {
      features.fireplaceType = 'electric';
    } else if (contains('wood burning')) {
      features.fireplaceType = 'wood';
    }
    
    features.hasHighCeilings = contains('high ceiling', '9 ft ceiling', '10 ft ceiling', '12 ft ceiling', 'vaulted');
    
    // Ceiling height
    const ceilingMatch = combinedText.match(/(\d+)(?:\s*'|ft)?\s*ceiling/i);
    if (ceilingMatch) {
      features.ceilingHeightFeet = parseInt(ceilingMatch[1]);
    }
    
    // ===== KITCHEN =====
    
    features.hasUpdatedKitchen = contains('updated kitchen', 'modern kitchen', 'renovated kitchen', 'gourmet kitchen');
    features.hasStainlessAppliances = contains('stainless steel', 'stainless appliances');
    
    if (contains('granite countertop')) {
      features.countertopType = 'granite';
    } else if (contains('quartz countertop')) {
      features.countertopType = 'quartz';
    } else if (contains('marble countertop')) {
      features.countertopType = 'marble';
    } else if (contains('laminate')) {
      features.countertopType = 'laminate';
    }
    
    features.hasIsland = contains('kitchen island', 'island counter');
    
    // ===== BATHROOM =====
    
    features.hasDoubleVanity = contains('double vanity', 'dual vanity');
    
    if (contains('garden tub', 'soaking tub')) {
      features.bathtubType = 'soaking';
    } else if (contains('bathtub', 'tub')) {
      features.bathtubType = 'standard';
    } else {
      features.bathtubType = 'none';
    }
    
    features.hasSeparateShower = contains('separate shower', 'walk-in shower', 'standalone shower');
    
    // ===== VIEWS =====
    
    if (contains('city view')) {
      features.viewType = 'city';
    } else if (contains('water view', 'lake view', 'river view')) {
      features.viewType = 'water';
    } else if (contains('park view')) {
      features.viewType = 'park';
    } else if (contains('courtyard view')) {
      features.viewType = 'courtyard';
    } else if (contains('street view')) {
      features.viewType = 'street';
    }
    
    // ===== WINDOWS =====
    
    features.hasLargeWindows = contains('large windows', 'floor-to-ceiling windows', 'oversized windows');
    
    if (contains('abundant natural light', 'plenty of natural light')) {
      features.naturalLightRating = 'excellent';
    } else if (contains('natural light', 'bright')) {
      features.naturalLightRating = 'good';
    }
    
    return features;
  }, selector);
}

/**
 * Parse bedrooms and bathrooms from unit type string
 */
export function parseBedsBaths(unitType: string): { bedrooms?: number; bathrooms?: number } {
  const result: { bedrooms?: number; bathrooms?: number } = {};
  
  // Studio
  if (/studio/i.test(unitType)) {
    result.bedrooms = 0;
    result.bathrooms = 1;
    return result;
  }
  
  // X Bed Y Bath format
  const bedsMatch = unitType.match(/(\d+)\s*[Bb]ed(?:room)?/);
  if (bedsMatch) {
    result.bedrooms = parseInt(bedsMatch[1]);
  }
  
  const bathsMatch = unitType.match(/(\d+(?:\.\d+)?)\s*[Bb]ath(?:room)?/);
  if (bathsMatch) {
    result.bathrooms = parseFloat(bathsMatch[1]);
  }
  
  return result;
}
