import React, { useState, useEffect } from 'react';
import type { CascadeConfig } from '../../services/CascadeSimulator';

interface SimulationControlsProps {
  config: CascadeConfig;
  onConfigChange: (config: CascadeConfig) => void;
  onStartSimulation: (triggerId?: string) => void;
  onResetSimulation: () => void;
  isSimulationActive: boolean;
  selectedAsset?: {
    id: string;
    name: string;
    type: string;
    criticality: string;
    operator: string;
  } | null;
  cascadeStatistics?: {
    totalAffected: number;
    byType: Record<string, number>;
    byCriticality: Record<string, number>;
    totalPopulationAffected: number;
  } | null;
  // New props for animation system and engine selection
  animationSystem?: 'basic' | 'advanced' | 'optimized';
  onAnimationSystemChange?: (system: 'basic' | 'advanced' | 'optimized') => void;
  simulationEngine?: 'basic' | 'advanced' | 'cached' | 'simple';
  onSimulationEngineChange?: (engine: 'basic' | 'advanced' | 'cached' | 'simple') => void;
}

const SimulationControls: React.FC<SimulationControlsProps> = ({
  config,
  onConfigChange,
  onStartSimulation,
  onResetSimulation,
  isSimulationActive,
  selectedAsset,
  cascadeStatistics,
  animationSystem = 'basic',
  onAnimationSystemChange,
  simulationEngine = 'basic',
  onSimulationEngineChange
}) => {
  const [selectedTrigger, setSelectedTrigger] = useState<string>('');
  
  // Update trigger when asset is selected
  useEffect(() => {
    if (selectedAsset) {
      setSelectedTrigger(selectedAsset.id);
    }
  }, [selectedAsset]);
  
  const updateConfig = (updates: Partial<CascadeConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  const getSpeedLabel = (speed: number) => {
    if (speed <= 0.5) return 'Slow';
    if (speed >= 2) return 'Fast';
    return 'Normal';
  };

  const getSpeedDelay = (speed: number) => {
    if (speed <= 0.5) return '4s delays';
    if (speed >= 2) return '0.5s delays';
    return '2s delays';
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">🚨 Cascade Simulation</h3>
      
      <div className="space-y-4">
        {/* Engine Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Simulation Engine
          </label>
          <select 
            value={simulationEngine}
            onChange={(e) => onSimulationEngineChange?.(e.target.value as 'basic' | 'advanced' | 'cached' | 'simple')}
            className="w-full rounded-md border-gray-300 text-sm focus:border-red-500 focus:ring-red-500 mb-2"
            disabled={isSimulationActive}
          >
            <option value="simple">🚀 Simple Engine (Pre-computed relationships - RECOMMENDED)</option>
            <option value="basic">Basic Engine (Proximity-based)</option>
            <option value="advanced">Advanced Engine (Graph-based)</option>
            <option value="cached">⚡ Cached Engine (Pre-computed results)</option>
          </select>
          <div className="text-xs text-gray-500">
            {simulationEngine === 'simple' && '🚀 Fast lookups with pre-computed relationships (recommended)'}
            {simulationEngine === 'basic' && '📊 Real-time proximity-based cascade computation'}
            {simulationEngine === 'advanced' && '🔬 Complex graph-based dependency modeling'}
            {simulationEngine === 'cached' && '⚡ Pre-computed results (requires cache file)'}
          </div>
        </div>

        {/* Animation System Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Animation System
          </label>
          <select 
            value={animationSystem}
            onChange={(e) => onAnimationSystemChange?.(e.target.value as 'basic' | 'advanced' | 'optimized')}
            className="w-full rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500 mb-2"
            disabled={isSimulationActive}
          >
            <option value="basic">Basic Visualization (Current)</option>
            <option value="advanced">Advanced Animation (Multi-stage)</option>
            <option value="optimized">🚀 Optimized Animation (GPU-accelerated)</option>
          </select>
          <div className="text-xs text-gray-500">
            {animationSystem === 'basic' && '📊 Simple ripple effects and connections'}
            {animationSystem === 'advanced' && '🎬 Multi-stage timing with visual effects'}
            {animationSystem === 'optimized' && '⚡ GPU-accelerated pulses and lines (5-10x faster)'}
          </div>
        </div>

        {/* Selected Asset Display */}
        {selectedAsset && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <h4 className="font-semibold text-blue-900 mb-2">🎯 Selected Asset</h4>
            <div className="text-sm space-y-1">
              <div><strong>Name:</strong> {selectedAsset.name}</div>
              <div><strong>Type:</strong> {selectedAsset.type}</div>
              <div><strong>Criticality:</strong> 
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  selectedAsset.criticality === 'critical' ? 'bg-red-100 text-red-800' :
                  selectedAsset.criticality === 'high' ? 'bg-orange-100 text-orange-800' :
                  selectedAsset.criticality === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedAsset.criticality}
                </span>
              </div>
              <div><strong>Operator:</strong> {selectedAsset.operator}</div>
            </div>
          </div>
        )}

        {/* Trigger Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trigger Asset ID
          </label>
          <input
            type="text"
            placeholder="Click asset on map or enter ID..."
            value={selectedTrigger || ''}
            onChange={(e) => setSelectedTrigger(e.target.value || '')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
            disabled={isSimulationActive}
          />
          <p className="text-xs text-gray-500 mt-1">
            💡 Click any asset on the map to auto-fill this field
          </p>
        </div>

        {/* Radius Control */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cascade Radius: {config.radiusKm}km
          </label>
          <input
            type="range"
            min="1"
            max="15"
            step="0.5"
            value={config.radiusKm}
            onChange={(e) => updateConfig({ radiusKm: parseFloat(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            disabled={isSimulationActive}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1km</span>
            <span>7.5km</span>
            <span>15km</span>
          </div>
        </div>

        {/* Speed Control */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Speed: {getSpeedLabel(config.speedMultiplier)}
          </label>
          <input
            type="range"
            min="0.25"
            max="3"
            step="0.25"
            value={config.speedMultiplier}
            onChange={(e) => updateConfig({ speedMultiplier: parseFloat(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            disabled={isSimulationActive}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Slow</span>
            <span>Normal</span>
            <span>Fast</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {getSpeedDelay(config.speedMultiplier)} between cascade steps
          </p>
        </div>

        {/* Severity Control */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Severity: {Math.round(config.severity * 100)}%
          </label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={config.severity}
            onChange={(e) => updateConfig({ severity: parseFloat(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            disabled={isSimulationActive}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>10%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.crossSectorEnabled}
              onChange={(e) => updateConfig({ crossSectorEnabled: e.target.checked })}
              className="rounded border-gray-300 focus:ring-red-500 text-red-600"
              disabled={isSimulationActive}
            />
            <span className="ml-2 text-sm text-gray-700">Enable cross-sector cascades</span>
          </label>
          <p className="text-xs text-gray-500 ml-6">
            Power failures affect telecoms, water affects power generation, etc.
          </p>
        </div>

        {/* Quick Scenario Buttons */}
        {!isSimulationActive && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">🎯 Quick Scenarios</h4>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => {
                  updateConfig({ radiusKm: 10, severity: 0.8, crossSectorEnabled: true });
                  onStartSimulation(); // Will find first critical asset automatically
                }}
                className="text-left text-xs bg-red-50 hover:bg-red-100 p-2 rounded border border-red-200"
              >
                ⚡ Critical Infrastructure Failure
                <div className="text-gray-500 mt-1">High severity, cross-sector enabled</div>
              </button>
              
              <button
                onClick={() => {
                  updateConfig({ radiusKm: 5, severity: 0.6, crossSectorEnabled: true });
                  onStartSimulation(); // Will find first available asset
                }}
                className="text-left text-xs bg-blue-50 hover:bg-blue-100 p-2 rounded border border-blue-200"
              >
                💧 Medium Impact Scenario
                <div className="text-gray-500 mt-1">Medium severity, cross-sector enabled</div>
              </button>
              
              <button
                onClick={() => {
                  updateConfig({ radiusKm: 3, severity: 0.4, crossSectorEnabled: false });
                  onStartSimulation(); // Will find first available asset
                }}
                className="text-left text-xs bg-green-50 hover:bg-green-100 p-2 rounded border border-green-200"
              >
                📡 Localized Outage
                <div className="text-gray-500 mt-1">Low severity, single-sector only</div>
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          <button
            onClick={() => onStartSimulation(selectedTrigger || undefined)}
            disabled={isSimulationActive}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center"
          >
            {isSimulationActive ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Running...
              </>
            ) : (
              '🚨 Start Cascade'
            )}
          </button>
          {isSimulationActive && (
            <button
              onClick={onResetSimulation}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200"
            >
              Reset
            </button>
          )}
        </div>

        {/* Simulation Status */}
        {isSimulationActive && cascadeStatistics && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center mb-2">
              <div className="animate-pulse w-2 h-2 bg-red-500 rounded-full mr-2"></div>
              <span className="text-sm text-red-700 font-medium">Cascade Active</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-red-700">Assets Affected:</span>
                <span className="ml-1 font-medium">{cascadeStatistics.totalAffected}</span>
              </div>
              <div>
                <span className="text-red-700">Population:</span>
                <span className="ml-1 font-medium">{cascadeStatistics.totalPopulationAffected.toLocaleString()}</span>
              </div>
            </div>
            
            {/* Breakdown by type */}
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(cascadeStatistics.byType).map(([type, count]) => (
                <span
                  key={type}
                  className={`text-xs px-2 py-1 rounded ${
                    type === 'power' ? 'bg-red-100 text-red-800' :
                    type === 'water' ? 'bg-blue-100 text-blue-800' :
                    type === 'telecoms' ? 'bg-green-100 text-green-800' :
                    'bg-purple-100 text-purple-800'
                  }`}
                >
                  {type}: {count}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimulationControls;