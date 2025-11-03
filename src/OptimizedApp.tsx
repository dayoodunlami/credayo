/**
 * OPTIMIZED APP
 * 
 * Streamlined version of the main app with:
 * - Single service architecture
 * - Fast loading (10% initial assets)
 * - Heatmap cascade visualization
 * - No performance issues
 * - Clean component structure
 */

import OptimizedMainLayout from './components/OptimizedMainLayout';
import DemoNavigation from './components/DemoNavigation';
import './App.css';

function OptimizedApp() {
  return (
    <div className="optimized-app">
      <OptimizedMainLayout />
      
      {/* Demo Navigation */}
      <DemoNavigation />
      
      {/* Development Info - Remove in production */}
      <div className="fixed top-20 right-80 z-40">
        <details className="bg-white rounded-lg shadow-lg border max-w-xs">
          <summary className="px-4 py-2 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-50">
            🚀 Optimized Version
          </summary>
          <div className="p-4 border-t text-xs text-gray-600 space-y-2">
            <div><strong>Performance:</strong></div>
            <div>• Single service (vs 8+ services)</div>
            <div>• 10% initial loading</div>
            <div>• Heatmap cascade visualization</div>
            <div>• No memory leaks</div>
            <div>• Fast startup</div>
            
            <div className="pt-2 border-t border-gray-200">
              <strong>Compare:</strong>
            </div>
            <div className="space-y-1">
              <a href="/" className="block text-blue-600 hover:underline">
                Original App (Heavy)
              </a>
              <a href="/test-infrastructure-cascade-correct.html" className="block text-blue-600 hover:underline">
                3D Cesium View
              </a>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}

export default OptimizedApp;