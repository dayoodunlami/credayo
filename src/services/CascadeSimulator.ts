// Cascade simulation engine for infrastructure failure propagation
export interface Asset {
  id: string;
  name: string;
  type: 'power' | 'water' | 'telecoms' | 'transport';
  subtype: string;
  coordinates: [number, number]; // [lng, lat]
  criticality: 'critical' | 'high' | 'medium' | 'low';
  voltage?: number;
  servicePopulation: number;
  backupPowerMinutes?: number;
  dependencies: string[];
  dependents: string[];
  metadata?: Record<string, any>;
}

export interface CascadeConfig {
  radiusKm: number;
  delaySeconds: number;
  severity: number; // 0-1
  crossSectorEnabled: boolean;
  speedMultiplier: number; // 0.5 = slow, 1 = normal, 2 = fast
}

export interface AssetState {
  id: string;
  status: 'normal' | 'degraded' | 'failed' | 'offline';
  impactTime: number; // seconds since cascade start
  downstreamCount: number;
  failureReason: 'trigger' | 'proximity' | 'dependency' | 'cross-sector';
}

export interface CascadeState {
  isActive: boolean;
  triggerId: string;
  affectedAssets: Map<string, AssetState>;
  currentStep: number;
  totalSteps: number;
  elapsedTime: number; // seconds since start
  config: CascadeConfig;
}

export interface CascadeStepResult {
  newlyAffected: AssetState[];
  totalAffected: number;
  isComplete: boolean;
  timestamp: number;
}

export class CascadeSimulator {
  private allAssets: Asset[] = [];
  private currentState: CascadeState | null = null;
  private simulationTimer: NodeJS.Timeout | null = null;
  private updateCallbacks: ((state: CascadeState) => void)[] = [];
  private stepInterval = 1000; // 1 second per step

  /**
   * Load and index all infrastructure assets for cascade simulation
   */
  async loadAssets(city: string = 'london'): Promise<void> {
    console.log('🔄 Loading assets for cascade simulation...');
    
    try {
      // Load all infrastructure data
      const [powerData, transportData, telecomData, waterData] = await Promise.all([
        fetch(`/data/${city}-power.json`).then(r => r.json()),
        fetch(`/data/${city}-transport.json`).then(r => r.json()),
        fetch(`/data/${city}-telecom.json`).then(r => r.json()),
        fetch(`/data/${city}-water.json`).then(r => r.json())
      ]);

      // Convert to cascade-ready format
      this.allAssets = [
        ...this.convertAssets(powerData.assets, 'power'),
        ...this.convertAssets(transportData.assets, 'transport'),
        ...this.convertAssets(telecomData.assets, 'telecoms'),
        ...this.convertAssets(waterData.assets, 'water')
      ];

      // Build dependency relationships
      this.buildDependencyGraph();

      console.log(`✅ Loaded ${this.allAssets.length} assets for cascade simulation`);
      
    } catch (error) {
      console.error('❌ Failed to load assets for cascade simulation:', error);
      throw error;
    }
  }

  /**
   * Convert raw asset data to cascade-ready format
   */
  private convertAssets(assets: any[], type: Asset['type']): Asset[] {
    return assets.map(asset => ({
      id: asset.id,
      name: asset.name,
      type,
      subtype: asset.subtype,
      coordinates: asset.coordinates,
      criticality: asset.criticality || this.inferCriticality(asset, type),
      voltage: asset.voltage,
      servicePopulation: asset.metadata?.servicePopulation || this.estimateServicePopulation(asset, type),
      backupPowerMinutes: asset.metadata?.backupPowerMinutes || this.estimateBackupPower(asset, type),
      dependencies: [],
      dependents: [],
      metadata: asset.metadata
    }));
  }

  /**
   * Infer criticality based on asset properties
   */
  private inferCriticality(asset: any, type: Asset['type']): Asset['criticality'] {
    // Power assets
    if (type === 'power') {
      if (asset.voltage >= 275000) return 'critical'; // Transmission
      if (asset.voltage >= 110000) return 'high'; // Primary
      if (asset.subtype === 'generation') return 'critical';
      return 'medium';
    }
    
    // Water assets
    if (type === 'water') {
      if (asset.subtype === 'treatment') return 'critical';
      if (asset.subtype === 'wastewater') return 'high';
      return 'medium';
    }
    
    // Telecoms assets
    if (type === 'telecoms') {
      if (asset.subtype === 'datacenter') return 'critical';
      if (asset.subtype === 'towers') return 'high';
      return 'medium';
    }
    
    // Transport assets
    if (type === 'transport') {
      if (asset.subtype === 'airport') return 'critical';
      if (asset.subtype === 'rail') return 'high';
      return 'medium';
    }
    
    return 'medium';
  }

  /**
   * Estimate service population based on asset type and location
   */
  private estimateServicePopulation(asset: any, type: Asset['type']): number {
    const basePopulation = {
      power: 50000,
      water: 100000,
      telecoms: 25000,
      transport: 75000
    };
    
    // Scale by criticality
    const criticalityMultiplier = {
      critical: 3,
      high: 2,
      medium: 1,
      low: 0.5
    };
    
    const criticality = this.inferCriticality(asset, type);
    return Math.round(basePopulation[type] * criticalityMultiplier[criticality]);
  }

  /**
   * Estimate backup power duration
   */
  private estimateBackupPower(asset: any, type: Asset['type']): number {
    const backupMinutes = {
      power: 0, // Power assets don't have backup power
      water: 240, // 4 hours typical
      telecoms: 480, // 8 hours typical
      transport: 120 // 2 hours typical
    };
    
    return backupMinutes[type];
  }

  /**
   * Build dependency relationships between assets
   */
  private buildDependencyGraph(): void {
    console.log('🔗 Building asset dependency graph...');
    
    for (const asset of this.allAssets) {
      // Find nearby assets that this asset depends on
      const nearbyAssets = this.findAssetsWithinRadius(asset.coordinates, 2); // 2km dependency radius
      
      for (const nearby of nearbyAssets) {
        if (nearby.id === asset.id) continue;
        
        // Determine if there's a dependency relationship
        if (this.hasDependencyRelationship(asset, nearby)) {
          asset.dependencies.push(nearby.id);
          nearby.dependents.push(asset.id);
        }
      }
    }
    
    const totalDependencies = this.allAssets.reduce((sum, asset) => sum + asset.dependencies.length, 0);
    console.log(`✅ Built dependency graph with ${totalDependencies} relationships`);
  }

  /**
   * Determine if one asset depends on another
   */
  private hasDependencyRelationship(dependent: Asset, provider: Asset): boolean {
    // Power dependencies
    if (dependent.type !== 'power' && provider.type === 'power') {
      // All non-power assets depend on power
      if (provider.criticality === 'critical' || provider.criticality === 'high') {
        return true;
      }
    }
    
    // Water dependencies
    if (dependent.type === 'power' && provider.type === 'water') {
      // Power generation depends on water for cooling
      if (dependent.subtype === 'generation' && provider.subtype === 'treatment') {
        return true;
      }
    }
    
    // Telecoms dependencies
    if (dependent.type === 'telecoms' && provider.type === 'power') {
      // Telecoms depend on power
      return provider.criticality === 'critical' || provider.criticality === 'high';
    }
    
    // Transport dependencies
    if (dependent.type === 'transport' && provider.type === 'power') {
      // Transport hubs depend on power
      return provider.criticality === 'critical';
    }
    
    return false;
  }

  /**
   * Initialize cascade simulation from a trigger asset
   */
  async initializeSimulation(triggerId: string, config: CascadeConfig): Promise<void> {
    console.log(`🚨 Initializing cascade simulation from asset: ${triggerId}`);
    
    const triggerAsset = this.allAssets.find(asset => asset.id === triggerId);
    if (!triggerAsset) {
      throw new Error(`Trigger asset not found: ${triggerId}`);
    }
    
    // Reset any existing simulation
    this.resetSimulation();
    
    // Initialize cascade state
    this.currentState = {
      isActive: true,
      triggerId,
      affectedAssets: new Map(),
      currentStep: 0,
      totalSteps: this.estimateTotalSteps(triggerAsset, config),
      elapsedTime: 0,
      config
    };
    
    // Add trigger asset as first affected
    const triggerState: AssetState = {
      id: triggerId,
      status: 'failed',
      impactTime: 0,
      downstreamCount: this.calculateDownstreamCount(triggerAsset),
      failureReason: 'trigger'
    };
    
    this.currentState.affectedAssets.set(triggerId, triggerState);
    
    // Notify subscribers
    this.notifySubscribers();
    
    // Start automatic simulation stepping
    this.startSimulationTimer();
    
    console.log(`✅ Cascade simulation initialized with ${this.currentState.totalSteps} estimated steps`);
  }

  /**
   * Estimate total simulation steps based on trigger asset and config
   */
  private estimateTotalSteps(triggerAsset: Asset, config: CascadeConfig): number {
    const baseSteps = Math.ceil(config.radiusKm * 2); // Rough estimate based on radius
    const criticalityMultiplier = {
      critical: 3,
      high: 2,
      medium: 1.5,
      low: 1
    };
    
    return Math.ceil(baseSteps * criticalityMultiplier[triggerAsset.criticality]);
  }

  /**
   * Calculate downstream asset count for criticality scoring
   */
  private calculateDownstreamCount(asset: Asset): number {
    const visited = new Set<string>();
    const queue = [asset.id];
    let count = 0;
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      
      visited.add(currentId);
      count++;
      
      const currentAsset = this.allAssets.find(a => a.id === currentId);
      if (currentAsset) {
        queue.push(...currentAsset.dependents);
      }
    }
    
    return count - 1; // Exclude the asset itself
  }

  /**
   * Start automatic simulation timer
   */
  private startSimulationTimer(): void {
    if (!this.currentState) return;
    
    const stepDelay = this.stepInterval / this.currentState.config.speedMultiplier;
    
    this.simulationTimer = setInterval(() => {
      const result = this.stepSimulation();
      if (result.isComplete) {
        this.stopSimulationTimer();
      }
    }, stepDelay);
  }

  /**
   * Stop simulation timer
   */
  private stopSimulationTimer(): void {
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }
  }

  /**
   * Execute one step of cascade simulation
   */
  stepSimulation(): CascadeStepResult {
    if (!this.currentState || !this.currentState.isActive) {
      return {
        newlyAffected: [],
        totalAffected: 0,
        isComplete: true,
        timestamp: Date.now()
      };
    }
    
    const newlyAffected: AssetState[] = [];
    const currentTime = this.currentState.elapsedTime;
    
    // Find assets to affect in this step
    const candidateAssets = this.findCascadeCandidates(currentTime);
    
    for (const candidate of candidateAssets) {
      if (!this.currentState.affectedAssets.has(candidate.id)) {
        const assetState: AssetState = {
          id: candidate.id,
          status: this.determineFailureStatus(candidate),
          impactTime: currentTime,
          downstreamCount: this.calculateDownstreamCount(candidate),
          failureReason: candidate.failureReason
        };
        
        this.currentState.affectedAssets.set(candidate.id, assetState);
        newlyAffected.push(assetState);
      }
    }
    
    // Update simulation state
    this.currentState.currentStep++;
    this.currentState.elapsedTime += this.currentState.config.delaySeconds;
    
    // Check if simulation is complete
    const isComplete = this.isSimulationComplete();
    if (isComplete) {
      this.currentState.isActive = false;
      console.log(`✅ Cascade simulation complete after ${this.currentState.currentStep} steps`);
    }
    
    // Notify subscribers
    this.notifySubscribers();
    
    return {
      newlyAffected,
      totalAffected: this.currentState.affectedAssets.size,
      isComplete,
      timestamp: Date.now()
    };
  }

  /**
   * Find assets that should be affected in current simulation step
   * Enhanced with BFS traversal and probability-based failure assessment
   */
  private findCascadeCandidates(currentTime: number): Array<Asset & { failureReason: AssetState['failureReason']; probability: number }> {
    if (!this.currentState) return [];
    
    const candidates: Array<Asset & { failureReason: AssetState['failureReason']; probability: number }> = [];
    const affectedAssetIds = Array.from(this.currentState.affectedAssets.keys());
    
    for (const affectedId of affectedAssetIds) {
      const affectedAsset = this.allAssets.find(a => a.id === affectedId);
      if (!affectedAsset) continue;
      
      const affectedState = this.currentState.affectedAssets.get(affectedId)!;
      const timeSinceFailure = currentTime - affectedState.impactTime;
      
      // Skip if not enough time has passed for cascade propagation
      if (timeSinceFailure < this.currentState.config.delaySeconds) continue;
      
      // Enhanced proximity-based failures with probability assessment
      const nearbyAssets = this.findAssetsWithinRadius(
        affectedAsset.coordinates, 
        this.currentState.config.radiusKm
      );
      
      for (const nearby of nearbyAssets) {
        if (this.currentState.affectedAssets.has(nearby.id)) continue;
        
        const { willFail, probability } = this.assessFailureProbability(
          affectedAsset, 
          nearby, 
          timeSinceFailure
        );
        
        // Only include if probability is significant
        if (probability > 0.1) {
          candidates.push({ 
            ...nearby, 
            failureReason: willFail ? 'proximity' : 'potential',
            probability 
          });
        }
      }
      
      // Enhanced dependency-based failures
      for (const dependentId of affectedAsset.dependents) {
        if (this.currentState.affectedAssets.has(dependentId)) continue;
        
        const dependent = this.allAssets.find(a => a.id === dependentId);
        if (dependent) {
          const { willFail, probability } = this.assessDependencyFailure(
            dependent, 
            affectedAsset, 
            timeSinceFailure
          );
          
          if (probability > 0.1) {
            candidates.push({ 
              ...dependent, 
              failureReason: 'dependency',
              probability 
            });
          }
        }
      }
      
      // Enhanced cross-sector failures with probability
      if (this.currentState.config.crossSectorEnabled) {
        const crossSectorAssets = this.findCrossSectorImpacts(affectedAsset);
        for (const crossAsset of crossSectorAssets) {
          if (!this.currentState.affectedAssets.has(crossAsset.id)) {
            const { willFail, probability } = this.assessCrossSectorFailure(
              affectedAsset,
              crossAsset,
              timeSinceFailure
            );
            
            if (probability > 0.1) {
              candidates.push({ 
                ...crossAsset, 
                failureReason: 'cross-sector',
                probability 
              });
            }
          }
        }
      }
    }
    
    return candidates;
  }

  /**
   * Enhanced failure probability assessment (inspired by your reference code)
   */
  private assessFailureProbability(
    upstream: Asset, 
    downstream: Asset, 
    timeSinceFailure: number
  ): { willFail: boolean; probability: number } {
    // Check backup power/redundancy
    if (downstream.backupPowerMinutes && downstream.backupPowerMinutes > 0) {
      const backupDurationSeconds = downstream.backupPowerMinutes * 60;
      
      // Still within backup time
      if (timeSinceFailure < backupDurationSeconds) {
        return {
          willFail: false,
          probability: 0.2 // Low probability while on backup
        };
      }
      
      // Backup exhausted
      return {
        willFail: true,
        probability: 0.9 // High probability after backup fails
      };
    }
    
    // Base probability by criticality
    const baseProbability = {
      critical: 0.8,
      high: 0.6,
      medium: 0.4,
      low: 0.2
    }[downstream.criticality];
    
    // Distance factor (closer = higher probability)
    const distance = this.calculateDistance(upstream.coordinates, downstream.coordinates);
    const distanceFactor = Math.max(0.1, 1 - (distance / this.currentState!.config.radiusKm));
    
    // Time factor (longer time = higher probability)
    const timeFactor = Math.min(1, timeSinceFailure / 300); // 5 minutes to reach full probability
    
    // Cross-sector dependency factor
    const crossSectorFactor = upstream.type !== downstream.type ? 0.7 : 1.0;
    
    const finalProbability = baseProbability * distanceFactor * timeFactor * crossSectorFactor * this.currentState!.config.severity;
    
    return {
      willFail: finalProbability >= 0.7,
      probability: Math.min(1, finalProbability)
    };
  }

  /**
   * Assess dependency-based failure probability
   */
  private assessDependencyFailure(
    dependent: Asset,
    provider: Asset,
    timeSinceFailure: number
  ): { willFail: boolean; probability: number } {
    // Direct dependencies have higher failure rates
    const baseProbability = 0.9;
    
    // Time factor for dependency failures (faster than proximity)
    const timeFactor = Math.min(1, timeSinceFailure / 60); // 1 minute to reach full probability
    
    // Consider backup power
    if (dependent.backupPowerMinutes && dependent.backupPowerMinutes > 0) {
      const backupDurationSeconds = dependent.backupPowerMinutes * 60;
      if (timeSinceFailure < backupDurationSeconds) {
        return { willFail: false, probability: 0.1 };
      }
    }
    
    const finalProbability = baseProbability * timeFactor;
    
    return {
      willFail: finalProbability >= 0.8,
      probability: finalProbability
    };
  }

  /**
   * Assess cross-sector failure probability
   */
  private assessCrossSectorFailure(
    upstream: Asset,
    downstream: Asset,
    timeSinceFailure: number
  ): { willFail: boolean; probability: number } {
    // Cross-sector rules
    let baseProbability = 0.3; // Default low probability
    
    // Power failures affect all other sectors
    if (upstream.type === 'power' && upstream.criticality === 'critical') {
      baseProbability = 0.7;
    }
    
    // Water treatment failures affect power generation
    if (upstream.type === 'water' && upstream.subtype === 'treatment' && 
        downstream.type === 'power' && downstream.subtype === 'generation') {
      baseProbability = 0.6;
    }
    
    // Telecoms failures affect transport coordination
    if (upstream.type === 'telecoms' && downstream.type === 'transport') {
      baseProbability = 0.4;
    }
    
    const timeFactor = Math.min(1, timeSinceFailure / 300); // 5 minutes
    const finalProbability = baseProbability * timeFactor;
    
    return {
      willFail: finalProbability >= 0.6,
      probability: finalProbability
    };
  }

  /**
   * Find assets within specified radius
   */
  private findAssetsWithinRadius(center: [number, number], radiusKm: number): Asset[] {
    return this.allAssets.filter(asset => {
      const distance = this.calculateDistance(center, asset.coordinates);
      return distance <= radiusKm;
    });
  }

  /**
   * Calculate distance between two coordinates in kilometers
   */
  private calculateDistance(coord1: [number, number], coord2: [number, number]): number {
    const [lng1, lat1] = coord1;
    const [lng2, lat2] = coord2;
    
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Determine if an asset should fail based on proximity to failed asset
   */
  private shouldAssetFail(asset: Asset, failedAsset: Asset, timeSinceFailure: number): boolean {
    // Base failure probability based on criticality
    const baseProbability = {
      critical: 0.8,
      high: 0.6,
      medium: 0.4,
      low: 0.2
    };
    
    // Distance factor (closer = higher probability)
    const distance = this.calculateDistance(asset.coordinates, failedAsset.coordinates);
    const distanceFactor = Math.max(0.1, 1 - (distance / 10)); // 10km max influence
    
    // Time factor (longer time = higher probability)
    const timeFactor = Math.min(1, timeSinceFailure / 300); // 5 minutes to reach full probability
    
    // Severity factor from config
    const severityFactor = this.currentState!.config.severity;
    
    const failureProbability = baseProbability[asset.criticality] * 
                              distanceFactor * 
                              timeFactor * 
                              severityFactor;
    
    return Math.random() < failureProbability;
  }

  /**
   * Determine if a dependent asset should fail
   */
  private shouldDependentFail(dependent: Asset, provider: Asset, timeSinceFailure: number): boolean {
    // Dependent assets have higher failure probability
    const dependencyProbability = 0.9;
    
    // Time factor for dependency failures (faster than proximity)
    const timeFactor = Math.min(1, timeSinceFailure / 60); // 1 minute to reach full probability
    
    // Consider backup power for non-power assets
    if (dependent.type !== 'power' && dependent.backupPowerMinutes) {
      const backupTimeSeconds = dependent.backupPowerMinutes * 60;
      if (timeSinceFailure < backupTimeSeconds) {
        return false; // Still on backup power
      }
    }
    
    return Math.random() < (dependencyProbability * timeFactor);
  }

  /**
   * Find cross-sector impact assets
   */
  private findCrossSectorImpacts(failedAsset: Asset): Asset[] {
    const crossSectorAssets: Asset[] = [];
    
    // Power failures affect all other sectors
    if (failedAsset.type === 'power' && failedAsset.criticality === 'critical') {
      const nearbyAssets = this.findAssetsWithinRadius(failedAsset.coordinates, 5);
      crossSectorAssets.push(...nearbyAssets.filter(a => a.type !== 'power'));
    }
    
    // Water treatment failures affect power generation
    if (failedAsset.type === 'water' && failedAsset.subtype === 'treatment') {
      const nearbyPower = this.findAssetsWithinRadius(failedAsset.coordinates, 10);
      crossSectorAssets.push(...nearbyPower.filter(a => 
        a.type === 'power' && a.subtype === 'generation'
      ));
    }
    
    return crossSectorAssets;
  }

  /**
   * Determine failure status based on asset type and conditions
   */
  private determineFailureStatus(asset: Asset): AssetState['status'] {
    // Critical assets fail completely
    if (asset.criticality === 'critical') {
      return 'failed';
    }
    
    // High criticality assets may degrade first
    if (asset.criticality === 'high') {
      return Math.random() < 0.7 ? 'failed' : 'degraded';
    }
    
    // Medium/low criticality assets often degrade
    return Math.random() < 0.5 ? 'failed' : 'degraded';
  }

  /**
   * Check if simulation is complete
   */
  private isSimulationComplete(): boolean {
    if (!this.currentState) return true;
    
    // Complete if we've reached estimated steps
    if (this.currentState.currentStep >= this.currentState.totalSteps) {
      return true;
    }
    
    // Complete if no new assets affected in last few steps
    const recentSteps = 3;
    if (this.currentState.currentStep > recentSteps) {
      // This is a simplified check - in a real implementation,
      // we'd track step-by-step changes
      return false;
    }
    
    return false;
  }

  /**
   * Reset simulation to initial state
   */
  resetSimulation(): void {
    console.log('🔄 Resetting cascade simulation');
    
    this.stopSimulationTimer();
    this.currentState = null;
    this.notifySubscribers();
  }

  /**
   * Get current simulation state
   */
  getCurrentState(): CascadeState | null {
    return this.currentState;
  }

  /**
   * Subscribe to simulation updates
   */
  subscribeToUpdates(callback: (state: CascadeState | null) => void): () => void {
    this.updateCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.updateCallbacks.indexOf(callback);
      if (index > -1) {
        this.updateCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify all subscribers of state changes
   */
  private notifySubscribers(): void {
    for (const callback of this.updateCallbacks) {
      try {
        callback(this.currentState);
      } catch (error) {
        console.error('Error in cascade simulation callback:', error);
      }
    }
  }

  /**
   * Get all loaded assets
   */
  getAllAssets(): Asset[] {
    return this.allAssets;
  }

  /**
   * Get cascade statistics for reporting
   */
  getCascadeStatistics(): {
    totalAffected: number;
    byType: Record<string, number>;
    byCriticality: Record<string, number>;
    byStatus: Record<string, number>;
    totalPopulationAffected: number;
  } | null {
    if (!this.currentState) return null;
    
    const stats = {
      totalAffected: this.currentState.affectedAssets.size,
      byType: {} as Record<string, number>,
      byCriticality: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      totalPopulationAffected: 0
    };
    
    for (const [assetId, assetState] of this.currentState.affectedAssets) {
      const asset = this.allAssets.find(a => a.id === assetId);
      if (!asset) continue;
      
      // Count by type
      stats.byType[asset.type] = (stats.byType[asset.type] || 0) + 1;
      
      // Count by criticality
      stats.byCriticality[asset.criticality] = (stats.byCriticality[asset.criticality] || 0) + 1;
      
      // Count by status
      stats.byStatus[assetState.status] = (stats.byStatus[assetState.status] || 0) + 1;
      
      // Sum population affected
      stats.totalPopulationAffected += asset.servicePopulation;
    }
    
    return stats;
  }
}