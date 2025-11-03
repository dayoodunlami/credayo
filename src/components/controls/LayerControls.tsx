import React from 'react';

interface LayerControlsProps {
  layers: LayerConfig[];
  onLayerToggle: (layerId: string, visible: boolean) => void;
  onOpacityChange: (layerId: string, opacity: number) => void;
}

interface LayerConfig {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  opacity: number;
  count?: number;
}

const LayerControls: React.FC<LayerControlsProps> = ({ 
  layers, 
  onLayerToggle, 
  onOpacityChange 
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Infrastructure Layers</h3>
      <div className="space-y-4">
        {layers.map((layer) => (
          <div key={layer.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={layer.visible}
                  onChange={(e) => onLayerToggle(layer.id, e.target.checked)}
                  className="rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{layer.name}</span>
                {layer.count && (
                  <span className="ml-2 text-xs text-gray-500">({layer.count})</span>
                )}
              </label>
              <div 
                className="w-4 h-4 rounded-full border border-gray-300"
                style={{ backgroundColor: layer.color }}
              ></div>
            </div>
            {layer.visible && (
              <div className="ml-6">
                <label className="block text-xs text-gray-500 mb-1">Opacity</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={layer.opacity}
                  onChange={(e) => onOpacityChange(layer.id, parseInt(e.target.value))}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LayerControls;