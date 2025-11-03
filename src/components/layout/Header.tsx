import React from 'react';

interface HeaderProps {
  systemStatus: 'online' | 'offline' | 'degraded';
}

const Header: React.FC<HeaderProps> = ({ systemStatus }) => {
  const statusConfig = {
    online: { color: 'text-green-600', bg: 'bg-green-500', text: 'System Online' },
    offline: { color: 'text-red-600', bg: 'bg-red-500', text: 'System Offline' },
    degraded: { color: 'text-yellow-600', bg: 'bg-yellow-500', text: 'System Degraded' }
  };

  const status = statusConfig[systemStatus];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="w-full px-6">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-gray-900">CReDo</h1>
              <p className="text-sm text-gray-500">Infrastructure Resilience Platform</p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-sm text-gray-500">
              London, UK • Live Data
            </div>
            <div className={`flex items-center text-sm ${status.color}`}>
              <div className={`w-2 h-2 ${status.bg} rounded-full mr-2`}></div>
              {status.text}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;