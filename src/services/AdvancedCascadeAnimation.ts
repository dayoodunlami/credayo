/**
 * ADVANCED CASCADE ANIMATION CONTROLLER
 * Based on reference implementation with multi-stage timing and visual effects
 */

import type { Map as MapTilerMap } from '@maptiler/sdk';
import type { AdvancedCascadeResult, CascadeImpact } from './AdvancedCascadeEngine';

// Import common interfaces from OptimizedCascadeAnimation
import type { ICascadeAnimationController, PerformanceMetrics, AnimationConfig } from './OptimizedCascadeAnimation';

export interface AdvancedAnimationConfig {
    speed: 'slow' | 'normal' | 'fast';
    showLines: boolean;
    showCircles: boolean;
    showLabels: boolean;
    colorScheme: {
        direct: string;
        cascade: string;
        potential: string;
        crossSector: string;
    };
}

export class AdvancedCascadeAnimationController implements ICascadeAnimationController {
    private map: MapTilerMap;
    private config: AdvancedAnimationConfig;
    private animationFrameId?: number;
    private currentTime: number = 0;
    private isPlaying: boolean = false;
    private activeEffects: Map<string, any> = new Map();
    private assetCoordinates: Map<string, [number, number]> = new Map();
    private performanceMetrics: PerformanceMetrics;

    constructor(map: MapTilerMap, config: Partial<AdvancedAnimationConfig> = {}) {
        this.map = map;
        this.config = {
            speed: 'normal',
            showLines: true,
            showCircles: true,
            showLabels: true,
            colorScheme: {
                direct: '#dc2626',
                cascade: '#f97316',
                potential: '#fbbf24',
                crossSector: '#a855f7'
            },
            ...config
        };

        this.performanceMetrics = {
            fps: 60,
            totalImpacts: 0,
            concurrentAnimations: 0,
            memoryUsage: 0,
            animationDuration: 0
        };

        this.initializeAnimationLayers();
    }

    /**
     * Initialize animation layers
     */
    private initializeAnimationLayers(): void {
        try {
            // Clear existing layers first to prevent conflicts
            this.clearAnimationLayers();

            // Expanding circles layer
            if (!this.map.getSource('cascade-circles')) {
                this.map.addSource('cascade-circles', {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] }
                });
            }

            if (!this.map.getLayer('cascade-circles')) {
                this.map.addLayer({
                    id: 'cascade-circles',
                    type: 'fill',
                    source: 'cascade-circles',
                    paint: {
                        'fill-color': ['get', 'color'],
                        'fill-opacity': ['get', 'opacity']
                    }
                });
            }

            // Connection lines layer
            if (!this.map.getSource('cascade-lines')) {
                this.map.addSource('cascade-lines', {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] }
                });
            }

            if (!this.map.getLayer('cascade-lines')) {
                this.map.addLayer({
                    id: 'cascade-lines',
                    type: 'line',
                    source: 'cascade-lines',
                    paint: {
                        'line-color': ['get', 'color'],
                        'line-width': ['get', 'width'],
                        'line-opacity': ['get', 'opacity']
                    },
                    layout: {
                        'line-cap': 'round',
                        'line-join': 'round'
                    }
                });
            }

            // Ripple effects layer
            if (!this.map.getSource('cascade-ripples')) {
                this.map.addSource('cascade-ripples', {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] }
                });
            }

            if (!this.map.getLayer('cascade-ripples')) {
                this.map.addLayer({
                    id: 'cascade-ripples',
                    type: 'circle',
                    source: 'cascade-ripples',
                    paint: {
                        'circle-radius': ['get', 'radius'],
                        'circle-color': ['get', 'color'],
                        'circle-opacity': ['get', 'opacity'],
                        'circle-stroke-width': 2,
                        'circle-stroke-color': '#ffffff',
                        'circle-stroke-opacity': 0.8
                    }
                });
            }

            console.log('✅ Advanced cascade animation layers initialized');

        } catch (error) {
            console.error('❌ Failed to initialize animation layers:', error);
        }
    }

    /**
     * Clear animation layers to prevent conflicts
     */
    private clearAnimationLayers(): void {
        const layerIds = ['cascade-circles', 'cascade-lines', 'cascade-ripples'];
        
        layerIds.forEach(layerId => {
            try {
                if (this.map.getLayer(layerId)) {
                    this.map.removeLayer(layerId);
                }
                if (this.map.getSource(layerId)) {
                    this.map.removeSource(layerId);
                }
            } catch (error) {
                // Layer might not exist, ignore
            }
        });
    }

    /**
     * Main animation loop - plays cascade animation over time
     */
    async playCascade(result: AdvancedCascadeResult): Promise<void> {
        const startTime = Date.now();
        this.isPlaying = true;
        this.currentTime = 0;
        
        // Update performance metrics
        this.performanceMetrics.totalImpacts = result.timeline.length;

        // Speed multiplier
        const speedMultiplier = {
            slow: 0.5,
            normal: 1.0,
            fast: 2.0
        }[this.config.speed];

        // Sort impacts by time
        const sortedImpacts = [...result.timeline];

        try {
            // Initial pulse on failed asset
            await this.animateInitialFailure(result.initiatingAsset);

            // Animate each impact in sequence
            for (const impact of sortedImpacts) {
                if (!this.isPlaying) break;

                // Wait until impact time (scaled by speed)
                const delay = (impact.timeToImpact - this.currentTime) / speedMultiplier * 1000;
                if (delay > 0) {
                    await this.sleep(delay);
                }

                this.currentTime = impact.timeToImpact;

                // Animate based on impact type
                switch (impact.impactType) {
                    case 'direct':
                        await this.animateDirectImpact(impact);
                        break;
                    case 'cascade':
                        await this.animateCascadeImpact(impact);
                        break;
                    case 'potential':
                        await this.animatePotentialImpact(impact);
                        break;
                    case 'cross-sector':
                        await this.animateCrossSectorImpact(impact);
                        break;
                }
            }
        } catch (error) {
            console.error('Error during cascade animation:', error);
        } finally {
            this.isPlaying = false;
            this.performanceMetrics.animationDuration = Date.now() - startTime;
        }
    }

    /**
     * Animate initial failure with expanding circle
     */
    private async animateInitialFailure(asset: any): Promise<void> {
        // Create expanding circle
        this.addExpandingCircle(
            asset.coordinates,
            {
                color: this.config.colorScheme.direct,
                maxRadius: 1000, // meters
                duration: 800 // ms
            }
        );

        // Pulse the asset itself
        this.pulseAsset(asset.id, this.config.colorScheme.direct, 3);

        await this.sleep(800);
    }

    /**
     * Animate direct impact with line + pulse
     */
    private async animateDirectImpact(impact: CascadeImpact): Promise<void> {
        // Show connection line (if enabled)
        if (this.config.showLines) {
            await this.animateLine(
                this.getAssetCoordinates(this.getCurrentSourceId(impact)),
                this.getAssetCoordinates(impact.assetId),
                this.config.colorScheme.direct,
                400,
                'solid'
            );
        }

        // Pulse asset
        this.pulseAsset(impact.assetId, this.config.colorScheme.direct, 2);

        // Set feature state to failed
        this.setAssetState(impact.assetId, 'failed', true);
        this.setAssetState(impact.assetId, 'fill-color', this.config.colorScheme.direct);

        await this.sleep(300);
    }

    /**
     * Animate cascade impact with ripple + dashed line
     */
    private async animateCascadeImpact(impact: CascadeImpact): Promise<void> {
        const assetCoords = this.getAssetCoordinates(impact.assetId);

        // Show ripple effect
        if (this.config.showCircles) {
            this.addRippleEffect(assetCoords, this.config.colorScheme.cascade);
        }

        // Show dashed connection line
        if (this.config.showLines) {
            await this.animateLine(
                this.getAssetCoordinates(this.getCurrentSourceId(impact)),
                assetCoords,
                this.config.colorScheme.cascade,
                500,
                'dashed'
            );
        }

        // Pulse asset
        this.pulseAsset(impact.assetId, this.config.colorScheme.cascade, 2);

        // Set feature state
        this.setAssetState(impact.assetId, 'cascaded', true);
        this.setAssetState(impact.assetId, 'fill-color', this.config.colorScheme.cascade);

        await this.sleep(400);
    }

    /**
     * Animate potential impact with transparent halo
     */
    private async animatePotentialImpact(impact: CascadeImpact): Promise<void> {
        // Add transparent halo
        this.addHalo(impact.assetId, {
            color: this.config.colorScheme.potential,
            opacity: 0.4 * impact.probability,
            radius: 15
        });

        // Set feature state
        this.setAssetState(impact.assetId, 'potential', true);
        this.setAssetState(impact.assetId, 'probability', impact.probability);

        await this.sleep(200);
    }

    /**
     * Animate cross-sector impact with special effects
     */
    private async animateCrossSectorImpact(impact: CascadeImpact): Promise<void> {
        const assetCoords = this.getAssetCoordinates(impact.assetId);

        // Special cross-sector ripple (different color)
        if (this.config.showCircles) {
            this.addRippleEffect(assetCoords, this.config.colorScheme.crossSector);
        }

        // Dotted line for cross-sector
        if (this.config.showLines) {
            await this.animateLine(
                this.getAssetCoordinates(this.getCurrentSourceId(impact)),
                assetCoords,
                this.config.colorScheme.crossSector,
                600,
                'dotted'
            );
        }

        // Pulse with cross-sector color
        this.pulseAsset(impact.assetId, this.config.colorScheme.crossSector, 2);

        // Set feature state
        this.setAssetState(impact.assetId, 'cross-sector', true);
        this.setAssetState(impact.assetId, 'fill-color', this.config.colorScheme.crossSector);

        await this.sleep(500);
    }

    /**
     * Create expanding circle animation
     */
    private addExpandingCircle(
        center: [number, number],
        options: { color: string; maxRadius: number; duration: number }
    ): void {
        const startTime = Date.now();
        const effectId = `circle-${startTime}`;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / options.duration, 1);
            const currentRadius = options.maxRadius * progress;
            const opacity = 0.4 * (1 - progress); // Fade out as it expands

            const circle = this.createCirclePolygon(center, currentRadius);

            const source = this.map.getSource('cascade-circles') as any;
            if (source) {
                const currentData = source._data || { type: 'FeatureCollection', features: [] };
                const newFeature = {
                    type: 'Feature',
                    properties: {
                        id: effectId,
                        color: options.color,
                        opacity
                    },
                    geometry: circle.geometry
                };

                // Update or add feature
                const existingIndex = currentData.features.findIndex((f: any) => f.properties.id === effectId);
                if (existingIndex >= 0) {
                    currentData.features[existingIndex] = newFeature;
                } else {
                    currentData.features.push(newFeature);
                }

                source.setData(currentData);
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Cleanup
                setTimeout(() => this.removeEffect(effectId, 'cascade-circles'), 100);
            }
        };

        animate();
    }

    /**
     * Animate line from point A to B
     */
    private async animateLine(
        from: [number, number],
        to: [number, number],
        color: string,
        duration: number,
        style: 'solid' | 'dashed' | 'dotted' = 'solid'
    ): Promise<void> {
        const effectId = `line-${Date.now()}`;

        // Create line
        const line = {
            type: 'Feature',
            properties: {
                id: effectId,
                color,
                width: style === 'solid' ? 4 : 3,
                opacity: 0.9
            },
            geometry: {
                type: 'LineString',
                coordinates: [from, to]
            }
        };

        const source = this.map.getSource('cascade-lines') as any;
        if (source) {
            const currentData = source._data || { type: 'FeatureCollection', features: [] };
            currentData.features.push(line);
            source.setData(currentData);
        }

        await this.sleep(duration);

        // Fade out and remove
        this.fadeOutEffect(effectId, 'cascade-lines', 300);
    }

    /**
     * Pulse an asset (change size/opacity)
     */
    private pulseAsset(assetId: string, color: string, pulses: number): void {
        let pulseCount = 0;

        const pulse = () => {
            if (pulseCount >= pulses) return;

            // Pulse animation
            this.setAssetState(assetId, 'pulse', true);
            this.setAssetState(assetId, 'pulse-color', color);

            setTimeout(() => {
                this.setAssetState(assetId, 'pulse', false);
                pulseCount++;
                if (pulseCount < pulses) {
                    setTimeout(pulse, 300);
                }
            }, 200);
        };

        pulse();
    }

    /**
     * Add ripple effect (multiple expanding circles)
     */
    private addRippleEffect(center: [number, number], color: string): void {
        const rippleCount = 3;
        const delayBetween = 200; // ms

        for (let i = 0; i < rippleCount; i++) {
            setTimeout(() => {
                this.addExpandingCircle(center, {
                    color,
                    maxRadius: 600 + (i * 100),
                    duration: 800 + (i * 100)
                });
            }, i * delayBetween);
        }
    }

    /**
     * Add persistent halo around asset
     */
    private addHalo(assetId: string, options: { color: string; opacity: number; radius: number }): void {
        // Set feature state for halo rendering
        this.setAssetState(assetId, 'halo', true);
        this.setAssetState(assetId, 'halo-color', options.color);
        this.setAssetState(assetId, 'halo-opacity', options.opacity);
        this.setAssetState(assetId, 'halo-radius', options.radius);
    }

    /**
     * Set feature state for an asset
     */
    private setAssetState(assetId: string, key: string, value: any): void {
        try {
            // Try different layer names that might contain the asset
            const layerNames = ['power-substations', 'transport-hubs', 'telecom-towers', 'water-treatment'];

            for (const layerName of layerNames) {
                try {
                    this.map.setFeatureState(
                        { source: layerName, id: assetId },
                        { [key]: value }
                    );
                } catch (e) {
                    // Layer might not exist or asset not in this layer
                }
            }
        } catch (error) {
            console.warn(`Could not set feature state for ${assetId}:`, error);
        }
    }

    /**
     * Create circle polygon for given center and radius
     */
    private createCirclePolygon(center: [number, number], radiusMeters: number): any {
        const points = 64;
        const coordinates: [number, number][] = [];
        const earthRadius = 6371000; // meters

        for (let i = 0; i <= points; i++) {
            const angle = (i / points) * 2 * Math.PI;
            const dx = radiusMeters * Math.cos(angle);
            const dy = radiusMeters * Math.sin(angle);

            const lat = center[1] + (dy / earthRadius) * (180 / Math.PI);
            const lon = center[0] + (dx / earthRadius) * (180 / Math.PI) / Math.cos(center[1] * Math.PI / 180);

            coordinates.push([lon, lat]);
        }

        return {
            type: 'Polygon',
            coordinates: [coordinates]
        };
    }

    /**
     * Utility methods
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private getAssetCoordinates(assetId: string): [number, number] {
        // Get coordinates from stored asset coordinates
        const coordinates = this.assetCoordinates.get(assetId);
        if (coordinates) {
            return coordinates;
        }
        
        // Fallback: try to get from map features (placeholder implementation)
        console.warn(`No coordinates found for asset ${assetId}, using fallback`);
        return [0, 0];
    }

    private getCurrentSourceId(impact: CascadeImpact): string {
        // Extract source asset ID from impact reason or use sourceAssetId if available
        if (impact.sourceAssetId) {
            return impact.sourceAssetId;
        }
        // Fallback: extract from reason or maintain in state
        return 'source-asset-id';
    }

    private removeEffect(effectId: string, sourceId: string): void {
        const source = this.map.getSource(sourceId) as any;
        if (source && source._data) {
            source._data.features = source._data.features.filter((f: any) => f.properties.id !== effectId);
            source.setData(source._data);
        }
    }

    private fadeOutEffect(effectId: string, sourceId: string, duration: number): void {
        const startTime = Date.now();

        const fade = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const opacity = 1 - progress;

            const source = this.map.getSource(sourceId) as any;
            if (source && source._data) {
                const feature = source._data.features.find((f: any) => f.properties.id === effectId);
                if (feature) {
                    feature.properties.opacity = opacity;
                    source.setData(source._data);
                }
            }

            if (progress < 1) {
                requestAnimationFrame(fade);
            } else {
                this.removeEffect(effectId, sourceId);
            }
        };

        fade();
    }

    /**
     * Stop animation
     */
    stop(): void {
        this.isPlaying = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }

    /**
     * Reset all cascade visuals
     */
    reset(): void {
        console.log('🧹 Resetting advanced cascade animation...');
        
        this.stop();

        // Clear all animation sources
        const sources = ['cascade-circles', 'cascade-lines', 'cascade-ripples'];

        for (const sourceId of sources) {
            const source = this.map.getSource(sourceId) as any;
            if (source) {
                source.setData({ type: 'FeatureCollection', features: [] });
            }
        }

        // Clear all active effects
        this.activeEffects.clear();

        // Reset all asset feature states
        this.resetAllAssetStates();

        // Cancel any pending animation frames
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = undefined;
        }

        // Reset timing
        this.currentTime = 0;
        this.isPlaying = false;

        console.log('✅ Advanced cascade animation reset complete');
    }

    /**
     * Reset all asset feature states
     */
    private resetAllAssetStates(): void {
        const layerNames = ['power-substations', 'transport-hubs', 'telecom-towers', 'water-treatment'];
        const stateKeys = ['failed', 'cascaded', 'potential', 'cross-sector', 'pulse', 'pulse-color', 'halo', 'halo-color', 'halo-opacity', 'halo-radius', 'fill-color', 'probability'];

        layerNames.forEach(layerName => {
            try {
                // Get all features in the layer
                const features = this.map.querySourceFeatures(layerName);
                features.forEach(feature => {
                    if (feature.id) {
                        // Reset all state properties
                        const resetState: any = {};
                        stateKeys.forEach(key => {
                            resetState[key] = false;
                        });
                        
                        this.map.setFeatureState(
                            { source: layerName, id: feature.id },
                            resetState
                        );
                    }
                });
            } catch (error) {
                // Layer might not exist or have features
            }
        });
    }

    /**
     * Update configuration - implements ICascadeAnimationController
     */
    updateConfig(newConfig: Partial<AnimationConfig>): void {
        // Map AnimationConfig to AdvancedAnimationConfig
        const mappedConfig: Partial<AdvancedAnimationConfig> = {
            speed: newConfig.speed,
            showLines: newConfig.showLines,
            showCircles: newConfig.showPulses, // Map showPulses to showCircles
            colorScheme: newConfig.colorScheme ? {
                direct: newConfig.colorScheme.direct,
                cascade: newConfig.colorScheme.cascade,
                potential: newConfig.colorScheme.potential,
                crossSector: newConfig.colorScheme.crossSector
            } : undefined
        };
        
        this.config = { ...this.config, ...mappedConfig };
    }

    /**
     * Get performance metrics - implements ICascadeAnimationController
     */
    getPerformanceMetrics(): PerformanceMetrics {
        // Update FPS based on current performance (simplified calculation)
        this.performanceMetrics.fps = this.isPlaying ? this.calculateCurrentFPS() : 60;
        this.performanceMetrics.concurrentAnimations = this.activeEffects.size;
        this.performanceMetrics.memoryUsage = this.estimateMemoryUsage();
        
        return { ...this.performanceMetrics };
    }

    /**
     * Set asset coordinates for animation positioning - implements ICascadeAnimationController
     */
    setAssetCoordinates(assetId: string, coordinates: [number, number]): void {
        this.assetCoordinates.set(assetId, coordinates);
    }

    /**
     * Calculate current FPS (simplified implementation)
     */
    private calculateCurrentFPS(): number {
        // Simple FPS calculation - in a real implementation this would track frame times
        return this.isPlaying ? Math.max(30, 60 - (this.activeEffects.size * 2)) : 60;
    }

    /**
     * Estimate memory usage (simplified implementation)
     */
    private estimateMemoryUsage(): number {
        // Estimate memory usage based on active effects and features
        const baseMemory = 10; // MB base usage
        const effectMemory = this.activeEffects.size * 0.5; // 0.5MB per active effect
        return baseMemory + effectMemory;
    }
}