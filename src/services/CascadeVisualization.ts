// Cascade visualization system adapted for our MapTiler SDK setup
import type { Map as MapTilerMap } from '@maptiler/sdk';
import type { CascadeState, AssetState, Asset } from './CascadeSimulator';

export interface AnimationConfig {
  speed: 'slow' | 'normal' | 'fast';
  showLines: boolean;
  showCircles: boolean;
  showLabels: boolean;
  colorScheme: {
    trigger: string;
    direct: string;
    cascade: string;
    potential: string;
    degraded: string;
  };
}

export interface VisualEffect {
  id: string;
  type: 'pulse' | 'ripple' | 'line' | 'halo' | 'expanding-circle';
  duration: number;
  cleanup: () => void;
}

export class CascadeVisualizationController {
  private map: MapTilerMap;
  private config: AnimationConfig;
  private activeEffects: Map<string, VisualEffect> = new Map();
  private animationFrameId: number | null = null;
  private cascadeState: CascadeState | null = null;
  private allAssets: Asset[] = [];

  constructor(map: MapTilerMap, config?: Partial<AnimationConfig>) {
    this.map = map;
    this.config = {
      speed: 'normal',
      showLines: true,
      showCircles: true,
      showLabels: false,
      colorScheme: {
        trigger: '#dc2626', // Red
        direct: '#ea580c', // Orange
        cascade: '#f59e0b', // Amber
        potential: '#84cc16', // Lime
        degraded: '#6b7280' // Gray
      },
      ...config
    };
    
    this.initializeVisualizationLayers();
  }

  /**
   * Initialize map layers for cascade visualization
   */
  private initializeVisualizationLayers(): void {
    try {
      // Cascade ripple effects layer
      this.map.addSource('cascade-ripples', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      this.map.addLayer({
        id: 'cascade-ripples',
        type: 'circle',
        source: 'cascade-ripples',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'radius'],
            0, 0,
            1000, 50
          ],
          'circle-color': ['get', 'color'],
          'circle-opacity': ['get', 'opacity'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 0.8
        }
      });

      // Asset state visualization layer
      this.map.addSource('cascade-assets', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      this.map.addLayer({
        id: 'cascade-assets',
        type: 'circle',
        source: 'cascade-assets',
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'status'], 'trigger'], 16,
            ['==', ['get', 'status'], 'failed'], 12,
            ['==', ['get', 'status'], 'degraded'], 10,
            8
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'status'], 'trigger'], this.config.colorScheme.trigger,
            ['==', ['get', 'status'], 'failed'], this.config.colorScheme.direct,
            ['==', ['get', 'status'], 'degraded'], this.config.colorScheme.degraded,
            this.config.colorScheme.cascade
          ],
          'circle-opacity': 0.8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 1
        }
      });

      // Connection lines layer
      this.map.addSource('cascade-connections', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      this.map.addLayer({
        id: 'cascade-connections',
        type: 'line',
        source: 'cascade-connections',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'width'],
          'line-opacity': ['get', 'opacity']
        }
      });

      console.log('✅ Cascade visualization layers initialized');

    } catch (error) {
      console.error('❌ Failed to initialize cascade visualization layers:', error);
    }
  }

  /**
   * Update visualization with current cascade state
   */
  updateVisualization(cascadeState: CascadeState | null, allAssets: Asset[]): void {
    this.cascadeState = cascadeState;
    this.allAssets = allAssets;

    if (!cascadeState || !cascadeState.isActive) {
      this.clearVisualization();
      return;
    }

    this.updateAssetVisualization();
    this.updateRippleEffects();
    
    if (this.config.showLines) {
      this.updateConnectionLines();
    }

    // Start animation loop if not already running
    if (!this.animationFrameId) {
      this.startAnimationLoop();
    }
  }

  /**
   * Update asset visualization based on their states
   */
  private updateAssetVisualization(): void {
    if (!this.cascadeState) return;

    const features = [];

    for (const [assetId, assetState] of this.cascadeState.affectedAssets) {
      const asset = this.allAssets.find(a => a.id === assetId);
      if (!asset) continue;

      const feature = {
        type: 'Feature',
        properties: {
          id: assetId,
          name: asset.name,
          status: assetState.failureReason === 'trigger' ? 'trigger' : assetState.status,
          criticality: asset.criticality,
          impactTime: assetState.impactTime,
          downstreamCount: assetState.downstreamCount
        },
        geometry: {
          type: 'Point',
          coordinates: asset.coordinates
        }
      };

      features.push(feature);
    }

    // Update the source
    const source = this.map.getSource('cascade-assets') as any;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features
      });
    }
  }

  /**
   * Create expanding ripple effects for newly affected assets
   */
  private updateRippleEffects(): void {
    if (!this.cascadeState) return;

    const rippleFeatures = [];
    const currentTime = Date.now();

    for (const [assetId, assetState] of this.cascadeState.affectedAssets) {
      const asset = this.allAssets.find(a => a.id === assetId);
      if (!asset) continue;

      // Create ripple effect for recent failures
      const timeSinceImpact = (currentTime - (assetState.impactTime * 1000));
      const rippleDuration = 3000; // 3 seconds

      if (timeSinceImpact < rippleDuration) {
        const progress = timeSinceImpact / rippleDuration;
        const radius = progress * 1000; // Max 1km ripple
        const opacity = Math.max(0, 1 - progress);

        const rippleFeature = {
          type: 'Feature',
          properties: {
            id: `ripple-${assetId}`,
            radius,
            opacity,
            color: this.getStatusColor(assetState.status)
          },
          geometry: {
            type: 'Point',
            coordinates: asset.coordinates
          }
        };

        rippleFeatures.push(rippleFeature);
      }
    }

    // Update ripples source
    const source = this.map.getSource('cascade-ripples') as any;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: rippleFeatures
      });
    }
  }

  /**
   * Update connection lines between dependent assets
   */
  private updateConnectionLines(): void {
    if (!this.cascadeState) return;

    const connectionFeatures = [];

    for (const [assetId, assetState] of this.cascadeState.affectedAssets) {
      const asset = this.allAssets.find(a => a.id === assetId);
      if (!asset) continue;

      // Draw lines to dependent assets that are also affected
      for (const dependentId of asset.dependents) {
        if (this.cascadeState.affectedAssets.has(dependentId)) {
          const dependentAsset = this.allAssets.find(a => a.id === dependentId);
          if (!dependentAsset) continue;

          const connectionFeature = {
            type: 'Feature',
            properties: {
              id: `connection-${assetId}-${dependentId}`,
              color: this.config.colorScheme.cascade,
              width: 2,
              opacity: 0.6
            },
            geometry: {
              type: 'LineString',
              coordinates: [asset.coordinates, dependentAsset.coordinates]
            }
          };

          connectionFeatures.push(connectionFeature);
        }
      }
    }

    // Update connections source
    const source = this.map.getSource('cascade-connections') as any;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: connectionFeatures
      });
    }
  }

  /**
   * Get color for asset status
   */
  private getStatusColor(status: AssetState['status']): string {
    switch (status) {
      case 'failed':
        return this.config.colorScheme.direct;
      case 'degraded':
        return this.config.colorScheme.degraded;
      case 'offline':
        return this.config.colorScheme.cascade;
      default:
        return this.config.colorScheme.potential;
    }
  }

  /**
   * Start animation loop for dynamic effects
   */
  private startAnimationLoop(): void {
    const animate = () => {
      if (this.cascadeState && this.cascadeState.isActive) {
        this.updateRippleEffects();
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.animationFrameId = null;
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Clear all cascade visualization
   */
  clearVisualization(): void {
    // Stop animation loop
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Clear all sources
    const sources = ['cascade-assets', 'cascade-ripples', 'cascade-connections'];
    
    for (const sourceId of sources) {
      const source = this.map.getSource(sourceId) as any;
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features: []
        });
      }
    }

    // Clear active effects
    for (const effect of this.activeEffects.values()) {
      effect.cleanup();
    }
    this.activeEffects.clear();

    console.log('🧹 Cascade visualization cleared');
  }

  /**
   * Add custom visual effect
   */
  addEffect(effect: VisualEffect): void {
    this.activeEffects.set(effect.id, effect);
    
    // Auto-cleanup after duration
    setTimeout(() => {
      if (this.activeEffects.has(effect.id)) {
        effect.cleanup();
        this.activeEffects.delete(effect.id);
      }
    }, effect.duration);
  }

  /**
   * Update animation configuration
   */
  updateConfig(newConfig: Partial<AnimationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reapply visualization with new config
    if (this.cascadeState) {
      this.updateVisualization(this.cascadeState, this.allAssets);
    }
  }

  /**
   * Create expanding circle effect for cascade radius
   */
  createRadiusVisualization(center: [number, number], radiusKm: number): void {
    const circleId = 'cascade-radius-circle';
    
    try {
      // Remove existing radius circle
      if (this.map.getLayer(circleId)) {
        this.map.removeLayer(circleId);
      }
      if (this.map.getSource(circleId)) {
        this.map.removeSource(circleId);
      }

      // Add radius circle
      this.map.addSource(circleId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Point',
            coordinates: center
          }
        }
      });

      this.map.addLayer({
        id: circleId,
        type: 'circle',
        source: circleId,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, radiusKm * 0.1,
            12, radiusKm * 0.5,
            16, radiusKm * 2
          ],
          'circle-color': this.config.colorScheme.potential,
          'circle-opacity': 0.1,
          'circle-stroke-width': 2,
          'circle-stroke-color': this.config.colorScheme.potential,
          'circle-stroke-opacity': 0.5
        }
      });

    } catch (error) {
      console.error('❌ Failed to create radius visualization:', error);
    }
  }

  /**
   * Remove radius visualization
   */
  removeRadiusVisualization(): void {
    const circleId = 'cascade-radius-circle';
    
    try {
      if (this.map.getLayer(circleId)) {
        this.map.removeLayer(circleId);
      }
      if (this.map.getSource(circleId)) {
        this.map.removeSource(circleId);
      }
    } catch (error) {
      console.error('❌ Failed to remove radius visualization:', error);
    }
  }

  /**
   * Cleanup all visualization resources
   */
  destroy(): void {
    this.clearVisualization();
    this.removeRadiusVisualization();

    // Remove all layers and sources
    const layerIds = ['cascade-assets', 'cascade-ripples', 'cascade-connections'];
    
    for (const layerId of layerIds) {
      try {
        if (this.map.getLayer(layerId)) {
          this.map.removeLayer(layerId);
        }
        if (this.map.getSource(layerId)) {
          this.map.removeSource(layerId);
        }
      } catch (error) {
        console.warn(`Failed to remove layer ${layerId}:`, error);
      }
    }

    console.log('🧹 Cascade visualization controller destroyed');
  }
}