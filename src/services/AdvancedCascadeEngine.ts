/**
 * ADVANCED CASCADE ENGINE
 * Based on reference implementation with graph traversal and probability modeling
 * 
 * Key improvements over basic CascadeSimulator:
 * - BFS graph traversal for dependency simulation
 * - Multi-stage animation timing
 * - Probability-based failure assessment
 * - Performance optimizations for large datasets
 */

export const ImpactType = {
    DIRECT: 'direct',           // Immediate failure
    CASCADE: 'cascade',         // Downstream failure
    POTENTIAL: 'potential',     // May fail (conditional)
    CROSS_SECTOR: 'cross-sector' // Different infrastructure type
} as const;

export type ImpactType = typeof ImpactType[keyof typeof ImpactType];

export const AssetCriticality = {
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low'
} as const;

export type AssetCriticality = typeof AssetCriticality[keyof typeof AssetCriticality];

export interface AdvancedAsset {
    id: string;
    type: 'power' | 'water' | 'telecoms' | 'transport';
    subtype: string;
    criticality: AssetCriticality;
    coordinates: [number, number];
    properties: Record<string, any>;

    // Enhanced dependency modeling
    suppliesTo: string[];      // Assets this supplies
    suppliedBy: string[];      // Assets that supply this

    // Redundancy modeling
    hasBackup: boolean;
    backupDuration?: number;   // Minutes before backup fails

    // Service area
    servicePopulation: number;
}

export interface CascadeImpact {
    assetId: string;
    sourceAssetId?: string;     // Asset that caused this impact (for line animations)
    impactType: ImpactType;
    probability: number;        // 0-1 (1 = guaranteed failure)
    timeToImpact: number;       // Seconds from initial failure
    reason: string;             // Why this asset is affected
}

export interface AdvancedCascadeResult {
    initiatingAsset: AdvancedAsset;
    impacts: CascadeImpact[];
    totalAffected: number;
    economicCost: number;
    populationAffected: number;
    timeline: CascadeImpact[];  // Sorted by time
}

export interface AdvancedCascadeConfig {
    includeConditional: boolean;
    maxDepth: number;
    timeWindow: number;         // Max simulation time in seconds
    probabilityThreshold: number; // Minimum probability to include
}

/**
 * Advanced Cascade Engine with graph traversal and probability modeling
 */
export class AdvancedCascadeEngine {
    private assets: Map<string, AdvancedAsset>;
    private adjacencyList: Map<string, string[]> = new Map();
    private reverseAdjacencyList: Map<string, string[]> = new Map();

    constructor(assets: AdvancedAsset[]) {
        this.assets = new Map(assets.map(a => [a.id, a]));
        this.buildDependencyGraph();
    }

    /**
     * Build directed graph of dependencies
     * Edge: A → B means "A supplies B" (if A fails, B may fail)
     */
    private buildDependencyGraph() {
        this.adjacencyList = new Map();
        this.reverseAdjacencyList = new Map();

        for (const asset of this.assets.values()) {
            this.adjacencyList.set(asset.id, asset.suppliesTo);

            // Build reverse adjacency for upstream analysis
            if (!this.reverseAdjacencyList.has(asset.id)) {
                this.reverseAdjacencyList.set(asset.id, []);
            }

            for (const dependentId of asset.suppliesTo) {
                if (!this.reverseAdjacencyList.has(dependentId)) {
                    this.reverseAdjacencyList.set(dependentId, []);
                }
                this.reverseAdjacencyList.get(dependentId)!.push(asset.id);
            }
        }

        console.log(`✅ Built dependency graph with ${this.adjacencyList.size} nodes`);
    }

    /**
     * Simulate cascade from a failed asset using BFS
     * Returns impacts in temporal order
     */
    simulateCascade(
        failedAssetId: string,
        config: AdvancedCascadeConfig = {
            includeConditional: true,
            maxDepth: 5,
            timeWindow: 3600, // 1 hour
            probabilityThreshold: 0.1
        }
    ): AdvancedCascadeResult {
        const impacts: CascadeImpact[] = [];
        const visited = new Set<string>();
        const queue: Array<{
            assetId: string;
            depth: number;
            timeToImpact: number;
            impactType: ImpactType;
            sourceAssetId?: string;
        }> = [];

        // Initialize with failed asset
        const initiatingAsset = this.assets.get(failedAssetId);
        if (!initiatingAsset) {
            throw new Error(`Asset ${failedAssetId} not found`);
        }

        queue.push({
            assetId: failedAssetId,
            depth: 0,
            timeToImpact: 0,
            impactType: ImpactType.DIRECT
        });

        // BFS traversal
        while (queue.length > 0) {
            const current = queue.shift()!;

            if (visited.has(current.assetId)) continue;
            if (current.depth > config.maxDepth) continue;
            if (current.timeToImpact > config.timeWindow) continue;

            visited.add(current.assetId);
            const asset = this.assets.get(current.assetId)!;

            // Add impact (skip the initiating asset)
            if (current.depth > 0) {
                const impact = this.calculateImpact(
                    asset,
                    current.depth,
                    current.timeToImpact,
                    current.impactType,
                    current.sourceAssetId
                );
                impacts.push(impact);
            }

            // Find downstream dependencies
            const downstream = this.adjacencyList.get(current.assetId) || [];
            for (const downstreamId of downstream) {
                if (visited.has(downstreamId)) continue;

                const downstreamAsset = this.assets.get(downstreamId);
                if (!downstreamAsset) continue;

                const assessment = this.assessFailureProbability(
                    asset,
                    downstreamAsset,
                    current.timeToImpact
                );

                // Direct cascade (high probability failure)
                if (assessment.willFail && assessment.probability >= 0.8) {
                    queue.push({
                        assetId: downstreamId,
                        depth: current.depth + 1,
                        timeToImpact: current.timeToImpact + assessment.timeDelay,
                        impactType: current.depth === 0 ? ImpactType.DIRECT : ImpactType.CASCADE,
                        sourceAssetId: current.assetId
                    });
                }
                // Potential impact (conditional failure)
                else if (config.includeConditional && assessment.probability >= config.probabilityThreshold) {
                    impacts.push({
                        assetId: downstreamId,
                        sourceAssetId: current.assetId,
                        impactType: ImpactType.POTENTIAL,
                        probability: assessment.probability,
                        timeToImpact: current.timeToImpact + assessment.timeDelay,
                        reason: this.getFailureReason(asset, downstreamAsset, assessment.probability)
                    });
                }
            }

            // Cross-sector analysis
            const crossSectorImpacts = this.findCrossSectorImpacts(asset, current.timeToImpact, current.assetId);
            for (const crossImpact of crossSectorImpacts) {
                if (!visited.has(crossImpact.assetId) && crossImpact.probability >= config.probabilityThreshold) {
                    if (crossImpact.probability >= 0.8) {
                        queue.push({
                            assetId: crossImpact.assetId,
                            depth: current.depth + 1,
                            timeToImpact: crossImpact.timeToImpact,
                            impactType: ImpactType.CROSS_SECTOR,
                            sourceAssetId: current.assetId
                        });
                    } else if (config.includeConditional) {
                        impacts.push(crossImpact);
                    }
                }
            }
        }

        // Sort impacts by time
        const timeline = impacts.sort((a, b) => a.timeToImpact - b.timeToImpact);

        return {
            initiatingAsset,
            impacts,
            totalAffected: impacts.filter(i => i.probability >= 0.8).length,
            economicCost: this.calculateEconomicCost(impacts),
            populationAffected: this.calculatePopulationImpact(impacts),
            timeline
        };
    }

    /**
     * Calculate impact details for an asset
     */
    private calculateImpact(
        asset: AdvancedAsset,
        depth: number,
        timeToImpact: number,
        impactType: ImpactType,
        sourceAssetId?: string
    ): CascadeImpact {
        const sourceAsset = sourceAssetId ? this.assets.get(sourceAssetId) : null;

        return {
            assetId: asset.id,
            sourceAssetId,
            impactType,
            probability: impactType === ImpactType.POTENTIAL ? 0.5 : 1.0,
            timeToImpact,
            reason: this.generateImpactReason(asset, sourceAsset, impactType, depth)
        };
    }

    /**
     * Assess whether downstream asset will fail
     * Returns: {willFail, probability, timeDelay}
     */
    private assessFailureProbability(
        upstream: AdvancedAsset,
        downstream: AdvancedAsset,
        currentTime: number
    ): { willFail: boolean; probability: number; timeDelay: number } {
        // Check backup power/redundancy
        if (downstream.hasBackup && downstream.backupDuration) {
            const backupDurationSeconds = downstream.backupDuration * 60;

            // If we're still within backup time, lower probability
            if (currentTime < backupDurationSeconds) {
                return {
                    willFail: false,
                    probability: 0.2,
                    timeDelay: backupDurationSeconds - currentTime
                };
            }
        }

        // Base probability by criticality
        const baseProbability = {
            [AssetCriticality.CRITICAL]: 0.9,
            [AssetCriticality.HIGH]: 0.7,
            [AssetCriticality.MEDIUM]: 0.5,
            [AssetCriticality.LOW]: 0.3
        }[downstream.criticality];

        // Cross-sector dependency (e.g., power → water)
        if (upstream.type !== downstream.type) {
            const crossSectorMultiplier = this.getCrossSectorMultiplier(upstream.type, downstream.type);
            return {
                willFail: baseProbability * crossSectorMultiplier >= 0.7,
                probability: baseProbability * crossSectorMultiplier,
                timeDelay: 300 // 5 minutes for cross-sector
            };
        }

        // Direct same-sector dependency
        return {
            willFail: baseProbability >= 0.7,
            probability: baseProbability,
            timeDelay: 60 // 1 minute for same sector
        };
    }

    /**
     * Find cross-sector impacts
     */
    private findCrossSectorImpacts(asset: AdvancedAsset, currentTime: number, sourceAssetId: string): CascadeImpact[] {
        const impacts: CascadeImpact[] = [];

        // Power failures affect all other sectors
        if (asset.type === 'power' && asset.criticality === AssetCriticality.CRITICAL) {
            const nearbyAssets = this.findAssetsWithinRadius(asset.coordinates, 5000); // 5km

            for (const nearby of nearbyAssets) {
                if (nearby.type !== 'power') {
                    impacts.push({
                        assetId: nearby.id,
                        sourceAssetId: sourceAssetId,
                        impactType: ImpactType.CROSS_SECTOR,
                        probability: 0.6,
                        timeToImpact: currentTime + 600, // 10 minutes
                        reason: `Power dependency: ${asset.type} → ${nearby.type}`
                    });
                }
            }
        }

        // Water treatment failures affect power generation
        if (asset.type === 'water' && asset.subtype === 'treatment') {
            const nearbyPower = this.findAssetsWithinRadius(asset.coordinates, 10000) // 10km
                .filter(a => a.type === 'power' && a.subtype === 'generation');

            for (const powerAsset of nearbyPower) {
                impacts.push({
                    assetId: powerAsset.id,
                    sourceAssetId: sourceAssetId,
                    impactType: ImpactType.CROSS_SECTOR,
                    probability: 0.5,
                    timeToImpact: currentTime + 900, // 15 minutes
                    reason: 'Water cooling dependency for power generation'
                });
            }
        }

        return impacts;
    }

    /**
     * Get cross-sector failure multiplier
     */
    private getCrossSectorMultiplier(upstreamType: string, downstreamType: string): number {
        const multipliers: Record<string, Record<string, number>> = {
            power: { water: 0.8, telecoms: 0.9, transport: 0.7 },
            water: { power: 0.6, telecoms: 0.3, transport: 0.4 },
            telecoms: { power: 0.2, water: 0.2, transport: 0.5 },
            transport: { power: 0.1, water: 0.1, telecoms: 0.2 }
        };

        return multipliers[upstreamType]?.[downstreamType] || 0.1;
    }

    /**
     * Find assets within radius
     */
    private findAssetsWithinRadius(center: [number, number], radiusMeters: number): AdvancedAsset[] {
        return Array.from(this.assets.values()).filter(asset => {
            const distance = this.calculateDistance(center, asset.coordinates);
            return distance <= radiusMeters / 1000; // Convert to km
        });
    }

    /**
     * Calculate distance between coordinates in km
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
     * Generate human-readable impact reason
     */
    private generateImpactReason(
        asset: AdvancedAsset,
        sourceAsset: AdvancedAsset | null,
        impactType: ImpactType,
        depth: number
    ): string {
        if (!sourceAsset) return 'Initial failure trigger';

        switch (impactType) {
            case ImpactType.DIRECT:
                return `Direct dependency on ${sourceAsset.id}`;
            case ImpactType.CASCADE:
                return `Cascade failure from ${sourceAsset.type} at depth ${depth}`;
            case ImpactType.CROSS_SECTOR:
                return `Cross-sector impact: ${sourceAsset.type} → ${asset.type}`;
            case ImpactType.POTENTIAL:
                return `Potential failure due to ${sourceAsset.type} dependency`;
            default:
                return 'Unknown failure reason';
        }
    }

    /**
     * Get failure reason for potential impacts
     */
    private getFailureReason(
        upstream: AdvancedAsset,
        downstream: AdvancedAsset,
        probability: number
    ): string {
        if (downstream.hasBackup) {
            return `May fail if backup systems exhausted (${Math.round(probability * 100)}% probability)`;
        }

        if (upstream.type !== downstream.type) {
            return `Cross-sector dependency: ${upstream.type} → ${downstream.type}`;
        }

        return `Downstream dependency (${Math.round(probability * 100)}% probability)`;
    }

    /**
     * Calculate economic cost (placeholder - would use real cost models)
     */
    private calculateEconomicCost(impacts: CascadeImpact[]): number {
        return impacts.reduce((sum, impact) => {
            const asset = this.assets.get(impact.assetId);
            if (!asset) return sum;

            const baseCost = {
                [AssetCriticality.CRITICAL]: 1000000,
                [AssetCriticality.HIGH]: 500000,
                [AssetCriticality.MEDIUM]: 100000,
                [AssetCriticality.LOW]: 10000
            }[asset.criticality];

            return sum + (baseCost * impact.probability);
        }, 0);
    }

    /**
     * Calculate population impact (placeholder)
     */
    private calculatePopulationImpact(impacts: CascadeImpact[]): number {
        return impacts.reduce((sum, impact) => {
            const asset = this.assets.get(impact.assetId);
            return sum + (asset?.servicePopulation || 1000) * impact.probability;
        }, 0);
    }

    /**
     * Get asset by ID
     */
    getAsset(id: string): AdvancedAsset | undefined {
        return this.assets.get(id);
    }

    /**
     * Get all assets
     */
    getAllAssets(): AdvancedAsset[] {
        return Array.from(this.assets.values());
    }
}