/**
 * Enhanced Property Data Extraction
 * Extracts additional fields for admin panel and JEDI RE integration
 */

import { Page } from '@cloudflare/puppeteer';
import type { LeaseRate } from './browser-automation';

/**
 * Extract property characteristics (year built, type, management)
 */
export async function extractPropertyCharacteristics(page: Page): Promise<{
  yearBuilt?: number;
  yearRenovated?: number;
  buildingType?: string;
  managementCompany?: string;
}> {
  return await page.evaluate(() => {
    const text = document.body.innerText;
    
    // Year Built patterns
    const builtPatterns = [
      /(?:built|constructed)(?:\s+in)?\s+(\d{4})/i,
      /year built[:\s]+(\d{4})/i,
      /construction[:\s]+(\d{4})/i,
    ];
    
    let yearBuilt: number | undefined;
    for (const pattern of builtPatterns) {
      const match = text.match(pattern);
      if (match) {
        const year = parseInt(match[1]);
        if (year >= 1900 && year <= new Date().getFullYear()) {
          yearBuilt = year;
          break;
        }
      }
    }
    
    // Year Renovated patterns
    const renovatedPatterns = [
      /(?:renovated|updated|modernized)(?:\s+in)?\s+(\d{4})/i,
      /last renovation[:\s]+(\d{4})/i,
      /recently renovated[:\s]+(\d{4})/i,
    ];
    
    let yearRenovated: number | undefined;
    for (const pattern of renovatedPatterns) {
      const match = text.match(pattern);
      if (match) {
        const year = parseInt(match[1]);
        if (year >= 1900 && year <= new Date().getFullYear()) {
          yearRenovated = year;
          break;
        }
      }
    }
    
    // Building Type patterns
    const buildingTypePatterns = [
      /garden[- ]style/i,
      /mid[- ]rise/i,
      /high[- ]rise/i,
      /townhome[- ]style/i,
      /low[- ]rise/i,
      /walk[- ]up/i,
      /luxury apartments/i,
    ];
    
    let buildingType: string | undefined;
    for (const pattern of buildingTypePatterns) {
      const match = text.match(pattern);
      if (match) {
        buildingType = match[0];
        break;
      }
    }
    
    // Management Company patterns
    const mgmtPatterns = [
      /(?:managed by|property management[:\s]+)([A-Z][A-Za-z\s&]+(?:Properties|Management|Realty|Group|Companies))/i,
      /property manager[:\s]+([A-Z][A-Za-z\s&]+(?:Properties|Management|Realty|Group))/i,
    ];
    
    let managementCompany: string | undefined;
    for (const pattern of mgmtPatterns) {
      const match = text.match(pattern);
      if (match) {
        managementCompany = match[1].trim();
        break;
      }
    }
    
    return { yearBuilt, yearRenovated, buildingType, managementCompany };
  });
}

/**
 * Calculate property class from features
 */
export function calculatePropertyClass(data: {
  avgRentPerSqft?: number;
  yearBuilt?: number;
  amenityCount: number;
  concessionRate?: number;
}): 'A' | 'B' | 'C' | 'D' | undefined {
  const { avgRentPerSqft, yearBuilt, amenityCount, concessionRate } = data;
  
  // Need at least some data to classify
  if (!avgRentPerSqft && !yearBuilt && amenityCount === 0) {
    return undefined;
  }
  
  const age = yearBuilt ? new Date().getFullYear() - yearBuilt : 999;
  const rent = avgRentPerSqft || 1.5; // Default mid-range
  const amenities = amenityCount || 0;
  const concessions = concessionRate || 0;
  
  // Scoring algorithm
  let score = 0;
  
  // Rent per sqft (40% weight)
  if (rent > 2.5) score += 40;
  else if (rent > 2.0) score += 30;
  else if (rent > 1.5) score += 20;
  else if (rent > 1.0) score += 10;
  
  // Age (30% weight)
  if (age < 5) score += 30;
  else if (age < 10) score += 25;
  else if (age < 20) score += 15;
  else if (age < 30) score += 10;
  else if (age < 50) score += 5;
  
  // Amenities (20% weight)
  if (amenities >= 15) score += 20;
  else if (amenities >= 10) score += 15;
  else if (amenities >= 5) score += 10;
  else if (amenities >= 3) score += 5;
  
  // Concession rate (10% weight - inverse)
  if (concessions < 15) score += 10;
  else if (concessions < 30) score += 7;
  else if (concessions < 50) score += 3;
  
  // Classify based on score
  if (score >= 75) return 'A';   // Premium
  if (score >= 50) return 'B';   // Mid-range
  if (score >= 30) return 'C';   // Older/Budget
  return 'D';                     // Needs work
}

/**
 * Extract financial data (fees)
 */
export async function extractFinancialData(page: Page): Promise<{
  parkingFeeMonthly?: number;
  petRentMonthly?: number;
  applicationFee?: number;
  adminFee?: number;
}> {
  return await page.evaluate(() => {
    const text = document.body.innerText;
    
    // Parking fee patterns
    const parkingPatterns = [
      /parking[:\s]+\$(\d+)(?:\/mo|per month)?/i,
      /garage[:\s]+\$(\d+)(?:\/mo|per month)?/i,
      /covered parking[:\s]+\$(\d+)(?:\/mo|per month)?/i,
    ];
    
    let parkingFeeMonthly: number | undefined;
    for (const pattern of parkingPatterns) {
      const match = text.match(pattern);
      if (match) {
        parkingFeeMonthly = parseInt(match[1]) * 100; // Convert to cents
        break;
      }
    }
    
    // Pet rent patterns
    const petRentPatterns = [
      /pet rent[:\s]+\$(\d+)(?:\/mo|per month)?/i,
      /pet fee[:\s]+\$(\d+)(?:\/mo|per month)?/i,
      /monthly pet fee[:\s]+\$(\d+)/i,
    ];
    
    let petRentMonthly: number | undefined;
    for (const pattern of petRentPatterns) {
      const match = text.match(pattern);
      if (match) {
        petRentMonthly = parseInt(match[1]) * 100; // Convert to cents
        break;
      }
    }
    
    // Application fee patterns
    const appFeePatterns = [
      /application fee[:\s]+\$(\d+)/i,
      /app fee[:\s]+\$(\d+)/i,
      /\$(\d+) application fee/i,
    ];
    
    let applicationFee: number | undefined;
    for (const pattern of appFeePatterns) {
      const match = text.match(pattern);
      if (match) {
        applicationFee = parseInt(match[1]) * 100; // Convert to cents
        break;
      }
    }
    
    // Admin fee patterns
    const adminFeePatterns = [
      /(?:admin|administrative|administration) fee[:\s]+\$(\d+)/i,
      /move[- ]in fee[:\s]+\$(\d+)/i,
      /\$(\d+) (?:admin|administrative) fee/i,
    ];
    
    let adminFee: number | undefined;
    for (const pattern of adminFeePatterns) {
      const match = text.match(pattern);
      if (match) {
        adminFee = parseInt(match[1]) * 100; // Convert to cents
        break;
      }
    }
    
    return { parkingFeeMonthly, petRentMonthly, applicationFee, adminFee };
  });
}

/**
 * Extract total units from page
 */
export async function extractTotalUnits(page: Page, leaseRateCount: number): Promise<number | undefined> {
  const extractedUnits = await page.evaluate(() => {
    const text = document.body.innerText;
    
    const unitsPatterns = [
      /(\d+)\s+(?:units|apartments|homes)/i,
      /community of (\d+)/i,
      /(\d+)[- ]unit/i,
    ];
    
    for (const pattern of unitsPatterns) {
      const match = text.match(pattern);
      if (match) {
        const units = parseInt(match[1]);
        if (units > 0 && units < 10000) { // Sanity check
          return units;
        }
      }
    }
    
    return undefined;
  });
  
  // Fallback: estimate from lease rate count (rough approximation)
  // Typically showing 30-50% of actual units as floor plans
  if (extractedUnits) return extractedUnits;
  if (leaseRateCount > 0) {
    return Math.ceil(leaseRateCount * 2.5);
  }
  return undefined;
}

/**
 * Parse availability date from text
 */
export function parseAvailabilityDate(availText: string | null): {
  date?: string;
  status: 'available' | 'coming_soon' | 'leased';
} {
  if (!availText) return { status: 'available' };
  
  const lower = availText.toLowerCase().trim();
  
  // Available now
  if (lower.includes('available now') || lower.includes('immediate') || lower === 'now') {
    return { 
      date: new Date().toISOString().split('T')[0], 
      status: 'available' 
    };
  }
  
  // Coming soon
  if (lower.includes('coming soon') || lower.includes('future')) {
    return { status: 'coming_soon' };
  }
  
  // Not available/leased
  if (lower.includes('leased') || lower.includes('not available') || lower.includes('unavailable')) {
    return { status: 'leased' };
  }
  
  // Try to parse date: "3/15", "March 15", "Mar 15, 2026", "2026-03-15"
  
  // ISO format: YYYY-MM-DD
  const isoMatch = availText.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1]);
    const month = parseInt(isoMatch[2]);
    const day = parseInt(isoMatch[3]);
    const date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime())) {
      return { date: date.toISOString().split('T')[0], status: 'available' };
    }
  }
  
  // MM/DD or MM/DD/YYYY
  const slashMatch = availText.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (slashMatch) {
    const month = parseInt(slashMatch[1]);
    const day = parseInt(slashMatch[2]);
    let year = slashMatch[3] ? parseInt(slashMatch[3]) : new Date().getFullYear();
    
    // Handle 2-digit years
    if (year < 100) {
      year += 2000;
    }
    
    const date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime())) {
      return { date: date.toISOString().split('T')[0], status: 'available' };
    }
  }
  
  // "March 15" or "March 15, 2026"
  const monthMatch = availText.match(/([A-Za-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?/);
  if (monthMatch) {
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                        'july', 'august', 'september', 'october', 'november', 'december'];
    const monthIndex = monthNames.indexOf(monthMatch[1].toLowerCase());
    
    if (monthIndex >= 0) {
      const day = parseInt(monthMatch[2]);
      const year = monthMatch[3] ? parseInt(monthMatch[3]) : new Date().getFullYear();
      const date = new Date(year, monthIndex, day);
      
      if (!isNaN(date.getTime())) {
        return { date: date.toISOString().split('T')[0], status: 'available' };
      }
    }
  }
  
  // Default: available (can't parse date)
  return { status: 'available' };
}

/**
 * Enhance lease rates with availability data
 */
export function enhanceLeaseRatesWithAvailability(leaseRates: LeaseRate[]): LeaseRate[] {
  return leaseRates.map(rate => {
    const availInfo = parseAvailabilityDate(rate.available);
    
    return {
      ...rate,
      availableDate: availInfo.date,
      unitStatus: availInfo.status,
    };
  });
}

/**
 * Calculate occupancy from available units
 */
export function calculateOccupancy(
  totalUnits: number | undefined,
  availableUnits: number
): number | undefined {
  if (!totalUnits || totalUnits === 0) return undefined;
  
  const occupiedUnits = totalUnits - availableUnits;
  const occupancyPercent = (occupiedUnits / totalUnits) * 100;
  
  // Round to 1 decimal place
  return Math.round(occupancyPercent * 10) / 10;
}

/**
 * Calculate average rent per square foot
 */
export function calculateAvgRentPerSqft(leaseRates: LeaseRate[]): number | undefined {
  const validRates = leaseRates.filter(r => r.sqft && r.sqft > 0 && r.price > 0);
  
  if (validRates.length === 0) return undefined;
  
  const totalRentPerSqft = validRates.reduce((sum, rate) => {
    return sum + (rate.price / rate.sqft! / 100); // Convert cents to dollars
  }, 0);
  
  return totalRentPerSqft / validRates.length;
}
