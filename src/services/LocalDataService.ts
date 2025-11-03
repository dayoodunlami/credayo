// Service to load infrastructure data from local JSON files
import type { InfrastructureAsset } from '../data/infrastructure';

interface LocalDataFile {
  city: string;
  type: string;
  timestamp: number;
  count: number;
  assets: InfrastructureAsset[];
}

export class LocalDataService {
  private static readonly DATA_BASE_URL = '/data';
  
  public static async loadLayerData(city: string, layerType: string): Promise<InfrastructureAsset[]> {
    try {
      console.log(`📁 Loading ${layerType} data for ${city}...`);
      
      const response = await fetch(`${this.DATA_BASE_URL}/${city}-${layerType}.json`);
      
      if (!response.ok) {
        throw new Error(`Failed to load ${layerType} data: ${response.status}`);
      }
      
      const data: LocalDataFile = await response.json();
      
      console.log(`✅ Loaded ${data.count} ${layerType} assets from local file`);
      console.log(`   File timestamp: ${new Date(data.timestamp).toLocaleString()}`);
      
      return data.assets;
      
    } catch (error) {
      console.error(`❌ Failed to load ${layerType} data for ${city}:`, error);
      return [];
    }
  }
  
  public static async loadAllLayers(city: string): Promise<InfrastructureAsset[]> {
    const layers = ['power', 'transport', 'telecom'];
    const allAssets: InfrastructureAsset[] = [];
    
    console.log(`📂 Loading all infrastructure layers for ${city}...`);
    
    for (const layer of layers) {
      const assets = await this.loadLayerData(city, layer);
      allAssets.push(...assets);
    }
    
    console.log(`✅ Total loaded: ${allAssets.length} infrastructure assets`);
    console.log(`   Power: ${allAssets.filter(a => a.type === 'power').length}`);
    console.log(`   Transport: ${allAssets.filter(a => a.type === 'transport').length}`);
    console.log(`   Telecom: ${allAssets.filter(a => a.type === 'telecom').length}`);
    
    return allAssets;
  }
  
  public static async testSampleData(): Promise<boolean> {
    try {
      console.log('🧪 Testing sample data loading...');
      
      // Try to load the sample file
      const response = await fetch('/data/london-power-sample.json');
      
      if (!response.ok) {
        throw new Error(`Sample file not found: ${response.status}`);
      }
      
      const data: LocalDataFile = await response.json();
      
      console.log('✅ Sample data loaded successfully:');
      console.log(`   City: ${data.city}`);
      console.log(`   Type: ${data.type}`);
      console.log(`   Count: ${data.count}`);
      console.log(`   Assets: ${data.assets.length}`);
      
      // Validate structure
      if (data.assets.length > 0) {
        const firstAsset = data.assets[0];
        console.log('📋 First asset structure:');
        console.log(`   ID: ${firstAsset.id}`);
        console.log(`   Name: ${firstAsset.name}`);
        console.log(`   Type: ${firstAsset.type}`);
        console.log(`   Coordinates: [${firstAsset.coordinates.join(', ')}]`);
        console.log(`   Status: ${firstAsset.status}`);
        console.log(`   Criticality: ${firstAsset.criticality}`);
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Sample data test failed:', error);
      return false;
    }
  }
}