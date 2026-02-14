/**
 * BrightData Proxy Configuration
 * 
 * Provides residential proxy rotation to avoid IP blocking
 * Documentation: https://docs.brightdata.com/
 */

export interface BrightDataConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

/**
 * Build BrightData proxy configuration
 * 
 * Format: brd-customer-{customer_id}-zone-{zone_name}
 * Default zone: residential
 * 
 * @param apiKey - BrightData API key/customer ID
 * @param zone - Proxy zone (residential, datacenter, mobile, etc.)
 * @param country - Optional country code (us, uk, de, etc.)
 * @param session - Optional session ID for sticky sessions
 */
export function getBrightDataProxy(
  apiKey: string,
  zone: string = 'residential',
  country?: string,
  session?: string
): BrightDataConfig {
  // BrightData proxy format
  let username = `brd-customer-${apiKey}-zone-${zone}`;
  
  // Add country targeting
  if (country) {
    username += `-country-${country}`;
  }
  
  // Add session for sticky IP
  if (session) {
    username += `-session-${session}`;
  }
  
  return {
    host: 'brd.superproxy.io',
    port: 22225, // Standard BrightData port
    username,
    password: apiKey, // API key is also the password
  };
}

/**
 * Build Puppeteer proxy args
 */
export function getPuppeteerProxyArgs(config: BrightDataConfig): string[] {
  return [
    `--proxy-server=${config.host}:${config.port}`,
  ];
}

/**
 * Get proxy authentication for Puppeteer page
 */
export function getProxyAuth(config: BrightDataConfig) {
  return {
    username: config.username,
    password: config.password,
  };
}

/**
 * Generate random session ID for sticky IPs
 * Use same session across requests to maintain same IP
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Recommended zones by use case
 */
export const BRIGHTDATA_ZONES = {
  // Best for web scraping (real residential IPs)
  RESIDENTIAL: 'residential',
  
  // Fastest, cheapest (datacenter IPs)
  DATACENTER: 'datacenter',
  
  // Mobile IPs (3G/4G/5G)
  MOBILE: 'mobile',
  
  // ISP IPs (blend of residential + datacenter)
  ISP: 'isp',
} as const;

/**
 * Example usage:
 * 
 * ```ts
 * const proxy = getBrightDataProxy(
 *   env.BRIGHTDATA_API_KEY,
 *   BRIGHTDATA_ZONES.RESIDENTIAL,
 *   'us', // Target US IPs
 *   generateSessionId() // Sticky session
 * );
 * 
 * const browser = await puppeteer.launch({
 *   args: getPuppeteerProxyArgs(proxy),
 * });
 * 
 * const page = await browser.newPage();
 * await page.authenticate(getProxyAuth(proxy));
 * ```
 */
