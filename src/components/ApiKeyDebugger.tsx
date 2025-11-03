import { useState } from 'react';
import { ApiKeyService } from '../services/ApiKeyService';
import type { ApiKeyTestResult } from '../services/ApiKeyService';

const ApiKeyDebugger: React.FC = () => {
  const [testResults, setTestResults] = useState<ApiKeyTestResult[]>([]);
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [manualKey, setManualKey] = useState('');
  const [manualResult, setManualResult] = useState<ApiKeyTestResult | null>(null);

  const testAllKeys = async () => {
    setIsTestingAll(true);
    const apiKeyService = ApiKeyService.getInstance();
    
    try {
      const results = await apiKeyService.getAllTestResults();
      setTestResults(results);
    } catch (error) {
      console.error('Error testing keys:', error);
    } finally {
      setIsTestingAll(false);
    }
  };

  const testManualKey = async () => {
    if (!manualKey.trim()) return;
    
    try {
      const response = await fetch(`https://api.maptiler.com/maps/streets/style.json?key=${manualKey}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      setManualResult({
        key: manualKey,
        isValid: response.ok,
        provider: 'MapTiler',
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      });
    } catch (error) {
      setManualResult({
        key: manualKey,
        isValid: false,
        provider: 'MapTiler',
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  const testInBrowser = () => {
    const key = manualKey || import.meta.env.VITE_MAPTILER_KEY;
    if (key) {
      window.open(`https://api.maptiler.com/maps/streets/style.json?key=${key}`, '_blank');
    }
  };

  return (
    <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>🔧 API Key Debugger</h2>
      
      {/* Test All Keys from .env */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem' }}>Test Keys from .env</h3>
        <button
          onClick={testAllKeys}
          disabled={isTestingAll}
          style={{
            backgroundColor: isTestingAll ? '#9ca3af' : '#2563eb',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            border: 'none',
            fontSize: '0.875rem',
            cursor: isTestingAll ? 'not-allowed' : 'pointer',
            marginBottom: '1rem'
          }}
        >
          {isTestingAll ? 'Testing...' : 'Test All .env Keys'}
        </button>

        {testResults.length > 0 && (
          <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.375rem' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Results:</h4>
            {testResults.map((result, index) => (
              <div key={index} style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                <span style={{ color: result.isValid ? '#059669' : '#dc2626' }}>
                  {result.isValid ? '✅' : '❌'} Key {index + 1}: {result.key.substring(0, 10)}...
                </span>
                {result.error && (
                  <div style={{ color: '#6b7280', fontSize: '0.75rem', marginLeft: '1rem' }}>
                    {result.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Key Test */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem' }}>Test Manual Key</h3>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="text"
            value={manualKey}
            onChange={(e) => setManualKey(e.target.value)}
            placeholder="Enter API key to test..."
            style={{
              flex: 1,
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem'
            }}
          />
          <button
            onClick={testManualKey}
            style={{
              backgroundColor: '#2563eb',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: 'none',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            Test
          </button>
          <button
            onClick={testInBrowser}
            style={{
              backgroundColor: '#059669',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: 'none',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            Open in Browser
          </button>
        </div>

        {manualResult && (
          <div style={{ 
            backgroundColor: manualResult.isValid ? '#d1fae5' : '#fee2e2', 
            padding: '0.75rem', 
            borderRadius: '0.375rem',
            border: `1px solid ${manualResult.isValid ? '#a7f3d0' : '#fecaca'}`
          }}>
            <div style={{ color: manualResult.isValid ? '#059669' : '#dc2626', fontSize: '0.875rem' }}>
              {manualResult.isValid ? '✅ Valid API Key!' : '❌ Invalid API Key'}
            </div>
            {manualResult.error && (
              <div style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {manualResult.error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Browser Test Instructions */}
      <div style={{ backgroundColor: '#eff6ff', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #bfdbfe' }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#1e40af' }}>
          🌐 Browser Test
        </h4>
        <p style={{ fontSize: '0.75rem', color: '#1e40af', marginBottom: '0.5rem' }}>
          You can test any API key directly in your browser:
        </p>
        <code style={{ fontSize: '0.75rem', backgroundColor: 'white', padding: '0.25rem', borderRadius: '0.25rem' }}>
          https://api.maptiler.com/maps/streets/style.json?key=YOUR_KEY_HERE
        </code>
        <p style={{ fontSize: '0.75rem', color: '#1e40af', marginTop: '0.5rem' }}>
          ✅ Valid key = JSON response | ❌ Invalid key = Error message
        </p>
      </div>
    </div>
  );
};

export default ApiKeyDebugger;