/**
 * Loading Progress Indicator for Chunked Data
 */
import React, { useState, useEffect } from 'react';

interface LoadingProgressProps {
  isVisible: boolean;
  onComplete?: () => void;
}

const LoadingProgress: React.FC<LoadingProgressProps> = ({ isVisible, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Initializing...');
  const [assetsLoaded, setAssetsLoaded] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    // Simulate chunked loading progress
    const phases = [
      { progress: 10, status: 'Loading metadata...', assets: 0 },
      { progress: 25, status: 'Loading first chunk...', assets: 1000 },
      { progress: 40, status: 'Map ready! Loading more data...', assets: 1000 },
      { progress: 60, status: 'Loading chunks 2-10...', assets: 8000 },
      { progress: 80, status: 'Loading chunks 11-20...', assets: 15000 },
      { progress: 95, status: 'Loading final chunks...', assets: 25000 },
      { progress: 100, status: 'Complete! All assets loaded.', assets: 26272 }
    ];

    let currentPhase = 0;
    const interval = setInterval(() => {
      if (currentPhase < phases.length) {
        const phase = phases[currentPhase];
        setProgress(phase.progress);
        setStatus(phase.status);
        setAssetsLoaded(phase.assets);
        currentPhase++;

        // Map becomes interactive at 25%
        if (phase.progress === 25 && onComplete) {
          onComplete();
        }
      } else {
        clearInterval(interval);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">🚀 Loading Infrastructure Data</h3>
          <p className="text-sm text-gray-600">Phase 1: Chunked Loading</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{status}</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-center text-sm">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-lg font-bold text-blue-600">{assetsLoaded.toLocaleString()}</div>
            <div className="text-blue-700">Assets Loaded</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-lg font-bold text-green-600">
              {progress >= 25 ? '✓ Ready' : 'Loading...'}
            </div>
            <div className="text-green-700">Map Status</div>
          </div>
        </div>

        {/* Interactive Notice */}
        {progress >= 25 && progress < 100 && (
          <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
            <div className="text-sm text-green-800">
              🎉 <strong>Map is now interactive!</strong> More data loading in background...
            </div>
          </div>
        )}

        {/* Skip Option */}
        {progress < 100 && (
          <div className="mt-4 text-center">
            <button
              onClick={onComplete}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Skip and use current data
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingProgress;