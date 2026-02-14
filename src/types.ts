export interface Env {
  MYBROWSER: Fetcher;
  SCRAPER_JOBS: DurableObjectNamespace;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY?: string;
  BRIGHTDATA_API_KEY: string;
  SCRAPINGBEE_API_KEY: string;
}

export interface ScrapeRequest {
  city: string;
  state: string;
  filters?: {
    minPrice?: number;
    maxPrice?: number;
    beds?: number[];
    baths?: number;
    pets?: 'allowed' | 'cats' | 'dogs' | 'none';
    availableBy?: string;
  };
  maxPages?: number;
}

export interface ScrapedListing {
  propertyName: string;
  address: string;
  city: string;
  state: string;
  zip?: string;
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  amenities?: string[];
  photos?: string[];
  contactPhone?: string;
  websiteUrl?: string;
  availableDate?: string;
  daysOnMarket?: number;
  specialOffers?: string;
  petPolicy?: string;
  applicationFee?: string;
  sourceUrl: string;
  scrapedAt: string;
}

export interface JobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  request: ScrapeRequest;
  progress: {
    currentPage: number;
    totalPages: number;
    listingsScraped: number;
  };
  results?: ScrapedListing[];
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ScraperSelectors {
  listings: string;
  propertyName: string;
  address: string;
  price: string;
  beds: string;
  baths: string;
  sqft: string;
  phone: string;
  amenities: string;
  photos: string;
  available: string;
  specials: string;
  petPolicy: string;
  nextButton: string;
}
