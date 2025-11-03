/**
 * CACHED CASCADE ENGINE
 * 
 * Loads pre-computed cascade results from stored JSON files.
 * Provides instant cascade lookups with zero computation time.
 */

import type { AdvancedCascadeResult } from './AdvancedCascadeEngine';

export class CachedCascadeEngine {
  private cache: Record<string, AdvancedCascadeResult> = {};
  private isLoaded: boolean = false;
  private loadingPromise: Promise<void> | null = null;

  constructor() {
    // Don't load cache automatically - only when needed
    console.log('📦 Cached cascade engine ready (cache will load on first use)');
  }

  /**
   * Load pre-computed cascade results from JSON file
   */
  private async loadCache(): Promise<void> {
    try {
      console.log('📂 Loading pre-computed cascade cache...');
      
      const response = await fetch('/data/cascade-cache.json');
      if (!response.ok) {
        throw new Error(`Failed to load cascade cache: HTTP ${response.status}`);
      }
      
      const text = await response.text();
      
      // Check if response is HTML (404 page) instead of JSON
      if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
        throw new Error('Cascade cache file not found - received HTML instead of JSON');
      }
      
      this.cache = JSON.parse(text);
      this.isLoaded = true;
      
      const assetCount = Object.keys(this.cache).length;
      const totalImpacts = Object.values(this.cache).reduce((sum, result) => sum + result.impacts.length, 0);
      
      console.log(`✅ Loaded cascade cache:`);
      console.log(`   📊 ${assetCount} assets`);
      console.log(`   ⚡ ${totalImpacts} total impacts`);
      console.log(`   🚀 Ready for instant cascades!`);
      
    } catch (error) {
      console.error('❌ Failed to load cascade cache:', error);
      console.log('💡 Run "npm run precompute-cascades" to generate cache file');
      console.log('💡 Or switch to "Advanced" simulation engine for real-time computation');
      this.isLoaded = false;
    }
  }

  /**
   * Ensure cache is loaded before use
   */
  private async ensureLoaded(): Promise<void> {
    if (!this.loadingPromise && !this.isLoaded) {
      this.loadingPromise = this.loadCache();
    }
    
    if (this.loadingPromise) {
      await this.loadingPromise;
      this.loadingPromise = null;
    }
  }

  /**
   * Get pre-computed cascade result for an asset (INSTANT)
   */
  async getCascadeResult(assetId: string): Promise<AdvancedCascadeResult | null> {
    await this.ensureLoaded();
    
    if (!this.isLoaded) {
      console.warn('⚠️ Cascade cache not loaded, cannot get result for', assetId);
      return null;
    }

    const result = this.cache[assetId];
    if (!result) {
      console.warn(`⚠️ No cached cascade found for asset: ${assetId}`);
      return null;
    }

    console.log(`⚡ Retrieved cached cascade for ${assetId}: ${result.impacts.length} impacts`);
    return result;
  }

  /**
   * Check if cache has result for asset
   */
  async hasResult(assetId: string): Promise<boolean> {
    await this.ensureLoaded();
    return this.isLoaded && !!this.cache[assetId];
  }

  /**
   * Get all available asset IDs in cache
   */
  async getAvailableAssets(): Promise<string[]> {
    await this.ensureLoaded();
    return this.isLoaded ? Object.keys(this.cache) : [];
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    isLoaded: boolean;
    assetCount: number;
    totalImpacts: number;
    averageImpacts: number;
  }> {
    await this.ensureLoaded();
    
    if (!this.isLoaded) {
      return {
        isLoaded: false,
        assetCount: 0,
        totalImpacts: 0,
        averageImpacts: 0
      };
    }

    const assetCount = Object.keys(this.cache).length;
    const totalImpacts = Object.values(this.cache).reduce((sum, result) => sum + result.impacts.length, 0);
    
    return {
      isLoaded: true,
      assetCount,
      totalImpacts,
      averageImpacts: Math.round(totalImpacts / assetCount)
    };
  }

  /**
   * Reload cache from file (useful for development)
   */
  async reloadCache(): Promise<void> {
    this.isLoaded = false;
    this.cache = {};
    this.loadingPromise = this.loadCache();
    await this.loadingPromise;
  }
}