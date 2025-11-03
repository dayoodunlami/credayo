/**
 * SIMPLE OPTIMIZED CASCADE ANIMATION
 * Using MapTiler's native animation capabilities for better performance
 * Based on MapTiler SDK examples: animated images, custom layers, and line animation
 */

import type { Map as MapTilerMap } from '@maptiler/sdk';

export interface SimpleAnimationConfig {
  speed: 'slow' | 'normal' | 'fast';
  showRipples: boolean;
  showLines: boolean;
  rippleRadius: number; // Max ripple radius in pixels
  rippleDuration: number; // Duration in milliseconds
}

export interface CascadeImpact {
  assetId: string;
  sourceAssetId?: string;
  coordinates: [number, number];
  impactType: 'direct' | 'cascade' | 'potential' | 'cross-sector';
  timeToImpact: number;
}

export interface CascadeResult {
  initiatingAsset: { id: string; coordinates: [number, number] };
  timeline: CascadeImpact[];
}

/**
 * Simple optimized animation controller using MapTiler's native capabilities
 */
export class SimpleOptimizedAnimationController {
  private map: MapTilerMap;
  private config: SimpleAnimationConfig;
  private activeRipples: Set<string> = new Set();
  private isPlaying: boolean = false;

  constructor(map: MapTilerMap, config: Partial<SimpleAnimationConfig> = {}) {
    this.map = map;
    this.config = {
      speed: 'normal',
      showRipples: true,
      showLines: true,
      rippleRadius: 100, // 100 pixels max
      rippleDuration: 2000, // 2 seconds
      ...config
    };

    this.initializeAnimationLayers();
  }

  /**
   * Initialize animation layers using MapTiler's native capabilities
   */
  private initializeAnimationLayers(): void {
    try {
      // Ripple effects using circle layer with animated properties
      this.map.addSource('optimized-ripples', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      this.map.addLayer({
        id: 'optimized-ripples',
        type: 'circle',
        source: 'optimized-ripples',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'progress'],
            0, 5,
            1, ['get', 'maxRadius']
          ],
          'circle-color': ['get', 'color'],
          'circle-opacity': [
            'interpolate',
            ['linear'],
            ['get', 'progress'],
            0, 0.8,
            1, 0
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': ['get', 'color'],
          'circle-stroke-opacity': [
            'interpolate',
            ['linear'],
            ['get', 'progress'],
            0, 1,
            1, 0
          ]
        }
      });

      // Connection lines using line layer
      this.map.addSource('optimized-lines', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      this.map.addLayer({
        id: 'optimized-lines',
        type: 'line',
        source: 'optimized-lines',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 3,
          'line-opacity': ['get', 'opacity']
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        }
      });

      console.log('✅ Simple optimized animation layers initialized');

    } catch (error) {
      console.error('❌ Failed to initialize simple optimized animation layers:', error);
    }
  }

  /**
   * Play cascade animation with simple, smooth effects
   */
  async playCascade(result: CascadeResult): Promise<void> {
    this.isPlaying = true;
    console.log('🚀 Starting simple optimized cascade animation');

    // Speed multiplier
    const speedMultiplier = {
      slow: 0.5,
      normal: 1.0,
      fast: 2.0
    }[this.config.speed];

    try {
      // Initial ripple on trigger asset
      if (this.config.showRipples) {
        this.createRipple(
          result.initiatingAsset.coordinates,
          result.initiatingAsset.id,
          '#dc2626', // Red for trigger
          this.config.rippleDuration / speedMultiplier
        );
      }

      // Animate each impact in the timeline
      for (const impact of result.timeline) {
        if (!this.isPlaying) break;

        // Wait for impact time
        const delay = impact.timeToImpact / speedMultiplier;
        await this.sleep(delay);

        // Create ripple effect
        if (this.config.showRipples) {
          const color = this.getImpactColor(impact.impactType);
          this.createRipple(
            impact.coordinates,
            impact.assetId,
            color,
            this.config.rippleDuration / speedMultiplier
          );
        }

        // Create connection line
        if (this.config.showLines && impact.sourceAssetId) {
          const sourceCoords = this.getAssetCoordinates(impact.sourceAssetId, result);
          if (sourceCoords) {
            this.createConnectionLine(
              sourceCoords,
              impact.coordinates,
              this.getImpactColor(impact.impactType),
              800 / speedMultiplier
            );
          }
        }
      }

      console.log('✅ Simple optimized cascade animation completed');

    } catch (error) {
      console.error('❌ Error in simple optimized cascade animation:', error);
    } finally {
      this.isPlaying = false;
    }
  }

  /**
   * Create expanding ripple effect using MapTiler's native animation
   */
  private createRipple(
    coordinates: [number, number],
    assetId: string,
    color: string,
    duration: number
  ): void {
    const rippleId = `ripple-${assetId}-${Date.now()}`;
    this.activeRipples.add(rippleId);

    // Create initial ripple feature
    const rippleFeature = {
      type: 'Feature' as const,
      properties: {
        id: rippleId,
        progress: 0,
        maxRadius: this.config.rippleRadius,
        color
      },
      geometry: {
        type: 'Point' as const,
        coordinates
      }
    };

    // Add to source
    const source = this.map.getSource('optimized-ripples') as any;
    if (source) {
      const currentData = source._data || { type: 'FeatureCollection', features: [] };
      currentData.features.push(rippleFeature);
      source.setData(currentData);
    }

    // Animate the ripple using requestAnimationFrame
    const startTime = Date.now();
    const animate = () => {
      if (!this.activeRipples.has(rippleId)) return;

      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Update ripple progress
      if (source && source._data) {
        const feature = source._data.features.find((f: any) => f.properties.id === rippleId);
        if (feature) {
          feature.properties.progress = progress;
          source.setData(source._data);
        }
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Clean up completed ripple
        this.removeRipple(rippleId);
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Create connection line between two points
   */
  private createConnectionLine(
    from: [number, number],
    to: [number, number],
    color: string,
    duration: number
  ): void {
    const lineId = `line-${Date.now()}`;

    const lineFeature = {
      type: 'Feature' as const,
      properties: {
        id: lineId,
        color,
        opacity: 0.8
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: [from, to]
      }
    };

    // Add line
    const source = this.map.getSource('optimized-lines') as any;
    if (source) {
      const currentData = source._data || { type: 'FeatureCollection', features: [] };
      currentData.features.push(lineFeature);
      source.setData(currentData);
    }

    // Fade out line after duration
    setTimeout(() => {
      this.fadeOutLine(lineId, 500);
    }, duration);
  }

  /**
   * Fade out and remove connection line
   */
  private fadeOutLine(lineId: string, fadeTime: number): void {
    const source = this.map.getSource('optimized-lines') as any;
    if (!source || !source._data) return;

    const startTime = Date.now();
    const fade = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / fadeTime, 1);
      const opacity = 0.8 * (1 - progress);

      const feature = source._data.features.find((f: any) => f.properties.id === lineId);
      if (feature) {
        feature.properties.opacity = opacity;
        source.setData(source._data);
      }

      if (progress < 1) {
        requestAnimationFrame(fade);
      } else {
        // Remove line
        source._data.features = source._data.features.filter((f: any) => f.properties.id !== lineId);
        source.setData(source._data);
      }
    };

    requestAnimationFrame(fade);
  }

  /**
   * Remove completed ripple
   */
  private removeRipple(rippleId: string): void {
    this.activeRipples.delete(rippleId);

    const source = this.map.getSource('optimized-ripples') as any;
    if (source && source._data) {
      source._data.features = source._data.features.filter((f: any) => f.properties.id !== rippleId);
      source.setData(source._data);
    }
  }

  /**
   * Get color for impact type
   */
  private getImpactColor(impactType: string): string {
    switch (impactType) {
      case 'direct': return '#dc2626';
      case 'cascade': return '#f97316';
      case 'potential': return '#fbbf24';
      case 'cross-sector': return '#a855f7';
      default: return '#6b7280';
    }
  }

  /**
   * Get asset coordinates from result
   */
  private getAssetCoordinates(assetId: string, result: CascadeResult): [number, number] | null {
    if (assetId === result.initiatingAsset.id) {
      return result.initiatingAsset.coordinates;
    }

    const impact = result.timeline.find(i => i.assetId === assetId);
    return impact ? impact.coordinates : null;
  }

  /**
   * Stop all animations
   */
  stop(): void {
    this.isPlaying = false;
    this.activeRipples.clear();
  }

  /**
   * Reset and clear all animations
   */
  reset(): void {
    this.stop();

    // Clear all sources
    const rippleSource = this.map.getSource('optimized-ripples') as any;
    if (rippleSource) {
      rippleSource.setData({ type: 'FeatureCollection', features: [] });
    }

    const lineSource = this.map.getSource('optimized-lines') as any;
    if (lineSource) {
      lineSource.setData({ type: 'FeatureCollection', features: [] });
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SimpleAnimationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}