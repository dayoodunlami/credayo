// Script to download infrastructure data from OpenInfraMap and save locally
import fs from 'fs';
import path from 'path';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// London bounds
const LONDON_BBOX = [51.28, -0.51, 51.69, 0.33]; // [south, west, north, east]

// Build queries for each infrastructure type
const buildPowerQuery = (bbox) => `
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

const buildTransportQuery = (bbox) => `
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

const buildTelecomQuery = (bbox) => `
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

const buildWaterQuery = (bbox) => `
  [out:json][timeout:45];
  (
    node["man_made"="water_treatment_plant"](${bbox.join(',')});
    node["man_made"="pumping_station"](${bbox.join(',')});
    node["man_made"="water_works"](${bbox.join(',')});
    node["man_made"="wastewater_plant"](${bbox.join(',')});
    node["man_made"="sewage_treatment_plant"](${bbox.join(',')});
    node["landuse"="reservoir"](${bbox.join(',')});
    node["water"="reservoir"](${bbox.join(',')});
    node["amenity"="water_point"](${bbox.join(',')});
    node["man_made"="water_tower"](${bbox.join(',')});
    way["man_made"="water_treatment_plant"](${bbox.join(',')});
    way["man_made"="pumping_station"](${bbox.join(',')});
    way["man_made"="water_works"](${bbox.join(',')});
    way["man_made"="wastewater_plant"](${bbox.join(',')});
    way["man_made"="sewage_treatment_plant"](${bbox.join(',')});
    way["landuse"="reservoir"](${bbox.join(',')});
    way["water"="reservoir"](${bbox.join(',')});
    way["man_made"="water_tower"](${bbox.join(',')});
  );
  out center meta;
`;

async function fetchOverpassData(query) {
  try {
    console.log('🌐 Making Overpass API request...');
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Overpass API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ Received ${data.elements?.length || 0} elements`);
    return data;
  } catch (error) {
    console.error('❌ Failed to fetch from Overpass API:', error);
    throw error;
  }
}

function parseOverpassElement(element, type) {
  // Get coordinates (handle both nodes and ways)
  let coordinates;
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
  let subtype = '';
  let criticality = 'medium';
  let voltage;

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
    if (tags.man_made === 'water_treatment_plant' || tags.man_made === 'water_works') {
      subtype = 'treatment';
      criticality = 'critical';
    } else if (tags.man_made === 'wastewater_plant' || tags.man_made === 'sewage_treatment_plant') {
      subtype = 'wastewater';
      criticality = 'critical';
    } else if (tags.man_made === 'pumping_station') {
      subtype = 'pumping';
      criticality = 'high';
    } else if (tags.landuse === 'reservoir' || tags.water === 'reservoir') {
      subtype = 'storage';
      criticality = 'high';
    } else if (tags.man_made === 'water_tower') {
      subtype = 'tower';
      criticality = 'medium';
    } else {
      subtype = 'distribution';
      criticality = 'medium';
    }
  }

  // Build essential metadata only
  const metadata = {};
  if (tags.operator) metadata.operator = tags.operator;
  if (tags.network) metadata.network = tags.network;
  if (tags.ref) metadata.reference = tags.ref;
  if (tags.voltage) metadata.voltage = tags.voltage;
  if (tags['substation:type']) metadata.substation_type = tags['substation:type'];
  if (tags['generator:source']) metadata.fuel_type = tags['generator:source'];
  if (tags.railway) metadata.railway_type = tags.railway;
  if (tags.iata) metadata.iata_code = tags.iata;
  if (tags['tower:type']) metadata.tower_type = tags['tower:type'];
  if (tags.capacity) metadata.capacity = tags.capacity;
  if (tags.volume) metadata.volume = tags.volume;
  if (tags['water:method']) metadata.treatment_method = tags['water:method'];
  if (tags['pumping_station:type']) metadata.pumping_type = tags['pumping_station:type'];

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

async function downloadInfrastructureData() {
  console.log('🚀 Starting infrastructure data download for London...');
  
  // Create data directory if it doesn't exist
  const dataDir = path.join(process.cwd(), 'public', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const layers = [
    { name: 'power', query: buildPowerQuery(LONDON_BBOX) },
    { name: 'transport', query: buildTransportQuery(LONDON_BBOX) },
    { name: 'telecom', query: buildTelecomQuery(LONDON_BBOX) },
    { name: 'water', query: buildWaterQuery(LONDON_BBOX) }
  ];

  for (const layer of layers) {
    try {
      console.log(`\n📡 Downloading ${layer.name} infrastructure...`);
      
      const rawData = await fetchOverpassData(layer.query);
      const assets = [];

      // Parse elements
      rawData.elements?.forEach(element => {
        const asset = parseOverpassElement(element, layer.name);
        if (asset) assets.push(asset);
      });

      console.log(`✅ Processed ${assets.length} ${layer.name} assets`);

      // Save to file
      const filename = path.join(dataDir, `london-${layer.name}.json`);
      fs.writeFileSync(filename, JSON.stringify({
        city: 'london',
        type: layer.name,
        timestamp: Date.now(),
        count: assets.length,
        assets
      }, null, 2));

      console.log(`💾 Saved to ${filename}`);
      
      // Wait a bit between requests to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Failed to download ${layer.name} data:`, error);
    }
  }

  console.log('\n🎉 Infrastructure data download complete!');
}

// Run the download
downloadInfrastructureData().catch(console.error);