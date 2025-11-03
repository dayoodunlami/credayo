import React from 'react';

interface DashboardMetrics {
  economicImpact: number;
  populationAffected: number;
  assetsAtRisk: number;
  vulnerableSites: {
    hospitals: number;
    schools: number;
    careHomes: number;
  };
  criticalAssets: number;
}

interface LiveDashboardProps {
  metrics: DashboardMetrics;
  isSimulationActive: boolean;
}

const LiveDashboard: React.FC<LiveDashboardProps> = ({ metrics, isSimulationActive }) => {
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `£${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
      return `£${(amount / 1000).toFixed(0)}K`;
    }
    return `£${amount.toLocaleString()}`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const MetricCard: React.FC<{
    title: string;
    value: string;
    subtitle: string;
    isActive?: boolean;
    color?: 'red' | 'orange' | 'gray';
  }> = ({ title, value, subtitle, isActive = false, color = 'gray' }) => {
    const colorClasses = {
      red: 'text-red-600',
      orange: 'text-orange-600',
      gray: 'text-gray-900'
    };

    return (
      <div className="bg-white rounded-lg shadow p-4 metric-card">
        <h4 className="text-sm font-medium text-gray-900 mb-2">{title}</h4>
        <div className={`text-2xl font-bold transition-all duration-500 ${
          isActive ? colorClasses[color] : 'text-gray-900'
        }`}>
          {value}
        </div>
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Economic Impact */}
      <MetricCard
        title="Economic Impact"
        value={formatCurrency(metrics.economicImpact)}
        subtitle={isSimulationActive ? 'Live simulation data' : 'No active simulation'}
        isActive={isSimulationActive && metrics.economicImpact > 0}
        color="red"
      />

      {/* Population Affected */}
      <MetricCard
        title="Population Affected"
        value={formatNumber(metrics.populationAffected)}
        subtitle="People impacted"
        isActive={isSimulationActive && metrics.populationAffected > 0}
        color="orange"
      />

      {/* Vulnerable Sites */}
      <div className="bg-white rounded-lg shadow p-4 metric-card">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Vulnerable Sites</h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600 flex items-center">
              <span className="mr-2">🏥</span>
              Hospitals
            </span>
            <span className={`text-xs font-medium transition-colors duration-300 ${
              metrics.vulnerableSites.hospitals > 0 ? 'text-red-600' : 'text-gray-900'
            }`}>
              {metrics.vulnerableSites.hospitals}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600 flex items-center">
              <span className="mr-2">🏫</span>
              Schools
            </span>
            <span className={`text-xs font-medium transition-colors duration-300 ${
              metrics.vulnerableSites.schools > 0 ? 'text-red-600' : 'text-gray-900'
            }`}>
              {metrics.vulnerableSites.schools}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600 flex items-center">
              <span className="mr-2">🏠</span>
              Care Homes
            </span>
            <span className={`text-xs font-medium transition-colors duration-300 ${
              metrics.vulnerableSites.careHomes > 0 ? 'text-red-600' : 'text-gray-900'
            }`}>
              {metrics.vulnerableSites.careHomes}
            </span>
          </div>
        </div>
      </div>

      {/* Critical Assets */}
      <MetricCard
        title="Critical Assets"
        value={metrics.criticalAssets.toString()}
        subtitle="Single points of failure"
        color="red"
      />

      {/* Assets at Risk */}
      <MetricCard
        title="Assets at Risk"
        value={formatNumber(metrics.assetsAtRisk)}
        subtitle="Infrastructure assets"
        isActive={isSimulationActive && metrics.assetsAtRisk > 0}
        color="red"
      />

      {/* System Status Indicator */}
      {isSimulationActive && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
            <span className="text-xs font-medium text-red-800">
              Simulation Running
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveDashboard;