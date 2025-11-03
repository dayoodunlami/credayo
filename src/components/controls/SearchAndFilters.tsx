import React, { useState, useCallback, useEffect } from 'react';
import { SearchService } from '../../services/SearchService';
import type { SearchFilters, SearchResult } from '../../services/SearchService';

interface SearchAndFiltersProps {
  searchService: SearchService;
  onSearchResults: (results: SearchResult) => void;
  onHighlightAssets: (assetIds: string[]) => void;
  onClearHighlights: () => void;
}

const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  searchService,
  onSearchResults,
  onHighlightAssets,
  onClearHighlights
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOperators, setSelectedOperators] = useState<string[]>([]);
  const [availableOperators, setAvailableOperators] = useState<string[]>([]);
  const [quickFilters, setQuickFilters] = useState({
    criticalOnly: false,
    highVoltageOnly: false,
    crossSectorOnly: false
  });
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Load operators on mount
  useEffect(() => {
    const operators = searchService.getOperators();
    setAvailableOperators(operators);
  }, [searchService]);

  // Debounced search
  const performSearch = useCallback(async () => {
    setIsSearching(true);
    
    const filters: Partial<SearchFilters> = {
      query: searchQuery,
      operators: selectedOperators,
      showCriticalOnly: quickFilters.criticalOnly,
      showHighVoltageOnly: quickFilters.highVoltageOnly,
      showCrossSectorOnly: quickFilters.crossSectorOnly
    };

    const results = searchService.search(filters);
    setSearchResults(results);
    onSearchResults(results);
    
    // Highlight results on map
    if (results.assets.length > 0 && results.assets.length < 1000) {
      onHighlightAssets(results.assets.map(a => a.id));
    }
    
    setIsSearching(false);
  }, [searchQuery, selectedOperators, quickFilters, searchService, onSearchResults, onHighlightAssets]);

  // Auto-search on input change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [performSearch]);

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedOperators([]);
    setQuickFilters({
      criticalOnly: false,
      highVoltageOnly: false,
      crossSectorOnly: false
    });
    setSearchResults(null);
    onClearHighlights();
  };

  const handleOperatorToggle = (operator: string) => {
    setSelectedOperators(prev => 
      prev.includes(operator) 
        ? prev.filter(op => op !== operator)
        : [...prev, operator]
    );
  };

  const handleQuickFilter = (filterKey: keyof typeof quickFilters) => {
    setQuickFilters(prev => ({
      ...prev,
      [filterKey]: !prev[filterKey]
    }));
  };

  // Get top operators for cascade scenarios
  const topOperators = availableOperators.slice(0, 8);

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Search & Filters</h3>
        {searchResults && (
          <span className="text-sm text-gray-500">
            {searchResults.totalCount.toLocaleString()} results
          </span>
        )}
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search assets, operators, types..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {isSearching && (
          <div className="absolute right-3 top-2.5">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {/* Quick Filters for Cascade Analysis */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">🎯 Cascade Triggers</h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleQuickFilter('criticalOnly')}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              quickFilters.criticalOnly
                ? 'bg-red-100 text-red-800 border-red-300'
                : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-red-50'
            }`}
          >
            🔴 Critical Only
          </button>
          
          <button
            onClick={() => handleQuickFilter('highVoltageOnly')}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              quickFilters.highVoltageOnly
                ? 'bg-orange-100 text-orange-800 border-orange-300'
                : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-orange-50'
            }`}
          >
            ⚡ High Voltage (110kV+)
          </button>
          
          <button
            onClick={() => handleQuickFilter('crossSectorOnly')}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              quickFilters.crossSectorOnly
                ? 'bg-purple-100 text-purple-800 border-purple-300'
                : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-purple-50'
            }`}
          >
            🔗 Cross-Sector Impact
          </button>
        </div>
      </div>

      {/* Operator Filter */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">🏢 Filter by Operator</h4>
        <div className="max-h-32 overflow-y-auto space-y-1">
          {topOperators.map(operator => (
            <label key={operator} className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
              <input
                type="checkbox"
                checked={selectedOperators.includes(operator)}
                onChange={() => handleOperatorToggle(operator)}
                className="rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-600 truncate">
                {operator}
              </span>
              {searchResults?.operatorCounts[operator] && (
                <span className="ml-auto text-xs text-gray-400">
                  ({searchResults.operatorCounts[operator]})
                </span>
              )}
            </label>
          ))}
        </div>
        
        {availableOperators.length > 8 && (
          <button className="text-xs text-blue-600 hover:text-blue-800">
            Show all {availableOperators.length} operators...
          </button>
        )}
      </div>

      {/* Search Results Summary */}
      {searchResults && searchResults.totalCount > 0 && (
        <div className="bg-blue-50 p-3 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Search Results</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-blue-700">Power:</span>
              <span className="ml-1 font-medium">{searchResults.typeCounts.power || 0}</span>
            </div>
            <div>
              <span className="text-blue-700">Water:</span>
              <span className="ml-1 font-medium">{searchResults.typeCounts.water || 0}</span>
            </div>
            <div>
              <span className="text-blue-700">Telecoms:</span>
              <span className="ml-1 font-medium">{searchResults.typeCounts.telecoms || 0}</span>
            </div>
            <div>
              <span className="text-blue-700">Transport:</span>
              <span className="ml-1 font-medium">{searchResults.typeCounts.transport || 0}</span>
            </div>
          </div>
          
          {/* Criticality breakdown */}
          <div className="mt-2 flex flex-wrap gap-1">
            {Object.entries(searchResults.criticalityCounts).map(([level, count]) => (
              <span
                key={level}
                className={`text-xs px-2 py-1 rounded ${
                  level === 'critical' ? 'bg-red-100 text-red-800' :
                  level === 'high' ? 'bg-orange-100 text-orange-800' :
                  level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}
              >
                {level}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cascade Scenario Shortcuts */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">🎮 Cascade Scenarios</h4>
        <div className="space-y-1">
          <button
            onClick={() => {
              setSearchQuery('Thames Water');
              setQuickFilters(prev => ({ ...prev, criticalOnly: true }));
            }}
            className="w-full text-left text-xs bg-blue-50 hover:bg-blue-100 p-2 rounded border border-blue-200"
          >
            💧 Thames Water Critical Assets
            <div className="text-gray-500 mt-1">Single-operator failure scenario</div>
          </button>
          
          <button
            onClick={() => {
              setSearchQuery('National Grid');
              setQuickFilters(prev => ({ ...prev, highVoltageOnly: true }));
            }}
            className="w-full text-left text-xs bg-red-50 hover:bg-red-100 p-2 rounded border border-red-200"
          >
            ⚡ National Grid Transmission
            <div className="text-gray-500 mt-1">High-voltage cascade triggers</div>
          </button>
          
          <button
            onClick={() => {
              setQuickFilters(prev => ({ ...prev, crossSectorOnly: true, criticalOnly: true }));
            }}
            className="w-full text-left text-xs bg-purple-50 hover:bg-purple-100 p-2 rounded border border-purple-200"
          >
            🔗 Cross-Sector Critical
            <div className="text-gray-500 mt-1">Multi-sector cascade potential</div>
          </button>
        </div>
      </div>

      {/* Clear/Reset */}
      {(searchQuery || selectedOperators.length > 0 || Object.values(quickFilters).some(Boolean)) && (
        <button
          onClick={handleClearSearch}
          className="w-full text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-md transition-colors"
        >
          🧹 Clear All Filters
        </button>
      )}
    </div>
  );
};

export default SearchAndFilters;