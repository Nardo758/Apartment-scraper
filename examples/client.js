/**
 * JavaScript client example for Apartment Scraper API
 * Use this in your frontend or Node.js backend
 */

class ApartmentScraperClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Start a new scraping job
   */
  async startScrape(request) {
    const response = await fetch(`${this.baseUrl}/api/scrape/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to start scrape: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get job status
   */
  async getStatus(jobId) {
    const response = await fetch(`${this.baseUrl}/api/scrape/status/${jobId}`);

    if (!response.ok) {
      throw new Error(`Failed to get status: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get job results
   */
  async getResults(jobId) {
    const response = await fetch(`${this.baseUrl}/api/scrape/results/${jobId}`);

    if (!response.ok) {
      throw new Error(`Failed to get results: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId) {
    const response = await fetch(`${this.baseUrl}/api/scrape/cancel/${jobId}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to cancel job: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Poll job until completion
   * Returns final results
   */
  async pollUntilComplete(jobId, intervalMs = 5000, timeoutMs = 300000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const status = await this.getStatus(jobId);

      if (status.status === 'completed') {
        return await this.getResults(jobId);
      }

      if (status.status === 'failed') {
        throw new Error(`Job failed: ${status.error}`);
      }

      if (status.status === 'cancelled') {
        throw new Error('Job was cancelled');
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error('Job timeout: took longer than expected');
  }

  /**
   * Start scrape and wait for completion
   * Convenience method that combines start + poll
   */
  async scrapeAndWait(request, pollInterval = 5000) {
    const { jobId } = await this.startScrape(request);
    console.log(`Job started: ${jobId}`);

    return await this.pollUntilComplete(jobId, pollInterval);
  }
}

// ============================================
// Usage Examples
// ============================================

// Example 1: Basic scraping
async function basicExample() {
  const client = new ApartmentScraperClient('https://apartment-scraper.your-worker.workers.dev');

  try {
    const result = await client.startScrape({
      city: 'atlanta',
      state: 'ga',
      filters: {
        minPrice: 1000,
        maxPrice: 3000,
        beds: [1, 2],
      },
      maxPages: 3,
    });

    console.log('Job started:', result.jobId);

    // Poll for results
    const status = await client.getStatus(result.jobId);
    console.log('Status:', status);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 2: Scrape and wait for completion
async function scrapeAndWaitExample() {
  const client = new ApartmentScraperClient('https://apartment-scraper.your-worker.workers.dev');

  try {
    const results = await client.scrapeAndWait({
      city: 'austin',
      state: 'tx',
      maxPages: 2,
    });

    console.log(`Found ${results.results.length} listings`);
    console.log('First listing:', results.results[0]);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 3: Scrape multiple cities in parallel
async function multiCityExample() {
  const client = new ApartmentScraperClient('https://apartment-scraper.your-worker.workers.dev');

  const cities = [
    { city: 'atlanta', state: 'ga' },
    { city: 'austin', state: 'tx' },
    { city: 'denver', state: 'co' },
  ];

  try {
    // Start all jobs
    const jobs = await Promise.all(
      cities.map(location =>
        client.startScrape({
          ...location,
          maxPages: 3,
        })
      )
    );

    console.log('Started jobs:', jobs.map(j => j.jobId));

    // Wait for all to complete
    const results = await Promise.all(
      jobs.map(job => client.pollUntilComplete(job.jobId))
    );

    results.forEach((result, i) => {
      console.log(`${cities[i].city}: ${result.results.length} listings`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 4: React Hook
function useApartmentScraper(baseUrl) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [results, setResults] = React.useState(null);

  const scrape = React.useCallback(async (request) => {
    setLoading(true);
    setError(null);
    setResults(null);

    const client = new ApartmentScraperClient(baseUrl);

    try {
      const data = await client.scrapeAndWait(request);
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  return { scrape, loading, error, results };
}

// Example 5: Node.js backend integration
async function backendExample() {
  const client = new ApartmentScraperClient(process.env.SCRAPER_URL);

  // Schedule daily scraping
  setInterval(async () => {
    try {
      console.log('Starting daily scrape...');
      
      const results = await client.scrapeAndWait({
        city: 'seattle',
        state: 'wa',
        maxPages: 5,
      });

      // Process results (save to your own DB, send notifications, etc.)
      console.log(`Scraped ${results.results.length} listings`);
      
      // Your custom logic here
      await processListings(results.results);
      
    } catch (error) {
      console.error('Daily scrape failed:', error);
    }
  }, 24 * 60 * 60 * 1000); // Every 24 hours
}

// Export for use in Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ApartmentScraperClient };
}
