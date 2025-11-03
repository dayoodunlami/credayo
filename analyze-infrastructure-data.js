// Script to analyze infrastructure data and extract unique subtypes and metadata
import fs from 'fs';

function analyzeInfrastructureData() {
  const sectors = ['power', 'transport', 'telecom', 'water'];
  
  sectors.forEach(sector => {
    console.log(`\n🔍 ANALYZING ${sector.toUpperCase()} INFRASTRUCTURE`);
    console.log('='.repeat(50));
    
    try {
      const data = JSON.parse(fs.readFileSync(`public/data/london-${sector}.json`, 'utf8'));
      
      // Analyze subtypes
      const subtypes = new Set();
      const criticalityLevels = new Set();
      const operators = new Set();
      const metadataKeys = new Set();
      const voltageRanges = [];
      
      data.assets.forEach(asset => {
        subtypes.add(asset.subtype);
        criticalityLevels.add(asset.criticality);
        
        if (asset.voltage) voltageRanges.push(asset.voltage);
        
        if (asset.metadata) {
          Object.keys(asset.metadata).forEach(key => metadataKeys.add(key));
          if (asset.metadata.operator) operators.add(asset.metadata.operator);
          if (asset.metadata.fuel_type) operators.add(`Fuel: ${asset.metadata.fuel_type}`);
          if (asset.metadata.railway_type) operators.add(`Rail: ${asset.metadata.railway_type}`);
          if (asset.metadata.tower_type) operators.add(`Tower: ${asset.metadata.tower_type}`);
        }
      });
      
      console.log(`📊 Total Assets: ${data.count}`);
      console.log(`🏷️  Subtypes: ${Array.from(subtypes).join(', ')}`);
      console.log(`⚡ Criticality: ${Array.from(criticalityLevels).join(', ')}`);
      console.log(`🏢 Operators/Types: ${Array.from(operators).slice(0, 10).join(', ')}${operators.size > 10 ? '...' : ''}`);
      console.log(`🔧 Metadata Keys: ${Array.from(metadataKeys).join(', ')}`);
      
      if (voltageRanges.length > 0) {
        const minV = Math.min(...voltageRanges.filter(v => v > 0));
        const maxV = Math.max(...voltageRanges);
        console.log(`⚡ Voltage Range: ${minV}V - ${maxV}V`);
      }
      
      // Sample a few assets to see structure
      console.log('\n📋 Sample Assets:');
      data.assets.slice(0, 3).forEach((asset, i) => {
        console.log(`  ${i+1}. ${asset.name} (${asset.subtype}) - ${asset.criticality}`);
        if (asset.metadata) {
          console.log(`     Metadata: ${JSON.stringify(asset.metadata)}`);
        }
      });
      
    } catch (error) {
      console.error(`❌ Error analyzing ${sector}:`, error.message);
    }
  });
}

analyzeInfrastructureData();