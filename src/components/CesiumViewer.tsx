/**
 * CESIUM VIEWER COMPONENT
 * 
 * Provides photorealistic 3D visualization using Cesium with Google 3D Tiles
 * Based on Google Maps 3D Area Explorer patterns
 */

import React, { useEffect, useRef, useState } from 'react';
import type { ViewMode } from '../types';

// Cesium imports
import * as Cesium from 'cesium';
import { CesiumInfrastructureService } from '../services/CesiumInfrastructureService';

interface CesiumViewerProps {
  viewMode: ViewMode;
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
  onViewModeChange: (mode: ViewMode) => void;
  onCameraChange?: (center: [number, number], zoom: number, bearing: number, pitch: number) => void;
  tileSource?: '3d-tiles-osm' | '3d-tiles-google' | '3d-tiles-ion' | 'terrain-only';
}

const CesiumViewer: React.FC<CesiumViewerProps> = ({
  viewMode,
  center,
  zoom,
  bearing,
  pitch,
  onViewModeChange,
  onCameraChange,
  tileSource = '3d-tiles-osm' // Default to OSM Buildings (fastest and most reliable)
}) => {
  const cesiumContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const infrastructureServiceRef = useRef<CesiumInfrastructureService | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Cesium viewer
  useEffect(() => {
    if (!cesiumContainerRef.current || viewerRef.current) return;

    const initializeCesium = async () => {
      try {
        console.log('🌍 Initializing Cesium viewer...');

        // Set Cesium Ion access token
        const cesiumIonToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
        
        if (!cesiumIonToken) {
          throw new Error('Cesium Ion token not found. Please add VITE_CESIUM_ION_TOKEN to your .env file.');
        }

        // Set the Cesium Ion access token
        Cesium.Ion.defaultAccessToken = cesiumIonToken;

        // Create terrain provider
        const terrainProvider = await Cesium.createWorldTerrainAsync();

        // Initialize Cesium viewer optimized for Google Photorealistic 3D Tiles
        const viewer = new Cesium.Viewer(cesiumContainerRef.current!, {
          // UI Controls
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          geocoder: false, // Disable geocoder to avoid compatibility issues
          homeButton: false,
          infoBox: true, // Enable for feature inspection
          sceneModePicker: false,
          selectionIndicator: true, // Enable for feature selection
          timeline: false,
          navigationHelpButton: false,
          navigationInstructionsInitiallyVisible: false,
          
          // Terrain and imagery - optimized for photorealistic tiles
          terrainProvider,
          
          // Performance optimizations for photorealistic content
          requestRenderMode: true,
          maximumRenderTimeChange: Infinity,
        });

        // Load 3D tiles based on selected source
        await load3DTiles(viewer, tileSource);
        
        async function load3DTiles(viewer: Cesium.Viewer, source: string) {
          switch (source) {
            case '3d-tiles-osm':
              await loadOsmBuildings(viewer);
              break;
            case '3d-tiles-google':
              await loadGooglePhotorealistic(viewer);
              break;
            case '3d-tiles-ion':
              await loadOsmIon(viewer);
              break;
            case 'terrain-only':
              await loadTerrainOnly(viewer);
              break;
            default:
              await loadOsmBuildings(viewer); // Default fallback
          }
        }
        
        async function loadOsmBuildings(viewer: Cesium.Viewer) {
          try {
            console.log('🏢 Loading OSM Buildings (Async - Recommended)...');
            
            const osmBuildings = await Cesium.createOsmBuildingsAsync();
            viewer.scene.primitives.add(osmBuildings);
            
            console.log('✅ OSM Buildings loaded successfully');
            
            // Configure for optimal performance
            osmBuildings.maximumScreenSpaceError = 2;
            osmBuildings.skipLevelOfDetail = true;
            osmBuildings.baseScreenSpaceError = 1024;
            osmBuildings.skipScreenSpaceErrorFactor = 16;
            
            // Set camera for OSM buildings
            viewer.camera.setView({
              destination: Cesium.Cartesian3.fromDegrees(-0.1276, 51.5074, 800),
              orientation: {
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-45),
                roll: 0.0
              }
            });
            
          } catch (osmError) {
            console.warn('⚠️ OSM Buildings (Async) failed, trying Ion asset fallback:', osmError);
            await loadOsmIon(viewer);
          }
        }
        
        async function loadGooglePhotorealistic(viewer: Cesium.Viewer) {
          if (typeof Cesium.createGooglePhotorealistic3DTileset !== 'function') {
            console.warn('⚠️ Google Photorealistic not available, falling back to OSM Buildings');
            await loadOsmBuildings(viewer);
            return;
          }
          
          try {
            console.log('🌍 Loading Google Photorealistic 3D Tiles...');
            
            const googleTileset = await Cesium.createGooglePhotorealistic3DTileset();
            viewer.scene.primitives.add(googleTileset);
            
            console.log('✅ Google Photorealistic 3D Tiles loaded successfully');
            
            // Configure for quality over performance
            googleTileset.maximumScreenSpaceError = 1;
            googleTileset.skipLevelOfDetail = true;
            
            // Set camera for photorealistic viewing
            viewer.camera.setView({
              destination: Cesium.Cartesian3.fromDegrees(-0.1276, 51.5074, 500),
              orientation: {
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-30),
                roll: 0.0
              }
            });
            
          } catch (googleError) {
            console.warn('⚠️ Google Photorealistic failed, falling back to OSM Buildings:', googleError);
            await loadOsmBuildings(viewer);
          }
        }
        
        async function loadOsmIon(viewer: Cesium.Viewer) {
          try {
            console.log('🏢 Loading OSM Buildings (Ion Asset)...');
            
            const osmTileset = await Cesium.Cesium3DTileset.fromIonAssetId(96188);
            viewer.scene.primitives.add(osmTileset);
            
            console.log('✅ OSM Buildings (Ion) loaded successfully');
            
            // Configure Ion tileset
            osmTileset.maximumScreenSpaceError = 2;
            osmTileset.skipLevelOfDetail = true;
            
            // Set camera for Ion OSM buildings
            viewer.camera.setView({
              destination: Cesium.Cartesian3.fromDegrees(-0.1276, 51.5074, 1000),
              orientation: {
                heading: 0.0,
                pitch: Cesium.Math.toRadians(-45),
                roll: 0.0
              }
            });
            
          } catch (ionError) {
            console.warn('⚠️ OSM Buildings (Ion) failed, using terrain only:', ionError);
            await loadTerrainOnly(viewer);
          }
        }
        
        async function loadTerrainOnly(viewer: Cesium.Viewer) {
          console.log('🌍 Using terrain only (no 3D buildings)');
          
          // Set camera for terrain viewing
          viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(-0.1276, 51.5074, 2000),
            orientation: {
              heading: 0.0,
              pitch: Cesium.Math.toRadians(-30),
              roll: 0.0
            }
          });
        }

        // Configure scene for optimal photorealistic visualization
        viewer.scene.globe.enableLighting = true;
        viewer.scene.globe.dynamicAtmosphereLighting = true;
        viewer.scene.globe.atmosphereLightIntensity = 10.0;
        
        // Enhanced lighting for photorealistic tiles
        viewer.scene.light = new Cesium.DirectionalLight({
          direction: new Cesium.Cartesian3(0.2, 0.5, -0.8) // Softer lighting angle
        });
        
        // Better fog and atmosphere for realism
        viewer.scene.fog.enabled = true;
        viewer.scene.fog.density = 0.0002;
        viewer.scene.fog.screenSpaceErrorFactor = 2.0;
        
        // High dynamic range for better color representation
        viewer.scene.highDynamicRange = true;
        
        // Disable default double-click behavior
        viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

        // Add camera change listener
        viewer.camera.changed.addEventListener(() => {
          if (onCameraChange) {
            const position = viewer.camera.positionCartographic;
            const longitude = Cesium.Math.toDegrees(position.longitude);
            const latitude = Cesium.Math.toDegrees(position.latitude);
            const heading = Cesium.Math.toDegrees(viewer.camera.heading);
            const pitch = Cesium.Math.toDegrees(viewer.camera.pitch);
            
            // Convert height to approximate zoom level (rough approximation)
            const zoom = Math.max(0, Math.min(20, 20 - Math.log2(position.height / 500)));
            
            onCameraChange([longitude, latitude], zoom, heading, pitch);
          }
        });

        viewerRef.current = viewer;
        
        // Initialize infrastructure service
        infrastructureServiceRef.current = new CesiumInfrastructureService(viewer);
        
        // Load infrastructure assets (with error handling)
        try {
          await infrastructureServiceRef.current.loadInfrastructureAssets('london');
        } catch (infraError) {
          console.warn('⚠️ Infrastructure loading failed, but Cesium viewer still functional:', infraError);
        }
        
        setIsInitialized(true);
        
        console.log('✅ Cesium viewer initialized with infrastructure assets');

      } catch (err) {
        console.error('❌ Failed to initialize Cesium viewer:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize 3D viewer');
      }
    };

    initializeCesium();
  }, [onCameraChange]);

  // Handle camera position updates
  useEffect(() => {
    if (!viewerRef.current || !isInitialized) return;

    const viewer = viewerRef.current;
    
    // Convert coordinates and fly to position
    const destination = Cesium.Cartesian3.fromDegrees(
      center[0], // longitude
      center[1], // latitude
      1000 // height in meters
    );

    viewer.camera.flyTo({
      destination,
      orientation: {
        heading: Cesium.Math.toRadians(bearing),
        pitch: Cesium.Math.toRadians(pitch),
        roll: 0.0
      },
      duration: 2.0
    });

  }, [center, zoom, bearing, pitch, isInitialized]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (infrastructureServiceRef.current) {
        infrastructureServiceRef.current.clearAssets();
        infrastructureServiceRef.current = null;
      }
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center p-6">
          <div className="text-red-600 text-lg font-semibold mb-2">
            3D Viewer Error
          </div>
          <div className="text-gray-600 text-sm mb-4">
            {error}
          </div>
          <button
            onClick={() => onViewModeChange('2d')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Switch to 2D View
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div
        ref={cesiumContainerRef}
        className="w-full h-full"
        style={{ 
          display: viewMode === 'photorealistic' ? 'block' : 'none',
          minHeight: '400px' // Ensure minimum height for Cesium
        }}
      />
      
      {!isInitialized && viewMode === 'photorealistic' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <div className="text-lg font-semibold">Loading 3D View...</div>
            <div className="text-sm text-gray-300 mt-2">Initializing 3D buildings</div>
          </div>
        </div>
      )}
      
      {/* Debug info - remove in production */}
      {viewMode === 'photorealistic' && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs p-2 rounded z-20">
          Status: {isInitialized ? '✅ Ready' : '⏳ Loading...'}
          {error && <div className="text-red-400">Error: {error}</div>}
        </div>
      )}
    </div>
  );
};

export default CesiumViewer;