import puppeteer, { Page, Browser } from '@cloudflare/puppeteer';
import type { Env, ScrapeRequest, ScrapedListing, ScraperSelectors } from './types';
import {
  randomDelay,
  getRandomUserAgent,
  getRandomViewport,
  extractNumber,
  extractPriceRange,
  cleanText,
  buildSearchUrl,
  retryWithBackoff,
} from './utils';
import {
  getBrightDataProxy,
  getPuppeteerProxyArgs,
  getProxyAuth,
  generateSessionId,
  BRIGHTDATA_ZONES,
} from './brightdata-proxy';

/**
 * Apartments.com selectors
 */
const SELECTORS: ScraperSelectors = {
  listings: 'article.placard, li.mortar-wrapper',
  propertyName: '.property-title, .property-name, h2.title',
  address: '.property-address, .property-location',
  price: '.property-pricing, .price-range, .rent',
  beds: '.bed-range, .beds',
  baths: '.bath-range, .baths',
  sqft: '.sqft, .square-feet',
  phone: '.phone-link, [data-phone], .contact-phone',
  amenities: '.amenity-group li, .amenities-list li',
  photos: '.carousel-photo img, .property-photo img',
  available: '.available-date, .property-available',
  specials: '.special-offer, .specials, .promotion',
  petPolicy: '.pet-policy, .pets-allowed',
  nextButton: '.next, .paging-next, button[aria-label*="Next"]',
};

/**
 * Initialize browser with anti-detection measures and BrightData proxy
 */
async function initBrowser(env: Env, useProxy: boolean = true): Promise<Browser> {
  const launchOptions: any = {};
  
  if (useProxy && env.BRIGHTDATA_API_KEY) {
    // Generate session ID for sticky IP (maintains same IP across requests)
    const sessionId = generateSessionId();
    
    // Configure BrightData residential proxy
    const proxy = getBrightDataProxy(
      env.BRIGHTDATA_API_KEY,
      BRIGHTDATA_ZONES.RESIDENTIAL,
      'us', // Target US IPs for apartments.com
      sessionId
    );
    
    // Add proxy args to browser launch
    launchOptions.args = getPuppeteerProxyArgs(proxy);
    
    console.log(`Using BrightData proxy: ${proxy.host}:${proxy.port}`);
    console.log(`Session ID: ${sessionId}`);
    
    // Store proxy config for page authentication
    (launchOptions as any).__proxyAuth = getProxyAuth(proxy);
  }
  
  const browser = await puppeteer.launch(env.MYBROWSER, launchOptions);
  return browser;
}

/**
 * Configure page with stealth settings
 */
async function setupPage(page: Page, proxyAuth?: { username: string; password: string }): Promise<void> {
  // Authenticate with proxy if provided
  if (proxyAuth) {
    await page.authenticate(proxyAuth);
    console.log('Proxy authentication successful');
  }
  
  // Set random user agent
  await page.setUserAgent(getRandomUserAgent());
  
  // Set random viewport
  const viewport = getRandomViewport();
  await page.setViewport(viewport);
  
  // Inject anti-detection scripts
  await page.evaluateOnNewDocument(() => {
    // Hide webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
    
    // Mock plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
    
    // Mock languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
    
    // Override permissions
    const win = globalThis as any;
    const originalQuery = win.navigator.permissions.query;
    win.navigator.permissions.query = (parameters: any) =>
      parameters.name === 'notifications'
        ? Promise.resolve({ state: 'denied' } as any)
        : originalQuery(parameters);
  });
}

/**
 * Extract listing data from a page element
 */
async function extractListingData(
  page: Page,
  listingElement: any,
  city: string,
  state: string,
  sourceUrl: string
): Promise<ScrapedListing | null> {
  try {
    const data = await page.evaluate((el, selectors) => {
      const getTextContent = (selector: string): string | null => {
        const element = el.querySelector(selector);
        return element ? element.textContent?.trim() || null : null;
      };
      
      const getAttribute = (selector: string, attr: string): string | null => {
        const element = el.querySelector(selector);
        return element ? element.getAttribute(attr) : null;
      };
      
      const getAllTextContent = (selector: string): string[] => {
        const elements = el.querySelectorAll(selector);
        return Array.from(elements).map((e: any) => e.textContent?.trim() || '').filter(Boolean);
      };
      
      const getAllAttributes = (selector: string, attr: string): string[] => {
        const elements = el.querySelectorAll(selector);
        return Array.from(elements)
          .map((e: any) => e.getAttribute(attr))
          .filter(Boolean) as string[];
      };
      
      return {
        propertyName: getTextContent(selectors.propertyName),
        address: getTextContent(selectors.address),
        price: getTextContent(selectors.price),
        beds: getTextContent(selectors.beds),
        baths: getTextContent(selectors.baths),
        sqft: getTextContent(selectors.sqft),
        phone: getTextContent(selectors.phone) || getAttribute(selectors.phone, 'data-phone'),
        amenities: getAllTextContent(selectors.amenities),
        photos: getAllAttributes(selectors.photos, 'src'),
        available: getTextContent(selectors.available),
        specials: getTextContent(selectors.specials),
        petPolicy: getTextContent(selectors.petPolicy),
        listingUrl: el.querySelector('a')?.href || null,
      };
    }, listingElement, SELECTORS);
    
    // Parse price range
    const priceRange = extractPriceRange(data.price);
    
    // Build listing object
    const listing: ScrapedListing = {
      propertyName: cleanText(data.propertyName) || 'Unknown Property',
      address: cleanText(data.address) || '',
      city,
      state,
      minPrice: priceRange.min,
      maxPrice: priceRange.max,
      beds: extractNumber(data.beds),
      baths: extractNumber(data.baths),
      sqft: extractNumber(data.sqft),
      amenities: data.amenities.filter(Boolean),
      photos: data.photos.filter(Boolean),
      contactPhone: cleanText(data.phone),
      websiteUrl: data.listingUrl || undefined,
      availableDate: cleanText(data.available),
      specialOffers: cleanText(data.specials),
      petPolicy: cleanText(data.petPolicy),
      sourceUrl,
      scrapedAt: new Date().toISOString(),
    };
    
    // Validate required fields
    if (!listing.propertyName && !listing.address) {
      return null;
    }
    
    return listing;
  } catch (error) {
    console.error('Error extracting listing data:', error);
    return null;
  }
}

/**
 * Scrape a single page
 */
async function scrapePage(
  page: Page,
  url: string,
  city: string,
  state: string
): Promise<ScrapedListing[]> {
  console.log(`Scraping page: ${url}`);
  
  await retryWithBackoff(async () => {
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
  });
  
  // Wait for listings to load
  await page.waitForSelector(SELECTORS.listings, { timeout: 10000 }).catch(() => {
    console.warn('Listings selector not found, page may have different structure');
  });
  
  // Add random delay to mimic human behavior
  await randomDelay(1000, 2000);
  
  // Get all listing elements
  const listingElements = await page.$$(SELECTORS.listings);
  console.log(`Found ${listingElements.length} listings on page`);
  
  const listings: ScrapedListing[] = [];
  
  for (const element of listingElements) {
    const listing = await extractListingData(page, element, city, state, url);
    if (listing) {
      listings.push(listing);
    }
    
    // Small delay between processing listings
    await randomDelay(100, 300);
  }
  
  return listings;
}

/**
 * Check if there's a next page
 */
async function hasNextPage(page: Page): Promise<boolean> {
  try {
    const nextButton = await page.$(SELECTORS.nextButton);
    if (!nextButton) return false;
    
    const isDisabled = await page.evaluate((el) => {
      return el.hasAttribute('disabled') || 
             el.classList.contains('disabled') ||
             el.getAttribute('aria-disabled') === 'true';
    }, nextButton);
    
    return !isDisabled;
  } catch (error) {
    return false;
  }
}

/**
 * Main scraping function
 */
export async function scrapeApartments(
  env: Env,
  request: ScrapeRequest,
  useProxy: boolean = true
): Promise<ScrapedListing[]> {
  let browser: Browser | null = null;
  const allListings: ScrapedListing[] = [];
  
  try {
    browser = await initBrowser(env, useProxy);
    const page = await browser.newPage();
    
    // Get proxy auth if available
    const proxyAuth = (browser as any).__proxyAuth;
    await setupPage(page, proxyAuth);
    
    const maxPages = request.maxPages || 5;
    let currentPage = 1;
    
    while (currentPage <= maxPages) {
      const url = buildSearchUrl(request.city, request.state, request.filters, currentPage);
      
      const pageListings = await scrapePage(page, url, request.city, request.state);
      allListings.push(...pageListings);
      
      console.log(`Page ${currentPage}: Scraped ${pageListings.length} listings (Total: ${allListings.length})`);
      
      // Check if there's a next page
      const hasNext = await hasNextPage(page);
      if (!hasNext) {
        console.log('No more pages available');
        break;
      }
      
      currentPage++;
      
      // Delay before next page
      await randomDelay(2000, 4000);
    }
    
    await page.close();
    return allListings;
  } catch (error) {
    console.error('Scraping error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
