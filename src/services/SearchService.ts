// Search and filter service for infrastructure assets
export interface SearchableAsset {
  id: string;
  name: string;
  type: 'power' | 'water' | 'telecoms' | 'transport';
  subtype: string;
  criticality: 'critical' | 'high' | 'medium' | 'low';
  operator?: string;
  voltage?: number;
  coordinates: [number, number];
  metadata?: Record<string, any>;
}

export interface SearchFilters {
  query: string;
  operators: string[];
  criticality: string[];
  assetTypes: string[];
  voltageRange?: [number, number];
  showCriticalOnly: boolean;
  showHighVoltageOnly: boolean;
  showCrossSectorOnly: boolean;
}

export interface SearchResult {
  assets: SearchableAsset[];
  totalCount: number;
  operatorCounts: Record<string, number>;
  criticalityCounts: Record<string, number>;
  typeCounts: Record<string, number>;
}

export class SearchService {
  private allAssets: SearchableAsset[] = [];
  private operators: Set<string> = new Set();
  private assetTypes: Set<string> = new Set();

  /**
   * Load and index all infrastructure assets for searching
   */
  async loadAssets(city: string = 'london'): Promise<void> {
    console.log('🔍 Loading assets for search indexing...');
    
    try {
      // Load all infrastructure data
      const [powerData, transportData, telecomData, waterData] = await Promise.all([
        fetch(`/data/${city}-power.json`).then(r => r.json()),
        fetch(`/data/${city}-transport.json`).then(r => r.json()),
        fetch(`/data/${city}-telecom.json`).then(r => r.json()),
        fetch(`/data/${city}-water.json`).then(r => r.json())
      ]);

      // Convert to searchable format
      this.allAssets = [
        ...this.convertAssets(powerData.assets, 'power'),
        ...this.convertAssets(transportData.assets, 'transport'),
        ...this.convertAssets(telecomData.assets, 'telecoms'),
        ...this.convertAssets(waterData.assets, 'water')
      ];

      // Build operator and type indexes
      this.allAssets.forEach(asset => {
        if (asset.operator) this.operators.add(asset.operator);
        this.assetTypes.add(`${asset.type}-${asset.subtype}`);
      });

      console.log(`✅ Indexed ${this.allAssets.length} assets for search`);
      console.log(`📊 Found ${this.operators.size} operators, ${this.assetTypes.size} asset types`);
      
    } catch (error) {
      console.error('❌ Failed to load assets for search:', error);
    }
  }

  /**
   * Convert raw asset data to searchable format
   */
  private convertAssets(assets: any[], type: SearchableAsset['type']): SearchableAsset[] {
    return assets.map(asset => ({
      id: asset.id,
      name: asset.name,
      type,
      subtype: asset.subtype,
      criticality: asset.criticality,
      operator: asset.metadata?.operator,
      voltage: asset.voltage,
      coordinates: asset.coordinates,
      metadata: asset.metadata
    }));
  }

  /**
   * Search assets with filters
   */
  search(filters: Partial<SearchFilters>): SearchResult {
    const {
      query = '',
      operators = [],
      criticality = [],
      assetTypes = [],
      voltageRange,
      showCriticalOnly = false,
      showHighVoltageOnly = false,
      showCrossSectorOnly = false
    } = filters;

    let filteredAssets = [...this.allAssets];

    // Text search (fuzzy matching)
    if (query.trim()) {
      const searchTerm = query.toLowerCase();
      filteredAssets = filteredAssets.filter(asset => 
        asset.name.toLowerCase().includes(searchTerm) ||
        asset.operator?.toLowerCase().includes(searchTerm) ||
        asset.subtype.toLowerCase().includes(searchTerm) ||
        asset.type.toLowerCase().includes(searchTerm)
      );
    }

    // Operator filter
    if (operators.length > 0) {
      filteredAssets = filteredAssets.filter(asset => 
        asset.operator && operators.includes(asset.operator)
      );
    }

    // Criticality filter
    if (criticality.length > 0) {
      filteredAssets = filteredAssets.filter(asset => 
        criticality.includes(asset.criticality)
      );
    }

    // Asset type filter
    if (assetTypes.length > 0) {
      filteredAssets = filteredAssets.filter(asset => 
        assetTypes.includes(`${asset.type}-${asset.subtype}`)
      );
    }

    // Voltage range filter (power assets only)
    if (voltageRange && voltageRange[0] !== voltageRange[1]) {
      filteredAssets = filteredAssets.filter(asset => 
        asset.voltage && 
        asset.voltage >= voltageRange[0] && 
        asset.voltage <= voltageRange[1]
      );
    }

    // Quick filters for cascade analysis
    if (showCriticalOnly) {
      filteredAssets = filteredAssets.filter(asset => 
        asset.criticality === 'critical'
      );
    }

    if (showHighVoltageOnly) {
      filteredAssets = filteredAssets.filter(asset => 
        asset.voltage && asset.voltage >= 110000 // 110kV+
      );
    }

    if (showCrossSectorOnly) {
      // Assets that likely have cross-sector dependencies
      filteredAssets = filteredAssets.filter(asset => 
        (asset.type === 'power' && asset.subtype === 'generation') ||
        (asset.type === 'water' && asset.subtype === 'treatment') ||
        (asset.type === 'telecoms' && asset.subtype === 'datacenter') ||
        (asset.type === 'transport' && asset.subtype === 'airport')
      );
    }

    // Calculate statistics
    const operatorCounts: Record<string, number> = {};
    const criticalityCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};

    filteredAssets.forEach(asset => {
      if (asset.operator) {
        operatorCounts[asset.operator] = (operatorCounts[asset.operator] || 0) + 1;
      }
      criticalityCounts[asset.criticality] = (criticalityCounts[asset.criticality] || 0) + 1;
      typeCounts[asset.type] = (typeCounts[asset.type] || 0) + 1;
    });

    return {
      assets: filteredAssets,
      totalCount: filteredAssets.length,
      operatorCounts,
      criticalityCounts,
      typeCounts
    };
  }

  /**
   * Get all unique operators for dropdown
   */
  getOperators(): string[] {
    return Array.from(this.operators).sort();
  }

  /**
   * Get cascade trigger candidates (critical assets with high connectivity)
   */
  getCascadeTriggers(): SearchableAsset[] {
    return this.allAssets.filter(asset => 
      asset.criticality === 'critical' &&
      (
        (asset.type === 'power' && asset.voltage && asset.voltage >= 275000) ||
        (asset.type === 'water' && asset.subtype === 'treatment') ||
        (asset.type === 'telecoms' && asset.subtype === 'datacenter') ||
        (asset.type === 'transport' && asset.subtype === 'airport')
      )
    );
  }

  /**
   * Get assets by operator (for single-operator failure scenarios)
   */
  getAssetsByOperator(operator: string): SearchableAsset[] {
    return this.allAssets.filter(asset => asset.operator === operator);
  }

  /**
   * Highlight assets on map based on search results
   */
  highlightAssets(map: any, assetIds: string[], color: string = '#ffff00'): void {
    console.log(`🎯 Highlighting ${assetIds.length} assets with color ${color}`);
    
    if (!map || assetIds.length === 0) return;
    
    try {
      // Remove existing highlight layer if it exists
      this.clearHighlights(map);
      
      // Create highlight source with matching assets
      const highlightAssets = this.allAssets.filter(asset => assetIds.includes(asset.id));
      
      if (highlightAssets.length === 0) return;
      
      // Convert to GeoJSON
      const highlightGeoJSON = {
        type: 'FeatureCollection',
        features: highlightAssets.map(asset => ({
          type: 'Feature',
          properties: {
            id: asset.id,
            name: asset.name,
            type: asset.type,
            criticality: asset.criticality
          },
          geometry: {
            type: 'Point',
            coordinates: asset.coordinates
          }
        }))
      };
      
      // Add highlight source and layer
      map.addSource('search-highlights', {
        type: 'geojson',
        data: highlightGeoJSON
      });
      
      // Add pulsing highlight layer
      map.addLayer({
        id: 'search-highlights',
        type: 'circle',
        source: 'search-highlights',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 8,
            12, 12,
            16, 16
          ],
          'circle-color': color,
          'circle-opacity': 0.8,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 1
        }
      });
      
      // Add pulsing animation
      let pulseRadius = 8;
      const pulseAnimation = () => {
        pulseRadius = pulseRadius === 8 ? 16 : 8;
        if (map.getLayer('search-highlights')) {
          map.setPaintProperty('search-highlights', 'circle-radius', [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, pulseRadius,
            12, pulseRadius + 4,
            16, pulseRadius + 8
          ]);
        }
      };
      
      // Store animation interval for cleanup
      (map as any)._searchHighlightInterval = setInterval(pulseAnimation, 1000);
      
      console.log(`✅ Highlighted ${highlightAssets.length} assets on map`);
      
    } catch (error) {
      console.error('❌ Failed to highlight assets:', error);
    }
  }

  /**
   * Clear all highlights
   */
  clearHighlights(map: any): void {
    console.log('🧹 Clearing search highlights');
    
    if (!map) return;
    
    try {
      // Clear animation interval
      if ((map as any)._searchHighlightInterval) {
        clearInterval((map as any)._searchHighlightInterval);
        delete (map as any)._searchHighlightInterval;
      }
      
      // Remove highlight layer and source
      if (map.getLayer('search-highlights')) {
        map.removeLayer('search-highlights');
      }
      if (map.getSource('search-highlights')) {
        map.removeSource('search-highlights');
      }
      
      console.log('✅ Cleared search highlights');
      
    } catch (error) {
      console.error('❌ Failed to clear highlights:', error);
    }
  }
}