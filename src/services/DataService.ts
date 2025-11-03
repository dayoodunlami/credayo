import * as maptilersdk from '@maptiler/sdk';

export class DataService {
  
  /**
   * Add infrastructure layers using offline GeoJSON data
   * Uses pre-downloaded data from Overpass API - reliable and fast
   */
  async addInfrastructureLayers(map: maptilersdk.Map, city: string = 'london') {
    console.log('🔧 Loading offline infrastructure data...');
    
    try {
      // Load all infrastructure data in parallel
      await Promise.all([
        this.addPowerLayers(map, city),
        this.addTelecomsLayers(map, city),
        this.addTransportLayers(map, city),
        this.addWaterLayers(map, city)
      ]);
      
      console.log('🎯 All infrastructure layers loaded successfully!');
      
      // Add cluster interaction handlers
      this.addClusterHandlers(map);
      
    } catch (error) {
      console.error('❌ Failed to load infrastructure layers:', error);
      // Fallback to mock data if offline files fail
      this.addMockInfrastructure(map);
    }
  }
  
  /**
   * Load power infrastructure from offline GeoJSON with clustering
   */
  private async addPowerLayers(map: maptilersdk.Map, city: string) {
    console.log('🔌 Loading power infrastructure with clustering...');
    
    try {
      const response = await fetch(`/data/${city}-power.json`);
      if (!response.ok) throw new Error(`Failed to load power data: ${response.status}`);
      
      const powerData = await response.json();
      console.log(`✅ Loaded ${powerData.count} power assets`);
      
      // Filter out solar panels by default (as per your requirement)
      const filteredAssets = powerData.assets.filter((asset: any) => {
        return !(asset.metadata?.fuel_type === 'solar');
      });
      
      // Convert to GeoJSON format
      const geoJsonData = {
        type: 'FeatureCollection' as const,
        features: filteredAssets.map((asset: any) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: asset.coordinates
          },
          properties: {
            id: asset.id,
            name: asset.name,
            type: asset.type,
            subtype: asset.subtype,
            voltage: asset.voltage || 0,
            criticality: asset.criticality,
            fuel_type: asset.metadata?.fuel_type || '',
            operator: asset.metadata?.operator || '',
            ...asset.metadata
          }
        }))
      };
      
      // Add clustered power source
      map.addSource('power-infrastructure', {
        type: 'geojson',
        data: geoJsonData,
        cluster: true,
        clusterRadius: 50, // Group assets within 50px
        clusterMaxZoom: 12, // Stop clustering at zoom 12
        // Aggregate properties for smart cluster styling
        clusterProperties: {
          'critical_count': ['+', ['case', ['==', ['get', 'criticality'], 'critical'], 1, 0]],
          'high_count': ['+', ['case', ['==', ['get', 'criticality'], 'high'], 1, 0]],
          'max_voltage': ['max', ['to-number', ['get', 'voltage'], 0]]
        }
      });
      
      // Power clusters (when zoomed out)
      map.addLayer({
        id: 'power-clusters',
        type: 'circle',
        source: 'power-infrastructure',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'case',
            ['>', ['get', 'critical_count'], 0], '#dc2626', // Red if contains critical assets
            ['>', ['get', 'high_count'], 0], '#f97316',     // Orange if contains high priority
            '#fbbf24' // Yellow for others
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            15, 10,   // 15px for <10 assets
            20, 30,   // 20px for 10-30 assets
            25, 50,   // 25px for 30-50 assets
            30        // 30px for 50+ assets
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
      
      // Cluster count labels
      map.addLayer({
        id: 'power-cluster-count',
        type: 'symbol',
        source: 'power-infrastructure',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-size': 12
        },
        paint: {
          'text-color': '#ffffff'
        }
      });
      
      // Individual unclustered power assets (when zoomed in)
      map.addLayer({
        id: 'power-substations',
        type: 'circle',
        source: 'power-infrastructure',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'subtype'], 'generation'], 10, // Generation larger
            ['>=', ['to-number', ['get', 'voltage'], 0], 275000], 8, // Transmission
            6 // Others
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'subtype'], 'generation'], '#7c2d12', // Dark red for generation
            ['>=', ['to-number', ['get', 'voltage'], 0], 275000], '#dc2626', // Transmission (red)
            ['>=', ['to-number', ['get', 'voltage'], 0], 110000], '#ef4444',  // High voltage (red)
            ['>=', ['to-number', ['get', 'voltage'], 0], 33000], '#f97316',   // Medium voltage (orange)
            '#fb923c' // Distribution (orange)
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
      
      console.log('✅ Added power infrastructure layers');
      
    } catch (error) {
      console.error('❌ Failed to load power data:', error);
      this.addMockPowerLayers(map);
    }
  }
  
  /**
   * Load telecoms infrastructure from offline GeoJSON
   */
  private async addTelecomsLayers(map: maptilersdk.Map, city: string) {
    console.log('📡 Loading telecoms infrastructure...');
    
    try {
      const response = await fetch(`/data/${city}-telecom.json`);
      if (!response.ok) throw new Error(`Failed to load telecom data: ${response.status}`);
      
      const telecomData = await response.json();
      console.log(`✅ Loaded ${telecomData.count} telecom assets`);
      
      // Convert to GeoJSON format
      const geoJsonData = {
        type: 'FeatureCollection' as const,
        features: telecomData.assets.map((asset: any) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: asset.coordinates
          },
          properties: {
            id: asset.id,
            name: asset.name,
            type: asset.type,
            subtype: asset.subtype,
            criticality: asset.criticality,
            ...asset.metadata
          }
        }))
      };
      
      // Add telecoms source
      map.addSource('telecom-infrastructure', {
        type: 'geojson',
        data: geoJsonData
      });
      
      // Communication towers
      map.addLayer({
        id: 'telecom-towers',
        type: 'circle',
        source: 'telecom-infrastructure',
        filter: ['==', ['get', 'subtype'], 'tower'],
        minzoom: 8,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 4,
            14, 8
          ],
          'circle-color': '#10b981', // Green for telecoms
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
      
      // Data centers
      map.addLayer({
        id: 'telecom-datacenters',
        type: 'circle',
        source: 'telecom-infrastructure',
        filter: ['==', ['get', 'subtype'], 'datacenter'],
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 6,
            14, 12
          ],
          'circle-color': '#059669', // Darker green for data centers
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
      
      console.log('✅ Added telecoms infrastructure layers');
      
    } catch (error) {
      console.error('❌ Failed to load telecom data:', error);
      this.addMockTelecomsLayers(map);
    }
  }
  
  /**
   * Load transport infrastructure from offline GeoJSON
   */
  private async addTransportLayers(map: maptilersdk.Map, city: string) {
    console.log('🚇 Loading transport infrastructure...');
    
    try {
      const response = await fetch(`/data/${city}-transport.json`);
      if (!response.ok) throw new Error(`Failed to load transport data: ${response.status}`);
      
      const transportData = await response.json();
      console.log(`✅ Loaded ${transportData.count} transport assets`);
      
      // Convert to GeoJSON format
      const geoJsonData = {
        type: 'FeatureCollection' as const,
        features: transportData.assets.map((asset: any) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: asset.coordinates
          },
          properties: {
            id: asset.id,
            name: asset.name,
            type: asset.type,
            subtype: asset.subtype,
            criticality: asset.criticality,
            ...asset.metadata
          }
        }))
      };
      
      // Add transport source
      map.addSource('transport-infrastructure', {
        type: 'geojson',
        data: geoJsonData
      });
      
      // Major transport hubs (airports, major rail stations)
      map.addLayer({
        id: 'transport-hubs',
        type: 'circle',
        source: 'transport-infrastructure',
        filter: ['any', ['==', ['get', 'subtype'], 'airport'], ['==', ['get', 'subtype'], 'rail']],
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'subtype'], 'airport'], 12, // Airports larger
            ['==', ['get', 'subtype'], 'rail'], 8,     // Rail stations medium
            6 // Other transport smaller
          ],
          'circle-color': '#0284c7', // Blue for transport hubs
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
      
      // Ports and logistics hubs
      map.addLayer({
        id: 'transport-logistics',
        type: 'circle',
        source: 'transport-infrastructure',
        filter: ['any', ['==', ['get', 'subtype'], 'port'], ['==', ['get', 'subtype'], 'logistics']],
        minzoom: 9,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            9, 4,
            14, 8
          ],
          'circle-color': '#0369a1', // Darker blue for logistics
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
      
      console.log('✅ Added transport infrastructure layers');
      
    } catch (error) {
      console.error('❌ Failed to load transport data:', error);
      this.addMockTransportLayers(map);
    }
  }
  
  /**
   * Load water infrastructure from offline GeoJSON
   */
  private async addWaterLayers(map: maptilersdk.Map, city: string) {
    console.log('💧 Loading water infrastructure...');
    
    try {
      const response = await fetch(`/data/${city}-water.json`);
      if (!response.ok) throw new Error(`Failed to load water data: ${response.status}`);
      
      const waterData = await response.json();
      console.log(`✅ Loaded ${waterData.count} water assets`);
      
      // Convert to GeoJSON format
      const geoJsonData = {
        type: 'FeatureCollection' as const,
        features: waterData.assets.map((asset: any) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: asset.coordinates
          },
          properties: {
            id: asset.id,
            name: asset.name,
            type: asset.type,
            subtype: asset.subtype,
            criticality: asset.criticality,
            ...asset.metadata
          }
        }))
      };
      
      // Add clustered water source
      map.addSource('water-infrastructure', {
        type: 'geojson',
        data: geoJsonData,
        cluster: true,
        clusterRadius: 60, // Slightly larger radius for water (fewer assets)
        clusterMaxZoom: 11, // Decluster earlier for water
        clusterProperties: {
          'critical_count': ['+', ['case', ['==', ['get', 'criticality'], 'critical'], 1, 0]],
          'treatment_count': ['+', ['case', ['==', ['get', 'subtype'], 'treatment'], 1, 0]]
        }
      });
      
      // Water clusters
      map.addLayer({
        id: 'water-clusters',
        type: 'circle',
        source: 'water-infrastructure',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'case',
            ['>', ['get', 'critical_count'], 0], '#0369a1', // Dark blue if contains critical
            ['>', ['get', 'treatment_count'], 0], '#0284c7', // Medium blue if contains treatment
            '#38bdf8' // Light blue for others
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            12, 5,    // 12px for <5 assets
            16, 15,   // 16px for 5-15 assets
            20, 25,   // 20px for 15-25 assets
            24        // 24px for 25+ assets
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
      
      // Water cluster count labels
      map.addLayer({
        id: 'water-cluster-count',
        type: 'symbol',
        source: 'water-infrastructure',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-size': 11
        },
        paint: {
          'text-color': '#ffffff'
        }
      });
      
      // Individual water assets (when zoomed in)
      map.addLayer({
        id: 'water-treatment',
        type: 'circle',
        source: 'water-infrastructure',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'subtype'], 'treatment'], 8,    // Treatment plants larger
            ['==', ['get', 'subtype'], 'wastewater'], 8,   // Wastewater plants larger
            ['==', ['get', 'subtype'], 'storage'], 6,      // Storage medium
            ['==', ['get', 'subtype'], 'tower'], 6,        // Towers medium
            4 // Others smaller
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'subtype'], 'treatment'], '#0284c7',    // Blue for treatment
            ['==', ['get', 'subtype'], 'wastewater'], '#0369a1',  // Darker blue for wastewater
            ['==', ['get', 'subtype'], 'storage'], '#38bdf8',     // Light blue for storage
            ['==', ['get', 'subtype'], 'tower'], '#38bdf8',       // Light blue for towers
            '#0891b2' // Medium blue for others
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
      
      console.log('✅ Added water infrastructure layers');
      
    } catch (error) {
      console.error('❌ Failed to load water data:', error);
      this.addMockWaterLayers(map);
    }
  }
  
  /**
   * Add mock power layers when offline data is not available
   */
  private addMockPowerLayers(map: maptilersdk.Map) {
    console.log('🔌 Adding mock power infrastructure...');
    
    const mockPowerData = {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [-0.1276, 51.5074] },
          properties: { name: 'Central London Substation', subtype: 'transmission', voltage: 275000, operator: 'National Grid' }
        },
        {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [-0.2416, 51.5194] },
          properties: { name: 'West London Substation', subtype: 'primary', voltage: 132000, operator: 'UK Power Networks' }
        },
        {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [-0.0759, 51.5155] },
          properties: { name: 'City Substation', subtype: 'secondary', voltage: 33000, operator: 'UK Power Networks' }
        }
      ]
    };
    
    map.addSource('power-infrastructure', {
      type: 'geojson',
      data: mockPowerData
    });
    
    map.addLayer({
      id: 'power-substations',
      type: 'circle',
      source: 'power-infrastructure',
      paint: {
        'circle-radius': 8,
        'circle-color': [
          'case',
          ['>=', ['to-number', ['get', 'voltage'], 0], 275000], '#dc2626',
          ['>=', ['to-number', ['get', 'voltage'], 0], 110000], '#ef4444',
          '#f97316'
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });
    
    console.log('✅ Added mock power infrastructure');
  }
  
  /**
   * Add mock telecoms layers when offline data is not available
   */
  private addMockTelecomsLayers(map: maptilersdk.Map) {
    console.log('📡 Adding mock telecoms infrastructure...');
    
    const mockTelecomsData = {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [-0.1389, 51.5186] },
          properties: { name: 'BT Tower', subtype: 'tower', height: '189', operator: 'BT' }
        },
        {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [-0.0759, 51.5155] },
          properties: { name: 'City Data Center', subtype: 'datacenter', operator: 'Equinix' }
        },
        {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [-0.2416, 51.5194] },
          properties: { name: 'West London Tower', subtype: 'tower', height: '120', operator: 'Vodafone' }
        }
      ]
    };
    
    map.addSource('telecom-infrastructure', {
      type: 'geojson',
      data: mockTelecomsData
    });
    
    map.addLayer({
      id: 'telecom-towers',
      type: 'circle',
      source: 'telecom-infrastructure',
      filter: ['==', ['get', 'subtype'], 'tower'],
      paint: {
        'circle-radius': 6,
        'circle-color': '#10b981',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });
    
    map.addLayer({
      id: 'telecom-datacenters',
      type: 'circle',
      source: 'telecom-infrastructure',
      filter: ['==', ['get', 'subtype'], 'datacenter'],
      paint: {
        'circle-radius': 8,
        'circle-color': '#059669',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });
    
    console.log('✅ Added mock telecoms infrastructure');
  }
  
  /**
   * Add mock transport layers when offline data is not available
   */
  private addMockTransportLayers(map: maptilersdk.Map) {
    console.log('🚇 Adding mock transport infrastructure...');
    
    const mockTransportData = {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [-0.4543, 51.4700] },
          properties: { name: 'Heathrow Airport', subtype: 'airport', operator: 'BAA', iata_code: 'LHR' }
        },
        {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [-0.1276, 51.5074] },
          properties: { name: 'King\'s Cross Station', subtype: 'rail', operator: 'Network Rail' }
        },
        {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [-0.0759, 51.5155] },
          properties: { name: 'Liverpool Street Station', subtype: 'rail', operator: 'Network Rail' }
        }
      ]
    };
    
    map.addSource('transport-infrastructure', {
      type: 'geojson',
      data: mockTransportData
    });
    
    map.addLayer({
      id: 'transport-hubs',
      type: 'circle',
      source: 'transport-infrastructure',
      paint: {
        'circle-radius': [
          'case',
          ['==', ['get', 'subtype'], 'airport'], 12,
          ['==', ['get', 'subtype'], 'rail'], 8,
          6
        ],
        'circle-color': '#0284c7',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });
    
    console.log('✅ Added mock transport infrastructure');
  }
  
  /**
   * Add mock water layers when offline data is not available
   */
  private addMockWaterLayers(map: maptilersdk.Map) {
    console.log('💧 Adding mock water infrastructure...');
    
    const mockWaterData = {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [-0.1276, 51.5074] },
          properties: { name: 'Thames Water Treatment Works', subtype: 'treatment', operator: 'Thames Water' }
        },
        {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [-0.2416, 51.5194] },
          properties: { name: 'West London Wastewater Plant', subtype: 'wastewater', operator: 'Thames Water' }
        },
        {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [-0.0759, 51.5155] },
          properties: { name: 'City Pumping Station', subtype: 'pumping', operator: 'Thames Water' }
        }
      ]
    };
    
    map.addSource('water-infrastructure', {
      type: 'geojson',
      data: mockWaterData
    });
    
    map.addLayer({
      id: 'water-treatment',
      type: 'circle',
      source: 'water-infrastructure',
      filter: ['==', ['get', 'subtype'], 'treatment'],
      paint: {
        'circle-radius': 8,
        'circle-color': '#0284c7',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });
    
    map.addLayer({
      id: 'water-wastewater',
      type: 'circle',
      source: 'water-infrastructure',
      filter: ['==', ['get', 'subtype'], 'wastewater'],
      paint: {
        'circle-radius': 8,
        'circle-color': '#0369a1',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });
    
    map.addLayer({
      id: 'water-pumping',
      type: 'circle',
      source: 'water-infrastructure',
      filter: ['==', ['get', 'subtype'], 'pumping'],
      paint: {
        'circle-radius': 6,
        'circle-color': '#0891b2',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });
    
    console.log('✅ Added mock water infrastructure');
  }

  /**
   * Add comprehensive mock infrastructure when all else fails
   */
  private addMockInfrastructure(map: maptilersdk.Map) {
    console.log('🔄 Adding comprehensive mock infrastructure...');
    
    this.addMockPowerLayers(map);
    this.addMockTelecomsLayers(map);
    this.addMockTransportLayers(map);
    this.addMockWaterLayers(map);
    
    console.log('✅ Added comprehensive mock infrastructure');
  }
  
  /**
   * Load emergency/vulnerable sites from cached GeoJSON
   */
  async loadEmergencySites(map: maptilersdk.Map, city: string) {
    try {
      const response = await fetch(`/data/${city}/emergency.geojson`);
      if (!response.ok) {
        console.log(`ℹ️ Emergency sites data not available for ${city} (${response.status})`);
        return;
      }
      
      // Check content type to avoid parsing HTML as JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.log(`ℹ️ Emergency sites data not available for ${city} - got ${contentType || 'unknown'} instead of JSON`);
        return;
      }
      
      const data = await response.json();
      
      map.addSource('emergency-sites', {
        type: 'geojson',
        data: data
      });
      
      // Hospitals
      map.addLayer({
        id: 'hospitals',
        type: 'symbol',
        source: 'emergency-sites',
        filter: ['==', ['get', 'amenity'], 'hospital'],
        layout: {
          'icon-image': 'hospital-15',
          'icon-size': 1.5
        }
      });
      
      // Schools
      map.addLayer({
        id: 'schools',
        type: 'symbol',
        source: 'emergency-sites',
        filter: ['==', ['get', 'amenity'], 'school'],
        layout: {
          'icon-image': 'school-15',
          'icon-size': 1.2
        }
      });
      
    } catch (error) {
      console.error('Failed to load emergency sites:', error);
    }
  }

  /**
   * Add cluster interaction handlers
   */
  addClusterHandlers(map: maptilersdk.Map) {
    // Power cluster click to zoom
    map.on('click', 'power-clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['power-clusters']
      });
      
      if (features.length > 0) {
        const clusterId = features[0].properties?.cluster_id;
        if (clusterId) {
          // Get zoom level to expand cluster
          (map.getSource('power-infrastructure') as any).getClusterExpansionZoom(
            clusterId,
            (err: any, zoom: number) => {
              if (err) return;
              
              map.easeTo({
                center: (features[0].geometry as any).coordinates,
                zoom: zoom + 0.5 // Zoom slightly past expansion point
              });
            }
          );
        }
      }
    });
    
    // Cursor pointer on cluster hover
    map.on('mouseenter', 'power-clusters', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    
    map.on('mouseleave', 'power-clusters', () => {
      map.getCanvas().style.cursor = '';
    });
    
    // Show cluster popup on hover
    map.on('mouseenter', 'power-clusters', (e) => {
      if (e.features && e.features[0]) {
        const feature = e.features[0];
        const properties = feature.properties;
        
        new maptilersdk.Popup({
          closeButton: false,
          closeOnClick: false
        })
          .setLngLat((feature.geometry as any).coordinates)
          .setHTML(`
            <div class="p-2 text-sm">
              <strong>${properties?.point_count} Power Assets</strong><br>
              Critical: ${properties?.critical_count || 0}<br>
              High Priority: ${properties?.high_count || 0}<br>
              <em>Click to zoom in</em>
            </div>
          `)
          .addTo(map);
      }
    });
    
    map.on('mouseleave', 'power-clusters', () => {
      // Remove popup
      const popups = document.getElementsByClassName('maplibregl-popup');
      if (popups.length) {
        popups[0].remove();
      }
    });
  }

  /**
   * Add click handlers for infrastructure assets
   */
  addAssetClickHandlers(map: maptilersdk.Map) {
    // Power substations click handler
    const powerLayers = ['power-substations', 'power-substations-secondary', 'power-generation'];
    powerLayers.forEach(layerId => {
      map.on('click', layerId, (e) => {
        if (e.features && e.features[0]) {
          const feature = e.features[0];
          const properties = feature.properties;
          
          new maptilersdk.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`
              <div class="p-2">
                <h3 class="font-bold text-red-600">Power Infrastructure</h3>
                <p><strong>Name:</strong> ${properties?.name || 'Unnamed'}</p>
                <p><strong>Type:</strong> ${properties?.subtype || 'Substation'}</p>
                <p><strong>Voltage:</strong> ${properties?.voltage || 'Unknown'} V</p>
                <p><strong>Operator:</strong> ${properties?.operator || 'Unknown'}</p>
                <p><strong>Criticality:</strong> ${properties?.criticality || 'Medium'}</p>
              </div>
            `)
            .addTo(map);
        }
      });
      
      map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
      });
    });

    // Telecom infrastructure click handlers
    const telecomLayers = ['telecom-towers', 'telecom-datacenters'];
    telecomLayers.forEach(layerId => {
      map.on('click', layerId, (e) => {
        if (e.features && e.features[0]) {
          const feature = e.features[0];
          const properties = feature.properties;
          
          new maptilersdk.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`
              <div class="p-2">
                <h3 class="font-bold text-green-600">Telecom Infrastructure</h3>
                <p><strong>Name:</strong> ${properties?.name || 'Unnamed'}</p>
                <p><strong>Type:</strong> ${properties?.subtype || 'Tower'}</p>
                <p><strong>Height:</strong> ${properties?.height || 'Unknown'} m</p>
                <p><strong>Operator:</strong> ${properties?.operator || 'Unknown'}</p>
                <p><strong>Criticality:</strong> ${properties?.criticality || 'Medium'}</p>
              </div>
            `)
            .addTo(map);
        }
      });
      
      map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
      });
    });

    // Transport infrastructure click handlers
    const transportLayers = ['transport-hubs', 'transport-logistics'];
    transportLayers.forEach(layerId => {
      map.on('click', layerId, (e) => {
        if (e.features && e.features[0]) {
          const feature = e.features[0];
          const properties = feature.properties;
          
          new maptilersdk.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`
              <div class="p-2">
                <h3 class="font-bold text-blue-600">Transport Infrastructure</h3>
                <p><strong>Name:</strong> ${properties?.name || 'Unnamed'}</p>
                <p><strong>Type:</strong> ${properties?.subtype || 'Hub'}</p>
                <p><strong>Operator:</strong> ${properties?.operator || 'Unknown'}</p>
                <p><strong>IATA:</strong> ${properties?.iata_code || 'N/A'}</p>
                <p><strong>Criticality:</strong> ${properties?.criticality || 'Medium'}</p>
              </div>
            `)
            .addTo(map);
        }
      });
      
      map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
      });
    });

    // Water infrastructure click handlers
    const waterLayers = ['water-treatment', 'water-wastewater', 'water-storage', 'water-pumping'];
    waterLayers.forEach(layerId => {
      map.on('click', layerId, (e) => {
        if (e.features && e.features[0]) {
          const feature = e.features[0];
          const properties = feature.properties;
          
          new maptilersdk.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`
              <div class="p-2">
                <h3 class="font-bold text-blue-600">Water Infrastructure</h3>
                <p><strong>Name:</strong> ${properties?.name || 'Unnamed'}</p>
                <p><strong>Type:</strong> ${properties?.subtype || 'Water Facility'}</p>
                <p><strong>Operator:</strong> ${properties?.operator || 'Unknown'}</p>
                <p><strong>Criticality:</strong> ${properties?.criticality || 'Medium'}</p>
              </div>
            `)
            .addTo(map);
        }
      });
      
      map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
      });
    });
  }
}