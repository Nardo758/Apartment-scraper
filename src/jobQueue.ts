import { DurableObject } from 'cloudflare:workers';
import type { Env, ScrapeRequest, JobStatus, ScrapedListing } from './types';
import { scrapeApartments } from './scraper';
import { saveListings } from './supabase';
import { generateJobId } from './utils';

/**
 * Durable Object for managing scraper jobs
 */
export class ScraperJobQueue extends DurableObject {
  private jobs: Map<string, JobStatus> = new Map();
  declare state: DurableObjectState;
  declare env: Env;
  
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = state;
    this.env = env;
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get<Map<string, JobStatus>>('jobs');
      if (stored) {
        this.jobs = new Map(stored);
      }
    });
  }
  
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    try {
      if (path === '/start' && request.method === 'POST') {
        return await this.startJob(request);
      }
      
      if (path.startsWith('/status/')) {
        const jobId = path.split('/')[2];
        return this.getJobStatus(jobId);
      }
      
      if (path.startsWith('/cancel/')) {
        const jobId = path.split('/')[2];
        return this.cancelJob(jobId);
      }
      
      if (path.startsWith('/results/')) {
        const jobId = path.split('/')[2];
        return this.getJobResults(jobId);
      }
      
      if (path === '/list') {
        return this.listJobs();
      }
      
      return new Response('Not found', { status: 404 });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
  
  /**
   * Start a new scraping job
   */
  private async startJob(request: Request): Promise<Response> {
    const scrapeRequest: ScrapeRequest = await request.json();
    
    // Validate request
    if (!scrapeRequest.city || !scrapeRequest.state) {
      return new Response(
        JSON.stringify({ error: 'City and state are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const jobId = generateJobId();
    
    const job: JobStatus = {
      jobId,
      status: 'pending',
      request: scrapeRequest,
      progress: {
        currentPage: 0,
        totalPages: scrapeRequest.maxPages || 5,
        listingsScraped: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    this.jobs.set(jobId, job);
    await this.persistJobs();
    
    // Start processing in background (don't await)
    this.processJob(jobId).catch(error => {
      console.error(`Job ${jobId} failed:`, error);
    });
    
    return new Response(
      JSON.stringify({
        jobId,
        status: 'pending',
        message: 'Job started successfully',
      }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
  
  /**
   * Process a scraping job
   */
  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    
    try {
      // Update status to processing
      job.status = 'processing';
      job.updatedAt = new Date().toISOString();
      await this.persistJobs();
      
      // Perform scraping
      const listings = await scrapeApartments(this.env as Env, job.request);
      
      // Update progress
      job.progress.listingsScraped = listings.length;
      job.results = listings;
      await this.persistJobs();
      
      // Save to Supabase
      if (listings.length > 0) {
        const saveResult = await saveListings(this.env as Env, listings);
        console.log(`Saved ${saveResult.success} listings, ${saveResult.failed} failed`);
      }
      
      // Mark as completed
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      job.updatedAt = new Date().toISOString();
      await this.persistJobs();
      
    } catch (error: any) {
      console.error(`Job ${jobId} error:`, error);
      job.status = 'failed';
      job.error = error.message;
      job.updatedAt = new Date().toISOString();
      await this.persistJobs();
    }
  }
  
  /**
   * Get job status
   */
  private getJobStatus(jobId: string): Response {
    const job = this.jobs.get(jobId);
    
    if (!job) {
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Return status without full results
    const statusResponse = {
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
      error: job.error,
    };
    
    return new Response(JSON.stringify(statusResponse), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  /**
   * Get job results
   */
  private getJobResults(jobId: string): Response {
    const job = this.jobs.get(jobId);
    
    if (!job) {
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (job.status !== 'completed') {
      return new Response(
        JSON.stringify({
          error: 'Job not completed yet',
          status: job.status,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({
        jobId: job.jobId,
        status: job.status,
        results: job.results,
        progress: job.progress,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
  
  /**
   * Cancel a job
   */
  private async cancelJob(jobId: string): Promise<Response> {
    const job = this.jobs.get(jobId);
    
    if (!job) {
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (job.status === 'completed' || job.status === 'failed') {
      return new Response(
        JSON.stringify({ error: 'Job already finished' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    job.status = 'cancelled';
    job.updatedAt = new Date().toISOString();
    await this.persistJobs();
    
    return new Response(
      JSON.stringify({ message: 'Job cancelled successfully' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  /**
   * List all jobs
   */
  private listJobs(): Response {
    const jobList = Array.from(this.jobs.values()).map(job => ({
      jobId: job.jobId,
      status: job.status,
      request: job.request,
      progress: job.progress,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    }));
    
    return new Response(JSON.stringify({ jobs: jobList }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  /**
   * Persist jobs to durable storage
   */
  private async persistJobs(): Promise<void> {
    await this.state.storage.put('jobs', Array.from(this.jobs.entries()));
  }
}
