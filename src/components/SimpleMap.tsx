import { useEffect, useRef } from 'react';
import { Map, config, MapStyle } from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';

const SimpleMap: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);

  useEffect(() => {
    if (map.current) return; // stops map from intializing more than once

    // Set API key using the exact approach from MapTiler docs
    config.apiKey = '9TGjdYW7sdX8esnxc6jG';

    if (mapContainer.current) {
      // Add a small delay to avoid conflicts with other maps
      setTimeout(() => {
        if (mapContainer.current) {
          map.current = new Map({
            container: mapContainer.current,
            style: MapStyle.STREETS, // Use the built-in style constant
            center: [-2.2426, 53.4808], // Manchester coordinates (different from main map)
            zoom: 12
          });

          map.current.on('load', () => {
            console.log('✅ MapTiler SDK Test map loaded successfully!');
          });

          map.current.on('error', (e) => {
            console.error('❌ MapTiler SDK Test map error:', e);
          });
        }
      }, 1000); // 1 second delay
    }

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  return (
    <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>🗺️ MapTiler SDK Test</h2>
      <div ref={mapContainer} style={{ width: '100%', height: '400px' }} />
      <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
        Using exact MapTiler SDK code from documentation
      </p>
    </div>
  );
};

export default SimpleMap;