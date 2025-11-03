# Implementation Plan

- [x] 1. Set up project structure and core interfaces




  - Initialize React + TypeScript + Vite project with required dependencies
  - Install MapTiler SDK, Cesium, Tailwind CSS, Zod, and jsPDF packages
  - Configure Vite for Cesium integration and TypeScript paths
  - Create directory structure for components, services, types, and configuration
  - _Requirements: 9.1, 9.2_


- [ ] 1.1 Create TypeScript interfaces and types
  - Define core Asset, VulnerableSite, and configuration interfaces
  - Implement Zod schemas for configuration validation
  - Create service interfaces for CascadeSimulator, EconomicCalculator, and InvestmentOptimizer
  - _Requirements: 7.5, 9.1_


- [ ] 1.2 Implement configuration service with validation
  - Create ConfigurationService class with Zod schema validation


  - Implement error handling for configuration loading failures
  - Add helper functions for time duration conversion (minutes-based)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 2. Build MapLibre-based 2D/3D mapping foundation


  - Set up MapContainer component with MapTiler SDK integration
  - Implement 2D/3D view toggle with smooth pitch transitions
  - Add basic map controls and navigation
  - Configure MapTiler API key and base map styling
  - _Requirements: 1.1, 4.1, 4.2, 4.4_

- [x] 2.1 Load and display infrastructure layers using offline GeoJSON data








  - Create DataService with offline GeoJSON sources (power, transport, telecoms)
  - Add power substations layer with voltage-based styling (red for transmission, orange for distribution)
  - Add water treatment plants and pipeline layers (blue styling)
  - Add telecommunications towers and data centers (green styling)
  - Implement asset click handlers with popup display showing tile properties
  - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [ ] 2.2 Extract emergency/vulnerable sites data (one-time)
  - Create extraction script for hospitals, schools, care homes, fire stations, police
  - Extract data for London, Manchester, Bristol using Overpass API with result limits
  - Save as static GeoJSON files in public/data/{city}/emergency.geojson
  - Implement 5-second delays between city extractions to avoid rate limits
  - _Requirements: 6.1, 6.2_

- [ ] 2.3 Load emergency sites from cached GeoJSON
  - Create emergency sites loader that reads from static GeoJSON files
  - Add hospital, school, care home layers with differentiated icons
  - Implement city detection to load appropriate emergency data file
  - Add click handlers for vulnerable site details and backup power status
  - _Requirements: 6.4, 6.5_

- [x] 3. Develop cascade simulation engine




  - Implement CascadeSimulator service with proximity calculations
  - Create asset dependency resolution and cascade propagation logic
  - Add timing delays and cross-sector cascade rules
  - Implement asset state management (normal, degraded, failed, offline)
  - _Requirements: 2.1, 2.2, 2.3, 2.4_


- [x] 3.1 Build cascade visualization system

  - Create expanding circle animation for cascade radius visualization
  - Implement asset color state changes during cascade progression
  - Add pulsing animations for affected assets
  - Create connection lines between dependent assets
  - _Requirements: 2.5, 4.3_

- [x] 3.2 Add cascade simulation controls

  - Build simulation control panel with radius, speed, and cross-sector toggles
  - Implement play, pause, reset, and step-through functionality
  - Add simulation progress indicators and timeline
  - Create scenario presets for common failure types
  - _Requirements: 2.1, 2.2_

- [ ] 4. Implement economic impact calculation system
  - Create EconomicCalculator service with configurable multipliers
  - Implement real-time cost accumulation during cascade simulations
  - Add peak hours and weather severity multiplier logic
  - Calculate population impact and business disruption costs
  - _Requirements: 3.1, 3.2, 3.4, 3.5_

- [ ] 4.1 Build economic dashboard component
  - Create EconomicDashboard with animated cost counters
  - Display total cost, cost per hour, affected population, and vulnerable sites count
  - Implement expandable cost breakdown by category
  - Add real-time updates with sub-50ms latency during simulations
  - _Requirements: 3.3_

- [ ] 4.2 Add economic impact visualization
  - Create economic impact overlays on map during simulations
  - Implement cost heat maps showing economic density
  - Add economic impact indicators for individual assets
  - Display running totals and projections
  - _Requirements: 3.1, 3.3_

- [ ] 5. Develop investment optimization system
  - Implement InvestmentOptimizer service with criticality scoring
  - Create algorithms for identifying single-point-of-failure assets
  - Build ROI calculation engine with configurable investment templates
  - Implement budget-constrained optimization algorithms
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 5.1 Create criticality visualization
  - Implement heat map visualization for asset criticality scores
  - Add pulsing indicators for single-point-of-failure assets
  - Create criticality-based asset styling and legends
  - Build criticality analysis dashboard with top critical assets
  - _Requirements: 5.1, 5.2, 11.3, 11.4_

- [ ] 5.2 Build investment planning interface
  - Create investment options panel with ROI calculations
  - Implement investment plan builder with budget constraints
  - Add investment scenario comparison tools
  - Build investment recommendations with priority indicators
  - _Requirements: 5.3, 5.4, 5.5_

- [ ] 6. Implement vulnerable sites monitoring
  - Create VulnerableSitesMonitor service with risk level calculations
  - Load vulnerable sites data (hospitals, schools, care homes)
  - Implement backup power duration tracking and countdown timers
  - Add evacuation requirement determination logic
  - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [ ] 6.1 Build vulnerable sites visualization
  - Display vulnerable sites with differentiated icons by type
  - Implement priority-based styling and alert indicators
  - Add backup power countdown timers for affected sites
  - Create vulnerable sites impact dashboard
  - _Requirements: 6.4, 6.5_

- [ ] 6.2 Add stakeholder notification system (PoC)
  - Implement console-based notification logging for proof-of-concept
  - Create notification message templates for different scenarios
  - Add stakeholder contact management interface
  - Build notification history and audit trail
  - _Requirements: 6.6, 6.7_

- [x] 7. Integrate Cesium photorealistic 3D view


  - Set up Cesium viewer component with Google 3D tiles
  - Implement view mode toggle between MapLibre and Cesium
  - Port infrastructure asset rendering to Cesium entities
  - Add camera controls and navigation for 3D environment
  - _Requirements: 4.5_

- [ ] 7.1 Synchronize state between mapping engines
  - Implement state synchronization between MapLibre and Cesium views
  - Maintain asset selection and cascade state across view switches
  - Preserve camera position and zoom levels during transitions
  - Ensure layer visibility consistency between engines
  - _Requirements: 4.3, 4.4_

- [ ] 7.2 Port cascade visualization to Cesium
  - Implement 3D cascade animations in Cesium environment
  - Create 3D expanding spheres for cascade radius visualization
  - Add 3D asset state indicators and animations
  - Ensure performance parity with MapLibre implementation
  - _Requirements: 2.5, 4.5_

- [ ] 8. Build dual data source architecture
  - Create DataSourceManager service to handle OpenInfraMap tiles and Overpass API data
  - Implement data source switching interface in layer controls panel
  - Add data source preference persistence in localStorage
  - Create automatic fallback mechanism when primary data source fails
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

- [ ] 8.1 Build layer management system
  - Create LayerController component with visibility toggles for both data sources
  - Implement opacity sliders for each infrastructure layer
  - Add layer grouping and categorization with data source indicators
  - Build layer state persistence across view mode and data source changes
  - _Requirements: 11.1, 11.2, 11.5_

- [x] 8.2 Add advanced layer features



  - Implement layer filtering and search capabilities for both data sources
  - Add layer styling customization options with data source-specific styling
  - Create layer export and sharing functionality
  - Build layer presets for different analysis scenarios
  - _Requirements: 11.1, 11.2_

- [ ] 9. Implement Story Mode for historical scenarios
  - Create StoryModeController service with scenario definitions
  - Implement automated camera flight paths for cinematic presentation
  - Add synchronized narration overlays with scenario timeline
  - Build playback controls (play, pause, reset, speed adjustment)
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 9.1 Create historical scenario data
  - Implement Storm Arwen 2021 scenario with timeline and affected assets
  - Add Thames Flood 2014 scenario with flood zone progression
  - Create scenario asset failure sequences based on historical data
  - Build scenario metadata and documentation
  - _Requirements: 10.1, 10.5_

- [ ] 9.2 Build Story Mode user interface
  - Create story mode selection interface with scenario previews
  - Implement timeline scrubber and playback controls
  - Add narration display with synchronized text overlays
  - Build story mode progress indicators and chapter navigation
  - _Requirements: 10.3, 10.4_

- [ ] 10. Develop PDF export and reporting system
  - Implement jsPDF-based report generation with professional layouts
  - Create map screenshot capture functionality for both mapping engines
  - Build economic analysis tables and charts for reports
  - Add investment plan export with ROI calculations and recommendations
  - _Requirements: 8.1, 8.2, 8.3, 8.5_

- [ ] 10.1 Create comprehensive report templates
  - Build executive summary template with key metrics
  - Implement critical asset analysis tables with criticality scores
  - Add vulnerable site impact assessment sections
  - Create economic projection charts and cost breakdown visualizations
  - _Requirements: 8.4, 8.5_

- [ ] 10.2 Add report customization and branding
  - Implement configurable organizational branding (logo, colors, name)
  - Add report template selection and customization options
  - Create report metadata and generation timestamps
  - Build report sharing and distribution functionality
  - _Requirements: 8.6_

- [ ] 11. Implement error handling and resilience
  - Add comprehensive error boundaries for React components
  - Implement network retry mechanisms for tile loading failures
  - Create user-friendly error messages with recovery suggestions
  - Add graceful degradation for non-critical component failures
  - _Requirements: 9.1, 9.2, 9.4, 9.5_

- [ ] 11.1 Build loading states and user feedback
  - Implement loading indicators for map tiles and data sources
  - Add progress bars for long-running operations (simulations, exports)
  - Create toast notifications for user actions and system events
  - Build connection status indicators and offline handling
  - _Requirements: 9.3, 9.5_

- [ ] 12. Performance optimization and testing
  - Implement asset clustering for dense areas to maintain 60fps
  - Add lazy loading for non-visible map layers and components
  - Optimize bundle splitting for Cesium and MapLibre libraries
  - Create performance monitoring and metrics collection
  - _Requirements: Performance Requirements 1-5_

- [ ]* 12.1 Write comprehensive test suite
  - Create unit tests for cascade simulation logic and economic calculations
  - Implement component tests for UI interactions and state management
  - Add integration tests for end-to-end simulation workflows
  - Build performance tests for animation frame rates and asset handling
  - _Requirements: All requirements validation_

- [ ]* 12.2 Add accessibility and usability features
  - Implement keyboard navigation for map controls and simulations
  - Add screen reader support for dashboard metrics and alerts
  - Create high contrast mode for better visibility
  - Build mobile-responsive layouts for tablet and phone usage
  - _Requirements: 9.4, 9.5_

- [ ] 13. Final integration and deployment preparation
  - Integrate all components into cohesive application workflow
  - Implement application routing and navigation structure
  - Add environment configuration for development and production
  - Create deployment scripts and Vercel configuration
  - _Requirements: All requirements integration_

- [ ] 13.1 Create user documentation and help system
  - Build in-application help tooltips and guided tours
  - Create user manual with feature explanations and workflows
  - Add keyboard shortcuts reference and accessibility guide
  - Implement contextual help system for complex features
  - _Requirements: 9.4, 9.5_

- [ ] 13.2 Prepare demonstration scenarios
  - Create compelling demo scenarios showcasing key features
  - Prepare sample data sets for different UK metropolitan areas
  - Build demo script with narrative flow and key talking points
  - Test all features for demo readiness and performance
  - _Requirements: All requirements demonstration_