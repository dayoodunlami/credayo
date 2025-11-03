import React, { useState, useEffect } from 'react';
import type { StoryPoint } from '../services/CameraService';

interface StoryboardPopupProps {
  isVisible: boolean;
  currentPoint: StoryPoint | null;
  currentIndex: number;
  totalPoints: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}

const StoryboardPopup: React.FC<StoryboardPopupProps> = ({
  isVisible,
  currentPoint,
  currentIndex,
  totalPoints,
  onClose,
  onNext,
  onPrevious,
  onSkip
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, currentPoint]);

  if (!isVisible || !currentPoint) return null;

  const progressPercent = (currentIndex / totalPoints) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className={`bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4 transform transition-all duration-300 ${
        isAnimating ? 'scale-95 opacity-90' : 'scale-100 opacity-100'
      }`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-4 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">🌪️ Storm Arwen - November 2021</h2>
              <p className="text-red-100 text-sm">Real Infrastructure Resilience Event</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-red-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-red-100 mb-1">
              <span>Step {currentIndex} of {totalPoints}</span>
              <span>{Math.round(progressPercent)}% Complete</span>
            </div>
            <div className="w-full bg-red-800 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>   
     {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {currentPoint.name}
            </h3>
            <p className="text-gray-700 text-lg leading-relaxed">
              {currentPoint.description}
            </p>
          </div>

          {/* Impact Stats (based on real Storm Arwen data) */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">📊 Impact Statistics</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {getImpactStats(currentPoint.id).map((stat, index) => (
                <div key={index} className="flex justify-between">
                  <span className="text-gray-600">{stat.label}:</span>
                  <span className="font-semibold text-red-600">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-gray-900 mb-2">⏰ Timeline</h4>
            <p className="text-sm text-blue-800">
              {getTimelineInfo(currentPoint.id)}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-between items-center">
          <button
            onClick={onPrevious}
            disabled={currentIndex === 1}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          
          <div className="flex space-x-2">
            <button
              onClick={onSkip}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Skip Story
            </button>
            
            <button
              onClick={onNext}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {currentIndex === totalPoints ? 'Finish' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper functions for real Storm Arwen data
function getImpactStats(pointId: string) {
  const stats: Record<string, Array<{label: string, value: string}>> = {
    'arwen-approach': [
      { label: 'Wind Speed', value: '100+ mph' },
      { label: 'Weather Warning', value: 'Red (Rare)' },
      { label: 'Affected Regions', value: '6 Counties' },
      { label: 'Duration', value: '18 Hours' }
    ],
    'northumberland-impact': [
      { label: 'Homes Without Power', value: '240,000' },
      { label: 'Trees Down', value: '16,000+' },
      { label: 'Roads Blocked', value: '200+' },
      { label: 'Rail Lines Closed', value: '12' }
    ],
    'durham-cascades': [
      { label: 'Power Outages', value: '180,000' },
      { label: 'Water Supplies Lost', value: '45,000' },
      { label: 'Substations Failed', value: '23' },
      { label: 'Mobile Towers Down', value: '150+' }
    ],
    'yorkshire-transport': [
      { label: 'A1 Closures', value: '50+ Miles' },
      { label: 'Train Cancellations', value: '400+' },
      { label: 'Airport Closures', value: '3' },
      { label: 'Bus Services', value: '90% Suspended' }
    ],
    'scotland-isolation': [
      { label: 'Scottish Outages', value: '135,000' },
      { label: 'Villages Cut Off', value: '50+' },
      { label: 'Emergency Calls', value: '2,000+' },
      { label: 'Rescue Operations', value: '200+' }
    ],
    'recovery-overview': [
      { label: 'Engineers Deployed', value: '1,000+' },
      { label: 'Military Personnel', value: '300' },
      { label: 'Max Outage Duration', value: '9 Days' },
      { label: 'Total Cost', value: '£50M+' }
    ]
  };
  
  return stats[pointId] || [];
}

function getTimelineInfo(pointId: string): string {
  const timeline: Record<string, string> = {
    'arwen-approach': 'November 26, 2021 - 15:00: Met Office issues rare Red Weather Warning as Storm Arwen approaches from North Sea',
    'northumberland-impact': 'November 26, 2021 - 21:00: First major power cuts reported. Kielder Forest devastated by 100mph winds',
    'durham-cascades': 'November 27, 2021 - 02:00: Cascading failures spread south. Water treatment plants lose power backup',
    'yorkshire-transport': 'November 27, 2021 - 06:00: Transport network collapses. A1 blocked by fallen trees for 50+ miles',
    'scotland-isolation': 'November 27, 2021 - 12:00: Scottish Borders cut off. Rural communities isolated for days',
    'recovery-overview': 'November 29, 2021 - 08:00: Military deployed. Full recovery takes 9 days for most remote areas'
  };
  
  return timeline[pointId] || 'Timeline information not available';
}

export default StoryboardPopup;