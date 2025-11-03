import MainLayout from './components/layout/MainLayout';
import OptimizedApp from './OptimizedApp';
import ApiKeyDebugger from './components/ApiKeyDebugger';
import DemoNavigation from './components/DemoNavigation';
import './App.css';

function App() {
  // Check URL for optimized version
  const isOptimized = window.location.pathname === '/optimized' || window.location.search.includes('optimized=true');
  
  if (isOptimized) {
    return <OptimizedApp />;
  }

  return (
    <>
      <MainLayout />
      <DemoNavigation />
      
      {/* Performance Comparison Panel */}
      <div className="fixed bottom-4 right-4 z-40">
        <details className="bg-white rounded-lg shadow-lg border">
          <summary className="px-4 py-2 cursor-pointer text-sm font-medium text-gray-700">
            🚀 Performance Options
          </summary>
          <div className="p-4 border-t max-w-md space-y-3">
            <div className="text-sm font-semibold text-gray-900">Compare Versions:</div>
            
            <a 
              href="/?optimized=true"
              className="block w-full py-2 px-3 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors text-center"
            >
              🚀 Try Optimized Version
            </a>
            
            <a 
              href="/test-infrastructure-cascade-correct.html"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2 px-3 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors text-center"
            >
              🌍 3D Cesium View
            </a>
            
            <details className="mt-3">
              <summary className="text-xs text-gray-500 cursor-pointer">Debug Panel</summary>
              <div className="mt-2">
                <ApiKeyDebugger />
              </div>
            </details>
          </div>
        </details>
      </div>
    </>
  );
}

export default App;