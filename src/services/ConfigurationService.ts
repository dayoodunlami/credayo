import type { ZodSchema } from 'zod';
import {
  EconomicMultipliersSchema,
  type EconomicMultipliers
} from '../config/schemas';

export class ConfigurationError extends Error {
  public details?: any;
  constructor(message: string, details?: any) {
    super(message);
    this.details = details;
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class ConfigurationService {
  private static instance: ConfigurationService;
  private cache = new Map<string, any>();

  static getInstance(): ConfigurationService {
    if (!ConfigurationService.instance) {
      ConfigurationService.instance = new ConfigurationService();
    }
    return ConfigurationService.instance;
  }

  async loadConfig<T>(path: string, schema: ZodSchema<T>): Promise<T> {
    // Check cache first
    if (this.cache.has(path)) {
      return this.cache.get(path);
    }

    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new ConfigurationError(`Failed to load ${path}: ${response.statusText}`);
      }

      const data = await response.json();
      const result = schema.safeParse(data);

      if (!result.success) {
        const errorDetails = result.error.flatten();
        console.error(`[ConfigError] ${path} validation failed:`, errorDetails);
        throw new ConfigurationError(
          `Configuration validation failed for ${path}`,
          errorDetails
        );
      }

      // Cache the validated result
      this.cache.set(path, result.data);
      return result.data;
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      throw new ConfigurationError(`Unexpected error loading ${path}`, error);
    }
  }

  async loadEconomicMultipliers(): Promise<EconomicMultipliers> {
    return this.loadConfig('/config/economic-multipliers.json', EconomicMultipliersSchema);
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// Helper function for time duration formatting
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hours`;
  return `${Math.floor(minutes / 1440)} days`;
}