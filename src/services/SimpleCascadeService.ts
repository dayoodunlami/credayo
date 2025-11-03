/**
 * SIMPLE CASCADE SERVICE
 * 
 * Uses pre-computed cascade relationships stored directly in asset data.
 * No real-time computation needed - just lookup relationships.
 */

export interface SimpleCascadeAsset {
  id: string;
  name: string;
  type: string;
  coordinates: [number, number];
  criticality: 'critical' | 'high' | 'medium' | 'low';
  
  // Pre-computed cascade relationships (stored in data files)
  cascadeTargets: {
    assetId: string;
    impactType: 'direct' | 'cascade' | 'potential' | 'cross-sector';
    probability: number;
    delayMs: number;
    distance: number;
  }[];
}

export interface SimpleCascadeResult {
  triggerId: string;
  impacts: {
    assetId: string;
    impactType: 'direct' | 'cascade' | 'potential' | 'cross-sector';
    probability: number;
    delayMs: number;
    reason: string;
  }[];
  totalAffected: number;
  timeline: {
    time: number;
    assetId: string;
    impactType: string;
  }[];
}

export class SimpleCascadeService {
  private assets: Map<string, SimpleCascadeAsset> = new Map();
  private isLoaded: boolean = false;

  /**
   * Load assets with pre-computed cascade relationships
   */
  async loadAssets(): Promise<void> {
    try {
      console.log('📂 Loading assets with pre-computed cascades...');
      
      // Load from existing data files
      const response = await fetch('/data/london-power-sample.json');
      const data = await response.json();
      
      // Convert existing assets to include cascade relationships
      const rawAssets = data.assets || data.features || data;
      if (!Array.isArray(rawAssets)) {
        throw new Error('Invalid data format - expected array of assets');
      }
      
      const assets = this.convertToSimpleCascadeAssets(rawAssets);
      
      // Store in map for fast lookup
      assets.forEach(asset => {
        this.assets.set(asset.id, asset);
      });
      
      this.isLoaded = true;
      console.log(`✅ Loaded ${assets.length} assets with cascade relationships`);
      
    } catch (error) {
      console.error('❌ Failed to load cascade assets:', error);
    }
  }

  /**
   * Convert existing asset data to include simple cascade relationships
   */
  private convertToSimpleCascadeAssets(inputData: any[]): SimpleCascadeAsset[] {
    const assets: SimpleCascadeAsset[] = [];
    
    // Handle different data formats
    if (!Array.isArray(inputData)) {
      console.warn('⚠️ Expected array but got:', typeof inputData);
      return assets;
    }
    
    inputData.forEach(item => {
      // Handle both GeoJSON features and direct asset objects
      const isGeoJSON = item.geometry && item.properties;
      
      const asset: SimpleCascadeAsset = {
        id: isGeoJSON ? (item.properties?.id || item.id) : item.id,
        name: isGeoJSON ? (item.properties?.name || `${item.properties?.type} Asset`) : (item.name || `${item.type} Asset`),
        type: isGeoJSON ? (item.properties?.type || 'power') : (item.type || 'power'),
        coordinates: isGeoJSON ? (item.geometry?.coordinates || [0, 0]) : (item.coordinates || [0, 0]),
        criticality: isGeoJSON ? (item.properties?.criticality || 'medium') : (item.criticality || 'medium'),
        cascadeTargets: []
      };
      
      assets.push(asset);
    });
    
    // Now compute cascade relationships ONCE during loading
    assets.forEach(sourceAsset => {
      const cascadeRadius = 5000; // 5km
      
      assets.forEach(targetAsset => {
        if (sourceAsset.id === targetAsset.id) return;
        
        const distance = this.calculateDistance(
          sourceAsset.coordinates,
          targetAsset.coordinates
        );
        
        if (distance <= cascadeRadius) {
          // Determine impact type and probability
          let impactType: 'direct' | 'cascade' | 'potential' | 'cross-sector' = 'cascade';
          let baseProbability = 0.5;
          
          if (distance < 1000) {
            impactType = 'direct';
            baseProbability = 0.8;
          } else if (sourceAsset.type !== targetAsset.type) {
            impactType = 'cross-sector';
            baseProbability = 0.4;
          } else if (distance > 3000) {
            impactType = 'potential';
            baseProbability = 0.3;
          }
          
          // Adjust probability based on criticality
          const criticalityMultiplier = {
            'critical': 1.2,
            'high': 1.0,
            'medium': 0.8,
            'low': 0.6
          }[targetAsset.criticality];
          
          const finalProbability = Math.min(1.0, baseProbability * criticalityMultiplier);
          
          // Only include if probability is significant
          if (finalProbability > 0.1) {
            sourceAsset.cascadeTargets.push({
              assetId: targetAsset.id,
              impactType,
              probability: finalProbability,
              delayMs: distance < 1000 ? 500 : distance < 2000 ? 1000 : 2000,
              distance
            });
          }
        }
      });
    });
    
    return assets;
  }

  /**
   * Get cascade result for an asset (INSTANT - just lookup)
   */
  getCascadeResult(triggerId: string): SimpleCascadeResult | null {
    if (!this.isLoaded) {
      console.warn('⚠️ Assets not loaded yet');
      return null;
    }
    
    const triggerAsset = this.assets.get(triggerId);
    if (!triggerAsset) {
      console.warn(`⚠️ Asset ${triggerId} not found`);
      return null;
    }
    
    // Build cascade result from pre-computed relationships
    const impacts = triggerAsset.cascadeTargets.map(target => ({
      assetId: target.assetId,
      impactType: target.impactType,
      probability: target.probability,
      delayMs: target.delayMs,
      reason: `${target.impactType} impact (${Math.round(target.distance)}m away)`
    }));
    
    // Create timeline
    const timeline = impacts
      .map(impact => ({
        time: impact.delayMs,
        assetId: impact.assetId,
        impactType: impact.impactType
      }))
      .sort((a, b) => a.time - b.time);
    
    console.log(`⚡ Retrieved cascade for ${triggerId}: ${impacts.length} impacts`);
    
    return {
      triggerId,
      impacts,
      totalAffected: impacts.length + 1,
      timeline
    };
  }

  /**
   * Get all available asset IDs
   */
  getAvailableAssets(): string[] {
    return Array.from(this.assets.keys());
  }

  /**
   * Get asset by ID
   */
  getAsset(assetId: string): SimpleCascadeAsset | undefined {
    return this.assets.get(assetId);
  }

  /**
   * Calculate distance between two coordinates
   */
  private calculateDistance(coord1: [number, number], coord2: [number, number]): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (coord2[1] - coord1[1]) * Math.PI / 180;
    const dLon = (coord2[0] - coord1[0]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(coord1[1] * Math.PI / 180) * Math.cos(coord2[1] * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isLoaded;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalAssets: number;
    totalCascadeRelationships: number;
    averageTargetsPerAsset: number;
  } {
    const totalAssets = this.assets.size;
    const totalRelationships = Array.from(this.assets.values())
      .reduce((sum, asset) => sum + asset.cascadeTargets.length, 0);
    
    return {
      totalAssets,
      totalCascadeRelationships: totalRelationships,
      averageTargetsPerAsset: Math.round(totalRelationships / totalAssets)
    };
  }
}