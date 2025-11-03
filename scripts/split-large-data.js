/**
 * Split large JSON files into smaller chunks for faster loading
 */
import fs from 'fs';
import path from 'path';

// Configuration
const CHUNK_SIZE = 1000; // Assets per chunk
const INPUT_DIR = 'public/data';
const OUTPUT_DIR = 'public/data/chunks';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Process london-power.json
const powerData = JSON.parse(fs.readFileSync(path.join(INPUT_DIR, 'london-power.json'), 'utf8'));
console.log(`Processing ${powerData.assets.length} power assets...`);

// Create metadata file
const metadata = {
  city: powerData.city,
  type: powerData.type,
  timestamp: powerData.timestamp,
  totalCount: powerData.count,
  chunkSize: CHUNK_SIZE,
  totalChunks: Math.ceil(powerData.assets.length / CHUNK_SIZE)
};

fs.writeFileSync(
  path.join(OUTPUT_DIR, 'london-power-metadata.json'), 
  JSON.stringify(metadata, null, 2)
);

// Split into chunks
for (let i = 0; i < powerData.assets.length; i += CHUNK_SIZE) {
  const chunk = powerData.assets.slice(i, i + CHUNK_SIZE);
  const chunkNumber = Math.floor(i / CHUNK_SIZE);
  
  const chunkData = {
    chunkNumber,
    totalChunks: metadata.totalChunks,
    count: chunk.length,
    assets: chunk
  };
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, `london-power-chunk-${chunkNumber}.json`),
    JSON.stringify(chunkData, null, 2)
  );
  
  console.log(`Created chunk ${chunkNumber}: ${chunk.length} assets`);
}

console.log(`✅ Split into ${metadata.totalChunks} chunks of ~${CHUNK_SIZE} assets each`);
console.log(`📊 Original: 9.2MB → Chunks: ~${Math.round(9.2 / metadata.totalChunks * 100) / 100}MB each`);