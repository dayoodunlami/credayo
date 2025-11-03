// OpenInfraMap Data Service
// Fetches real infrastructure data from OpenStreetMap via Overpass API

import type { InfrastructureAsset } from '../data/infrastructure';

interface CityBounds {
  name: string;
  bbox: [number, number, number, number]; // [south, west, north, east]
}

// City boundaries for data fetching
const CITY_BOUNDS: Record<string, CityBounds> = {
  london: {
    name: 'London',
    bbox: [51.28, -0.51, 51.69, 0.33] // Greater London area
  },
  bristol: {
    name: 'Bristol', 
    bbox: [51.35, -2.75, 51.55, -2.45]
  },
  manchester: {
    name: 'Manchester',
    bbox: [53.35, -2.35, 53.55, -2.15]
  }
};

export class OpenInfraService {
  private static readonly OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  
  // Fetch power infrastructure (substations, power plants, generation)
  private static buildPowerQuery(bbox: number[]): string {
    return `
      [out:json][timeout:45];
      (
        node["power"="substation"](${bbox.join(',')});
        node["power"="plant"](${bbox.join(',')});
        node["power"="generator"]["generator:source"~"^(wind|solar|nuclear|gas|coal|hydro)$"](${bbox.join(',')});
        way["power"="substation"](${bbox.join(',')});
        way["power"="plant"](${bbox.join(',')});
        way["power"="generator"](${bbox.join(',')});
      );
      out center meta;
    `;
  }

  // Fetch transport infrastructure (airports, rail, ports, logistics)
  private static buildTransportQuery(bbox: number[]): string {
    return `
      [out:json][timeout:45];
      (
        node["aeroway"="aerodrome"](${bbox.join(',')});
        node["railway"="station"](${bbox.join(',')});
        node["public_transport"="station"](${bbox.join(',')});
        node["harbour"="yes"](${bbox.join(',')});
        node["landuse"="port"](${bbox.join(',')});
        node["industrial"="logistics"](${bbox.join(',')});
        way["aeroway"="aerodrome"](${bbox.join(',')});
        way["railway"="station"](${bbox.join(',')});
        way["landuse"="port"](${bbox.join(',')});
        way["industrial"="logistics"](${bbox.join(',')});
      );
      out center meta;
    `;
  }

  // Fetch telecom infrastructure (data centers, fiber, towers, satellite)
  private static buildTelecomQuery(bbox: number[]): string {
    return `
      [out:json][timeout:45];
      (
        node["man_made"="mast"]["tower:type"="communication"](${bbox.join(',')});
        node["man_made"="tower"]["tower:type"="communication"](${bbox.join(',')});
        node["telecom"](${bbox.join(',')});
        node["building"="data_centre"](${bbox.join(',')});
        node["man_made"="communications_tower"](${bbox.join(',')});
        node["communication"="line"](${bbox.join(',')});
        way["man_made"="mast"](${bbox.join(',')});
        way["building"="data_centre"](${bbox.join(',')});
        way["landuse"="industrial"]["industrial"="telecommunications"](${bbox.join(',')});
      );
      out center meta;
    `;
  }



  private static async fetchOverpassData(query: string): Promise<any> {
    try {
      console.log('🌐 Making Overpass API request...');
      const response = await fetch(this.OVERPASS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(query)}`
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Overpass API error ${response.status}:`, errorText);
        throw new Error(`Overpass API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Overpass API response: ${data.elements?.length || 0} elements`);
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch from Overpass API:', error);
      throw error;
    }
  }

  private static parseOverpassElement(element: any, type: InfrastructureAsset['type']): InfrastructureAsset | null {
    // Get coordinates (handle both nodes and ways)
    let coordinates: [number, number];
    if (element.type === 'node') {
      coordinates = [element.lon, element.lat];
    } else if (element.center) {
      coordinates = [element.center.lon, element.center.lat];
    } else {
      return null; // Skip if no coordinates
    }

    const tags = element.tags || {};
    const name = tags.name || tags['name:en'] || `${type.charAt(0).toUpperCase() + type.slice(1)} ${element.id}`;

    // Determine subtype and criticality
    let subtype: string = '';
    let criticality: InfrastructureAsset['criticality'] = 'medium';
    let voltage: number | undefined;

    if (type === 'power') {
      const voltageStr = tags.voltage || tags['voltage:primary'] || '';
      voltage = parseInt(voltageStr) || 0;
      
      if (tags.power === 'plant' || tags.power === 'generator') {
        subtype = 'generation';
        criticality = 'critical';
      } else if (voltage >= 275) {
        subtype = 'transmission';
        criticality = 'critical';
      } else if (voltage >= 110) {
        subtype = 'primary';
        criticality = 'high';
      } else if (voltage >= 11) {
        subtype = 'secondary';
        criticality = 'medium';
      } else {
        subtype = 'secondary';
        criticality = 'low';
      }
    } else if (type === 'transport') {
      if (tags.aeroway === 'aerodrome') {
        subtype = 'airport';
        criticality = 'critical';
      } else if (tags.railway === 'station') {
        subtype = 'rail';
        criticality = 'high';
      } else if (tags.harbour || tags.landuse === 'port') {
        subtype = 'port';
        criticality = 'high';
      } else {
        subtype = 'logistics';
        criticality = 'medium';
      }
    } else if (type === 'telecom') {
      if (tags.building === 'data_centre') {
        subtype = 'datacenter';
        criticality = 'critical';
      } else if (tags.communication === 'line') {
        subtype = 'fiber';
        criticality = 'high';
      } else if (tags['tower:type'] === 'communication') {
        subtype = 'tower';
        criticality = 'medium';
      } else {
        subtype = 'tower';
        criticality = 'medium';
      }
    } else if (type === 'water') {
      if (tags.man_made === 'water_treatment_plant') {
        subtype = 'treatment';
        criticality = 'critical';
      } else if (tags.man_made === 'pumping_station') {
        subtype = 'pumping';
        criticality = 'high';
      } else if (tags.landuse === 'reservoir' || tags.water === 'reservoir') {
        subtype = 'storage';
        criticality = 'high';
      } else {
        subtype = 'distribution';
        criticality = 'medium';
      }
    } else if (type === 'emergency') {
      if (tags.amenity === 'hospital') {
        subtype = 'hospital';
        criticality = 'critical';
      } else if (tags.amenity === 'fire_station') {
        subtype = 'fire';
        criticality = 'high';
      } else if (tags.amenity === 'police') {
        subtype = 'police';
        criticality = 'high';
      } else if (tags.amenity === 'school') {
        subtype = 'school';
        criticality = 'medium';
      } else if (tags.amenity === 'nursing_home') {
        subtype = 'care';
        criticality = 'high';
      }
    }

    // Build comprehensive metadata
    const metadata: any = {};
    
    // Operator information (critical for dependencies)
    if (tags.operator) metadata.operator = tags.operator;
    if (tags['operator:short']) metadata.operator_short = tags['operator:short'];
    if (tags.network) metadata.network = tags.network;
    if (tags.owner) metadata.owner = tags.owner;
    
    // Technical specifications
    if (tags.voltage) metadata.voltage = tags.voltage;
    if (tags['voltage:primary']) metadata.voltage_primary = tags['voltage:primary'];
    if (tags['voltage:secondary']) metadata.voltage_secondary = tags['voltage:secondary'];
    if (tags.frequency) metadata.frequency = tags.frequency;
    if (tags.capacity) metadata.capacity = tags.capacity;
    if (tags.ref) metadata.reference = tags.ref;
    
    // Power-specific details
    if (tags['substation:type']) metadata.substation_type = tags['substation:type'];
    if (tags['generator:source']) metadata.fuel_type = tags['generator:source'];
    if (tags['generator:output:electricity']) metadata.generation_mw = parseFloat(tags['generator:output:electricity']);
    if (tags['generator:type']) metadata.generator_type = tags['generator:type'];
    
    // Transport-specific details
    if (tags.railway) metadata.railway_type = tags.railway;
    if (tags.public_transport) metadata.transport_type = tags.public_transport;
    if (tags.aeroway) metadata.aeroway_type = tags.aeroway;
    if (tags.iata) metadata.iata_code = tags.iata;
    if (tags.icao) metadata.icao_code = tags.icao;
    
    // Telecom-specific details
    if (tags['tower:type']) metadata.tower_type = tags['tower:type'];
    if (tags['communication:mobile_phone']) metadata.mobile_operator = tags['communication:mobile_phone'];
    if (tags['communication:internet']) metadata.internet_provider = tags['communication:internet'];
    
    // Water-specific details
    if (tags['water:method']) metadata.treatment_method = tags['water:method'];
    if (tags['pumping_station:type']) metadata.pumping_type = tags['pumping_station:type'];
    if (tags.volume) metadata.storage_volume = tags.volume;
    
    // Emergency services details
    if (tags.emergency === 'yes') metadata.emergency_services = true;
    if (tags.beds) metadata.beds = parseInt(tags.beds);
    if (tags['emergency:phone']) metadata.emergency_phone = tags['emergency:phone'];
    if (tags.healthcare) metadata.healthcare_type = tags.healthcare;
    
    // Operational status and dates
    if (tags.start_date) metadata.commissioned = tags.start_date;
    if (tags.end_date) metadata.decommissioned = tags.end_date;
    if (tags.construction) metadata.construction_status = tags.construction;
    
    // Contact and administrative info
    if (tags.phone) metadata.phone = tags.phone;
    if (tags.website) metadata.website = tags.website;
    if (tags.email) metadata.email = tags.email;

    return {
      id: `${type}_${subtype}_${element.id}`,
      name,
      type,
      subtype,
      coordinates,
      status: 'normal',
      criticality,
      voltage,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined
    };
  }

  public static async fetchCityInfrastructure(cityKey: string): Promise<InfrastructureAsset[]> {
    const city = CITY_BOUNDS[cityKey];
    if (!city) {
      throw new Error(`Unknown city: ${cityKey}`);
    }

    console.log(`🔄 Fetching infrastructure data for ${city.name}...`);
    
    const cacheKey = `openinfra_${cityKey}`;
    const cached = localStorage.getItem(cacheKey);
    
    // Check cache
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < this.CACHE_DURATION) {
        console.log(`✅ Using cached data for ${city.name} (${data.length} assets)`);
        return data;
      }
    }

    try {
      console.log('🌐 Making API requests to Overpass API...');
      // Fetch only the working infrastructure types (power, transport, telecom)
      const [powerData, transportData, telecomData] = await Promise.all([
        this.fetchOverpassData(this.buildPowerQuery(city.bbox)),
        this.fetchOverpassData(this.buildTransportQuery(city.bbox)),
        this.fetchOverpassData(this.buildTelecomQuery(city.bbox))
      ]);
      
      console.log('📊 API Response Summary:');
      console.log(`   Power elements: ${powerData.elements?.length || 0}`);
      console.log(`   Transport elements: ${transportData.elements?.length || 0}`);
      console.log(`   Telecom elements: ${telecomData.elements?.length || 0}`);

      // Parse and combine all data
      const allAssets: InfrastructureAsset[] = [];

      // Process power infrastructure
      powerData.elements?.forEach((element: any) => {
        const asset = this.parseOverpassElement(element, 'power');
        if (asset) allAssets.push(asset);
      });

      // Process transport infrastructure  
      transportData.elements?.forEach((element: any) => {
        const asset = this.parseOverpassElement(element, 'transport');
        if (asset) allAssets.push(asset);
      });

      // Process telecom infrastructure
      telecomData.elements?.forEach((element: any) => {
        const asset = this.parseOverpassElement(element, 'telecom');
        if (asset) allAssets.push(asset);
      });

      console.log(`✅ Fetched ${allAssets.length} infrastructure assets for ${city.name}`);
      console.log(`   Power: ${allAssets.filter(a => a.type === 'power').length}`);
      console.log(`   Transport: ${allAssets.filter(a => a.type === 'transport').length}`);
      console.log(`   Telecom: ${allAssets.filter(a => a.type === 'telecom').length}`);

      // Try to cache the results, but don't fail if localStorage is full
      try {
        // Create a lighter version for caching (remove some metadata to save space)
        const lightAssets = allAssets.map(asset => ({
          id: asset.id,
          name: asset.name,
          type: asset.type,
          subtype: asset.subtype,
          coordinates: asset.coordinates,
          status: asset.status,
          criticality: asset.criticality,
          capacity: asset.capacity,
          voltage: asset.voltage,
          // Keep only essential metadata
          metadata: asset.metadata ? {
            operator: asset.metadata.operator,
            voltage: asset.metadata.voltage,
            reference: asset.metadata.reference,
            iata_code: asset.metadata.iata_code,
            railway_type: asset.metadata.railway_type,
            tower_type: asset.metadata.tower_type
          } : undefined
        }));

        const cacheData = JSON.stringify({
          data: lightAssets,
          timestamp: Date.now()
        });
        
        // Check if data is still too large (rough estimate: 5MB limit)
        if (cacheData.length > 5 * 1024 * 1024) {
          console.log(`⚠️ Dataset too large for localStorage cache (${(cacheData.length / 1024 / 1024).toFixed(1)}MB), skipping cache`);
        } else {
          localStorage.setItem(cacheKey, cacheData);
          console.log(`✅ Data cached successfully (${(cacheData.length / 1024 / 1024).toFixed(1)}MB)`);
        }
      } catch (error) {
        console.log('⚠️ Failed to cache data (localStorage full), continuing without cache:', error instanceof Error ? error.message : error);
      }

      return allAssets;

    } catch (error) {
      console.error(`❌ Failed to fetch infrastructure for ${city.name}:`, error);
      
      // Return cached data if available, even if expired
      if (cached) {
        const { data } = JSON.parse(cached);
        console.log(`⚠️ Using expired cache for ${city.name} (${data.length} assets)`);
        return data;
      }
      
      throw error;
    }
  }

  public static async detectCity(bounds: any): Promise<string> {
    // Simple city detection based on map bounds
    const center = {
      lat: (bounds.getNorth() + bounds.getSouth()) / 2,
      lng: (bounds.getEast() + bounds.getWest()) / 2
    };

    // Check which city the center point falls into
    for (const [key, city] of Object.entries(CITY_BOUNDS)) {
      const [south, west, north, east] = city.bbox;
      if (center.lat >= south && center.lat <= north && 
          center.lng >= west && center.lng <= east) {
        return key;
      }
    }

    return 'london'; // Default to London
  }

  public static getCityList(): string[] {
    return Object.keys(CITY_BOUNDS);
  }

  public static clearCache(): void {
    Object.keys(CITY_BOUNDS).forEach(city => {
      localStorage.removeItem(`openinfra_${city}`);
    });
    console.log('🗑️ OpenInfra cache cleared');
  }

  public static getStorageInfo(): { used: number; available: number; total: number } {
    let used = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length;
      }
    }
    
    // Rough estimate of localStorage limit (usually 5-10MB)
    const total = 5 * 1024 * 1024; // 5MB estimate
    const available = total - used;
    
    return { used, available, total };
  }
}