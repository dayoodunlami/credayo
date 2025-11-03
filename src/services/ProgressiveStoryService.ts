/**
 * PROGRESSIVE STORY SERVICE
 * 
 * Manages progressive reveal story mode with compact floating cards
 * Integrates with camera service for smooth transitions
 */

import type { StoryPoint } from './CameraService';

export interface StoryData {
  title: string;
  subtitle: string;
  chapters: Record<string, StoryChapter>;
}

export interface StoryChapter {
  title: string;
  description: string;
  center: [number, number];
  zoom: number;
  bearing?: number;
  pitch?: number;
  stats: Array<{ label: string; value: string }>;
}

export class ProgressiveStoryService {
  private currentStoryMode: string | null = null;
  private currentChapterIndex: number = 0;
  private storyChapterKeys: string[] = [];
  private isActive: boolean = false;
  private onChapterChange?: (chapter: StoryChapter, index: number, total: number) => void;
  private onStoryEnd?: () => void;

  // Story data
  private storyData: Record<string, StoryData> = {
    arwen: {
      title: '🌪️ Storm Arwen - November 2021',
      subtitle: 'Real Infrastructure Resilience Event',
      chapters: {
        'arwen-approach': {
          title: 'Storm Arwen Approaches',
          description: 'November 26, 2021 - Storm Arwen brings unprecedented 100mph winds from the North Sea, targeting Northern England and Scotland with rare Red Weather Warnings.',
          center: [-1.5, 55.5],
          zoom: 6,
          bearing: 45,
          pitch: 20,
          stats: [
            { label: 'Wind Speed', value: '100+ mph' },
            { label: 'Weather Warning', value: 'Red (Rare)' },
            { label: 'Affected Regions', value: '6 Counties' },
            { label: 'Duration', value: '18 Hours' }
          ]
        },
        'northumberland-impact': {
          title: 'Northumberland Devastation',
          description: 'First major impact: 240,000 homes lose power as Kielder Forest is devastated. Over 16,000 trees fall, blocking major roads and rail lines across the region.',
          center: [-2.1, 55.2],
          zoom: 8,
          bearing: 30,
          pitch: 45,
          stats: [
            { label: 'Homes Without Power', value: '240,000' },
            { label: 'Trees Down', value: '16,000+' },
            { label: 'Roads Blocked', value: '200+' },
            { label: 'Rail Lines Closed', value: '12' }
          ]
        },
        'durham-cascades': {
          title: 'Durham Power Cascades',
          description: 'Power lines collapse across County Durham. Multiple substations fail, triggering cascading outages that affect water treatment plants and mobile networks.',
          center: [-1.8, 54.7],
          zoom: 9,
          bearing: 60,
          pitch: 50,
          stats: [
            { label: 'Power Outages', value: '180,000' },
            { label: 'Water Supplies Lost', value: '45,000' },
            { label: 'Substations Failed', value: '23' },
            { label: 'Mobile Towers Down', value: '150+' }
          ]
        },
        'recovery-overview': {
          title: 'Recovery Operations',
          description: 'Day 3: Military deployed with 300 personnel. Over 1,000 engineers work around the clock. Some remote areas remain without power for 9 days.',
          center: [-2.0, 54.8],
          zoom: 7,
          bearing: 0,
          pitch: 60,
          stats: [
            { label: 'Engineers Deployed', value: '1,000+' },
            { label: 'Military Personnel', value: '300' },
            { label: 'Max Outage Duration', value: '9 Days' },
            { label: 'Total Cost', value: '£50M+' }
          ]
        }
      }
    }
  };

  constructor() {
    this.setupKeyboardListeners();
  }

  /**
   * Start progressive story mode
   */
  startStory(storyType: string): boolean {
    if (!this.storyData[storyType]) {
      console.error(`Story type "${storyType}" not found`);
      return false;
    }

    this.currentStoryMode = storyType;
    this.currentChapterIndex = 0;
    this.storyChapterKeys = Object.keys(this.storyData[storyType].chapters);
    this.isActive = true;

    console.log(`🎬 Starting progressive story: ${this.storyData[storyType].title}`);
    
    // Show first chapter
    this.showCurrentChapter();
    
    return true;
  }

  /**
   * Stop story mode
   */
  stopStory(): void {
    this.isActive = false;
    this.currentStoryMode = null;
    this.currentChapterIndex = 0;
    this.storyChapterKeys = [];
    
    if (this.onStoryEnd) {
      this.onStoryEnd();
    }
  }

  /**
   * Go to next chapter
   */
  nextChapter(): boolean {
    if (!this.isActive || this.currentChapterIndex >= this.storyChapterKeys.length - 1) {
      // Story finished
      this.stopStory();
      return false;
    }

    this.currentChapterIndex++;
    this.showCurrentChapter();
    return true;
  }

  /**
   * Go to previous chapter
   */
  previousChapter(): boolean {
    if (!this.isActive || this.currentChapterIndex <= 0) {
      return false;
    }

    this.currentChapterIndex--;
    this.showCurrentChapter();
    return true;
  }

  /**
   * Show current chapter
   */
  private showCurrentChapter(): void {
    if (!this.currentStoryMode || !this.isActive) return;

    const story = this.storyData[this.currentStoryMode];
    const chapterKey = this.storyChapterKeys[this.currentChapterIndex];
    const chapter = story.chapters[chapterKey];

    console.log(`📍 Showing chapter ${this.currentChapterIndex + 1}/${this.storyChapterKeys.length}: ${chapter.title}`);

    if (this.onChapterChange) {
      this.onChapterChange(chapter, this.currentChapterIndex + 1, this.storyChapterKeys.length);
    }
  }

  /**
   * Set up keyboard listeners
   */
  private setupKeyboardListeners(): void {
    document.addEventListener('keydown', (event) => {
      if (!this.isActive) return;

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          this.nextChapter();
          break;
        case 'ArrowRight':
          event.preventDefault();
          this.nextChapter();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          this.previousChapter();
          break;
        case 'Escape':
          event.preventDefault();
          this.stopStory();
          break;
      }
    });
  }

  /**
   * Set chapter change callback
   */
  onChapterChangeCallback(callback: (chapter: StoryChapter, index: number, total: number) => void): void {
    this.onChapterChange = callback;
  }

  /**
   * Set story end callback
   */
  onStoryEndCallback(callback: () => void): void {
    this.onStoryEnd = callback;
  }

  /**
   * Get current story info
   */
  getCurrentStoryInfo(): { title: string; subtitle: string } | null {
    if (!this.currentStoryMode) return null;
    
    const story = this.storyData[this.currentStoryMode];
    return {
      title: story.title,
      subtitle: story.subtitle
    };
  }

  /**
   * Check if story is active
   */
  isStoryActive(): boolean {
    return this.isActive;
  }

  /**
   * Get current chapter info
   */
  getCurrentChapter(): { chapter: StoryChapter; index: number; total: number } | null {
    if (!this.isActive || !this.currentStoryMode) return null;

    const story = this.storyData[this.currentStoryMode];
    const chapterKey = this.storyChapterKeys[this.currentChapterIndex];
    const chapter = story.chapters[chapterKey];

    return {
      chapter,
      index: this.currentChapterIndex + 1,
      total: this.storyChapterKeys.length
    };
  }
}