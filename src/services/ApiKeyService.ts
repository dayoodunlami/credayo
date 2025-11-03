export interface ApiKeyTestResult {
  key: string;
  isValid: boolean;
  error?: string;
  provider: string;
}

export class ApiKeyService {
  private static instance: ApiKeyService;
  private testedKeys = new Map<string, ApiKeyTestResult>();

  static getInstance(): ApiKeyService {
    if (!ApiKeyService.instance) {
      ApiKeyService.instance = new ApiKeyService();
    }
    return ApiKeyService.instance;
  }

  // Get all available API keys from environment
  private getAvailableKeys(): { key: string; name: string }[] {
    const keys: { key: string; name: string }[] = [];
    
    // Check for multiple MapTiler keys
    const key1 = import.meta.env.VITE_MAPTILER_KEY;
    const key2 = import.meta.env.VITE_MAPTILER_KEY_1;
    const key3 = import.meta.env.VITE_MAPTILER_KEY_2;
    const key4 = import.meta.env.VITE_MAPTILER_KEY_3;

    console.log('🔍 Checking environment variables:');
    console.log('VITE_MAPTILER_KEY:', key1 ? `${key1.substring(0, 10)}...` : 'not found');
    console.log('VITE_MAPTILER_KEY (full for debug):', key1);
    console.log('VITE_MAPTILER_KEY_1:', key2 ? `${key2.substring(0, 10)}...` : 'not found');
    console.log('VITE_MAPTILER_KEY_2:', key3 ? `${key3.substring(0, 10)}...` : 'not found');
    console.log('VITE_MAPTILER_KEY_3:', key4 ? `${key4.substring(0, 10)}...` : 'not found');

    if (key1 && key1 !== 'your_maptiler_key_here' && key1.trim() !== '') {
      keys.push({ key: key1, name: 'VITE_MAPTILER_KEY' });
    }
    if (key2 && key2 !== 'your_maptiler_key_here' && key2.trim() !== '') {
      keys.push({ key: key2, name: 'VITE_MAPTILER_KEY_1' });
    }
    if (key3 && key3 !== 'your_backup_key_here' && key3.trim() !== '') {
      keys.push({ key: key3, name: 'VITE_MAPTILER_KEY_2' });
    }
    if (key4 && key4 !== 'your_third_key_here' && key4.trim() !== '') {
      keys.push({ key: key4, name: 'VITE_MAPTILER_KEY_3' });
    }

    console.log(`📋 Found ${keys.length} API key(s) to test`);
    return keys;
  }

  // Test a single API key
  private async testSingleKey(apiKey: string): Promise<ApiKeyTestResult> {
    // Check cache first
    if (this.testedKeys.has(apiKey)) {
      return this.testedKeys.get(apiKey)!;
    }

    try {
      const response = await fetch(`https://api.maptiler.com/maps/streets/style.json?key=${apiKey}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      const result: ApiKeyTestResult = {
        key: apiKey,
        isValid: response.ok,
        provider: 'MapTiler',
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      };

      // Cache the result
      this.testedKeys.set(apiKey, result);
      return result;

    } catch (error) {
      const result: ApiKeyTestResult = {
        key: apiKey,
        isValid: false,
        provider: 'MapTiler',
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };

      this.testedKeys.set(apiKey, result);
      return result;
    }
  }

  // Test all available API keys and return the first working one
  async findWorkingApiKey(): Promise<ApiKeyTestResult | null> {
    const availableKeys = this.getAvailableKeys();
    
    if (availableKeys.length === 0) {
      return null;
    }

    console.log(`🔑 Testing ${availableKeys.length} API key(s)...`);

    // Test keys in parallel for speed
    const testPromises = availableKeys.map(({ key }) => this.testSingleKey(key));
    const results = await Promise.all(testPromises);

    // Log results
    results.forEach((result, index) => {
      const keyName = availableKeys[index].name;
      if (result.isValid) {
        console.log(`✅ ${keyName}: Valid`);
      } else {
        console.log(`❌ ${keyName}: ${result.error}`);
      }
    });

    // Return the first working key
    return results.find(result => result.isValid) || null;
  }

  // Get all test results for debugging
  async getAllTestResults(): Promise<ApiKeyTestResult[]> {
    const availableKeys = this.getAvailableKeys();
    const testPromises = availableKeys.map(({ key }) => this.testSingleKey(key));
    return Promise.all(testPromises);
  }

  // Clear cache (for retesting)
  clearCache(): void {
    this.testedKeys.clear();
  }
}