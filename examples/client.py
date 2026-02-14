"""
Python client for Apartment Scraper API
Compatible with Python 3.7+
"""

import requests
import time
from typing import Dict, List, Optional, Any
from dataclasses import dataclass


@dataclass
class ScrapeRequest:
    """Request object for starting a scrape"""
    city: str
    state: str
    filters: Optional[Dict[str, Any]] = None
    max_pages: int = 5


@dataclass
class JobStatus:
    """Job status response"""
    job_id: str
    status: str  # pending, processing, completed, failed, cancelled
    progress: Dict[str, int]
    created_at: str
    updated_at: str
    completed_at: Optional[str] = None
    error: Optional[str] = None


class ApartmentScraperClient:
    """Client for interacting with Apartment Scraper Worker API"""
    
    def __init__(self, base_url: str, api_key: Optional[str] = None):
        """
        Initialize the client
        
        Args:
            base_url: Base URL of the worker (e.g., https://apartment-scraper.workers.dev)
            api_key: Optional API key for authentication
        """
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.session = requests.Session()
        
        if api_key:
            self.session.headers['Authorization'] = f'Bearer {api_key}'
    
    def start_scrape(self, request: ScrapeRequest) -> Dict[str, Any]:
        """
        Start a new scraping job
        
        Args:
            request: ScrapeRequest object with scraping parameters
            
        Returns:
            Dictionary with jobId and status
        """
        payload = {
            'city': request.city,
            'state': request.state,
            'maxPages': request.max_pages,
        }
        
        if request.filters:
            payload['filters'] = request.filters
        
        response = self.session.post(
            f'{self.base_url}/api/scrape/start',
            json=payload
        )
        response.raise_for_status()
        
        return response.json()
    
    def get_status(self, job_id: str) -> JobStatus:
        """
        Get the status of a job
        
        Args:
            job_id: Job ID returned from start_scrape()
            
        Returns:
            JobStatus object
        """
        response = self.session.get(
            f'{self.base_url}/api/scrape/status/{job_id}'
        )
        response.raise_for_status()
        
        data = response.json()
        return JobStatus(
            job_id=data['jobId'],
            status=data['status'],
            progress=data['progress'],
            created_at=data['createdAt'],
            updated_at=data['updatedAt'],
            completed_at=data.get('completedAt'),
            error=data.get('error')
        )
    
    def get_results(self, job_id: str) -> Dict[str, Any]:
        """
        Get the results of a completed job
        
        Args:
            job_id: Job ID
            
        Returns:
            Dictionary with results and metadata
        """
        response = self.session.get(
            f'{self.base_url}/api/scrape/results/{job_id}'
        )
        response.raise_for_status()
        
        return response.json()
    
    def cancel_job(self, job_id: str) -> Dict[str, str]:
        """
        Cancel a running job
        
        Args:
            job_id: Job ID
            
        Returns:
            Confirmation message
        """
        response = self.session.post(
            f'{self.base_url}/api/scrape/cancel/{job_id}'
        )
        response.raise_for_status()
        
        return response.json()
    
    def poll_until_complete(
        self,
        job_id: str,
        interval: int = 5,
        timeout: int = 300
    ) -> Dict[str, Any]:
        """
        Poll job status until it completes
        
        Args:
            job_id: Job ID
            interval: Polling interval in seconds
            timeout: Maximum time to wait in seconds
            
        Returns:
            Job results when complete
            
        Raises:
            TimeoutError: If job doesn't complete within timeout
            RuntimeError: If job fails
        """
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            status = self.get_status(job_id)
            
            if status.status == 'completed':
                return self.get_results(job_id)
            
            if status.status == 'failed':
                raise RuntimeError(f'Job failed: {status.error}')
            
            if status.status == 'cancelled':
                raise RuntimeError('Job was cancelled')
            
            # Print progress
            print(f"Status: {status.status} - "
                  f"Page {status.progress['currentPage']}/{status.progress['totalPages']} - "
                  f"Scraped: {status.progress['listingsScraped']}")
            
            time.sleep(interval)
        
        raise TimeoutError(f'Job did not complete within {timeout} seconds')
    
    def scrape_and_wait(
        self,
        request: ScrapeRequest,
        poll_interval: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Convenience method to start a scrape and wait for completion
        
        Args:
            request: ScrapeRequest object
            poll_interval: Polling interval in seconds
            
        Returns:
            List of scraped listings
        """
        result = self.start_scrape(request)
        job_id = result['jobId']
        
        print(f"Job started: {job_id}")
        
        results = self.poll_until_complete(job_id, poll_interval)
        return results['results']


# ============================================
# Usage Examples
# ============================================

def basic_example():
    """Basic scraping example"""
    client = ApartmentScraperClient('https://apartment-scraper.workers.dev')
    
    request = ScrapeRequest(
        city='atlanta',
        state='ga',
        filters={
            'minPrice': 1000,
            'maxPrice': 3000,
            'beds': [1, 2]
        },
        max_pages=3
    )
    
    # Start job
    result = client.start_scrape(request)
    print(f"Job started: {result['jobId']}")
    
    # Check status
    status = client.get_status(result['jobId'])
    print(f"Status: {status.status}")


def scrape_and_wait_example():
    """Scrape and wait for completion"""
    client = ApartmentScraperClient('https://apartment-scraper.workers.dev')
    
    request = ScrapeRequest(
        city='austin',
        state='tx',
        max_pages=2
    )
    
    try:
        listings = client.scrape_and_wait(request)
        print(f"Found {len(listings)} listings")
        
        # Print first listing
        if listings:
            print("\nFirst listing:")
            print(f"  Name: {listings[0]['propertyName']}")
            print(f"  Address: {listings[0]['address']}")
            print(f"  Price: ${listings[0].get('minPrice', 'N/A')}")
            
    except Exception as e:
        print(f"Error: {e}")


def multi_city_example():
    """Scrape multiple cities in parallel"""
    import concurrent.futures
    
    client = ApartmentScraperClient('https://apartment-scraper.workers.dev')
    
    cities = [
        ScrapeRequest(city='atlanta', state='ga', max_pages=3),
        ScrapeRequest(city='austin', state='tx', max_pages=3),
        ScrapeRequest(city='denver', state='co', max_pages=3),
    ]
    
    # Start all jobs
    jobs = [client.start_scrape(req) for req in cities]
    print(f"Started {len(jobs)} jobs")
    
    # Wait for all to complete in parallel
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [
            executor.submit(client.poll_until_complete, job['jobId'])
            for job in jobs
        ]
        
        results = [future.result() for future in futures]
    
    # Print summary
    for i, result in enumerate(results):
        print(f"{cities[i].city}: {len(result['results'])} listings")


def pandas_example():
    """Export results to pandas DataFrame"""
    import pandas as pd
    
    client = ApartmentScraperClient('https://apartment-scraper.workers.dev')
    
    request = ScrapeRequest(
        city='seattle',
        state='wa',
        max_pages=2
    )
    
    listings = client.scrape_and_wait(request)
    
    # Convert to DataFrame
    df = pd.DataFrame(listings)
    
    # Clean up columns
    df['avgPrice'] = (df['minPrice'] + df['maxPrice']) / 2
    
    # Print summary statistics
    print("\nSummary Statistics:")
    print(df[['beds', 'baths', 'sqft', 'avgPrice']].describe())
    
    # Export to CSV
    df.to_csv('apartments.csv', index=False)
    print("\nExported to apartments.csv")


def save_to_database_example():
    """Save results to your own database"""
    import psycopg2
    
    client = ApartmentScraperClient('https://apartment-scraper.workers.dev')
    
    request = ScrapeRequest(
        city='portland',
        state='or',
        max_pages=3
    )
    
    listings = client.scrape_and_wait(request)
    
    # Connect to your database
    conn = psycopg2.connect(
        host="localhost",
        database="myapp",
        user="myuser",
        password="mypassword"
    )
    
    cur = conn.cursor()
    
    # Insert listings
    for listing in listings:
        cur.execute("""
            INSERT INTO apartments (name, address, city, state, min_price, max_price)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (address, city, state) DO UPDATE
            SET min_price = EXCLUDED.min_price,
                max_price = EXCLUDED.max_price,
                updated_at = NOW()
        """, (
            listing['propertyName'],
            listing['address'],
            listing['city'],
            listing['state'],
            listing.get('minPrice'),
            listing.get('maxPrice')
        ))
    
    conn.commit()
    cur.close()
    conn.close()
    
    print(f"Saved {len(listings)} listings to database")


if __name__ == '__main__':
    # Run examples
    print("Example 1: Basic scraping")
    basic_example()
    
    print("\n" + "="*50 + "\n")
    
    print("Example 2: Scrape and wait")
    scrape_and_wait_example()
