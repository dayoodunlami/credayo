/**
 * Easy Navigation for Demo Pages
 */
import React from 'react';

const DemoNavigation: React.FC = () => {
  const currentPath = window.location.pathname;
  const currentSearch = window.location.search;
  
  const isOptimized = currentSearch.includes('optimized=true');
  const is3D = currentPath.includes('test-infrastructure-cascade-correct.html');
  const isOriginal = !isOptimized && !is3D;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <h3 className="text-sm font-bold text-gray-900 mb-3">🚀 Demo Navigation</h3>
        
        <div className="space-y-2">
          {/* Optimized 2D */}
          <a
            href="/?optimized=true"
            className={`block w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              isOptimized
                ? 'bg-green-100 text-green-800 border border-green-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isOptimized && '✓ '} ⚡ Optimized 2D Map
            <div className="text-xs opacity-75">Fast chunked loading</div>
          </a>

          {/* 3D Cesium */}
          <a
            href="/test-infrastructure-cascade-correct.html"
            className={`block w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              is3D
                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {is3D && '✓ '} 🌍 3D Cesium View
            <div className="text-xs opacity-75">Globe with buildings</div>
          </a>

          {/* Original */}
          <a
            href="/"
            className={`block w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              isOriginal
                ? 'bg-orange-100 text-orange-800 border border-orange-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isOriginal && '✓ '} 📊 Performance Compare
            <div className="text-xs opacity-75">Original vs optimized</div>
          </a>
        </div>

        {/* Quick Actions */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-2">Quick Actions:</div>
          <div className="flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 py-1 px-2 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200 transition-colors"
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => window.open(window.location.href, '_blank')}
              className="flex-1 py-1 px-2 bg-blue-100 text-blue-600 rounded text-xs hover:bg-blue-200 transition-colors"
            >
              🔗 New Tab
            </button>
          </div>
        </div>

        {/* Performance Info */}
        <div className="mt-3 pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            {isOptimized && '⚡ Chunked loading: ~2-3 sec startup'}
            {is3D && '🌍 3D rendering: May take 10-15 sec'}
            {isOriginal && '📊 Original: 30+ sec loading time'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoNavigation;