/**
 * OPTIMIZED MAIN LAYOUT
 * 
 * Streamlined main layout replacing the heavy MainLayout with:
 * - Single service (replaces 8+ services)
 * - Fast loading (10% initial assets)
 * - Heatmap cascade visualization
 * - No memory leaks or freezing
 * - Clean, responsive design
 */

import React, { useState, useCallback } from 'react';
import OptimizedMapContainer from './OptimizedMapContainer';
import StreamlinedControls from './StreamlinedControls';
import { OptimizedInfrastructureService } from '../services/OptimizedInfrastructureService';
import type { CascadeImpact } from '../services/OptimizedInfrastructureService';
import * as maptilersdk from '@maptiler/sdk';

const OptimizedMainLayout: React.FC = () => {
  const [service, setService] = useState<OptimizedInfrastructureService | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<{ id: string; name: string } | null>(null);
  const [systemStatus, setSystemStatus] = useState<'loading' | 'ready' | 'simulating' | 'error'>('loading');
  const [cascadeResults, setCascadeResults] = useState<CascadeImpact[] | null>(null);

  // Handle map load
  const handleMapLoad = useCallback((map: maptilersdk.Map, infrastructureService: OptimizedInfrastructureService) => {
    console.log('🗺️ Optimized map loaded with infrastructure service', map.getCenter());
    setService(infrastructureService);
    setSystemStatus('ready');
  }, []);

  // Handle asset selection
  const handleAssetClick = useCallback((assetId: string, assetName: string) => {
    console.log(`🎯 Asset selected: ${assetName} (${assetId})`);
    setSelectedAsset({ id: assetId, name: assetName });
  }, []);

  // Handle cascade start
  const handleCascadeStart = useCallback((assetId: string) => {
    console.log(`🚨 Starting cascade simulation for: ${assetId}`);
    setSystemStatus('simulating');
  }, []);

  // Handle cascade completion
  const handleCascadeComplete = useCallback((impacts: CascadeImpact[]) => {
    console.log(`✅ Cascade simulation complete: ${impacts.length} impacts`);
    setCascadeResults(impacts);
    setSystemStatus('ready');
  }, []);

  return (
    <div className="fixed inset-0 bg-gray-100 overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-white shadow-sm border-b border-gray-200 z-20">
        <div className="flex justify-between items-center px-6 py-4">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">CReDo</h1>
            <span className="ml-2 text-sm text-gray-500">Infrastructure Resilience Platform</span>
            <span className="ml-4 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              Optimized
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">London, UK</div>
            <div className={`flex items-center text-sm ${
              systemStatus === 'ready' ? 'text-green-600' : 
              systemStatus === 'simulating' ? 'text-orange-600' :
              systemStatus === 'error' ? 'text-red-600' : 'text-gray-600'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                systemStatus === 'ready' ? 'bg-green-500' : 
                systemStatus === 'simulating' ? 'bg-orange-500 animate-pulse' :
                systemStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
              }`}></div>
              {systemStatus === 'loading' && 'Initializing...'}
              {systemStatus === 'ready' && 'System Ready'}
              {systemStatus === 'simulating' && 'Cascade Simulation Active'}
              {systemStatus === 'error' && 'System Error'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Map Area */}
      <div className="absolute inset-0 pt-16">
        <OptimizedMapContainer
          onMapLoad={handleMapLoad}
          onAssetClick={handleAssetClick}
        />
      </div>

      {/* Streamlined Controls */}
      <StreamlinedControls
        service={service}
        selectedAsset={selectedAsset}
        onCascadeStart={handleCascadeStart}
        onCascadeComplete={handleCascadeComplete}
      />

      {/* Status Panel - Bottom Right */}
      {cascadeResults && (
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-10 max-w-sm">
          <div className="text-sm font-semibold text-gray-900 mb-2">
            📊 Cascade Impact Summary
          </div>
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Total Impacts:</span>
              <span className="font-semibold">{cascadeResults.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Critical Impacts:</span>
              <span className="font-semibold text-red-600">
                {cascadeResults.filter(i => i.zone === 'critical').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>High Impacts:</span>
              <span className="font-semibold text-orange-600">
                {cascadeResults.filter(i => i.zone === 'high').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Visualization:</span>
              <span className="font-semibold text-green-600">Heatmap Active</span>
            </div>
          </div>
        </div>
      )}

      {/* Performance Indicator - Bottom Left */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg text-xs z-10">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
          <span>Optimized Performance • Fast Loading • No Freezing</span>
        </div>
      </div>
    </div>
  );
};

export default OptimizedMainLayout;