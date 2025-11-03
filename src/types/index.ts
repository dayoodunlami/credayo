// Core type definitions for Infrastructure Resilience Platform

export interface Asset {
  id: string;
  name: string;
  type: 'power_substation' | 'transport_hub' | 'telecom_tower' | 'water_facility';
  location: [number, number]; // [lng, lat]
  properties: {
    capacity?: number;
    voltage?: number;
    servicePopulation: number;
    backupPowerMinutes?: number;
    criticalityScore?: number;
  };
  dependencies: string[]; // Asset IDs this depends on
  dependents: string[]; // Asset IDs that depend on this
  vulnerabilityFactors: VulnerabilityFactors;
  metadata: Record<string, any>;
}

export interface VulnerabilityFactors {
  ageYears: number;
  floodRiskLevel: number; // 1-5
  weatherExposure: number; // 1-5
  redundancyAvailable: boolean;
  maintenanceScore: number; // 1-5
}

export interface VulnerableSite {
  id: string;
  name: string;
  type: 'hospital' | 'care_home' | 'school' | 'military' | 'data_center' | 'emergency_services';
  location: [number, number];
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  capacity: number; // beds, students, etc.
  backupPowerMinutes: number;
  dependencies: string[]; // Infrastructure asset IDs
  stakeholders: Stakeholder[];
  evacuationComplexity: 'low' | 'medium' | 'high' | 'very_high' | 'critical';
  alternativeServiceRadiusKm?: number;
}

export interface Stakeholder {
  name: string;
  role: string;
  contact: {
    email: string;
    phone: string;
    sms: string;
  };
  notificationTriggers: string[];
  escalationTimeMinutes: number;
}

export interface CascadeState {
  isActive: boolean;
  triggerId: string;
  affectedAssets: Map<string, AssetState>;
  currentStep: number;
  totalSteps: number;
  elapsedTime: number; // in minutes
}

export interface AssetState {
  id: string;
  status: 'normal' | 'degraded' | 'failed' | 'offline';
  impactTime: number; // minutes since cascade start
  downstreamCount: number;
}

export interface EconomicImpact {
  totalCost: number;
  costPerHour: number;
  affectedPopulation: number;
  vulnerableSitesCount: number;
  breakdown: {
    directCosts: number;
    businessDisruption: number;
    emergencyResponse: number;
    recoveryCosts: number;
  };
  duration: number; // in minutes
}

export interface CascadeConfig {
  radiusKm: number;
  delaySeconds: number;
  severity: number; // 0-1
  crossSectorEnabled: boolean;
  economicMultipliers: EconomicMultipliers;
}

export interface EconomicMultipliers {
  version: string;
  lastUpdated?: string;
  baseCosts: {
    powerOutagePerHour: number;
    powerSubstationPerHour: number;
    transportDisruptionPerHour: number;
    transportHubPerHour: number;
    telecomFailurePerHour: number;
    waterServiceDisruptionPerHour: number;
    sewageOverflowPerHour: number;
  };
  multipliers: {
    peakHours: {
      weekdayMorning: number;
      weekdayEvening: number;
      weekend: number;
      offPeak: number;
    };
    weatherSeverity: Record<string, number>;
    businessDisruptionFactor: number;
    emergencyResponseMultiplier: number;
  };
  populationImpacts: {
    costPerPersonPerHour: number;
    vulnerablePersonMultiplier: number;
    businessClosureCost: number;
    schoolClosureCost: number;
  };
  oneTimeCosts: Record<string, number>;
  recoveryCosts: Record<string, number>;
}

export type ViewMode = '2d' | '3d' | 'photorealistic';

export interface LayerVisibilityState {
  powerSubstations: boolean;
  transportHubs: boolean;
  telecomTowers: boolean;
  vulnerableSites: boolean;
  floodZones: boolean;
  criticalityHeatmap: boolean;
}

export interface LayerDefinition {
  id: string;
  name: string;
  type: 'infrastructure' | 'vulnerable-sites' | 'flood-zones' | 'criticality';
  defaultVisible: boolean;
  defaultOpacity: number;
  color: string;
}