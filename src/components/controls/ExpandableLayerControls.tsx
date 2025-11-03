import React from 'react';

interface SubLayerConfig {
  id: string;
  name: string;
  visible: boolean;
  count: number;
  defaultOn: boolean;
}

interface LayerSectionConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  totalCount: number;
  expanded: boolean;
  visible: boolean;
  opacity: number;
  subLayers: SubLayerConfig[];
}

interface ExpandableLayerControlsProps {
  sections: LayerSectionConfig[];
  onSectionToggle: (sectionId: string, visible: boolean) => void;
  onSubLayerToggle: (sectionId: string, subLayerId: string, visible: boolean) => void;
  onOpacityChange: (sectionId: string, opacity: number) => void;
  onSectionExpand: (sectionId: string, expanded: boolean) => void;
}

const ExpandableLayerControls: React.FC<ExpandableLayerControlsProps> = ({
  sections,
  onSectionToggle,
  onSubLayerToggle,
  onOpacityChange,
  onSectionExpand
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Infrastructure Layers</h3>
      
      <div className="space-y-3">
        {sections.map((section) => (
          <div key={section.id} className="border border-gray-200 rounded-lg">
            {/* Section Header */}
            <div className="p-3 bg-gray-50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => onSectionExpand(section.id, !section.expanded)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {section.expanded ? (
                      <span className="w-4 h-4 text-center">▼</span>
                    ) : (
                      <span className="w-4 h-4 text-center">▶</span>
                    )}
                  </button>
                  
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={section.visible}
                      onChange={(e) => onSectionToggle(section.id, e.target.checked)}
                      className="rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      {section.icon} {section.name}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      ({section.totalCount.toLocaleString()})
                    </span>
                  </label>
                </div>
                
                <div 
                  className="w-4 h-4 rounded-full border border-gray-300"
                  style={{ backgroundColor: section.color }}
                />
              </div>
              
              {/* Opacity Control */}
              {section.visible && (
                <div className="mt-3 ml-7">
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-gray-500 min-w-0">Opacity:</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={section.opacity}
                      onChange={(e) => onOpacityChange(section.id, parseInt(e.target.value))}
                      className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-xs text-gray-500 min-w-0">{section.opacity}%</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Expandable Sub-layers */}
            {section.expanded && (
              <div className="p-3 space-y-2 bg-white rounded-b-lg">
                {section.subLayers.map((subLayer) => (
                  <div key={subLayer.id} className="flex items-center justify-between pl-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={subLayer.visible}
                        onChange={(e) => onSubLayerToggle(section.id, subLayer.id, e.target.checked)}
                        className="rounded border-gray-300 focus:ring-2 focus:ring-blue-500 text-sm"
                        disabled={!section.visible}
                      />
                      <span className={`ml-2 text-sm ${!section.visible ? 'text-gray-400' : 'text-gray-600'}`}>
                        {subLayer.name}
                      </span>
                      <span className={`ml-2 text-xs ${!section.visible ? 'text-gray-300' : 'text-gray-400'}`}>
                        ({subLayer.count})
                      </span>
                    </label>
                    
                    {subLayer.defaultOn && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Default ON
                      </span>
                    )}
                  </div>
                ))}
                
                {section.subLayers.length === 0 && (
                  <div className="text-sm text-gray-400 pl-4 italic">
                    Sub-categories coming in Phase 2
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap gap-2">
          <button className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200">
            🔴 Critical Only
          </button>
          <button className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200">
            🏢 Major Operators
          </button>
          <button className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200">
            ⚡ High Voltage
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpandableLayerControls;