/**
 * VIEW MODE TOGGLE COMPONENT
 * 
 * Provides toggle controls for switching between 2D, 3D, and photorealistic views
 */

import React from 'react';
import type { ViewMode } from '../types';

interface ViewModeToggleProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  disabled?: boolean;
}

const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  currentMode,
  onModeChange,
  disabled = false
}) => {
  const modes: Array<{
    id: ViewMode;
    label: string;
    icon: string;
    description: string;
  }> = [
    {
      id: '2d',
      label: '2D',
      icon: '🗺️',
      description: 'Flat map view'
    },
    {
      id: '3d',
      label: '3D',
      icon: '🏢',
      description: 'Elevated 3D view'
    },
    {
      id: 'photorealistic',
      label: 'Photo 3D',
      icon: '🌍',
      description: 'Photorealistic 3D'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-1">
      <div className="flex space-x-1">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            disabled={disabled}
            className={`
              flex flex-col items-center px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200
              ${currentMode === mode.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            title={mode.description}
          >
            <span className="text-sm mb-0.5">{mode.icon}</span>
            <span className="text-xs">{mode.label}</span>
          </button>
        ))}
      </div>
      
      {/* Current mode indicator - more compact */}
      <div className="mt-1 text-center">
        <span className="text-xs text-gray-500">
          {modes.find(m => m.id === currentMode)?.description}
        </span>
      </div>
    </div>
  );
};

export default ViewModeToggle;