/**
 * Random delay between actions
 */
export async function randomDelay(minMs: number = 1000, maxMs: number = 3000): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Get a random user agent
 */
export function getRandomUserAgent(): string {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.1; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

/**
 * Get random viewport dimensions
 */
export function getRandomViewport(): { width: number; height: number } {
  const baseWidth = 1920;
  const baseHeight = 1080;
  return {
    width: baseWidth + Math.floor(Math.random() * 100),
    height: baseHeight + Math.floor(Math.random() * 100),
  };
}

/**
 * Extract number from string (e.g., "$1,500" -> 1500)
 */
export function extractNumber(text: string | null): number | undefined {
  if (!text) return undefined;
  const match = text.replace(/,/g, '').match(/\d+/);
  return match ? parseInt(match[0], 10) : undefined;
}

/**
 * Extract price range from string (e.g., "$1,500 - $2,000")
 */
export function extractPriceRange(text: string | null): { min?: number; max?: number } {
  if (!text) return {};
  
  const prices = text.match(/\$?\d{1,3}(?:,\d{3})*/g);
  if (!prices || prices.length === 0) return {};
  
  const numbers = prices.map(p => parseInt(p.replace(/[$,]/g, ''), 10));
  
  if (numbers.length === 1) {
    return { min: numbers[0], max: numbers[0] };
  }
  
  return { min: Math.min(...numbers), max: Math.max(...numbers) };
}

/**
 * Clean and normalize text
 */
export function cleanText(text: string | null): string | undefined {
  if (!text) return undefined;
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Generate unique job ID
 */
export function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Build Apartments.com search URL
 */
export function buildSearchUrl(city: string, state: string, filters?: any, page: number = 1): string {
  const baseUrl = 'https://www.apartments.com';
  const citySlug = city.toLowerCase().replace(/\s+/g, '-');
  const stateSlug = state.toLowerCase();
  
  let url = `${baseUrl}/${citySlug}-${stateSlug}/`;
  
  const params = new URLSearchParams();
  
  if (page > 1) {
    params.append('bb', String(page));
  }
  
  if (filters) {
    if (filters.minPrice) params.append('min', String(filters.minPrice));
    if (filters.maxPrice) params.append('max', String(filters.maxPrice));
    if (filters.beds && filters.beds.length > 0) {
      params.append('bb', filters.beds.join(','));
    }
  }
  
  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}
