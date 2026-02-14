/**
 * Page Inspector - Analyze actual HTML structure
 */

import puppeteer from '@cloudflare/puppeteer';
import type { Env } from './types';

export async function inspectPage(env: Env, url: string) {
  console.log('🔍 Inspecting page:', url);
  
  const browser = await puppeteer.launch(env.MYBROWSER);
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('📄 Loading page...');
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000,
    });
    
    // Wait for page to fully load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Extract all possible selectors and their content
    const analysis = await page.evaluate(() => {
      const results: any = {
        title: document.title,
        h1s: [] as string[],
        h2s: [] as string[],
        prices: [] as string[],
        classesWithPrice: [] as string[],
        classesWithBed: [] as string[],
        allText: '',
      };
      
      // Get all h1 tags
      document.querySelectorAll('h1').forEach(el => {
        results.h1s.push(el.textContent?.trim() || '');
      });
      
      // Get all h2 tags
      document.querySelectorAll('h2').forEach(el => {
        results.h2s.push(el.textContent?.trim() || '');
      });
      
      // Find all elements with price-like text
      document.querySelectorAll('*').forEach(el => {
        const text = el.textContent || '';
        if (text.match(/\$\s*[\d,]+/) && text.length < 200) {
          const className = el.className;
          if (className && typeof className === 'string') {
            results.classesWithPrice.push(className);
          }
        }
        if (text.match(/\d+\s*bed/i) && text.length < 100) {
          const className = el.className;
          if (className && typeof className === 'string') {
            results.classesWithBed.push(className);
          }
        }
      });
      
      // Get page text for price extraction
      results.allText = document.body.textContent?.slice(0, 5000) || '';
      
      return results;
    });
    
    console.log('✅ Page analysis complete');
    return analysis;
    
  } finally {
    await browser.close();
  }
}
