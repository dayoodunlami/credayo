/**
 * Progressive Data Loader for Vercel Deployment
 * Loads large datasets in chunks for faster initial rendering
 */

interface ChunkMetadata {
  city: string;
  type: string;
  timestamp: number;
  totalCount: number;
  chunkSize: number;
  totalChunks: number;
}

interface DataChunk {
  chunkNumber: number;
  totalChunks: number;
  count: number;
  assets: any[];
}

export class ProgressiveDataLoader {
  private loadedChunks = new Map<string, DataChunk>();
  private metadata: ChunkMetadata | null = null;
  private baseUrl: string;

  constructor(baseUrl = '/data/chunks') {
    this.baseUrl = baseUrl;
  }

  /**
   * Load initial chunk and metadata for fast startup
   */
  async loadInitialData(dataType: string): Promise<{ metadata: ChunkMetadata; initialAssets: any[] }> {
    try {
      // Load metadata first
      const metadataResponse = await fetch(`${this.baseUrl}/${dataType}-metadata.json`);
      this.metadata = await metadataResponse.json();

      // Load first chunk for immediate display
      const firstChunk = await this.loadChunk(dataType, 0);
      
      console.log(`✅ Loaded initial ${dataType} data: ${firstChunk.assets.length} assets`);
      console.log(`📊 Total available: ${this.metadata.totalCount} assets in ${this.metadata.totalChunks} chunks`);

      return {
        metadata: this.metadata,
        initialAssets: firstChunk.assets
      };
    } catch (error) {
      console.error(`❌ Failed to load initial ${dataType} data:`, error);
      throw error;
    }
  }

  /**
   * Load specific chunk
   */
  async loadChunk(dataType: string, chunkNumber: number): Promise<DataChunk> {
    const cacheKey = `${dataType}-${chunkNumber}`;
    
    if (this.loadedChunks.has(cacheKey)) {
      return this.loadedChunks.get(cacheKey)!;
    }

    try {
      const response = await fetch(`${this.baseUrl}/${dataType}-chunk-${chunkNumber}.json`);
      const chunk: DataChunk = await response.json();
      
      this.loadedChunks.set(cacheKey, chunk);
      console.log(`📦 Loaded ${dataType} chunk ${chunkNumber}: ${chunk.count} assets`);
      
      return chunk;
    } catch (error) {
      console.error(`❌ Failed to load ${dataType} chunk ${chunkNumber}:`, error);
      throw error;
    }
  }

  /**
   * Load chunks progressively in background
   */
  async loadAllChunksProgressively(
    dataType: string, 
    onChunkLoaded?: (chunk: DataChunk, progress: number) => void
  ): Promise<any[]> {
    if (!this.metadata) {
      throw new Error('Metadata not loaded. Call loadInitialData first.');
    }

    const allAssets: any[] = [];
    
    // Load remaining chunks (skip chunk 0 as it's already loaded)
    for (let i = 1; i < this.metadata.totalChunks; i++) {
      try {
        const chunk = await this.loadChunk(dataType, i);
        allAssets.push(...chunk.assets);
        
        const progress = (i + 1) / this.metadata.totalChunks;
        if (onChunkLoaded) {
          onChunkLoaded(chunk, progress);
        }

        // Small delay to prevent blocking UI
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.warn(`⚠️ Failed to load chunk ${i}, continuing...`);
      }
    }

    console.log(`✅ Progressive loading complete: ${allAssets.length} total assets`);
    return allAssets;
  }

  /**
   * Get loading statistics
   */
  getStats() {
    return {
      metadata: this.metadata,
      loadedChunks: this.loadedChunks.size,
      totalChunks: this.metadata?.totalChunks || 0,
      loadProgress: this.metadata ? (this.loadedChunks.size / this.metadata.totalChunks) : 0
    };
  }
}