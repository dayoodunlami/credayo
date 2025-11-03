// Infrastructure Asset Types and Styling

export interface InfrastructureAsset {
  id: string;
  name: string;
  type: 'power' | 'transport' | 'telecom' | 'water' | 'emergency';
  subtype: string;
  coordinates: [number, number]; // [longitude, latitude]
  status: 'normal' | 'degraded' | 'failed' | 'offline';
  criticality: 'low' | 'medium' | 'high' | 'critical';
  capacity?: number;
  voltage?: number;
  dependencies?: string[];
  metadata?: {
    operator?: string;
    network?: string;
    reference?: string;
    voltage?: string;
    voltage_primary?: string;
    voltage_secondary?: string;
    substation_type?: string;
    fuel_type?: string;
    generation_mw?: number;
    generator_type?: string;
    railway_type?: string;
    transport_type?: string;
    aeroway_type?: string;
    iata_code?: string;
    icao_code?: string;
    tower_type?: string;
    mobile_operator?: string;
    internet_provider?: string;
    treatment_method?: string;
    pumping_type?: string;
    storage_volume?: string;
    emergency_services?: boolean;
    beds?: number;
    emergency_phone?: string;
    healthcare_type?: string;
    commissioned?: string;
    decommissioned?: string;
    construction_status?: string;
    phone?: string;
    website?: string;
    email?: string;
    [key: string]: any;
  };
}

// Asset styling configuration
export const assetStyles = {
  power: {
    transmission: { color: '#dc2626', name: 'Transmission' }, // dark red
    primary: { color: '#ef4444', name: 'Primary' }, // red
    secondary: { color: '#f97316', name: 'Secondary' }, // orange
    generation: { color: '#7c2d12', name: 'Generation' }, // dark orange
    color: '#ef4444', // fallback
    icon: '⚡',
    size: 8
  },
  transport: {
    airport: { color: '#1d4ed8', name: 'Airport' }, // dark blue
    rail: { color: '#3b82f6', name: 'Railway' }, // blue
    port: { color: '#0ea5e9', name: 'Port' }, // sky blue
    logistics: { color: '#06b6d4', name: 'Logistics' }, // cyan
    color: '#3b82f6', // fallback
    icon: '🚇',
    size: 8
  },
  telecom: {
    datacenter: { color: '#059669', name: 'Data Center' }, // dark green
    fiber: { color: '#10b981', name: 'Fiber' }, // green
    tower: { color: '#34d399', name: 'Tower' }, // light green
    satellite: { color: '#6ee7b7', name: 'Satellite' }, // very light green
    color: '#10b981', // fallback
    icon: '📡',
    size: 8
  },
  water: {
    treatment: { color: '#0369a1', name: 'Treatment' }, // dark blue
    pumping: { color: '#0284c7', name: 'Pumping' }, // blue
    storage: { color: '#0ea5e9', name: 'Storage' }, // sky blue
    distribution: { color: '#38bdf8', name: 'Distribution' }, // light blue
    color: '#0284c7', // fallback
    icon: '💧',
    size: 8
  },
  emergency: {
    hospital: { color: '#dc2626', name: 'Hospital' }, // red
    fire: { color: '#ea580c', name: 'Fire Station' }, // orange
    police: { color: '#1d4ed8', name: 'Police' }, // blue
    school: { color: '#7c3aed', name: 'School' }, // purple
    care: { color: '#be185d', name: 'Care Home' }, // pink
    color: '#dc2626', // fallback
    icon: '🚨',
    size: 8
  }
};

// Layer configuration for controls
export const layerConfig = {
  power: {
    name: 'Power Infrastructure',
    subtypes: {
      transmission: { name: 'Transmission (400kV+)', minVoltage: 275 },
      primary: { name: 'Primary (132kV+)', minVoltage: 110 },
      secondary: { name: 'Secondary (33kV+)', minVoltage: 11 },
      generation: { name: 'Power Generation', minVoltage: 0 }
    }
  },
  transport: {
    name: 'Transport Infrastructure',
    subtypes: {
      airport: { name: 'Airports' },
      rail: { name: 'Railway Stations' },
      port: { name: 'Ports & Maritime' },
      logistics: { name: 'Logistics Hubs' }
    }
  },
  telecom: {
    name: 'Telecommunications',
    subtypes: {
      datacenter: { name: 'Data Centers' },
      fiber: { name: 'Fiber Hubs' },
      tower: { name: 'Cell Towers' },
      satellite: { name: 'Satellite Stations' }
    }
  },
  water: {
    name: 'Water Infrastructure',
    subtypes: {
      treatment: { name: 'Treatment Plants' },
      pumping: { name: 'Pumping Stations' },
      storage: { name: 'Reservoirs & Storage' },
      distribution: { name: 'Distribution Hubs' }
    }
  },
  emergency: {
    name: 'Emergency & Vulnerable',
    subtypes: {
      hospital: { name: 'Hospitals' },
      fire: { name: 'Fire Stations' },
      police: { name: 'Police Stations' },
      school: { name: 'Schools' },
      care: { name: 'Care Homes' }
    }
  }
};