import * as maptilersdk from '@maptiler/sdk';
import type { InfrastructureAsset } from '../data/infrastructure';
import { assetStyles } from '../data/infrastructure';
import { OpenInfraService } from './OpenInfraService';
import { LocalDataService } from './LocalDataService';

export class InfrastructureService {
  private map: maptilersdk.Map | null = null;
  private assets: InfrastructureAsset[] = [];
  private currentCity: string = 'london';
  private isLoading: boolean = false;
  private layerVisibility: Record<string, boolean> = {
    power: true,
    transport: true,
    telecom: true,
    water: false,
    emergency: false
  };

  constructor(map: maptilersdk.Map) {
    this.map = map;
    this.loadInfrastructureData();
  }

  private async loadInfrastructureData() {
    if (!this.map || this.isLoading) return;
    
    this.isLoading = true;
    console.log(`🔄 Loading infrastructure data for ${this.currentCity}...`);

    try {
      // Fetch real OpenInfraMap data
      this.assets = await OpenInfraService.fetchCityInfrastructure(this.currentCity);
      
      // Initialize map layers with real data
      this.initializeLayers();
      
      console.log(`✅ Loaded ${this.assets.length} real infrastructure assets`);
      console.log(`   Power: ${this.assets.filter(a => a.type === 'power').length}`);
      console.log(`   Transport: ${this.assets.filter(a => a.type === 'transport').length}`);
      console.log(`   Telecom: ${this.assets.filter(a => a.type === 'telecom').length}`);
    } catch (error) {
      console.error('❌ Failed to load infrastructure data:', error);
      // Keep empty assets array - layers will show no data
    } finally {
      this.isLoading = false;
    }
  }

  private initializeLayers() {
    if (!this.map) return;

    // Add sources for each asset type (even if empty)
    this.addAssetSources();
    
    // Add layers for each asset type (even if empty)
    this.addAssetLayers();
  }

  private addAssetSources() {
    if (!this.map) return;

    const assetTypes = ['power', 'transport', 'telecom', 'water', 'emergency'] as const;

    assetTypes.forEach(type => {
      const assets = this.assets.filter(asset => asset.type === type);
      
      console.log(`📊 Creating ${type} source with ${assets.length} assets`);
      
      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: assets.map(asset => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: asset.coordinates
          },
          properties: {
            id: asset.id,
            name: asset.name,
            type: asset.type,
            subtype: asset.subtype,
            status: asset.status,
            criticality: asset.criticality,
            capacity: asset.capacity,
            voltage: asset.voltage,
            metadata: asset.metadata
          }
        }))
      };

      // Always create the source, even if empty
      try {
        this.map!.addSource(`${type}-assets`, {
          type: 'geojson',
          data: geojson
        });
        console.log(`✅ Created ${type} source successfully`);
      } catch (error) {
        console.error(`❌ Failed to create ${type} source:`, error);
      }
    });
  }

  private addAssetLayers() {
    if (!this.map) return;

    const assetTypes = ['power', 'transport', 'telecom', 'water', 'emergency'] as const;

    assetTypes.forEach(type => {
      try {
        // Get default color for the type
        const typeStyles = assetStyles[type];
        const defaultColor = typeStyles.color;
        
        console.log(`🎨 Creating ${type} layer...`);
        
        // Add circle layer for assets with subtype-based styling
        this.map!.addLayer({
          id: `${type}-assets-circle`,
          type: 'circle',
          source: `${type}-assets`,
          paint: {
            'circle-radius': [
              'case',
              ['==', ['get', 'criticality'], 'critical'], 12,
              ['==', ['get', 'criticality'], 'high'], 10,
              ['==', ['get', 'criticality'], 'medium'], 8,
              6
            ],
            'circle-color': [
              'case',
              ['==', ['get', 'status'], 'failed'], '#dc2626',
              ['==', ['get', 'status'], 'degraded'], '#f59e0b',
              ['==', ['get', 'status'], 'offline'], '#6b7280',
              // Use subtype-specific colors
              ...this.buildSubtypeColorExpression(type),
              defaultColor // fallback
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.8
          },
          layout: {
            visibility: this.layerVisibility[type] ? 'visible' : 'none'
          }
        });

        console.log(`✅ Created ${type} layer successfully`);

        // Add click handlers
        this.map!.on('click', `${type}-assets-circle`, (e) => {
          this.handleAssetClick(e);
        });

        // Change cursor on hover
        this.map!.on('mouseenter', `${type}-assets-circle`, () => {
          this.map!.getCanvas().style.cursor = 'pointer';
        });

        this.map!.on('mouseleave', `${type}-assets-circle`, () => {
          this.map!.getCanvas().style.cursor = '';
        });
      } catch (error) {
        console.error(`❌ Failed to create ${type} layer:`, error);
      }
    });
  }

  private buildSubtypeColorExpression(type: keyof typeof assetStyles): any[] {
    const typeStyles = assetStyles[type];
    const expression: any[] = [];
    
    Object.entries(typeStyles).forEach(([subtype, style]: [string, any]) => {
      if (typeof style === 'object' && style.color) {
        expression.push(['==', ['get', 'subtype'], subtype]);
        expression.push(style.color);
      }
    });
    
    return expression;
  }

  private handleAssetClick(e: any) {
    if (!e.features || e.features.length === 0) return;

    const feature = e.features[0];
    const properties = feature.properties;
    
    // Create popup content
    const popupContent = this.createPopupContent(properties);
    
    // Show popup
    new maptilersdk.Popup()
      .setLngLat(e.lngLat)
      .setHTML(popupContent)
      .addTo(this.map!);
  }

  private createPopupContent(properties: any): string {
    const statusColors: Record<string, string> = {
      normal: '#10b981',
      degraded: '#f59e0b', 
      failed: '#dc2626',
      offline: '#6b7280'
    };
    const statusColor = statusColors[properties.status] || '#6b7280';

    const criticalityBadges: Record<string, string> = {
      critical: '<span class="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">Critical</span>',
      high: '<span class="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">High</span>',
      medium: '<span class="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">Medium</span>',
      low: '<span class="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Low</span>'
    };
    const criticalityBadge = criticalityBadges[properties.criticality] || '';

    let metadataHtml = '';
    if (properties.metadata) {
      const metadata = properties.metadata;
      metadataHtml = '<div class="mt-3 text-sm text-gray-600 space-y-1">';
      
      // Operator & Network Information
      if (metadata.operator) {
        metadataHtml += `<div class="flex justify-between"><span class="font-medium">Operator:</span><span>${metadata.operator}</span></div>`;
      }
      if (metadata.network && metadata.network !== metadata.operator) {
        metadataHtml += `<div class="flex justify-between"><span class="font-medium">Network:</span><span>${metadata.network}</span></div>`;
      }
      if (metadata.reference) {
        metadataHtml += `<div class="flex justify-between"><span class="font-medium">Reference:</span><span>${metadata.reference}</span></div>`;
      }
      
      // Technical Specifications
      if (metadata.voltage) {
        metadataHtml += `<div class="flex justify-between"><span class="font-medium">Voltage:</span><span>${metadata.voltage}</span></div>`;
      }
      if (metadata.substation_type) {
        metadataHtml += `<div class="flex justify-between"><span class="font-medium">Type:</span><span class="capitalize">${metadata.substation_type}</span></div>`;
      }
      if (metadata.fuel_type) {
        metadataHtml += `<div class="flex justify-between"><span class="font-medium">Fuel:</span><span class="capitalize">${metadata.fuel_type}</span></div>`;
      }
      if (metadata.generation_mw) {
        metadataHtml += `<div class="flex justify-between"><span class="font-medium">Output:</span><span>${metadata.generation_mw}MW</span></div>`;
      }
      
      // Transport Details
      if (metadata.iata_code) {
        metadataHtml += `<div class="flex justify-between"><span class="font-medium">IATA:</span><span>${metadata.iata_code}</span></div>`;
      }
      if (metadata.railway_type) {
        metadataHtml += `<div class="flex justify-between"><span class="font-medium">Railway:</span><span class="capitalize">${metadata.railway_type}</span></div>`;
      }
      
      // Telecom Details
      if (metadata.tower_type) {
        metadataHtml += `<div class="flex justify-between"><span class="font-medium">Tower Type:</span><span class="capitalize">${metadata.tower_type}</span></div>`;
      }
      if (metadata.mobile_operator) {
        metadataHtml += `<div class="flex justify-between"><span class="font-medium">Mobile:</span><span>${metadata.mobile_operator}</span></div>`;
      }
      
      // Water Details
      if (metadata.treatment_method) {
        metadataHtml += `<div class="flex justify-between"><span class="font-medium">Method:</span><span class="capitalize">${metadata.treatment_method}</span></div>`;
      }
      if (metadata.storage_volume) {
        metadataHtml += `<div class="flex justify-between"><span class="font-medium">Volume:</span><span>${metadata.storage_volume}</span></div>`;
      }
      
      // Emergency Services
      if (metadata.beds) {
        metadataHtml += `<div class="flex justify-between"><span class="font-medium">Beds:</span><span>${metadata.beds}</span></div>`;
      }
      if (metadata.healthcare_type) {
        metadataHtml += `<div class="flex justify-between"><span class="font-medium">Healthcare:</span><span class="capitalize">${metadata.healthcare_type}</span></div>`;
      }
      
      // Contact Information
      if (metadata.phone) {
        metadataHtml += `<div class="flex justify-between"><span class="font-medium">Phone:</span><span>${metadata.phone}</span></div>`;
      }
      
      metadataHtml += '</div>';
    }

    return `
      <div class="p-3 min-w-64">
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-semibold text-gray-900">${properties.name}</h3>
          ${criticalityBadge}
        </div>
        <div class="flex items-center mb-2">
          <div class="w-3 h-3 rounded-full mr-2" style="background-color: ${statusColor}"></div>
          <span class="text-sm capitalize">${properties.status}</span>
        </div>
        <div class="text-sm text-gray-600 mb-1">
          Type: <span class="capitalize">${properties.type}</span>
        </div>
        ${properties.capacity ? `<div class="text-sm text-gray-600 mb-1">Capacity: ${(properties.capacity / 1000).toFixed(0)}MW</div>` : ''}
        ${metadataHtml}
        <div class="mt-3 pt-2 border-t border-gray-200">
          <button class="text-xs text-blue-600 hover:text-blue-800" onclick="window.triggerCascade('${properties.id}')">
            🚨 Trigger Cascade
          </button>
        </div>
      </div>
    `;
  }

  // Public methods for layer control
  public toggleLayer(type: string, visible: boolean) {
    if (!this.map) return;
    
    this.layerVisibility[type] = visible;
    
    // Check if layer exists before trying to style it
    if (this.map.getLayer(`${type}-assets-circle`)) {
      const visibility = visible ? 'visible' : 'none';
      this.map.setLayoutProperty(`${type}-assets-circle`, 'visibility', visibility);
    } else {
      console.log(`⚠️ Layer ${type}-assets-circle does not exist, skipping toggle`);
    }
  }

  public setLayerOpacity(type: string, opacity: number) {
    if (!this.map) return;
    
    // Check if layer exists before trying to style it
    if (this.map.getLayer(`${type}-assets-circle`)) {
      this.map.setPaintProperty(`${type}-assets-circle`, 'circle-opacity', opacity / 100);
    } else {
      console.log(`⚠️ Layer ${type}-assets-circle does not exist, skipping opacity change`);
    }
  }

  public updateAssetStatus(assetId: string, status: InfrastructureAsset['status']) {
    // Find and update the asset
    const asset = this.assets.find(a => a.id === assetId);
    if (!asset) return;
    
    asset.status = status;
    
    // Update the map source
    const assetType = asset.type;
    const assets = this.assets.filter(a => a.type === assetType);
    
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: assets.map(a => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: a.coordinates
        },
        properties: {
          id: a.id,
          name: a.name,
          type: a.type,
          status: a.status,
          criticality: a.criticality,
          capacity: a.capacity,
          metadata: a.metadata
        }
      }))
    };

    const source = this.map!.getSource(`${assetType}-assets`) as maptilersdk.GeoJSONSource;
    if (source) {
      source.setData(geojson);
    }
  }

  public getAssetCounts() {
    return {
      power: this.assets.filter(a => a.type === 'power').length,
      transport: this.assets.filter(a => a.type === 'transport').length,
      telecom: this.assets.filter(a => a.type === 'telecom').length,
      water: this.assets.filter(a => a.type === 'water').length,
      emergency: this.assets.filter(a => a.type === 'emergency').length
    };
  }

  public getAssets() {
    return this.assets;
  }

  public async switchCity(cityKey: string) {
    if (cityKey === this.currentCity || this.isLoading) return;
    
    this.currentCity = cityKey;
    console.log(`🔄 Switching to ${cityKey}...`);
    
    // Clear existing layers
    this.clearLayers();
    
    // Load new city data
    await this.loadInfrastructureData();
  }

  private clearLayers() {
    if (!this.map) return;
    
    const assetTypes = ['power', 'transport', 'telecom', 'water', 'emergency'];
    assetTypes.forEach(type => {
      try {
        if (this.map!.getLayer(`${type}-assets-circle`)) {
          this.map!.removeLayer(`${type}-assets-circle`);
        }
        if (this.map!.getSource(`${type}-assets`)) {
          this.map!.removeSource(`${type}-assets`);
        }
      } catch (error) {
        // Layer might not exist, ignore
      }
    });
  }

  public getCurrentCity(): string {
    return this.currentCity;
  }

  public isLoadingData(): boolean {
    return this.isLoading;
  }

  public getCityList(): string[] {
    return OpenInfraService.getCityList();
  }

  public async forceRefresh() {
    console.log('🗑️ Clearing cache and forcing refresh...');
    OpenInfraService.clearCache();
    
    // Clear existing layers
    this.clearLayers();
    
    // Reload data
    await this.loadInfrastructureData();
  }

  public async testApiCall() {
    console.log('🧪 Testing direct API call...');
    try {
      // Make a simple test query to see if the API is working
      const testQuery = `
        [out:json][timeout:10];
        (
          node["power"="substation"](51.28,-0.51,51.69,0.33);
        );
        out center meta 5;
      `;
      
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(testQuery)}`
      });

      if (!response.ok) {
        throw new Error(`API test failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ API test successful:', data.elements?.length || 0, 'elements returned');
      return data;
    } catch (error) {
      console.error('❌ API test failed:', error);
      throw error;
    }
  }

  public async testLocalData() {
    console.log('🧪 Testing local data loading...');
    try {
      const success = await LocalDataService.testSampleData();
      if (success) {
        console.log('✅ Local data test successful');
      } else {
        console.log('❌ Local data test failed');
      }
      return success;
    } catch (error) {
      console.error('❌ Local data test failed:', error);
      return false;
    }
  }

  public async loadFromLocalFiles() {
    console.log('📁 Loading infrastructure data from local files...');
    try {
      this.isLoading = true;
      
      // Clear existing layers first
      this.clearLayers();
      
      // Load data from local files
      this.assets = await LocalDataService.loadAllLayers(this.currentCity);
      
      // Initialize map layers
      this.initializeLayers();
      
      console.log(`✅ Loaded ${this.assets.length} assets from local files`);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to load from local files:', error);
      return false;
    } finally {
      this.isLoading = false;
    }
  }
}