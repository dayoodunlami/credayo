/**
 * CAMERA SERVICE
 * 
 * Provides cinematic camera movements and story mode functionality
 * Based on MapTiler SDK camera animation examples
 */

import type { Map as MapTilerMap } from '@maptiler/sdk';

export interface StoryPoint {
  id: string;
  name: string;
  description: string;
  center: [number, number];
  zoom: number;
  bearing?: number;
  pitch?: number;
  duration?: number;
}

export class CameraService {
  private map: MapTilerMap;
  private isOrbiting: boolean = false;
  private orbitAnimation: number | null = null;
  private currentStoryIndex: number = 0;
  private orbitSpeed: number = 1; // Default speed multiplier

  // UK Storm Story Points (Generic)
  private stormStoryPoints: StoryPoint[] = [
    {
      id: 'overview',
      name: 'UK Overview',
      description: 'Storm approaching the UK from the Atlantic',
      center: [-2.0, 54.0],
      zoom: 5.5,
      bearing: 0,
      pitch: 0,
      duration: 3000
    },
    {
      id: 'scotland',
      name: 'Scotland Impact',
      description: 'High winds affecting Scottish power infrastructure',
      center: [-4.0, 56.5],
      zoom: 7,
      bearing: 15,
      pitch: 30,
      duration: 4000
    },
    {
      id: 'manchester',
      name: 'Manchester Region',
      description: 'Storm moving south, affecting transport hubs',
      center: [-2.2426, 53.4808],
      zoom: 9,
      bearing: 45,
      pitch: 45,
      duration: 4000
    },
    {
      id: 'london',
      name: 'London Critical Infrastructure',
      description: 'Storm reaches London, testing resilience systems',
      center: [-0.1276, 51.5074],
      zoom: 11,
      bearing: 0,
      pitch: 60,
      duration: 5000
    }
  ];

  // Storm Arwen Story Points (November 2021 - Real Event)
  private stormArwenStoryPoints: StoryPoint[] = [
    {
      id: 'arwen-approach',
      name: 'Storm Arwen Approaches',
      description: 'November 26, 2021 - Storm Arwen brings 100mph winds from the North Sea, targeting Northern England and Scotland',
      center: [-1.5, 55.5],
      zoom: 6,
      bearing: 45,
      pitch: 20,
      duration: 4000
    },
    {
      id: 'northumberland-impact',
      name: 'Northumberland Devastation',
      description: 'First major impact: 240,000 homes lose power. Kielder Forest devastated, blocking major roads and rail lines',
      center: [-2.1, 55.2],
      zoom: 8,
      bearing: 30,
      pitch: 45,
      duration: 5000
    },
    {
      id: 'durham-cascades',
      name: 'Durham Power Cascades',
      description: 'Power lines down across County Durham. Substations fail, triggering cascading outages to water treatment plants',
      center: [-1.8, 54.7],
      zoom: 9,
      bearing: 60,
      pitch: 50,
      duration: 5000
    },
    {
      id: 'yorkshire-transport',
      name: 'Yorkshire Transport Collapse',
      description: 'A1 and East Coast Main Line blocked by fallen trees. Leeds Bradford Airport closes. Transport network paralyzed',
      center: [-1.5, 54.0],
      zoom: 8.5,
      bearing: 15,
      pitch: 40,
      duration: 5000
    },
    {
      id: 'scotland-isolation',
      name: 'Scottish Borders Isolated',
      description: 'Cross-border infrastructure fails. Scottish Power reports 135,000 customers without power. Rural communities cut off',
      center: [-2.8, 55.6],
      zoom: 8,
      bearing: 90,
      pitch: 35,
      duration: 5000
    },
    {
      id: 'recovery-overview',
      name: 'Recovery Operations',
      description: 'Day 3: Military deployed. 1,000+ engineers working. Some areas remain without power for 9 days',
      center: [-2.0, 54.8],
      zoom: 7,
      bearing: 0,
      pitch: 60,
      duration: 6000
    }
  ];

  constructor(map: MapTilerMap) {
    this.map = map;
  }  /**

   * Start orbiting around a point
   */
  startOrbit(center: [number, number], radius: number = 0.01, speed: number = 1): void {
    if (this.isOrbiting) {
      this.stopOrbit();
    }

    this.isOrbiting = true;
    let angle = 0;

    const orbit = () => {
      if (!this.isOrbiting) return;

      angle += speed * this.orbitSpeed * 0.002; // Very slow orbit with adjustable speed
      
      const offsetX = Math.cos(angle) * radius;
      const offsetY = Math.sin(angle) * radius;

      this.map.easeTo({
        center: [center[0] + offsetX, center[1] + offsetY],
        bearing: (angle * 180 / Math.PI) % 360,
        duration: 200,
        easing: (t) => t * (2 - t) // Smooth easing for fluid motion
      });

      this.orbitAnimation = requestAnimationFrame(orbit);
    };

    orbit();
  }

  /**
   * Stop orbiting
   */
  stopOrbit(): void {
    this.isOrbiting = false;
    if (this.orbitAnimation) {
      cancelAnimationFrame(this.orbitAnimation);
      this.orbitAnimation = null;
    }
  }

  /**
   * Toggle orbit mode
   */
  toggleOrbit(center?: [number, number]): boolean {
    if (this.isOrbiting) {
      this.stopOrbit();
      return false;
    } else {
      const orbitCenter = center || this.map.getCenter().toArray() as [number, number];
      this.startOrbit(orbitCenter);
      return true;
    }
  }

  /**
   * Start story mode - fly through predefined points
   */
  async startStoryMode(): Promise<void> {
    console.log('🎬 Starting UK Storm Story Mode');
    this.currentStoryIndex = 0;

    for (let i = 0; i < this.stormStoryPoints.length; i++) {
      const point = this.stormStoryPoints[i];
      
      console.log(`📍 Story Point ${i + 1}: ${point.name}`);
      
      await this.flyToPoint(point);
      
      // Wait at each point
      await this.sleep(point.duration || 3000);
    }

    console.log('✅ Story mode completed');
  }

  /**
   * Start Storm Arwen story mode - based on real November 2021 event
   */
  async startStormArwenMode(): Promise<void> {
    console.log('🌪️ Starting Storm Arwen Story Mode (November 2021)');
    this.currentStoryIndex = 0;

    for (let i = 0; i < this.stormArwenStoryPoints.length; i++) {
      const point = this.stormArwenStoryPoints[i];
      
      console.log(`📍 Arwen Point ${i + 1}: ${point.name}`);
      
      // Trigger storyboard popup event
      if (typeof window !== 'undefined' && (window as any).showStoryboardPopup) {
        (window as any).showStoryboardPopup(point, i + 1, this.stormArwenStoryPoints.length);
      }
      
      await this.flyToPoint(point);
      
      // Wait at each point
      await this.sleep(point.duration || 4000);
    }

    console.log('✅ Storm Arwen story mode completed');
  }

  /**
   * Fly to a specific story point
   */
  private async flyToPoint(point: StoryPoint): Promise<void> {
    return new Promise((resolve) => {
      this.map.flyTo({
        center: point.center,
        zoom: point.zoom,
        bearing: point.bearing || 0,
        pitch: point.pitch || 0,
        duration: 2000,
        essential: true
      });

      // Resolve after animation completes
      setTimeout(resolve, 2500);
    });
  }

  /**
   * Go to next story point
   */
  nextStoryPoint(): void {
    if (this.currentStoryIndex < this.stormStoryPoints.length - 1) {
      this.currentStoryIndex++;
      const point = this.stormStoryPoints[this.currentStoryIndex];
      this.flyToPoint(point);
    }
  }

  /**
   * Go to previous story point
   */
  previousStoryPoint(): void {
    if (this.currentStoryIndex > 0) {
      this.currentStoryIndex--;
      const point = this.stormStoryPoints[this.currentStoryIndex];
      this.flyToPoint(point);
    }
  }

  /**
   * Get current story point info
   */
  getCurrentStoryPoint(): StoryPoint | null {
    return this.stormStoryPoints[this.currentStoryIndex] || null;
  }

  /**
   * Get Storm Arwen story points
   */
  getStormArwenStoryPoints(): StoryPoint[] {
    return this.stormArwenStoryPoints;
  }

  /**
   * Fly to London (quick access)
   */
  flyToLondon(): void {
    this.map.flyTo({
      center: [-0.1276, 51.5074],
      zoom: 11,
      bearing: 0,
      pitch: 0,
      duration: 2000
    });
  }

  /**
   * Fly to UK overview
   */
  flyToUKOverview(): void {
    this.map.flyTo({
      center: [-2.0, 54.0],
      zoom: 5.5,
      bearing: 0,
      pitch: 0,
      duration: 2000
    });
  }

  /**
   * Reset camera to default view
   */
  resetCamera(): void {
    this.stopOrbit();
    this.flyToLondon();
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if currently orbiting
   */
  isCurrentlyOrbiting(): boolean {
    return this.isOrbiting;
  }

  /**
   * Set orbit speed (0.1 = very slow, 1 = normal, 3 = fast)
   */
  setOrbitSpeed(speed: number): void {
    this.orbitSpeed = Math.max(0.1, Math.min(3, speed));
  }

  /**
   * Get current orbit speed
   */
  getOrbitSpeed(): number {
    return this.orbitSpeed;
  }
}