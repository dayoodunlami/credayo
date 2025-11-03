/**
 * OFFLINE CASCADE PRE-COMPUTATION SCRIPT
 * 
 * This script pre-computes cascade results for ALL assets and stores them as JSON.
 * Run this once to generate instant cascade lookups.
 * 
 * Usage: node scripts/precompute-cascades.js
 */

const fs = require('fs');
const path = require('path');

// Mock the cascade engine for Node.js environment
class MockAdvancedCascadeEngine {
  constructor(assets) {
    this.assets = assets;
    this.assetMap = new Map(assets.map(asset => [asset.id, asset]));
  }

  simulateCascade(triggerId, options = {}) {
    const triggerAsset = this.assetMap.get(triggerId);
    if (!triggerAsset) {
      throw new Error(`Asset ${triggerId} not found`);
    }

    const {
      maxDepth = 5,
      timeWindow = 3600,
      probabilityThreshold = 0.1
    } = options;

    // Simple cascade simulation for pre-computation
    const impacts = [];
    const timeline = [];
    const visited = new Set([triggerId]);
    
    let currentTime = 1000; // Start at 1 second

    // Find nearby assets within cascade radius
    const cascadeRadius = 5000; // 5km in meters
    const nearbyAssets = this.assets.filter(asset => {
      if (asset.id === triggerId) return false;
      
      const distance = this.calculateDistance(
        triggerAsset.coordinates,
        asset.coordinates
      );
      
      return distance <= cascadeRadius;
    });

    // Create impacts for nearby assets
    nearbyAssets.forEach((asset, index) => {
      const distance = this.calculateDistance(
        triggerAsset.coordinates,
        asset.coordinates
      );

      // Determine impact type based on distance and asset type
      let impactType = 'cascade';
      if (distance < 1000) impactType = 'direct';
      if (asset.type !== triggerAsset.type) impactType = 'cross-sector';
      if (distance > 3000) impactType = 'potential';

      // Calculate probability based on distance and criticality
      const baseProbability = asset.criticality === 'critical' ? 0.8 : 
                             asset.criticality === 'high' ? 0.6 : 0.4;
      const distanceFactor = Math.max(0.1, 1 - (distance / cascadeRadius));
      const probability = baseProbability * distanceFactor;

      if (probability >= probabilityThreshold) {
        const impact = {
          assetId: asset.id,
          sourceAssetId: triggerId,
          impactType,
          probability,
          timeToImpact: currentTime + (index * 500), // 500ms between impacts
          reason: `${impactType} impact from ${triggerAsset.name || triggerId}`
        };

        impacts.push(impact);
        timeline.push(impact);
      }
    });

    // Add secondary cascades for power networks (cascades from cascaded assets)
    if (triggerAsset.type === 'power') {
      const primaryImpacts = impacts.filter(i => i.impactType === 'direct' || i.impactType === 'cascade');
      
      primaryImpacts.forEach((primaryImpact, primaryIndex) => {
        const primaryAsset = this.assetMap.get(primaryImpact.assetId);
        if (!primaryAsset) return;

        // Find assets that could be affected by this cascaded asset
        const secondaryTargets = nearbyAssets.filter(asset => {
          if (asset.id === primaryImpact.assetId) return false; // Don't cascade to self
          if (impacts.some(i => i.assetId === asset.id)) return false; // Already affected
          
          const distanceFromPrimary = this.calculateDistance(
            primaryAsset.coordinates,
            asset.coordinates
          );
          
          return distanceFromPrimary <= cascadeRadius * 0.6; // Secondary cascade has shorter range
        });

        secondaryTargets.slice(0, 2).forEach((secondaryAsset, secondaryIndex) => {
          const secondaryDistance = this.calculateDistance(
            primaryAsset.coordinates,
            secondaryAsset.coordinates
          );

          const secondaryProbability = 0.4 * (1 - (secondaryDistance / (cascadeRadius * 0.6)));
          
          if (secondaryProbability >= probabilityThreshold) {
            const secondaryImpact = {
              assetId: secondaryAsset.id,
              sourceAssetId: primaryImpact.assetId,
              impactType: 'cascade',
              probability: secondaryProbability,
              timeToImpact: primaryImpact.timeToImpact + 1000 + (secondaryIndex * 300), // After primary impact
              reason: `Secondary cascade from ${primaryAsset.name || primaryImpact.assetId}`
            };

            impacts.push(secondaryImpact);
            timeline.push(secondaryImpact);
          }
        });
      });
    }

    // Sort timeline by time
    timeline.sort((a, b) => a.timeToImpact - b.timeToImpact);

    return {
      initiatingAsset: {
        id: triggerId,
        coordinates: triggerAsset.coordinates,
        name: triggerAsset.name || triggerId
      },
      impacts,
      totalAffected: impacts.length + 1,
      economicCost: impacts.length * 500000,
      populationAffected: impacts.length * 25000,
      timeline
    };
  }

  calculateDistance(coord1, coord2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (coord2[1] - coord1[1]) * Math.PI / 180;
    const dLon = (coord2[0] - coord1[0]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(coord1[1] * Math.PI / 180) * Math.cos(coord2[1] * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

async function loadAssets() {
  console.log('📂 Loading infrastructure assets...');
  
  const assets = [];
  const dataDir = path.join(__dirname, '../public/data');
  
  // Load all infrastructure data files
  const files = [
    'london-power-sample.json'
    // Add more files as needed
  ];

  for (const file of files) {
    try {
      const filePath = path.join(dataDir, file);
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Extract assets from the data structure
        if (data.assets) {
          assets.push(...data.assets);
        } else if (Array.isArray(data)) {
          assets.push(...data);
        } else if (data.features) {
          // GeoJSON format
          const geoAssets = data.features.map(feature => ({
            id: feature.properties.id || feature.id,
            name: feature.properties.name,
            type: feature.properties.type || 'power',
            subtype: feature.properties.subtype,
            coordinates: feature.geometry.coordinates,
            criticality: feature.properties.criticality || 'medium',
            servicePopulation: feature.properties.servicePopulation || 10000,
            dependencies: [],
            dependents: []
          }));
          assets.push(...geoAssets);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Could not load ${file}:`, error.message);
    }
  }

  console.log(`✅ Loaded ${assets.length} assets`);
  return assets;
}

async function precomputeAllCascades() {
  console.log('🚀 Starting cascade pre-computation...');
  
  const assets = await loadAssets();
  if (assets.length === 0) {
    console.error('❌ No assets found. Check your data files.');
    return;
  }

  const engine = new MockAdvancedCascadeEngine(assets);
  const cascadeCache = {};
  
  let completed = 0;
  const total = assets.length;

  for (const asset of assets) {
    try {
      console.log(`🔄 Computing cascade for ${asset.id} (${completed + 1}/${total})`);
      
      cascadeCache[asset.id] = engine.simulateCascade(asset.id, {
        maxDepth: 5,
        timeWindow: 3600,
        probabilityThreshold: 0.1
      });
      
      completed++;
      
      // Progress indicator
      if (completed % 10 === 0) {
        console.log(`📊 Progress: ${completed}/${total} (${Math.round(completed/total*100)}%)`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to compute cascade for ${asset.id}:`, error.message);
    }
  }

  // Ensure output directory exists
  const outputDir = path.join(__dirname, '../public/data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save to public directory so it can be loaded by the app
  const outputPath = path.join(outputDir, 'cascade-cache.json');
  fs.writeFileSync(outputPath, JSON.stringify(cascadeCache, null, 2));

  console.log(`✅ Pre-computed ${completed} cascades`);
  console.log(`💾 Saved to: ${outputPath}`);
  console.log(`📊 File size: ${Math.round(fs.statSync(outputPath).size / 1024)}KB`);
  
  // Also create a backup with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(outputDir, `cascade-cache-${timestamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(cascadeCache, null, 2));
  console.log(`💾 Backup saved to: ${backupPath}`);
  
  // Generate summary
  const totalImpacts = Object.values(cascadeCache).reduce((sum, result) => sum + result.impacts.length, 0);
  console.log(`📈 Total impacts computed: ${totalImpacts}`);
  console.log(`⚡ Average impacts per cascade: ${Math.round(totalImpacts / completed)}`);
}

// Run the pre-computation
precomputeAllCascades().catch(console.error);