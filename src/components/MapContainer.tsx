import { useEffect, useRef, useState } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import { DataService } from '../services/DataService';
import CesiumViewer from './CesiumViewer';
import ViewModeToggle from './ViewModeToggle';
import type { ViewMode } from '../types';

interface MapContainerProps {
  onMapLoad?: (map: maptilersdk.Map, dataService: DataService) => void;
  initialViewMode?: ViewMode;
}

const MapContainer: React.FC<MapContainerProps> = ({ onMapLoad, initialViewMode = '2d' }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maptilersdk.Map | null>(null);
  const dataService = useRef<DataService | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-0.1276, 51.5074]);
  const [mapZoom, setMapZoom] = useState(10);
  const [mapBearing, setMapBearing] = useState(0);
  const [mapPitch, setMapPitch] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyStatus, setApiKeyStatus] = useState<'testing' | 'found' | 'none'>('testing');

  useEffect(() => {
    if (map.current) return; // Initialize map only once

    // Temporarily hardcode the API key to test
    const apiKey = '9TGjdYW7sdX8esnxc6jG';
    
    console.log('🔑 Using hardcoded API Key for testing');
    
    // Set the API key globally (MapTiler SDK requirement)
    maptilersdk.config.apiKey = apiKey;

    if (mapContainer.current) {
      try {
        setApiKeyStatus('found');
        
        // Create map using MapTiler SDK
        map.current = new maptilersdk.Map({
          container: mapContainer.current,
          style: maptilersdk.MapStyle.STREETS,
          center: [-0.1276, 51.5074], // London coordinates
          zoom: 10,
          pitch: 0,
          bearing: 0
        });

        map.current.on('load', async () => {
          console.log('✅ Map loaded successfully!');
          
          // Initialize data service and load infrastructure layers
          if (map.current) {
            dataService.current = new DataService();
            
            try {
              // Add infrastructure layers using offline GeoJSON data
              await dataService.current.addInfrastructureLayers(map.current, 'london');
              
              // Add click handlers for asset popups
              dataService.current.addAssetClickHandlers(map.current);
              
              // Load emergency sites from cached file (London by default)
              await dataService.current.loadEmergencySites(map.current, 'london');
              
              console.log('✅ All infrastructure layers loaded successfully!');
            } catch (error) {
              console.error('❌ Error loading infrastructure layers:', error);
            }
          }
          
          setIsLoading(false);
          if (onMapLoad && map.current && dataService.current) {
            onMapLoad(map.current, dataService.current);
          }
        });

        map.current.on('error', (e: any) => {
          console.warn('⚠️ Map loading issue:', e);
          // Don't fail the entire map for data loading issues
          // The DataService has fallback mechanisms
          if (e.error?.message?.includes('Failed to fetch') && e.sourceId) {
            console.log(`🔄 Data source ${e.sourceId} unavailable, using fallbacks`);
          } else {
            console.error('❌ Critical map error:', e);
            setError(`Map loading failed: ${e.error?.message || 'Unknown error'}`);
            setIsLoading(false);
          }
        });

      } catch (err) {
        console.error('❌ Map initialization error:', err);
        setError(`Failed to initialize map: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsLoading(false);
      }
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [onMapLoad]);



  if (error) {
    return (
      <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-red-600 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Map Error</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <div className="text-xs text-gray-500">
            <p>To fix this:</p>
            <p>1. Get a free API key from <a href="https://cloud.maptiler.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">MapTiler</a></p>
            <p>2. Create a .env file with: VITE_MAPTILER_KEY=your_key_here</p>
            <p>3. Restart the development server</p>
          </div>
        </div>
      </div>
    );
  }

  const handleViewModeChange = (newMode: ViewMode) => {
    console.log(`🔄 Switching to ${newMode} view mode`);
    
    if (newMode === '2d' || newMode === '3d') {
      // MapTiler modes
      if (map.current) {
        const newPitch = newMode === '3d' ? 60 : 0;
        map.current.easeTo({
          pitch: newPitch,
          duration: 1000
        });
      }
    }
    
    setViewMode(newMode);
  };

  const handleCameraChange = (center: [number, number], zoom: number, bearing: number, pitch: number) => {
    setMapCenter(center);
    setMapZoom(zoom);
    setMapBearing(bearing);
    setMapPitch(pitch);
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-gray-100">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">
              {apiKeyStatus === 'testing' ? 'Testing API keys...' : 'Loading map...'}
            </p>
          </div>
        </div>
      )}
      
      {/* MapTiler 2D/3D View */}
      <div 
        ref={mapContainer} 
        className="w-full h-full"
        style={{ display: viewMode === 'photorealistic' ? 'none' : 'block' }}
      />
      
      {/* Cesium Photorealistic 3D View */}
      <CesiumViewer
        viewMode={viewMode}
        center={mapCenter}
        zoom={mapZoom}
        bearing={mapBearing}
        pitch={mapPitch}
        onViewModeChange={handleViewModeChange}
        onCameraChange={handleCameraChange}
      />
      
      {/* View Mode Toggle - Right side, below header navigation */}
      {!isLoading && !error && (
        <div className="absolute top-32 right-4 z-10">
          <ViewModeToggle
            currentMode={viewMode}
            onModeChange={handleViewModeChange}
            disabled={isLoading}
          />
        </div>
      )}
    </div>
  );
};

export default MapContainer;