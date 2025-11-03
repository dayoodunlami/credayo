/**
 * STREAMLINED CONTROLS
 * 
 * Simplified control panel with:
 * - Essential controls only
 * - Heatmap cascade triggers
 * - Clean, responsive design
 * - No complex state management
 */

import React, { useState, useEffect } from 'react';
import { OptimizedInfrastructureService } from '../services/OptimizedInfrastructureService';
import type { CascadeImpact } from '../services/OptimizedInfrastructureService';

interface StreamlinedControlsProps {
  service: OptimizedInfrastructureService | null;
  selectedAsset: { id: string; name: string } | null;
  onCascadeStart?: (assetId: string) => void;
  onCascadeComplete?: (impacts: CascadeImpact[]) => void;
}

const StreamlinedControls: React.FC<StreamlinedControlsProps> = ({
  service,
  selectedAsset,
  onCascadeStart,
  onCascadeComplete
}) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [lastCascadeResult, setLastCascadeResult] = useState<CascadeImpact[] | null>(null);

  // Update stats when service changes
  useEffect(() => {
    if (service) {
      const serviceStats = service.getStats();
      setStats(serviceStats);
    }
  }, [service]);

  const handleCascadeSimulation = async (assetId?: string) => {
    if (!service || isSimulating) return;

    const targetAssetId = assetId || selectedAsset?.id;
    if (!targetAssetId) {
      alert('Please select an asset first by clicking on the map');
      return;
    }

    try {
      setIsSimulating(true);
      
      if (onCascadeStart) {
        onCascadeStart(targetAssetId);
      }

      console.log(`🚨 Starting electrical cascade simulation for: ${targetAssetId}`);
      
      const impacts = await service.simulateCascade(targetAssetId);
      setLastCascadeResult(impacts);
      
      if (onCascadeComplete) {
        onCascadeComplete(impacts);
      }

      console.log(`✅ Cascade complete: ${impacts.length} impacts`);

    } catch (error) {
      console.error('❌ Cascade simulation failed:', error);
      alert(`Cascade simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleResetCascade = async () => {
    if (!service) return;

    try {
      await service.clearCascadeVisualization();
      setLastCascadeResult(null);
      console.log('🔄 Cascade visualization cleared');
    } catch (error) {
      console.error('❌ Failed to clear cascade:', error);
    }
  };

  const handleQuickCascade = async (assetType: 'primary' | 'secondary') => {
    if (!service) return;

    const assets = service.getAssets().filter(asset => asset.type === assetType);
    if (assets.length > 0) {
      await handleCascadeSimulation(assets[0].id);
    }
  };

  return (
    <div className="absolute top-4 left-4 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">🏢 Infrastructure Resilience</h2>
        <p className="text-sm text-gray-600">Optimized cascade simulation</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-red-600">{stats.assetsByType.primary}</div>
              <div className="text-xs text-gray-600">Primary</div>
            </div>
            <div>
              <div className="text-lg font-bold text-orange-600">{stats.assetsByType.secondary}</div>
              <div className="text-xs text-gray-600">Secondary</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-600">{stats.assetsByType.critical}</div>
              <div className="text-xs text-gray-600">Critical</div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Asset */}
      {selectedAsset && (
        <div className="p-4 border-b border-gray-200 bg-blue-50">
          <div className="text-sm font-semibold text-blue-900">Selected Asset</div>
          <div className="text-sm text-blue-700">{selectedAsset.name}</div>
          <div className="text-xs text-blue-600 mt-1">Click "Simulate Cascade" to analyze impact</div>
        </div>
      )}

      {/* Main Controls */}
      <div className="p-4 space-y-3">
        {/* Primary Cascade Button */}
        <button
          onClick={() => handleCascadeSimulation()}
          disabled={!selectedAsset || isSimulating}
          className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${
            selectedAsset && !isSimulating
              ? 'bg-red-600 hover:bg-red-700 shadow-md hover:shadow-lg'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {isSimulating ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Simulating Heatmap Cascade...
            </div>
          ) : (
            '🚨 Simulate Cascade (Circles)'
          )}
        </button>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleQuickCascade('primary')}
            disabled={isSimulating}
            className="py-2 px-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
          >
            ⚡ Primary Failure
          </button>
          <button
            onClick={() => handleQuickCascade('secondary')}
            disabled={isSimulating}
            className="py-2 px-3 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-200 transition-colors disabled:opacity-50"
          >
            🔌 Secondary Failure
          </button>
        </div>

        {/* Reset Button */}
        <button
          onClick={handleResetCascade}
          disabled={!lastCascadeResult}
          className="w-full py-2 px-4 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔄 Reset Impact Zones
        </button>
      </div>

      {/* Cascade Results */}
      {lastCascadeResult && (
        <div className="p-4 border-t border-gray-200 bg-green-50">
          <div className="text-sm font-semibold text-green-900 mb-2">
            🎯 Cascade Analysis Complete
          </div>
          <div className="text-xs text-green-700 space-y-1">
            <div>• {lastCascadeResult.length} assets affected</div>
            <div>• Persistent impact zones active</div>
            <div>• Electrical cascade: Primary → Secondary → Buildings</div>
            <div>• Zones remain visible until reset</div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 mb-2">Advanced Features:</div>
        <div className="flex gap-2">
          <a
            href="/test-infrastructure-cascade-correct.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2 px-3 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors text-center"
          >
            🌍 3D Cesium View
          </a>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Performance Info */}
      <div className="p-3 bg-gray-50 rounded-b-lg">
        <div className="text-xs text-gray-500 text-center">
          ⚡ Electrical Cascade: Primary→Secondary→Buildings • Persistent zones
        </div>
      </div>
    </div>
  );
};

export default StreamlinedControls;