/**
 * Full Browser Automation for Apartment Scraping
 * 
 * Enhanced browser automation with:
 * - Proper session management
 * - Wait for dynamic content (AJAX/React)
 * - Extract 12-month lease rates
 * - Handle multiple property management platforms
 * - Screenshot capabilities
 */

import puppeteer, { Browser, Page } from '@cloudflare/puppeteer';
import type { Env } from './types';
import {
  extractPropertyCharacteristics,
  extractFinancialData,
  extractTotalUnits,
  enhanceLeaseRatesWithAvailability,
  calculatePropertyClass,
  calculateOccupancy,
  calculateAvgRentPerSqft,
} from './enhanced-extraction';

// Property management platform types
export type PMSType = 'entrata' | 'realpage' | 'yardi' | 'resman' | 'appfolio' | 'unknown';

export interface LeaseRate {
  unitType: string;          // "Studio", "1 Bed", "2 Bed 2 Bath", etc.
  sqft: number | null;       // Square footage
  price: number;             // Monthly rent in cents (e.g., 172800 = $1,728)
  leaseTerm: string;         // "12 month", "13 month", etc.
  available: string | null;  // "Now", "Feb 15", etc.
  unitNumber?: string;       // "A101", etc.
  concessions?: Concession[]; // Special offers/discounts
  availableDate?: string;    // ISO date string (YYYY-MM-DD)
  unitStatus?: 'available' | 'coming_soon' | 'leased';
}

export interface Concession {
  type: string;              // "free_rent", "discount", "waived_fee", "gift_card", etc.
  description: string;       // Full text description
  value: string | null;      // "$500", "1 month free", etc.
  terms?: string;            // Fine print / conditions
}

export interface PropertyData {
  propertyName: string;
  address: string;
  phone: string | null;
  websiteUrl: string;         // The URL that was scraped
  leaseRates: LeaseRate[];
  amenities: string[];
  concessions: Concession[];  // Property-wide specials/discounts
  pmsType: PMSType;
  scrapedAt: string;
  rawHTML?: string;  // Optional: first 10KB for debugging
  
  // Property characteristics
  yearBuilt?: number;
  yearRenovated?: number;
  propertyClass?: 'A' | 'B' | 'C' | 'D';
  buildingType?: string;
  managementCompany?: string;
  
  // Occupancy & operations
  totalUnits?: number;
  currentOccupancyPercent?: number;
  avgDaysToLease?: number;
  
  // Financial data (in cents)
  parkingFeeMonthly?: number;
  petRentMonthly?: number;
  applicationFee?: number;
  adminFee?: number;
}

/**
 * Launch browser using Cloudflare Browser Rendering
 * Uses the MYBROWSER binding configured in wrangler.toml
 */
export async function connectBrowser(env: Env): Promise<Browser> {
  console.log('[Browser] Launching Cloudflare Browser...');
  
  try {
    const browser = await puppeteer.launch(env.MYBROWSER);
    
    console.log('[Browser] Browser launched successfully');
    return browser;
    
  } catch (error: any) {
    console.error('[Browser] Launch failed:', error.message);
    throw new Error(`Browser launch failed: ${error.message}`);
  }
}

/**
 * Detect property management system type from page content
 */
async function detectPMS(page: Page): Promise<PMSType> {
  return await page.evaluate(() => {
    const html = document.documentElement.innerHTML.toLowerCase();
    const scripts = Array.from(document.scripts).map(s => s.src).join(' ');
    
    if (html.includes('entrata') || html.includes('elan_id') || scripts.includes('entrata')) {
      return 'entrata';
    }
    if (html.includes('realpage') || html.includes('onsite')) {
      return 'realpage';
    }
    if (html.includes('yardi') || html.includes('rentcafe')) {
      return 'yardi';
    }
    if (html.includes('resman') || scripts.includes('resman')) {
      return 'resman';
    }
    if (html.includes('appfolio')) {
      return 'appfolio';
    }
    
    return 'unknown';
  });
}

/**
 * Wait for dynamic content to load
 * Handles AJAX, React, and other JS frameworks
 */
async function waitForDynamicContent(page: Page, timeout: number = 10000): Promise<void> {
  console.log('[Browser] Waiting for dynamic content...');
  
  // Strategy 1: Wait for network to be idle
  try {
    await page.waitForNetworkIdle({ timeout: 5000 });
    console.log('[Browser] Network idle');
  } catch (e) {
    console.log('[Browser] Network idle timeout (continuing)');
  }
  
  // Strategy 2: Wait for common pricing elements
  const priceSelectors = [
    '[class*="price"]',
    '[class*="rent"]',
    '[class*="rate"]',
    '[data-testid*="price"]',
    '.floor-plan',
    '.unit-price',
  ];
  
  for (const selector of priceSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 2000 });
      console.log(`[Browser] Found pricing element: ${selector}`);
      break;
    } catch (e) {
      // Try next selector
    }
  }
  
  // Strategy 3: Wait a bit more for lazy-loaded content
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));
  console.log('[Browser] Additional wait complete');
}

/**
 * Random delay to mimic human behavior
 */
async function humanDelay(minMs: number = 500, maxMs: number = 2000): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Move mouse to random positions to mimic human behavior
 */
async function randomMouseMovements(page: Page, count: number = 3): Promise<void> {
  console.log('[Browser] Simulating human mouse movements...');
  
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * 1920);
    const y = Math.floor(Math.random() * 1080);
    
    await page.mouse.move(x, y, { steps: 10 });
    await humanDelay(200, 800);
  }
}

/**
 * Scroll page slowly to trigger lazy loading (mimics human scrolling)
 */
async function scrollPage(page: Page): Promise<void> {
  console.log('[Browser] Scrolling slowly to load lazy content...');
  
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 150; // Smaller scroll distance (more human-like)
      const scrollDelay = 200 + Math.random() * 300; // Random delay 200-500ms
      
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve(true);
        }
      }, scrollDelay);
    });
  });
  
  // Pause at bottom
  await humanDelay(1000, 2000);
  
  // Scroll back to top slowly
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      const scrollToTop = () => {
        if (window.scrollY > 0) {
          window.scrollBy(0, -200);
          setTimeout(scrollToTop, 100);
        } else {
          resolve(true);
        }
      };
      scrollToTop();
    });
  });
  
  console.log('[Browser] Scroll complete');
}

/**
 * Extract lease rates from page
 * Handles multiple page structures and PMS types
 */
async function extractLeaseRates(page: Page, pmsType: PMSType): Promise<LeaseRate[]> {
  console.log(`[Browser] Extracting lease rates (PMS: ${pmsType})...`);
  
  const rates = await page.evaluate((pms) => {
    const results: any[] = [];
    
    // Helper: Clean whitespace
    const cleanText = (text: string): string => {
      return text.replace(/\s+/g, ' ').trim();
    };
    
    // Helper: Check if element should be excluded
    const shouldExclude = (el: Element): boolean => {
      const text = el.textContent || '';
      const cleanedText = cleanText(text);
      
      // Exclude if contains filter keywords
      if (/minimum rent|filter|sort by|view all|show all/i.test(cleanedText)) {
        return true;
      }
      
      // Exclude if it's a button or link without real content
      if ((el.tagName === 'BUTTON' || el.tagName === 'A') && cleanedText.length < 30) {
        return true;
      }
      
      // Exclude navigation elements
      if (el.closest('nav') || el.closest('header') || el.closest('footer')) {
        return true;
      }
      
      // Exclude if class/id suggests it's UI controls
      const className = el.className?.toString().toLowerCase() || '';
      const id = el.id?.toLowerCase() || '';
      if (className.includes('filter') || className.includes('sort') || 
          id.includes('filter') || id.includes('sort')) {
        return true;
      }
      
      return false;
    };
    
    // Helper: Parse price text to cents
    const parsePrice = (text: string): number | null => {
      const match = text.match(/\$?([\d,]+)/);
      if (match) {
        return parseInt(match[1].replace(/,/g, '')) * 100; // Convert to cents
      }
      return null;
    };
    
    // Helper: Parse square footage
    const parseSqft = (text: string): number | null => {
      const match = text.match(/(\d{1,4})\s*(?:sq\.?\s*ft|sqft)/i);
      return match ? parseInt(match[1]) : null;
    };
    
    // Helper: Extract bedroom info
    const parseUnitType = (text: string): string => {
      const cleaned = cleanText(text);
      
      if (/studio/i.test(cleaned)) return 'Studio';
      
      const bedMatch = cleaned.match(/(\d+)\s*(?:bed(?:room)?|br)/i);
      const bathMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:bath(?:room)?|ba)/i);
      
      if (bedMatch) {
        let result = `${bedMatch[1]} Bed`;
        if (bathMatch) result += ` ${bathMatch[1]} Bath`;
        return result;
      }
      
      // If no bed/bath found, return first few words (cleaned)
      const words = cleaned.split(' ').slice(0, 4).join(' ');
      return words || 'Unknown';
    };
    
    // Strategy 1: Look for floor plan cards (site-specific selectors first!)
    const floorPlanSelectors = [
      // Site-specific (from inspect-page analysis)
      '.mt_fp_list_grp.mt_fp_details_wrap',  // Master template theme
      '.mt_fp_list_grp',                     // Broader match
      '.fp-card', '.fp-content',             // Entrata common
      '.model',                              // Property management systems
      // Generic
      '.floor-plan-card', '.floorplan-card', '.unit-card', '.apartment-card',
      'article[class*="floor"]', 'article[class*="unit"]',
      // Data attributes
      '[data-testid*="floor-plan"]', '[data-testid*="unit-card"]',
      // Broader patterns (last resort)
      '[class*="floor-plan"]', '[class*="fp_"]',
    ];
    
    let totalFound = 0;
    let excluded = 0;
    
    for (const selector of floorPlanSelectors) {
      const elements = document.querySelectorAll(selector);
      totalFound += elements.length;
      
      console.log(`[Selector: ${selector}] Found ${elements.length} elements`);
      
      elements.forEach((el, idx) => {
        try {
          // Exclude UI elements
          if (shouldExclude(el)) {
            excluded++;
            return;
          }
          
          const text = cleanText(el.textContent || '');
          
          // Skip if too short or too long
          if (text.length < 30 || text.length > 1000) {
            if (idx < 3) console.log(`  [${idx}] Skipped: text length ${text.length}`);
            return;
          }
          
          // Skip if looks like CSS
          if (text.includes('{') || text.includes('background-color')) {
            return;
          }
          
          // Look for unit type indicator (more lenient)
          const hasUnitType = /studio|\d+\s*bed|\d+\s*br|bedroom|bath/i.test(text);
          
          // Find price first
          const priceMatches = text.matchAll(/\$[\d,]+/g);
          const prices: number[] = [];
          
          for (const match of priceMatches) {
            const price = parsePrice(match[0]);
            if (price && price >= 50000 && price <= 1000000) { // $500-$10,000
              prices.push(price);
            }
          }
          
          // Must have either unit type OR price (lenient)
          if (!hasUnitType && prices.length === 0) {
            if (idx < 3) console.log(`  [${idx}] Skipped: no unit type or price - "${text.substring(0, 60)}..."`);
            return;
          }
          
          if (prices.length === 0) {
            if (idx < 3) console.log(`  [${idx}] Skipped: no valid price`);
            return;
          }
          
          // Use the minimum price (usually the starting/best rate)
          const price = Math.min(...prices);
          
          // Find unit type
          const unitType = parseUnitType(text);
          
          // Skip if unit type is too generic
          if (unitType.length < 3 || /^unknown$/i.test(unitType)) {
            if (idx < 3) console.log(`  [${idx}] Skipped: generic unit type "${unitType}"`);
            return;
          }
          
          // Find sqft
          const sqft = parseSqft(text);
          
          // Find availability
          let available: string | null = null;
          if (/available now|now/i.test(text)) {
            available = 'Now';
          } else if (/available/i.test(text)) {
            const dateMatch = text.match(/available[\s:]+(.*?)(?:\||$)/i);
            if (dateMatch) {
              available = cleanText(dateMatch[1]).substring(0, 20);
            }
          }
          
          // Look for lease term
          let leaseTerm = '12 month'; // Default assumption
          if (/\d+[\s-]?month/i.test(text)) {
            const termMatch = text.match(/(\d+)[\s-]?month/i);
            if (termMatch) leaseTerm = `${termMatch[1]} month`;
          }
          
          console.log(`  [${idx}] ✓ EXTRACTED: ${unitType} - $${price/100}`);
          
          results.push({
            unitType,
            sqft,
            price,
            leaseTerm,
            available,
          });
        } catch (e) {
          console.error('Error parsing floor plan:', e);
        }
      });
      
      // If we found good results, stop trying more selectors
      if (results.length >= 5) {
        console.log(`[Extract] Success: ${results.length} rates found, stopping`);
        break;
      }
    }
    
    console.log(`[Extract] Total elements found: ${totalFound}, excluded: ${excluded}, extracted: ${results.length}`);
    
    // Strategy 2: Entrata-specific extraction (if we detected it's Entrata)
    if (pms === 'entrata' && results.length < 3) {
      console.log('[Entrata] Trying Entrata-specific selectors...');
      
      const entrataSelectors = [
        '.fp-card', '.fp-container .model',
        '[data-selenium-id*="FloorPlan"]',
        '.floor-plan-group .floor-plan',
        '.floor-plans-container .floor-plan',
      ];
      
      for (const selector of entrataSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          elements.forEach((el) => {
            if (shouldExclude(el)) return;
            
            const text = cleanText(el.textContent || '');
            if (text.length < 30 || text.length > 1000) return;
            
            // Must have unit type
            if (!(/studio|\d+\s*bed|\d+\s*br/i.test(text))) return;
            
            // Look for "From $X" pricing pattern common in Entrata
            const fromPriceMatch = text.match(/from\s*\$?([\d,]+)/i);
            if (fromPriceMatch) {
              const price = parseInt(fromPriceMatch[1].replace(/,/g, '')) * 100;
              if (price >= 50000 && price <= 1000000) {
                const unitType = parseUnitType(text);
                if (unitType && unitType.length >= 3) {
                  results.push({
                    unitType,
                    sqft: parseSqft(text),
                    price,
                    leaseTerm: '12 month',
                    available: /available now|now/i.test(text) ? 'Now' : null,
                  });
                }
              }
            }
          });
          
          if (results.length >= 5) break;
        }
      }
    }
    
    // Strategy 3: Look for pricing in JSON-LD or data attributes
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    scripts.forEach((script) => {
      try {
        const data = JSON.parse(script.textContent || '');
        // Check for pricing data in structured data
        if (data.offers || data.priceRange) {
          // TODO: Parse structured data
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    });
    
    // Remove duplicates (same price + unit type)
    const seen = new Set();
    return results.filter((rate) => {
      const key = `${rate.unitType}-${rate.price}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
  }, pmsType);
  
  console.log(`[Browser] Found ${rates.length} lease rates`);
  return rates;
}

/**
 * Extract concessions/specials from page
 */
async function extractConcessions(page: Page): Promise<Concession[]> {
  console.log('[Browser] Extracting concessions and specials...');
  
  return await page.evaluate(() => {
    const concessions: any[] = [];
    
    // Common concession keywords
    const keywords = [
      'special', 'offer', 'promotion', 'deal', 'discount',
      'free rent', 'waived fee', 'move-in', 'limited time',
      'concession', 'incentive', 'savings', 'gift card',
      'complimentary', 'reduced', 'half off', 'month free'
    ];
    
    // Helper: Check if element is visible content (not script/style)
    const isVisibleContent = (el: Element): boolean => {
      const tagName = el.tagName.toLowerCase();
      if (['script', 'style', 'noscript', 'link', 'meta'].includes(tagName)) {
        return false;
      }
      // Check if hidden
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') {
        return false;
      }
      return true;
    };
    
    // Strategy 1: Look for special banners/cards (exclude style tags!)
    const specialSelectors = [
      '.special:not(style)', '.specials:not(style)', '.promotion:not(style)', '.offer:not(style)',
      '[class*="special"]:not(style)', '[class*="promotion"]:not(style)', '[class*="offer"]:not(style)',
      '[class*="discount"]:not(style)', '[class*="concession"]:not(style)', '[data-testid*="special"]'
    ];
    
    for (const selector of specialSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        // Skip if not visible content
        if (!isVisibleContent(el)) return;
        
        const text = el.textContent?.trim() || '';
        // Reasonable text length (not CSS or huge blocks)
        if (text.length > 10 && text.length < 500) {
          // Skip if looks like CSS
          if (text.includes('{') || text.includes('}') || text.includes('px') || text.includes('color:')) {
            return;
          }
          
          // Check if contains concession keywords
          const lowerText = text.toLowerCase();
          if (keywords.some(keyword => lowerText.includes(keyword))) {
            // Determine type
            let type = 'other';
            if (/free rent|month free|months free/i.test(text)) {
              type = 'free_rent';
            } else if (/waived fee|no fee|fee waived/i.test(text)) {
              type = 'waived_fee';
            } else if (/discount|% off|reduced/i.test(text)) {
              type = 'discount';
            } else if (/gift card/i.test(text)) {
              type = 'gift_card';
            }
            
            // Extract value if possible
            let value: string | null = null;
            const valueMatch = text.match(/\$[\d,]+|[\d.]+ months?|[\d]+%/i);
            if (valueMatch) {
              value = valueMatch[0];
            }
            
            concessions.push({
              type,
              description: text,
              value,
            });
          }
        }
      });
    }
    
    // Strategy 2: Look in modal/popup content
    const modalSelectors = [
      '.modal', '.popup', '.overlay',
      '[role="dialog"]', '[aria-modal="true"]'
    ];
    
    for (const selector of modalSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        const text = el.textContent?.trim() || '';
        if (text.length > 10 && text.length < 500) {
          const lowerText = text.toLowerCase();
          if (keywords.some(keyword => lowerText.includes(keyword))) {
            // Already captured above, skip duplicates
          }
        }
      });
    }
    
    // Strategy 3: Check meta tags and structured data
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    scripts.forEach((script) => {
      try {
        const data = JSON.parse(script.textContent || '');
        if (data.offers || data.specialOffer) {
          const offer = data.offers || data.specialOffer;
          if (offer.description) {
            concessions.push({
              type: 'other',
              description: offer.description,
              value: offer.price || null,
            });
          }
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    });
    
    // Remove duplicates
    const seen = new Set<string>();
    return concessions.filter((c) => {
      const key = c.description.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });
}

/**
 * Extract property basic info
 */
async function extractPropertyInfo(page: Page): Promise<{
  propertyName: string;
  address: string;
  phone: string | null;
  amenities: string[];
}> {
  return await page.evaluate(() => {
    // Property name
    const nameSelectors = [
      'h1',
      '[class*="property-name"]',
      '[class*="community-name"]',
      '.hero-title',
      '[itemprop="name"]',
    ];
    
    let propertyName = 'Unknown Property';
    for (const selector of nameSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        propertyName = el.textContent.trim();
        break;
      }
    }
    
    // Address
    const addressSelectors = [
      '[itemprop="address"]',
      '[class*="address"]',
      '[class*="location"]',
    ];
    
    let address = '';
    for (const selector of addressSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        address = el.textContent.trim();
        break;
      }
    }
    
    // Phone
    let phone: string | null = null;
    const phoneSelectors = [
      'a[href^="tel:"]',
      '[class*="phone"]',
      '[itemprop="telephone"]',
    ];
    
    for (const selector of phoneSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const href = el.getAttribute('href');
        if (href?.startsWith('tel:')) {
          phone = href.replace('tel:', '');
          break;
        }
        const text = el.textContent?.trim();
        if (text) {
          const phoneMatch = text.match(/[\d\(\)\-\.\s]{10,}/);
          if (phoneMatch) {
            phone = phoneMatch[0].trim();
            break;
          }
        }
      }
    }
    
    // Amenities
    const amenities: string[] = [];
    const amenityElements = document.querySelectorAll(
      '[class*="amenity"] li, [class*="feature"] li, [class*="amenity-list"] li'
    );
    
    amenityElements.forEach((el) => {
      const text = el.textContent?.trim();
      if (text && text.length > 3 && text.length < 100) {
        amenities.push(text);
      }
    });
    
    return {
      propertyName,
      address,
      phone,
      amenities: Array.from(new Set(amenities)).slice(0, 20),
    };
  });
}

/**
 * Main function: Scrape property with full browser automation
 * 
 * @param env - Worker environment
 * @param url - Property website URL
 * @param options - Scraping options
 */
export async function scrapePropertyFullBrowser(
  env: Env,
  url: string,
  options: {
    waitTime?: number;      // How long to wait for content (ms)
    scrollPage?: boolean;   // Whether to scroll to trigger lazy loading
    screenshot?: boolean;   // Whether to take screenshot
  } = {}
): Promise<PropertyData> {
  const { waitTime = 10000, scrollPage: shouldScroll = true, screenshot = false } = options;
  
  let browser: Browser | null = null;
  let page: Page | null = null;
  
  try {
    console.log(`[Browser] Starting full automation for: ${url}`);
    
    // Connect to browser
    browser = await connectBrowser(env);
    page = await browser.newPage();
    
    // Set realistic viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Human-like delay before navigation
    console.log('[Browser] Pausing before navigation...');
    await humanDelay(1000, 2000);
    
    // Navigate to page
    console.log('[Browser] Navigating...');
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    
    console.log('[Browser] Page loaded, waiting for content...');
    
    // Human-like delay after page load
    await humanDelay(1500, 3000);
    
    // Random mouse movements to appear human
    await randomMouseMovements(page, 3);
    
    // Wait for dynamic content
    await waitForDynamicContent(page, waitTime);
    
    // Another pause
    await humanDelay(1000, 2000);
    
    // Scroll page if requested (slowly, human-like)
    if (shouldScroll) {
      await scrollPage(page);
      await humanDelay(1000, 2000);
    }
    
    // More random movements
    await randomMouseMovements(page, 2);
    
    // Detect property management system
    const pmsType = await detectPMS(page);
    console.log(`[Browser] Detected PMS: ${pmsType}`);
    
    // Extract property info
    const propertyInfo = await extractPropertyInfo(page);
    console.log(`[Browser] Property: ${propertyInfo.propertyName}`);
    
    // Another pause (human-like)
    await humanDelay(800, 1500);
    
    // Extract concessions/specials
    const concessions = await extractConcessions(page);
    console.log(`[Browser] Found ${concessions.length} concessions/specials`);
    
    // Pause before extracting rates
    await humanDelay(800, 1500);
    
    // Extract lease rates
    const leaseRates = await extractLeaseRates(page, pmsType);
    console.log(`[Browser] Extracted ${leaseRates.length} lease rates`);
    
    // === ENHANCED EXTRACTION ===
    
    // Extract property characteristics
    console.log('[Browser] Extracting property characteristics...');
    const characteristics = await extractPropertyCharacteristics(page);
    
    // Extract financial data
    console.log('[Browser] Extracting financial data...');
    const financialData = await extractFinancialData(page);
    
    // Extract total units
    const totalUnits = await extractTotalUnits(page, leaseRates.length);
    console.log(`[Browser] Total units: ${totalUnits || 'unknown'}`);
    
    // Enhance lease rates with availability data
    const enhancedLeaseRates = enhanceLeaseRatesWithAvailability(leaseRates);
    
    // Calculate occupancy from available units
    const availableUnits = enhancedLeaseRates.filter(r => r.unitStatus === 'available').length;
    const currentOccupancyPercent = calculateOccupancy(totalUnits, availableUnits);
    console.log(`[Browser] Occupancy: ${currentOccupancyPercent || 'unknown'}%`);
    
    // Calculate property class
    const avgRentPerSqft = calculateAvgRentPerSqft(enhancedLeaseRates);
    const concessionRate = enhancedLeaseRates.length > 0 
      ? (concessions.length / enhancedLeaseRates.length) * 100 
      : 0;
    const propertyClass = calculatePropertyClass({
      avgRentPerSqft,
      yearBuilt: characteristics.yearBuilt,
      amenityCount: propertyInfo.amenities.length,
      concessionRate,
    });
    console.log(`[Browser] Property class: ${propertyClass || 'unknown'}`);
    
    // Get HTML for debugging (optional)
    let rawHTML: string | undefined;
    if (enhancedLeaseRates.length === 0) {
      // If we didn't find rates, capture HTML for analysis
      const fullHTML = await page.content();
      rawHTML = fullHTML.substring(0, 10000); // First 10KB
    }
    
    // Take screenshot if requested
    if (screenshot) {
      // TODO: Save screenshot to R2/S3
      console.log('[Browser] Screenshot requested (not implemented yet)');
    }
    
    await page.close();
    
    const result: PropertyData = {
      ...propertyInfo,
      websiteUrl: url,
      leaseRates: enhancedLeaseRates,
      concessions,
      pmsType,
      scrapedAt: new Date().toISOString(),
      rawHTML,
      
      // Enhanced property data
      ...characteristics,
      ...financialData,
      propertyClass,
      totalUnits,
      currentOccupancyPercent,
      // avgDaysToLease will be calculated over time from rent_history
    };
    
    console.log(`[Browser] Scraping complete: ${enhancedLeaseRates.length} rates, class ${propertyClass || 'N/A'}`);
    return result;
    
  } catch (error: any) {
    console.error('[Browser] Scraping error:', error);
    throw error;
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close();
    console.log('[Browser] Cleaned up');
  }
}

/**
 * Scrape multiple properties in parallel (careful with rate limits!)
 */
export async function scrapePropertiesBatch(
  env: Env,
  urls: string[],
  concurrency: number = 3
): Promise<PropertyData[]> {
  console.log(`[Batch] Scraping ${urls.length} properties with concurrency ${concurrency}`);
  
  const results: PropertyData[] = [];
  const errors: Array<{ url: string; error: string }> = [];
  
  // Process in batches
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    console.log(`[Batch] Processing batch ${i / concurrency + 1} (${batch.length} URLs)`);
    
    const promises = batch.map(async (url) => {
      try {
        const data = await scrapePropertyFullBrowser(env, url, {
          scrollPage: true,
          waitTime: 10000,
        });
        return { success: true, data };
      } catch (error: any) {
        return { success: false, url, error: error.message };
      }
    });
    
    const batchResults = await Promise.all(promises);
    
    batchResults.forEach((result) => {
      if (result.success) {
        results.push(result.data);
      } else {
        errors.push({ url: result.url, error: result.error });
      }
    });
    
    // Delay between batches to avoid rate limits (random 3-6 seconds)
    if (i + concurrency < urls.length) {
      const delay = 3000 + Math.floor(Math.random() * 3000);
      console.log(`[Batch] Waiting ${delay / 1000}s before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.log(`[Batch] Complete: ${results.length} success, ${errors.length} errors`);
  if (errors.length > 0) {
    console.log('[Batch] Errors:', errors);
  }
  
  return results;
}
