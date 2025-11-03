/**
 * OPTIMIZED MAP CONTAINER
 * 
 * Lightweight map component with:
 * - Fast initialization
 * - Single service integration
 * - Heatmap cascade visualization
 * - No memory leaks
 */

import React, { useRef, useEffect, useState } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import { OptimizedInfrastructureService } from '../services/OptimizedInfrastructureService';

interface OptimizedMapContainerProps {
  onMapLoad?: (map: maptilersdk.Map, service: OptimizedInfrastructureService) => void;
  onAssetClick?: (assetId: string, assetName: string) => void;
}

const OptimizedMapContainer: React.FC<OptimizedMapContainerProps> = ({ 
  onMapLoad, 
  onAssetClick 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maptilersdk.Map | null>(null);
  const service = useRef<OptimizedInfrastructureService | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (map.current) return; // Initialize only once

    const initializeMap = async () => {
      try {
        console.log('🗺️ Initializing optimized map...');
        
        // Set MapTiler API key
        const apiKey = import.meta.env.VITE_MAPTILER_KEY;
        if (!apiKey) {
          throw new Error('MapTiler API key not found. Please add VITE_MAPTILER_KEY to your .env file.');
        }

        maptilersdk.config.apiKey = apiKey;

        // Create map with optimized settings
        map.current = new maptilersdk.Map({
          container: mapContainer.current!,
          style: maptilersdk.MapStyle.STREETS,
          center: [-0.1276, 51.5074], // London
          zoom: 11,
          pitch: 0,
          bearing: 0,
          maxZoom: 18,
          minZoom: 8
        });

        // Initialize infrastructure service
        service.current = new OptimizedInfrastructureService();

        map.current.on('load', async () => {
          try {
            console.log('✅ Map loaded, initializing infrastructure service...');
            
            if (service.current && map.current) {
              await service.current.initialize(map.current);
              
              // Set up asset click handlers
              setupAssetClickHandlers();
              
              setIsLoading(false);
              
              if (onMapLoad) {
                onMapLoad(map.current, service.current);
              }
              
              console.log('🚀 Optimized map ready!');
            }
          } catch (serviceError) {
            console.error('❌ Service initialization failed:', serviceError);
            setError('Failed to initialize infrastructure service');
            setIsLoading(false);
          }
        });

        map.current.on('error', (e) => {
          console.error('❌ Map error:', e);
          setError('Map failed to load');
          setIsLoading(false);
        });

      } catch (err) {
        console.error('❌ Map initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize map');
        setIsLoading(false);
      }
    };

    const setupAssetClickHandlers = () => {
      if (!map.current) return;

      // Click handlers for different asset types
      const assetLayers = ['primary-substations', 'secondary-substations', 'critical-facilities'];
      
      assetLayers.forEach(layerId => {
        map.current!.on('click', layerId, (e) => {
          if (e.features && e.features.length > 0) {
            const feature = e.features[0];
            const assetId = feature.properties?.id;
            const assetName = feature.properties?.name;
            
            if (assetId && onAssetClick) {
              onAssetClick(assetId, assetName);
            }
          }
        });

        // Change cursor on hover
        map.current!.on('mouseenter', layerId, () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = 'pointer';
          }
        });

        map.current!.on('mouseleave', layerId, () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = '';
          }
        });
      });

      console.log('✅ Asset click handlers configured');
    };

    initializeMap();

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      if (service.current) {
        service.current = null;
      }
    };
  }, [onMapLoad, onAssetClick]);

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
        <div className="text-center p-6 max-w-md">
          <div className="text-red-600 text-lg font-semibold mb-2">
            Map Error
          </div>
          <div className="text-gray-600 text-sm mb-4">
            {error}
          </div>
          <div className="text-xs text-gray-500">
            <p>Check your .env file for VITE_MAPTILER_KEY</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div
        ref={mapContainer}
        className="w-full h-full"
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-10">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <div className="text-lg font-semibold">Loading Infrastructure Map...</div>
            <div className="text-sm text-gray-300 mt-2">Optimized for fast performance</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizedMapContainer;