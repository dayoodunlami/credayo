/**
 * CESIUM INFRASTRUCTURE SERVICE
 * 
 * Handles rendering infrastructure assets in Cesium 3D environment
 * Ports 2D infrastructure visualization to 3D entities
 */

import * as Cesium from 'cesium';

export interface InfrastructureAsset {
  id: string;
  type: 'power' | 'water' | 'telecoms' | 'transport';
  subtype?: string;
  coordinates: [number, number];
  properties: Record<string, any>;
  metadata?: Record<string, any>;
}

export class CesiumInfrastructureService {
  private viewer: Cesium.Viewer;
  private assetEntities: Map<string, Cesium.Entity> = new Map();
  private layerVisibility: Map<string, boolean> = new Map();

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
    this.initializeLayerVisibility();
  }

  private initializeLayerVisibility() {
    // Default layer visibility
    this.layerVisibility.set('power', true);
    this.layerVisibility.set('water', true);
    this.layerVisibility.set('telecoms', true);
    this.layerVisibility.set('transport', true);
  }

  /**
   * Load and render infrastructure assets from GeoJSON data
   */
  async loadInfrastructureAssets(city: string = 'london') {
    console.log('🏗️ Loading infrastructure assets in Cesium...');

    try {
      // Load all infrastructure types in parallel
      await Promise.all([
        this.loadPowerAssets(city),
        this.loadWaterAssets(city),
        this.loadTelecomsAssets(city),
        this.loadTransportAssets(city)
      ]);

      console.log('✅ All infrastructure assets loaded in Cesium');
    } catch (error) {
      console.error('❌ Failed to load infrastructure in Cesium:', error);
      this.loadMockAssets();
    }
  }

  /**
   * Load power infrastructure assets
   */
  private async loadPowerAssets(city: string) {
    try {
      const response = await fetch(`/data/${city}-power.json`);
      if (!response.ok) throw new Error(`Failed to load power data: ${response.status}`);
      
      const powerData = await response.json();
      
      // Filter out solar panels
      const filteredAssets = powerData.assets.filter((asset: any) => {
        return !(asset.metadata?.fuel_type === 'solar');
      });

      filteredAssets.forEach((asset: any) => {
        this.createPowerEntity(asset);
      });

      console.log(`🔌 Loaded ${filteredAssets.length} power assets in 3D`);
    } catch (error) {
      console.warn('⚠️ Failed to load power assets:', error);
    }
  }

  /**
   * Load water infrastructure assets
   */
  private async loadWaterAssets(city: string) {
    try {
      const response = await fetch(`/data/${city}-water.json`);
      if (!response.ok) throw new Error(`Failed to load water data: ${response.status}`);
      
      const waterData = await response.json();
      
      waterData.assets.forEach((asset: any) => {
        this.createWaterEntity(asset);
      });

      console.log(`💧 Loaded ${waterData.assets.length} water assets in 3D`);
    } catch (error) {
      console.warn('⚠️ Failed to load water assets:', error);
    }
  }

  /**
   * Load telecoms infrastructure assets
   */
  private async loadTelecomsAssets(city: string) {
    try {
      const response = await fetch(`/data/${city}-telecom.json`);
      if (!response.ok) throw new Error(`Failed to load telecoms data: ${response.status}`);
      
      const telecomsData = await response.json();
      
      telecomsData.assets.forEach((asset: any) => {
        this.createTelecomsEntity(asset);
      });

      console.log(`📡 Loaded ${telecomsData.assets.length} telecoms assets in 3D`);
    } catch (error) {
      console.warn('⚠️ Failed to load telecoms assets, using mock data:', error);
      this.loadMockTelecomsAssets();
    }
  }

  /**
   * Load transport infrastructure assets
   */
  private async loadTransportAssets(city: string) {
    try {
      const response = await fetch(`/data/${city}-transport.json`);
      if (!response.ok) throw new Error(`Failed to load transport data: ${response.status}`);
      
      const transportData = await response.json();
      
      transportData.assets.forEach((asset: any) => {
        this.createTransportEntity(asset);
      });

      console.log(`🚇 Loaded ${transportData.assets.length} transport assets in 3D`);
    } catch (error) {
      console.warn('⚠️ Failed to load transport assets:', error);
    }
  }

  /**
   * Create power infrastructure entity
   */
  private createPowerEntity(asset: any) {
    const [longitude, latitude] = asset.coordinates;
    const voltage = asset.metadata?.voltage || 0;
    
    // Determine color and height based on voltage
    let color = Cesium.Color.ORANGE;
    let height = 20;
    
    if (voltage >= 275000) {
      color = Cesium.Color.RED;
      height = 40;
    } else if (voltage >= 132000) {
      color = Cesium.Color.DARKORANGE;
      height = 30;
    }

    const entity = this.viewer.entities.add({
      id: `power-${asset.id}`,
      position: Cesium.Cartesian3.fromDegrees(longitude, latitude, height / 2),
      cylinder: {
        length: height,
        topRadius: 8,
        bottomRadius: 8,
        material: color,
        outline: true,
        outlineColor: Cesium.Color.WHITE
      },
      label: {
        text: asset.properties?.name || 'Power Station',
        font: '12pt sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -50),
        show: false // Only show on hover
      },
      properties: {
        type: 'power',
        ...asset.properties,
        ...asset.metadata
      }
    });

    this.assetEntities.set(`power-${asset.id}`, entity);
  }

  /**
   * Create water infrastructure entity
   */
  private createWaterEntity(asset: any) {
    const [longitude, latitude] = asset.coordinates;
    
    const entity = this.viewer.entities.add({
      id: `water-${asset.id}`,
      position: Cesium.Cartesian3.fromDegrees(longitude, latitude, 15),
      cylinder: {
        length: 25,
        topRadius: 12,
        bottomRadius: 12,
        material: Cesium.Color.BLUE,
        outline: true,
        outlineColor: Cesium.Color.WHITE
      },
      label: {
        text: asset.properties?.name || 'Water Facility',
        font: '12pt sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -50),
        show: false
      },
      properties: {
        type: 'water',
        ...asset.properties,
        ...asset.metadata
      }
    });

    this.assetEntities.set(`water-${asset.id}`, entity);
  }

  /**
   * Create telecoms infrastructure entity
   */
  private createTelecomsEntity(asset: any) {
    const [longitude, latitude] = asset.coordinates;
    const height = asset.metadata?.height || 30;
    
    const entity = this.viewer.entities.add({
      id: `telecoms-${asset.id}`,
      position: Cesium.Cartesian3.fromDegrees(longitude, latitude, height / 2),
      cylinder: {
        length: height,
        topRadius: 3,
        bottomRadius: 3,
        material: Cesium.Color.GREEN,
        outline: true,
        outlineColor: Cesium.Color.WHITE
      },
      label: {
        text: asset.properties?.name || 'Telecoms Tower',
        font: '12pt sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -50),
        show: false
      },
      properties: {
        type: 'telecoms',
        ...asset.properties,
        ...asset.metadata
      }
    });

    this.assetEntities.set(`telecoms-${asset.id}`, entity);
  }

  /**
   * Create transport infrastructure entity
   */
  private createTransportEntity(asset: any) {
    const [longitude, latitude] = asset.coordinates;
    
    const entity = this.viewer.entities.add({
      id: `transport-${asset.id}`,
      position: Cesium.Cartesian3.fromDegrees(longitude, latitude, 10),
      box: {
        dimensions: new Cesium.Cartesian3(20, 20, 15),
        material: Cesium.Color.PURPLE,
        outline: true,
        outlineColor: Cesium.Color.WHITE
      },
      label: {
        text: asset.properties?.name || 'Transport Hub',
        font: '12pt sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -50),
        show: false
      },
      properties: {
        type: 'transport',
        ...asset.properties,
        ...asset.metadata
      }
    });

    this.assetEntities.set(`transport-${asset.id}`, entity);
  }

  /**
   * Toggle layer visibility
   */
  setLayerVisibility(layerType: string, visible: boolean) {
    this.layerVisibility.set(layerType, visible);
    
    // Update entity visibility
    this.assetEntities.forEach((entity, id) => {
      if (id.startsWith(`${layerType}-`)) {
        entity.show = visible;
      }
    });
  }

  /**
   * Get layer visibility status
   */
  getLayerVisibility(layerType: string): boolean {
    return this.layerVisibility.get(layerType) || false;
  }

  /**
   * Handle asset selection
   */
  selectAsset(assetId: string) {
    const entity = this.assetEntities.get(assetId);
    if (entity) {
      // Show label and highlight
      if (entity.label) {
        (entity.label as any).show = true;
      }
      
      // Fly to asset
      this.viewer.flyTo(entity, {
        duration: 1.0,
        offset: new Cesium.HeadingPitchRange(0, -0.5, 500)
      });
    }
  }

  /**
   * Clear asset selection
   */
  clearSelection() {
    this.assetEntities.forEach(entity => {
      if (entity.label) {
        (entity.label as any).show = false;
      }
    });
  }

  /**
   * Load mock telecoms assets
   */
  private loadMockTelecomsAssets() {
    const mockTelecomsAssets = [
      {
        id: 'mock-telecoms-1',
        coordinates: [-0.1500, 51.5100],
        properties: { name: 'BT Tower' },
        metadata: { height: 60 }
      },
      {
        id: 'mock-telecoms-2',
        coordinates: [-0.1200, 51.5150],
        properties: { name: 'Telecom Tower North' },
        metadata: { height: 45 }
      },
      {
        id: 'mock-telecoms-3',
        coordinates: [-0.1400, 51.5050],
        properties: { name: 'Data Center South' },
        metadata: { height: 25 }
      }
    ];

    mockTelecomsAssets.forEach(asset => {
      this.createTelecomsEntity(asset);
    });

    console.log('📡 Loaded 3 mock telecoms assets in 3D');
  }

  /**
   * Load mock assets for testing
   */
  private loadMockAssets() {
    console.log('🔧 Loading comprehensive mock infrastructure assets...');
    
    // Mock London assets with more variety
    const mockAssets = [
      // Power assets
      {
        id: 'mock-power-1',
        type: 'power',
        coordinates: [-0.1276, 51.5074],
        properties: { name: 'Central London Power Station' },
        metadata: { voltage: 400000 }
      },
      {
        id: 'mock-power-2',
        type: 'power',
        coordinates: [-0.1100, 51.5120],
        properties: { name: 'North London Substation' },
        metadata: { voltage: 132000 }
      },
      // Water assets
      {
        id: 'mock-water-1',
        type: 'water',
        coordinates: [-0.1000, 51.5200],
        properties: { name: 'Thames Water Treatment' },
        metadata: {}
      },
      {
        id: 'mock-water-2',
        type: 'water',
        coordinates: [-0.1350, 51.5080],
        properties: { name: 'West London Water Plant' },
        metadata: {}
      },
      // Transport assets
      {
        id: 'mock-transport-1',
        type: 'transport',
        coordinates: [-0.1240, 51.5180],
        properties: { name: 'King\'s Cross Station' },
        metadata: {}
      }
    ];

    mockAssets.forEach(asset => {
      switch (asset.type) {
        case 'power':
          this.createPowerEntity(asset);
          break;
        case 'water':
          this.createWaterEntity(asset);
          break;
        case 'transport':
          this.createTransportEntity(asset);
          break;
      }
    });

    // Load mock telecoms separately
    this.loadMockTelecomsAssets();

    console.log('✅ All mock assets loaded (8 total)');
  }

  /**
   * Clear all infrastructure assets
   */
  clearAssets() {
    this.assetEntities.forEach(entity => {
      this.viewer.entities.remove(entity);
    });
    this.assetEntities.clear();
  }

  /**
   * Get asset count by type
   */
  getAssetCount(type?: string): number {
    if (!type) {
      return this.assetEntities.size;
    }
    
    let count = 0;
    this.assetEntities.forEach((_, id) => {
      if (id.startsWith(`${type}-`)) {
        count++;
      }
    });
    return count;
  }
}