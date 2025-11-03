import React, { useState, useCallback, useRef, useEffect } from 'react';
import ExpandableLayerControls from '../controls/ExpandableLayerControls';
import SearchAndFilters from '../controls/SearchAndFilters';
import SimulationControls from '../controls/SimulationControls';
import LiveDashboard from '../dashboard/LiveDashboard';
import MapContainer from '../MapContainer';
import { DataService } from '../../services/DataService';
import { SearchService } from '../../services/SearchService';
import { CascadeSimulator } from '../../services/CascadeSimulator';
import { CascadeVisualizationController } from '../../services/CascadeVisualization';
import { AdvancedCascadeEngine } from '../../services/AdvancedCascadeEngine';
import { AdvancedCascadeAnimationController } from '../../services/AdvancedCascadeAnimation';
import { OptimizedCascadeAnimationController } from '../../services/OptimizedCascadeAnimationController';
import { CachedCascadeEngine } from '../../services/CachedCascadeEngine';
import { SimpleCascadeService } from '../../services/SimpleCascadeService';
import { CameraService } from '../../services/CameraService';
import { ProgressiveStoryService } from '../../services/ProgressiveStoryService';
import StoryboardPopup from '../StoryboardPopup';
import type { StoryPoint } from '../../services/CameraService';
import type { StoryChapter } from '../../services/ProgressiveStoryService';
import type { SearchResult } from '../../services/SearchService';
import type { CascadeConfig, CascadeState } from '../../services/CascadeSimulator';
import { Popup } from '@maptiler/sdk';

// Debounce utility for performance optimization
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
// import maplibregl from 'maplibre-gl'; // Removed unused import

// Types
// Legacy interface - removed as no longer used

// Legacy interface - removed as no longer used

interface DashboardMetrics {
  economicImpact: number;
  populationAffected: number;
  assetsAtRisk: number;
  vulnerableSites: {
    hospitals: number;
    schools: number;
    careHomes: number;
  };
  criticalAssets: number;
}

const MainLayout: React.FC = () => {
  // State management
  const [systemStatus] = useState<'online' | 'offline' | 'degraded'>('online');
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'layers' | 'search' | 'simulation'>('layers');
  const [cascadeState, setCascadeState] = useState<CascadeState | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<{
    id: string;
    name: string;
    type: string;
    criticality: string;
    operator: string;
  } | null>(null);
  const dataService = useRef<DataService | null>(null);
  const searchService = useRef<SearchService | null>(null);
  const cascadeSimulator = useRef<CascadeSimulator | null>(null);
  const cascadeVisualization = useRef<CascadeVisualizationController | null>(null);
  const advancedCascadeEngine = useRef<AdvancedCascadeEngine | null>(null);
  const advancedCascadeAnimation = useRef<AdvancedCascadeAnimationController | null>(null);
  const optimizedCascadeAnimation = useRef<OptimizedCascadeAnimationController | null>(null);
  const cachedCascadeEngine = useRef<CachedCascadeEngine | null>(null);
  const simpleCascadeService = useRef<SimpleCascadeService | null>(null);
  const cameraService = useRef<CameraService | null>(null);
  const progressiveStoryService = useRef<ProgressiveStoryService | null>(null);
  const [animationSystem, setAnimationSystem] = useState<'basic' | 'advanced' | 'optimized'>('basic');
  const [simulationEngine, setSimulationEngine] = useState<'basic' | 'advanced' | 'cached' | 'simple'>('simple');
  const [isOrbiting, setIsOrbiting] = useState(false);
  const [isStoryMode, setIsStoryMode] = useState(false);
  const [orbitSpeed, setOrbitSpeed] = useState(1);
  const [showStoryboard, setShowStoryboard] = useState(false);
  const [currentStoryPoint, setCurrentStoryPoint] = useState<StoryPoint | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const [totalStoryPoints, setTotalStoryPoints] = useState(0);
  const [currentStoryChapter, setCurrentStoryChapter] = useState<StoryChapter | null>(null);
  const map = useRef<any>(null);
  
  // Enhanced layer configuration with expandable sections
  const [layerSections, setLayerSections] = useState([
    {
      id: 'power',
      name: 'Power Infrastructure',
      icon: '⚡',
      color: '#ef4444',
      totalCount: 0,
      expanded: false,
      visible: true,
      opacity: 80,
      subLayers: [
        { id: 'transmission', name: 'Transmission Substations (275kV+)', visible: true, count: 0, defaultOn: true },
        { id: 'primary', name: 'Primary Substations (110-275kV)', visible: true, count: 0, defaultOn: true },
        { id: 'secondary', name: 'Secondary Substations (33-110kV)', visible: false, count: 0, defaultOn: false },
        { id: 'generation', name: 'Power Generation', visible: true, count: 0, defaultOn: true },
        { id: 'solar', name: 'Solar Panels', visible: false, count: 0, defaultOn: false }
      ]
    },
    {
      id: 'water',
      name: 'Water Infrastructure',
      icon: '💧',
      color: '#0284c7',
      totalCount: 0,
      expanded: false,
      visible: true,
      opacity: 80,
      subLayers: [
        { id: 'treatment', name: 'Water Treatment Plants', visible: true, count: 0, defaultOn: true },
        { id: 'wastewater', name: 'Wastewater Treatment', visible: true, count: 0, defaultOn: true },
        { id: 'storage', name: 'Storage & Reservoirs', visible: false, count: 0, defaultOn: false },
        { id: 'pumping', name: 'Pumping Stations', visible: true, count: 0, defaultOn: true }
      ]
    },
    {
      id: 'telecoms',
      name: 'Telecommunications',
      icon: '📡',
      color: '#10b981',
      totalCount: 0,
      expanded: false,
      visible: true,
      opacity: 80,
      subLayers: [
        { id: 'towers', name: 'Communication Towers', visible: true, count: 0, defaultOn: true },
        { id: 'datacenters', name: 'Data Centers', visible: true, count: 0, defaultOn: true },
        { id: 'fiber', name: 'Fiber Infrastructure', visible: false, count: 0, defaultOn: false }
      ]
    },
    {
      id: 'transport',
      name: 'Transport Infrastructure',
      icon: '🚇',
      color: '#3b82f6',
      totalCount: 0,
      expanded: false,
      visible: true,
      opacity: 80,
      subLayers: [
        { id: 'rail', name: 'Railway Stations', visible: true, count: 0, defaultOn: true },
        { id: 'airports', name: 'Airports', visible: true, count: 0, defaultOn: true },
        { id: 'logistics', name: 'Logistics Hubs', visible: false, count: 0, defaultOn: false }
      ]
    }
  ]);

  const [cascadeConfig, setCascadeConfig] = useState<CascadeConfig>({
    radiusKm: 5,
    delaySeconds: 2,
    severity: 0.7,
    crossSectorEnabled: true,
    speedMultiplier: 1
  });

  // Optimized animation configuration
  const optimizedAnimationConfig = {
    speed: cascadeConfig.speedMultiplier === 0.5 ? 'slow' : 
           cascadeConfig.speedMultiplier === 2 ? 'fast' : 'normal',
    showLines: true,
    showPulses: true,
    maxConcurrentAnimations: 15,
    colorScheme: {
      direct: '#dc2626',
      cascade: '#f97316',
      potential: '#fbbf24',
      crossSector: '#a855f7'
    }
  } as const;

  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics>({
    economicImpact: 0,
    populationAffected: 0,
    assetsAtRisk: 0,
    vulnerableSites: {
      hospitals: 0,
      schools: 0,
      careHomes: 0
    },
    criticalAssets: 23
  });

  // Event handlers with useCallback for performance
  const handleSectionToggle = useCallback((sectionId: string, visible: boolean) => {
    setLayerSections(prev => prev.map(section => 
      section.id === sectionId ? { ...section, visible } : section
    ));
    
    // Control actual map layers
    if (map.current) {
      const layerIds = getLayerIdsForType(sectionId);
      layerIds.forEach(id => {
        try {
          if (map.current.getLayer(id)) {
            map.current.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
          }
        } catch (error) {
          console.warn(`Could not toggle layer ${id}:`, error);
        }
      });
      console.log(`✅ Toggled ${sectionId} section: ${visible ? 'visible' : 'hidden'}`);
    }
  }, []);

  const handleSubLayerToggle = useCallback((sectionId: string, subLayerId: string, visible: boolean) => {
    setLayerSections(prev => prev.map(section => 
      section.id === sectionId 
        ? {
            ...section,
            subLayers: section.subLayers.map(sub => 
              sub.id === subLayerId ? { ...sub, visible } : sub
            )
          }
        : section
    ));
    
    // TODO: Implement sub-layer control in Phase 2
    console.log(`🔧 Sub-layer toggle: ${sectionId}.${subLayerId} = ${visible} (Phase 2 feature)`);
  }, []);

  const handleSectionExpand = useCallback((sectionId: string, expanded: boolean) => {
    setLayerSections(prev => prev.map(section => 
      section.id === sectionId ? { ...section, expanded } : section
    ));
  }, []);

  const handleOpacityChange = useCallback((sectionId: string, opacity: number) => {
    setLayerSections(prev => prev.map(section => 
      section.id === sectionId ? { ...section, opacity } : section
    ));
    
    // Update map layer opacity
    if (map.current) {
      const layerIds = getLayerIdsForType(sectionId);
      const opacityValue = opacity / 100; // Convert percentage to 0-1
      
      layerIds.forEach(id => {
        try {
          if (map.current.getLayer(id)) {
            const layer = map.current.getLayer(id);
            if (layer.type === 'circle') {
              map.current.setPaintProperty(id, 'circle-opacity', opacityValue);
            } else if (layer.type === 'line') {
              map.current.setPaintProperty(id, 'line-opacity', opacityValue);
            } else if (layer.type === 'symbol') {
              map.current.setPaintProperty(id, 'icon-opacity', opacityValue);
            }
          }
        } catch (error) {
          console.warn(`Could not change opacity for layer ${id}:`, error);
        }
      });
      console.log(`✅ Changed ${sectionId} opacity to ${opacity}%`);
    }
  }, []);

  const handleStartSimulation = useCallback(async (triggerId?: string) => {
    if (!cascadeSimulator.current) {
      console.error('Cascade simulator not initialized');
      return;
    }

    try {
      let actualTriggerId = triggerId;
      
      // If no trigger provided, find the first available critical asset
      if (!actualTriggerId) {
        const allAssets = cascadeSimulator.current.getAllAssets();
        const criticalAssets = allAssets.filter(asset => asset.criticality === 'critical');
        
        if (criticalAssets.length > 0) {
          actualTriggerId = criticalAssets[0].id;
          console.log('🎯 Using first critical asset as trigger:', actualTriggerId);
        } else if (allAssets.length > 0) {
          actualTriggerId = allAssets[0].id;
          console.log('🎯 Using first available asset as trigger:', actualTriggerId);
        } else {
          throw new Error('No assets available for cascade simulation');
        }
      }
      
      console.log('🚨 Starting basic cascade simulation with trigger:', actualTriggerId);
      
      await cascadeSimulator.current.initializeSimulation(actualTriggerId, cascadeConfig);
      setActiveTab('simulation'); // Switch to simulation tab to show progress
      
    } catch (error: any) {
      console.error('❌ Failed to start cascade simulation:', error);
      
      // More helpful error message
      if (error.message && error.message.includes('not found')) {
        alert(`Asset not found. Try clicking on an asset on the map first, or use the search tab to find assets.`);
      } else {
        alert(`Failed to start simulation: ${error.message}`);
      }
    }
  }, [cascadeConfig]);

  const handleStartSimpleSimulation = useCallback(async (triggerId?: string) => {
    if (!simpleCascadeService.current) {
      console.error('Simple cascade service not initialized');
      return;
    }

    try {
      let actualTriggerId = triggerId;
      
      // If no trigger provided, find the first available asset
      if (!actualTriggerId) {
        const availableAssets = simpleCascadeService.current.getAvailableAssets();
        if (availableAssets.length > 0) {
          actualTriggerId = availableAssets[0];
          console.log('🎯 Using first available asset as trigger:', actualTriggerId);
        } else {
          throw new Error('No assets available for cascade simulation');
        }
      }
      
      console.log(`⚡ Starting INSTANT simple cascade with ${animationSystem.toUpperCase()} animation`);
      console.log('Trigger asset:', actualTriggerId);
      
      // Get cascade result (INSTANT - just lookup)
      const result = simpleCascadeService.current.getCascadeResult(actualTriggerId);
      
      if (!result) {
        throw new Error(`No cascade data found for asset: ${actualTriggerId}`);
      }
      
      console.log(`🚀 Retrieved simple cascade: ${result.impacts.length} impacts`);
      
      // Convert to format expected by animation controllers
      const triggerAsset = simpleCascadeService.current.getAsset(actualTriggerId);
      const animationResult = {
        initiatingAsset: {
          id: actualTriggerId,
          coordinates: triggerAsset?.coordinates || [0, 0],
          name: triggerAsset?.name || actualTriggerId,
          type: (triggerAsset?.type || 'power') as 'power' | 'water' | 'telecoms' | 'transport',
          subtype: triggerAsset?.type || 'power',
          criticality: (triggerAsset?.criticality || 'medium') as 'critical' | 'high' | 'medium' | 'low',
          properties: {},
          suppliesTo: [],
          suppliedBy: [],
          hasBackup: false,
          backupDuration: 0,
          servicePopulation: 10000
        },
        impacts: result.impacts.map(impact => ({
          assetId: impact.assetId,
          sourceAssetId: actualTriggerId,
          impactType: impact.impactType as any,
          probability: impact.probability,
          timeToImpact: impact.delayMs,
          reason: impact.reason
        })),
        timeline: result.impacts.map(impact => ({
          assetId: impact.assetId,
          sourceAssetId: actualTriggerId,
          impactType: impact.impactType as any,
          probability: impact.probability,
          timeToImpact: impact.delayMs,
          reason: impact.reason
        })).sort((a, b) => a.timeToImpact - b.timeToImpact),
        totalAffected: result.totalAffected,
        economicCost: result.impacts.length * 500000,
        populationAffected: result.impacts.length * 25000
      };
      
      // Choose animation system
      if (animationSystem === 'optimized' && optimizedCascadeAnimation.current) {
        await optimizedCascadeAnimation.current.playCascade(animationResult);
        console.log('✅ Optimized cascade animation completed');
      } else if (animationSystem === 'advanced' && advancedCascadeAnimation.current) {
        await advancedCascadeAnimation.current.playCascade(animationResult);
        console.log('✅ Advanced cascade animation completed');
      } else {
        console.log('🔄 Using basic cascade visualization');
      }
      
      setActiveTab('simulation');
      
    } catch (error: any) {
      console.error('❌ Failed to start simple cascade simulation:', error);
      alert(`Failed to start simulation: ${error.message}`);
    }
  }, [animationSystem]);

  const handleStartCachedSimulation = useCallback(async (triggerId?: string) => {
    if (!cachedCascadeEngine.current) {
      console.error('Cached cascade engine not initialized');
      return;
    }

    try {
      let actualTriggerId = triggerId;
      
      // Check if cache is loaded
      const cacheStats = await cachedCascadeEngine.current.getCacheStats();
      
      if (!cacheStats.isLoaded) {
        console.log('⚠️ Cache not available, falling back to real-time advanced simulation');
        // Fallback to advanced simulation
        return handleStartAdvancedSimulation(actualTriggerId);
      }
      
      // If no trigger provided, find the first available asset in cache
      if (!actualTriggerId) {
        const availableAssets = await cachedCascadeEngine.current.getAvailableAssets();
        if (availableAssets.length > 0) {
          actualTriggerId = availableAssets[0];
          console.log('🎯 Using first cached asset as trigger:', actualTriggerId);
        } else {
          console.log('⚠️ No cached assets available, falling back to advanced simulation');
          return handleStartAdvancedSimulation(actualTriggerId);
        }
      }
      
      console.log(`⚡ Starting INSTANT cached cascade with ${animationSystem.toUpperCase()} animation`);
      console.log('Trigger asset:', actualTriggerId);
      
      // Get pre-computed cascade result (INSTANT - 0ms)
      const result = await cachedCascadeEngine.current.getCascadeResult(actualTriggerId);
      
      if (!result) {
        console.log(`⚠️ No cached result for ${actualTriggerId}, falling back to real-time computation`);
        return handleStartAdvancedSimulation(actualTriggerId);
      }
      
      console.log(`🚀 Retrieved cached cascade: ${result.impacts.length} impacts`);
      
      // Choose animation system
      if (animationSystem === 'optimized' && optimizedCascadeAnimation.current) {
        // Use optimized animation controller
        await optimizedCascadeAnimation.current.playCascade(result);
        console.log('✅ Optimized cascade animation completed');
      } else if (animationSystem === 'advanced' && advancedCascadeAnimation.current) {
        // Use advanced animation controller
        await advancedCascadeAnimation.current.playCascade(result);
        console.log('✅ Advanced cascade animation completed');
      } else {
        // Fall back to basic visualization
        console.log('🔄 Using basic cascade visualization');
        // The basic visualization will be handled by the existing cascade visualization system
      }
      
      setActiveTab('simulation'); // Switch to simulation tab to show progress
      
    } catch (error: any) {
      console.error('❌ Cached cascade simulation failed, falling back to advanced simulation:', error);
      
      // Always fallback to advanced simulation instead of showing error
      return handleStartAdvancedSimulation(triggerId);
    }
  }, [animationSystem]);

  const handleStartAdvancedSimulation = useCallback(async (triggerId?: string) => {
    if (!advancedCascadeEngine.current) {
      console.error('Advanced cascade engine not initialized');
      return;
    }

    try {
      let actualTriggerId = triggerId;
      
      // If no trigger provided, find the first available critical asset
      if (!actualTriggerId) {
        const allAssets = advancedCascadeEngine.current.getAllAssets();
        const criticalAssets = allAssets.filter(asset => asset.criticality === 'critical');
        
        if (criticalAssets.length > 0) {
          actualTriggerId = criticalAssets[0].id;
          console.log('🎯 Using first critical asset as trigger:', actualTriggerId);
        } else if (allAssets.length > 0) {
          actualTriggerId = allAssets[0].id;
          console.log('🎯 Using first available asset as trigger:', actualTriggerId);
        } else {
          throw new Error('No assets available for advanced cascade simulation');
        }
      }
      
      console.log(`🚨 Starting advanced cascade simulation with ${animationSystem.toUpperCase()} animation system`);
      console.log('Trigger asset:', actualTriggerId);
      
      // Run advanced cascade simulation
      const result = advancedCascadeEngine.current.simulateCascade(actualTriggerId, {
        includeConditional: true,
        maxDepth: 5,
        timeWindow: 3600,
        probabilityThreshold: 0.1
      });
      
      // Choose animation system
      if (animationSystem === 'optimized' && optimizedCascadeAnimation.current) {
        // Use optimized animation controller
        await optimizedCascadeAnimation.current.playCascade(result);
        console.log('✅ Optimized cascade animation completed');
      } else if (animationSystem === 'advanced' && advancedCascadeAnimation.current) {
        // Use advanced animation controller
        await advancedCascadeAnimation.current.playCascade(result);
        console.log('✅ Advanced cascade animation completed');
      } else {
        // Fall back to basic visualization
        console.log('🔄 Using basic cascade visualization');
        // The basic visualization will be handled by the existing cascade visualization system
      }
      
      setActiveTab('simulation'); // Switch to simulation tab to show progress
      
    } catch (error: any) {
      console.error('❌ Failed to start advanced cascade simulation:', error);
      
      // More helpful error message
      if (error.message && error.message.includes('not found')) {
        alert(`Asset not found. Try clicking on an asset on the map first, or use the search tab to find assets.`);
      } else {
        alert(`Failed to start advanced simulation: ${error.message}`);
      }
    }
  }, [cascadeConfig, animationSystem]);

  const handleResetSimulation = useCallback(() => {
    console.log('🔄 Resetting all cascade simulations and animations...');
    
    // Reset basic cascade simulator
    if (cascadeSimulator.current) {
      cascadeSimulator.current.resetSimulation();
    }
    
    // Reset basic visualization
    if (cascadeVisualization.current) {
      cascadeVisualization.current.clearVisualization();
    }
    
    // Reset advanced cascade animation
    if (advancedCascadeAnimation.current) {
      advancedCascadeAnimation.current.reset();
    }
    
    // Reset optimized cascade animation
    if (optimizedCascadeAnimation.current) {
      optimizedCascadeAnimation.current.reset();
    }

    // Reset camera
    if (cameraService.current) {
      cameraService.current.resetCamera();
      setIsOrbiting(false);
      setIsStoryMode(false);
      setOrbitSpeed(1); // Reset to default speed
    }
    
    // Clear all map layers and sources related to cascades
    if (map.current) {
      const cascadeLayers = [
        'cascade-circles', 'cascade-lines', 'cascade-ripples', 
        'cascade-assets', 'cascade-connections', 'cascade-highlights',
        'search-highlights', 'cascade-radius-circle', 'cascade-pulses',
        'cascade-symbols', 'cascade-effects'
      ];
      
      cascadeLayers.forEach(layerId => {
        try {
          if (map.current.getLayer(layerId)) {
            map.current.removeLayer(layerId);
          }
          if (map.current.getSource(layerId)) {
            map.current.removeSource(layerId);
          }
        } catch (error) {
          // Layer might not exist, ignore
        }
      });

      // Reset all feature states for infrastructure layers
      const infrastructureLayers = ['power-substations', 'transport-hubs', 'telecom-towers', 'water-treatment'];
      infrastructureLayers.forEach(layerName => {
        try {
          const features = map.current.querySourceFeatures(layerName);
          features.forEach((feature: any) => {
            if (feature.id) {
              map.current.setFeatureState(
                { source: layerName, id: feature.id },
                {
                  failed: false,
                  cascaded: false,
                  potential: false,
                  'cross-sector': false,
                  pulse: false,
                  halo: false,
                  highlighted: false
                }
              );
            }
          });
        } catch (error) {
          // Layer might not exist or have features
        }
      });

      // Close any open popups
      const popups = document.querySelectorAll('.maplibregl-popup');
      popups.forEach(popup => popup.remove());
    }
    
    // Clear all global timers and intervals (more targeted approach)
    try {
      // Clear any window-level animation intervals
      if ((window as any).cascadeAnimationInterval) {
        clearInterval((window as any).cascadeAnimationInterval);
        delete (window as any).cascadeAnimationInterval;
      }
      if ((window as any).cascadeAnimationTimeout) {
        clearTimeout((window as any).cascadeAnimationTimeout);
        delete (window as any).cascadeAnimationTimeout;
      }
    } catch (error) {
      // Ignore errors in cleanup
    }
    
    // Reset all state
    setCascadeState(null);
    setSelectedAsset(null);
    setIsSimulationActive(false);
    
    // Reset dashboard metrics
    setDashboardMetrics(prev => ({
      ...prev,
      economicImpact: 0,
      populationAffected: 0,
      assetsAtRisk: 0,
      vulnerableSites: {
        hospitals: 0,
        schools: 0,
        careHomes: 0
      }
    }));
    
    console.log('✅ All cascade simulations and animations reset');
  }, []);

  // Camera control handlers
  const handleToggleOrbit = useCallback(() => {
    if (!cameraService.current) return;
    
    const newOrbitState = cameraService.current.toggleOrbit();
    setIsOrbiting(newOrbitState);
    
    if (newOrbitState) {
      // Set initial speed when starting orbit
      cameraService.current.setOrbitSpeed(orbitSpeed);
      console.log('🌍 Started orbiting camera');
    } else {
      console.log('⏹️ Stopped orbiting camera');
    }
  }, [orbitSpeed]);

  const handleStartStoryMode = useCallback(async () => {
    if (!cameraService.current) return;
    
    setIsStoryMode(true);
    console.log('🎬 Starting story mode');
    
    try {
      await cameraService.current.startStoryMode();
    } catch (error) {
      console.error('❌ Story mode failed:', error);
    } finally {
      setIsStoryMode(false);
    }
  }, []);

  const handleFlyToLondon = useCallback(() => {
    if (!cameraService.current) return;
    cameraService.current.flyToLondon();
  }, []);

  const handleFlyToUK = useCallback(() => {
    if (!cameraService.current) return;
    cameraService.current.flyToUKOverview();
  }, []);

  const handleStartStormArwen = useCallback(async () => {
    if (!cameraService.current) return;
    
    setIsStoryMode(true);
    console.log('🌪️ Starting Storm Arwen story mode');
    
    try {
      await cameraService.current.startStormArwenMode();
    } catch (error) {
      console.error('❌ Storm Arwen story mode failed:', error);
    } finally {
      setIsStoryMode(false);
      setShowStoryboard(false);
    }
  }, []);

  const handleStartProgressiveStory = useCallback(() => {
    if (!progressiveStoryService.current) return;
    
    const success = progressiveStoryService.current.startStory('arwen');
    if (success) {
      setIsStoryMode(true);
      console.log('🎬 Starting progressive Storm Arwen story');
    }
  }, []);

  // Storyboard popup handlers
  const handleStoryboardClose = useCallback(() => {
    setShowStoryboard(false);
  }, []);

  const handleStoryboardNext = useCallback(() => {
    setShowStoryboard(false);
    // Continue with camera animation
  }, []);

  const handleStoryboardPrevious = useCallback(() => {
    setShowStoryboard(false);
    // Could implement going back to previous point
  }, []);

  const handleStoryboardSkip = useCallback(() => {
    setShowStoryboard(false);
    setIsStoryMode(false);
    // Stop the story mode
  }, []);



  // Helper function to get map layer IDs for each infrastructure type (including clusters)
  const getLayerIdsForType = (layerType: string): string[] => {
    switch (layerType) {
      case 'power':
        return ['power-clusters', 'power-cluster-count', 'power-substations'];
      case 'transport':
        return ['transport-hubs', 'transport-logistics'];
      case 'telecoms':
        return ['telecom-towers', 'telecom-datacenters'];
      case 'water':
        return ['water-clusters', 'water-cluster-count', 'water-treatment'];
      default:
        return [];
    }
  };

  // Helper function to find asset by type and criticality (removed unused function)

  // Debounced update function for performance
  const debouncedVisualizationUpdate = useCallback(
    debounce((state: CascadeState | null, assets: any[]) => {
      if (cascadeVisualization.current && map.current) {
        cascadeVisualization.current.updateVisualization(state, assets);
      }
    }, 100), // 100ms debounce
    []
  );

  // Initialize services
  useEffect(() => {
    if (!searchService.current) {
      searchService.current = new SearchService();
      // Load assets for search indexing
      searchService.current.loadAssets('london').then(() => {
        console.log('✅ Search service initialized');
      });
    }

    // Initialize simple cascade service (preferred)
    if (!simpleCascadeService.current) {
      simpleCascadeService.current = new SimpleCascadeService();
      simpleCascadeService.current.loadAssets().then(() => {
        const stats = simpleCascadeService.current!.getStats();
        console.log('✅ Simple cascade service initialized');
        console.log(`📊 ${stats.totalAssets} assets, ${stats.totalCascadeRelationships} relationships`);
      });
    }

    // Initialize cached cascade engine (fallback - only when needed)
    if (!cachedCascadeEngine.current) {
      cachedCascadeEngine.current = new CachedCascadeEngine();
      console.log('✅ Cached cascade engine initialized (will load cache on demand)');
    }

    if (!cascadeSimulator.current) {
      cascadeSimulator.current = new CascadeSimulator();
      // Load assets for cascade simulation
      cascadeSimulator.current.loadAssets('london').then(() => {
        console.log('✅ Cascade simulator initialized');
      });

      // Subscribe to cascade updates with debounced visualization
      cascadeSimulator.current.subscribeToUpdates((state) => {
        setCascadeState(state);
        setIsSimulationActive(state?.isActive || false);
        
        // Debounced visualization update for better performance
        debouncedVisualizationUpdate(
          state, 
          cascadeSimulator.current?.getAllAssets() || []
        );
      });
    }

    // Initialize advanced cascade engine
    if (!advancedCascadeEngine.current) {
      advancedCascadeEngine.current = new AdvancedCascadeEngine([]);
      // Load assets for advanced cascade simulation
      cascadeSimulator.current?.loadAssets('london').then(() => {
        const assets = cascadeSimulator.current?.getAllAssets() || [];
        // Convert basic assets to advanced format
        const advancedAssets = assets.map(asset => ({
          ...asset,
          suppliesTo: asset.dependents || [],
          suppliedBy: asset.dependencies || [],
          hasBackup: asset.backupPowerMinutes ? asset.backupPowerMinutes > 0 : false,
          backupDuration: asset.backupPowerMinutes,
          properties: {}, // Add required properties field
          criticality: asset.criticality as any // Type assertion for compatibility
        }));
        advancedCascadeEngine.current = new AdvancedCascadeEngine(advancedAssets);
        console.log('✅ Advanced cascade engine initialized');
        
        // Set asset coordinates for optimized animation controller
        if (optimizedCascadeAnimation.current) {
          assets.forEach(asset => {
            optimizedCascadeAnimation.current!.setAssetCoordinates(asset.id, asset.coordinates);
          });
          console.log('✅ Asset coordinates set for optimized animation controller');
        }
      });
    }
  }, [debouncedVisualizationUpdate]);

  // Search handlers
  const handleSearchResults = useCallback((results: SearchResult) => {
    console.log(`🔍 Search returned ${results.totalCount} results`);
    // TODO: Update map to show only search results or highlight them
  }, []);

  const handleHighlightAssets = useCallback((assetIds: string[]) => {
    console.log(`🎯 Highlighting ${assetIds.length} assets on map`);
    // TODO: Implement map highlighting
    if (map.current && searchService.current) {
      searchService.current.highlightAssets(map.current, assetIds);
    }
  }, []);

  const handleClearHighlights = useCallback(() => {
    console.log('🧹 Clearing search highlights');
    if (map.current && searchService.current) {
      searchService.current.clearHighlights(map.current);
    }
  }, []);

  const handleMapLoad = useCallback((mapInstance: any, dataServiceInstance: DataService) => {
    console.log('Map loaded in MainLayout:', mapInstance);
    map.current = mapInstance;
    dataService.current = dataServiceInstance;
    
    // Initialize cascade visualization
    if (!cascadeVisualization.current) {
      cascadeVisualization.current = new CascadeVisualizationController(mapInstance);
      console.log('✅ Cascade visualization initialized');
    }

    // Initialize advanced cascade animation (legacy)
    if (!advancedCascadeAnimation.current) {
      advancedCascadeAnimation.current = new AdvancedCascadeAnimationController(mapInstance, {
        speed: 'normal',
        showLines: true,
        showCircles: true,
        showLabels: false
      });
      console.log('✅ Advanced cascade animation (legacy) initialized');
    }

    // Initialize optimized cascade animation
    if (!optimizedCascadeAnimation.current) {
      optimizedCascadeAnimation.current = new OptimizedCascadeAnimationController(mapInstance, optimizedAnimationConfig);
      console.log('✅ Optimized cascade animation initialized');
    }

    // Initialize camera service
    if (!cameraService.current) {
      cameraService.current = new CameraService(mapInstance);
      console.log('✅ Camera service initialized');
      
      // Set up storyboard popup callback
      (window as any).showStoryboardPopup = (point: StoryPoint, index: number, total: number) => {
        setCurrentStoryPoint(point);
        setStoryIndex(index);
        setTotalStoryPoints(total);
        setShowStoryboard(true);
      };
    }

    // Initialize progressive story service
    if (!progressiveStoryService.current) {
      progressiveStoryService.current = new ProgressiveStoryService();
      
      // Set up callbacks
      progressiveStoryService.current.onChapterChangeCallback((chapter, index, total) => {
        setCurrentStoryChapter(chapter);
        setStoryIndex(index);
        setTotalStoryPoints(total);
        
        // Fly camera to chapter location
        if (cameraService.current) {
          mapInstance.flyTo({
            center: chapter.center,
            zoom: chapter.zoom,
            bearing: chapter.bearing || 0,
            pitch: chapter.pitch || 0,
            duration: 2000,
            essential: true
          });
        }
      });
      
      progressiveStoryService.current.onStoryEndCallback(() => {
        setIsStoryMode(false);
        setCurrentStoryChapter(null);
      });
      
      console.log('✅ Progressive story service initialized');
    }
    
    // Update layer counts with actual data
    setLayerSections(prev => prev.map(section => ({
      ...section,
      totalCount: section.id === 'power' ? 26272 : 
                  section.id === 'transport' ? 755 : 
                  section.id === 'telecoms' ? 541 : 
                  section.id === 'water' ? 466 : 0
    })));
    
    // Set up enhanced asset interaction - choose engine based on selection
    (window as any).triggerCascade = (assetId: string) => {
      console.log(`🚨 Triggering cascade from asset (${simulationEngine.toUpperCase()} Engine):`, assetId);
      
      if (simulationEngine === 'simple') {
        handleStartSimpleSimulation(assetId);
      } else if (simulationEngine === 'cached') {
        handleStartCachedSimulation(assetId);
      } else if (simulationEngine === 'advanced') {
        handleStartAdvancedSimulation(assetId);
      } else {
        handleStartSimulation(assetId);
      }
    };

    // Set up asset selection for configuration
    (window as any).selectAssetForSimulation = (assetId: string) => {
      console.log('⚙️ Selected asset for simulation configuration:', assetId);
      // Asset is already set in state, just ensure simulation tab is active
      setActiveTab('simulation');
      // Close any open popups
      const popups = document.querySelectorAll('.maplibregl-popup');
      popups.forEach(popup => popup.remove());
    };

    // Add click handlers for asset selection
    mapInstance.on('click', (e: any) => {
      const features = mapInstance.queryRenderedFeatures(e.point, {
        layers: ['power-substations', 'transport-hubs', 'telecom-towers', 'water-treatment', 'power-clusters', 'water-clusters']
      });

      if (features.length > 0) {
        const asset = features[0];
        const assetId = asset.properties?.id;
        const assetName = asset.properties?.name || asset.properties?.operator || `${asset.properties?.type || 'Infrastructure'} Asset`;
        const assetType = asset.properties?.type || asset.properties?.subtype || 'Unknown';
        const criticality = asset.properties?.criticality || 'Unknown';
        const operator = asset.properties?.operator || 'Unknown';
        
        // Update selected asset state
        setSelectedAsset({
          id: assetId,
          name: assetName,
          type: assetType,
          criticality,
          operator
        });
        
        // Switch to simulation tab to show the selected asset
        setActiveTab('simulation');
        
        // Show asset selection popup with options
        new Popup()
          .setLngLat(e.lngLat)
          .setHTML(`
            <div class="p-3 min-w-[200px]">
              <h3 class="font-bold text-gray-900 mb-2">${assetName}</h3>
              <div class="text-sm text-gray-600 mb-3 space-y-1">
                <div><strong>Type:</strong> ${assetType}</div>
                <div><strong>Criticality:</strong> <span class="px-2 py-1 rounded text-xs ${
                  criticality === 'critical' ? 'bg-red-100 text-red-800' :
                  criticality === 'high' ? 'bg-orange-100 text-orange-800' :
                  criticality === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }">${criticality}</span></div>
                <div><strong>Operator:</strong> ${operator}</div>
              </div>
              <div class="space-y-2">
                <button 
                  onclick="window.triggerCascade('${assetId}')" 
                  class="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                >
                  🚨 Trigger Cascade Now
                </button>
                <button 
                  onclick="window.selectAssetForSimulation('${assetId}')" 
                  class="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                >
                  ⚙️ Configure & Simulate
                </button>
              </div>
            </div>
          `)
          .addTo(mapInstance);
      }
    });

    // Add hover effects for better discoverability
    mapInstance.on('mouseenter', ['power-substations', 'transport-hubs', 'telecom-towers', 'water-treatment'], () => {
      mapInstance.getCanvas().style.cursor = 'pointer';
    });

    mapInstance.on('mouseleave', ['power-substations', 'transport-hubs', 'telecom-towers', 'water-treatment'], () => {
      mapInstance.getCanvas().style.cursor = '';
    });

    // Add double-click to clear all animations
    mapInstance.on('dblclick', (e: any) => {
      // Prevent default map zoom behavior
      e.preventDefault();
      
      console.log('🧹 Double-click detected - clearing all animations and simulations');
      handleResetSimulation();
    });

    console.log('✅ Map interaction handlers set up');
  }, [handleStartSimulation, handleStartSimpleSimulation]);

  return (
    <div className="fixed inset-0 bg-white overflow-hidden">
      {/* Full Screen Map - Takes entire viewport */}
      <div className="absolute inset-0">
        <MapContainer onMapLoad={handleMapLoad} />
      </div>

      {/* Google Maps Style - Floating Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-white shadow-sm border-b border-gray-200">
        <div className="flex justify-between items-center px-6 py-3">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">CReDo</h1>
            <span className="ml-2 text-sm text-gray-500">Infrastructure Resilience</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">London, UK</div>
            <div className={`flex items-center text-sm ${systemStatus === 'online' ? 'text-green-600' : 'text-red-600'}`}>
              <div className={`w-2 h-2 ${systemStatus === 'online' ? 'bg-green-500' : 'bg-red-500'} rounded-full mr-2`}></div>
              {isSimulationActive ? 'Simulation Active' : 'System Online'}
            </div>
          </div>
        </div>
      </div>

      {/* Google Maps Style - Floating Left Panel */}
      <div className={`absolute top-16 left-4 z-10 transition-all duration-300 ${isPanelCollapsed ? 'w-12' : 'w-80'}`}>
        {isPanelCollapsed ? (
          /* Collapsed - Just toggle button */
          <button
            onClick={() => setIsPanelCollapsed(false)}
            className="w-12 h-12 bg-white shadow-lg rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200"
            title="Show Controls"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        ) : (
          /* Expanded - Full control panel */
          <div className="bg-white shadow-lg rounded-lg border border-gray-200 max-h-[calc(100vh-120px)] flex flex-col">
            {/* Panel Header with Tabs */}
            <div className="border-b border-gray-200">
              <div className="flex justify-between items-center p-4 pb-2">
                <h3 className="font-semibold text-gray-900">Controls</h3>
                <button
                  onClick={() => setIsPanelCollapsed(true)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Hide Controls"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Tab Navigation */}
              <div className="flex px-4 pb-2">
                <button
                  onClick={() => setActiveTab('layers')}
                  className={`px-3 py-1 text-sm font-medium rounded-md mr-2 transition-colors ${
                    activeTab === 'layers'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  🗺️ Layers
                </button>
                <button
                  onClick={() => setActiveTab('search')}
                  className={`px-3 py-1 text-sm font-medium rounded-md mr-2 transition-colors ${
                    activeTab === 'search'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  🔍 Search
                </button>
                <button
                  onClick={() => setActiveTab('simulation')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'simulation'
                      ? 'bg-red-100 text-red-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  🚨 Simulate
                </button>
              </div>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
              {activeTab === 'layers' ? (
                <>
                  {/* City Selector */}
                  <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">City</h4>
                    <select 
                      className="w-full rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        // TODO: Implement city switching for offline GeoJSON data
                        console.log('Switch to city:', e.target.value);
                      }}
                      defaultValue="london"
                    >
                      <option value="london">London</option>
                      <option value="bristol">Bristol</option>
                      <option value="manchester">Manchester</option>
                    </select>
                  </div>

                  {/* Layer Controls */}
                  <ExpandableLayerControls 
                    sections={layerSections}
                    onSectionToggle={handleSectionToggle}
                    onSubLayerToggle={handleSubLayerToggle}
                    onOpacityChange={handleOpacityChange}
                    onSectionExpand={handleSectionExpand}
                  />
                  
                  {/* Camera Controls */}
                  <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3">🎬 Camera Controls</h4>
                    
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={handleToggleOrbit}
                          className={`text-xs px-3 py-2 rounded border transition-colors ${
                            isOrbiting 
                              ? 'bg-blue-100 text-blue-800 border-blue-300' 
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {isOrbiting ? '⏹️ Stop Orbit' : '🌍 Start Orbit'}
                        </button>
                        
                        <button
                          onClick={handleStartStoryMode}
                          disabled={isStoryMode}
                          className="text-xs px-3 py-2 rounded border bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isStoryMode ? '🎬 Playing...' : '🎬 Generic Storm'}
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          onClick={handleStartProgressiveStory}
                          disabled={isStoryMode}
                          className="text-xs px-3 py-2 rounded border bg-red-50 text-red-700 border-red-300 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isStoryMode ? '🌪️ Playing...' : '🌪️ Storm Arwen 2021 (Progressive)'}
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={handleFlyToLondon}
                          className="text-xs px-3 py-2 rounded border bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                        >
                          🏙️ London View
                        </button>
                        
                        <button
                          onClick={handleFlyToUK}
                          className="text-xs px-3 py-2 rounded border bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
                        >
                          🇬🇧 UK Overview
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 mt-2">
                      {isOrbiting && '🌍 Camera orbiting around current view'}
                      {isStoryMode && '🎬 Playing cinematic storm story'}
                      {!isOrbiting && !isStoryMode && '📹 Camera controls ready'}
                    </div>
                  </div>

                  {/* OpenInfraMap Status */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-2">Data Source</h4>
                    <p className="text-sm text-green-700 mb-2">
                      Using offline GeoJSON data - fast and reliable!
                    </p>
                    <div className="flex items-center text-xs text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      Live infrastructure data streaming
                    </div>
                  </div>
                  
                  {/* Live Dashboard */}
                  <LiveDashboard 
                    metrics={dashboardMetrics}
                    isSimulationActive={isSimulationActive}
                  />
                </>
              ) : activeTab === 'search' ? (
                <>
                  {/* Search and Filters Tab */}
                  {searchService.current && (
                    <SearchAndFilters
                      searchService={searchService.current}
                      onSearchResults={handleSearchResults}
                      onHighlightAssets={handleHighlightAssets}
                      onClearHighlights={handleClearHighlights}
                    />
                  )}
                  
                  {/* Search Results Actions */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">🎯 Cascade Analysis</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Use search results to identify cascade triggers and analyze infrastructure dependencies.
                    </p>
                    <div className="space-y-2">
                      <button 
                        onClick={() => setActiveTab('simulation')}
                        className="w-full text-left text-xs bg-white hover:bg-blue-50 p-2 rounded border border-blue-200"
                      >
                        🚨 Start Cascade from Selected Assets
                        <div className="text-gray-500 mt-1">Simulate failure propagation</div>
                      </button>
                      <button className="w-full text-left text-xs bg-white hover:bg-blue-50 p-2 rounded border border-blue-200">
                        📊 Analyze Criticality Scores
                        <div className="text-gray-500 mt-1">Calculate asset importance</div>
                      </button>
                      <button className="w-full text-left text-xs bg-white hover:bg-blue-50 p-2 rounded border border-blue-200">
                        💰 Economic Impact Assessment
                        <div className="text-gray-500 mt-1">Estimate failure costs</div>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Simulation Tab */}
                  <SimulationControls
                    config={cascadeConfig}
                    onConfigChange={setCascadeConfig}
                    onStartSimulation={handleStartSimulation}
                    onResetSimulation={handleResetSimulation}
                    isSimulationActive={isSimulationActive}
                    selectedAsset={selectedAsset}
                    cascadeStatistics={cascadeSimulator.current?.getCascadeStatistics() || null}
                    animationSystem={animationSystem}
                    onAnimationSystemChange={setAnimationSystem}
                    simulationEngine={simulationEngine}
                    onSimulationEngineChange={setSimulationEngine}
                  />
                  
                  {/* Live Dashboard */}
                  <LiveDashboard 
                    metrics={dashboardMetrics}
                    isSimulationActive={isSimulationActive}
                  />
                  
                  {/* Cascade Progress */}
                  {cascadeState && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-semibold text-red-900 mb-2">📊 Cascade Progress</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Step:</span>
                          <span>{cascadeState.currentStep} / {cascadeState.totalSteps}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Elapsed Time:</span>
                          <span>{Math.round(cascadeState.elapsedTime / 60)}m {cascadeState.elapsedTime % 60}s</span>
                        </div>
                        <div className="w-full bg-red-200 rounded-full h-2">
                          <div 
                            className="bg-red-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(cascadeState.currentStep / cascadeState.totalSteps) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Google Maps Style - Floating Bottom Right Info */}
      {isSimulationActive && (
        <div className="absolute bottom-4 right-4 z-10 bg-red-50 border border-red-200 rounded-lg px-4 py-2 shadow-lg">
          <div className="flex items-center text-sm text-red-700">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
            <span className="font-medium">Cascade Simulation Running</span>
          </div>
        </div>
      )}

      {/* Storyboard Popup */}
      <StoryboardPopup
        isVisible={showStoryboard}
        currentPoint={currentStoryPoint}
        currentIndex={storyIndex}
        totalPoints={totalStoryPoints}
        onClose={handleStoryboardClose}
        onNext={handleStoryboardNext}
        onPrevious={handleStoryboardPrevious}
        onSkip={handleStoryboardSkip}
      />

      {/* Progressive Story Mode Overlay */}
      {isStoryMode && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          {/* Story Chapter Card - Compact Floating */}
          <div className="absolute bottom-6 left-6 max-w-md pointer-events-auto">
            <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
              {/* Progress Bar */}
              <div className="h-1 bg-gray-200">
                <div 
                  className="h-full bg-red-600 transition-all duration-300"
                  style={{ width: `${((storyIndex) / Math.max(totalStoryPoints - 1, 1)) * 100}%` }}
                ></div>
              </div>
              
              {/* Chapter Content */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">
                    {currentStoryChapter?.title || 'Loading...'}
                  </h3>
                  <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                    {storyIndex}/{totalStoryPoints}
                  </span>
                </div>
                
                <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                  {currentStoryChapter?.description || ''}
                </p>
                
                {/* Quick Stats */}
                {currentStoryChapter?.stats && (
                  <div className="bg-gray-50 rounded-md p-2 mb-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {currentStoryChapter.stats.slice(0, 4).map((stat, index) => (
                        <div key={index} className="flex justify-between">
                          <span className="text-gray-600">{stat.label}:</span>
                          <span className="font-semibold text-red-600">{stat.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    Press SPACE or scroll to continue
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        progressiveStoryService.current?.stopStory();
                        setIsStoryMode(false);
                      }}
                      className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => progressiveStoryService.current?.nextChapter()}
                      className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      {storyIndex === totalStoryPoints ? 'Finish' : 'Next →'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Keyboard Instructions - Top Right */}
          <div className="absolute top-20 right-6 pointer-events-auto">
            <div className="bg-black/75 text-white text-xs px-3 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <kbd className="bg-white/20 px-1 rounded">SPACE</kbd>
                <span>Next</span>
                <kbd className="bg-white/20 px-1 rounded ml-2">ESC</kbd>
                <span>Exit</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orbit Speed Control - Only visible when orbiting */}
      {isOrbiting && (
        <div className="fixed top-20 left-6 z-30 pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 p-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-700">Orbit Speed</span>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={orbitSpeed}
                onChange={(e) => {
                  const newSpeed = parseFloat(e.target.value);
                  setOrbitSpeed(newSpeed);
                  if (cameraService.current) {
                    cameraService.current.setOrbitSpeed(newSpeed);
                  }
                }}
                className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((orbitSpeed - 0.1) / 2.9) * 100}%, #e5e7eb ${((orbitSpeed - 0.1) / 2.9) * 100}%, #e5e7eb 100%)`
                }}
              />
              <span className="text-xs text-gray-500 min-w-[2rem]">
                {orbitSpeed === 0.1 ? 'Min' : orbitSpeed === 3 ? 'Max' : orbitSpeed.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Slow</span>
              <span>Fast</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainLayout;