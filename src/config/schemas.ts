import { z } from 'zod';

// Economic Multipliers Schema
export const EconomicMultipliersSchema = z.object({
  version: z.string(),
  lastUpdated: z.string().optional(),
  baseCosts: z.object({
    powerOutagePerHour: z.number().positive(),
    powerSubstationPerHour: z.number().positive(),
    transportDisruptionPerHour: z.number().positive(),
    transportHubPerHour: z.number().positive(),
    telecomFailurePerHour: z.number().positive(),
    waterServiceDisruptionPerHour: z.number().positive(),
    sewageOverflowPerHour: z.number().positive()
  }),
  multipliers: z.object({
    peakHours: z.object({
      weekdayMorning: z.number().positive(),
      weekdayEvening: z.number().positive(),
      weekend: z.number().positive(),
      offPeak: z.number().positive()
    }),
    weatherSeverity: z.record(z.string(), z.number().positive()),
    businessDisruptionFactor: z.number().min(0),
    emergencyResponseMultiplier: z.number().min(0)
  }),
  populationImpacts: z.object({
    costPerPersonPerHour: z.number().min(0),
    vulnerablePersonMultiplier: z.number().min(0),
    businessClosureCost: z.number().min(0),
    schoolClosureCost: z.number().min(0)
  }),
  oneTimeCosts: z.record(z.string(), z.number().min(0)),
  recoveryCosts: z.record(z.string(), z.number().min(0))
});

export type EconomicMultipliers = z.infer<typeof EconomicMultipliersSchema>;