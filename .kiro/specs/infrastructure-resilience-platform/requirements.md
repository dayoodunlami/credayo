# Requirements Document

## Introduction

The CReDo Infrastructure Resilience Platform is a web-based application that visualizes UK critical infrastructure and simulates cascade failure scenarios. The system provides dual 2D/3D visualization capabilities, real-time economic impact analysis, and investment optimization tools to help stakeholders understand infrastructure dependencies and make informed resilience decisions.

## Glossary

- **Infrastructure_Platform**: The web-based CReDo application system
- **Cascade_Simulator**: The component that models failure propagation across infrastructure sectors
- **Asset_Visualizer**: The mapping component that renders infrastructure assets in 2D and 3D views
- **Economic_Calculator**: The component that computes financial impacts of infrastructure failures
- **Investment_Optimizer**: The component that analyzes and recommends infrastructure investments
- **Vulnerable_Sites_Monitor**: The component that tracks and alerts on critical facilities at risk
- **Configuration_System**: The JSON-based system for managing economic multipliers and cascade rules
- **Stakeholder**: Any user or external party requiring notifications about infrastructure impacts
- **Story_Mode**: The component that replays historical infrastructure failure scenarios with automated camera animations
- **Layer_Controller**: The UI component that manages visibility and styling of map layers

## Technical Architecture

### Technology Stack
- **Frontend Framework**: React 18 with TypeScript, built with Vite
- **2D/3D Mapping**: MapLibre GL JS v4.x with MapTiler SDK
- **Photorealistic 3D**: Cesium JS with Google Photorealistic 3D Tiles
- **Styling**: Tailwind CSS for responsive design
- **State Management**: React Context API with custom hooks
- **Exports**: jsPDF for report generation
- **Configuration Validation**: Zod schemas for JSON config validation

### Data Sources
- **Primary**: Offline GeoJSON data (power, transport, telecom)
- **Cached**: Static GeoJSON for London, Manchester, Bristol (~24MB total)
- **Vulnerable Sites**: OpenStreetMap amenity tags + custom datasets
- **Flood Data**: Environment Agency flood zones

### Target Deployment
- **Platform**: Vercel (static hosting)
- **Total Bundle Size**: ~70MB (React + Cesium + cached data)

## Performance Requirements

1. **Initial Load**: Map must render in under 2 seconds on broadband connections
2. **Animation**: Cascade simulations must maintain 60fps for smooth visualization
3. **Scalability**: System must handle 5,000+ infrastructure assets without performance degradation
4. **Responsiveness**: 2D/3D toggle must complete in under 100ms
5. **Economic Calculations**: Dashboard updates must occur within 50ms of cascade events

## Geographic Coverage

### Phase 1 (PoC)
- **London**: Complete infrastructure coverage (~3,500 assets)
- **Manchester**: Complete infrastructure coverage (~1,200 assets)
- **Bristol**: Complete infrastructure coverage (~800 assets)

### Fallback
- Other UK areas: Stream from OpenInfraMap vector tile server

## Requirements

### Requirement 1

**User Story:** As an infrastructure analyst, I want to visualize critical infrastructure assets on an interactive map, so that I can understand the spatial distribution and relationships between different infrastructure types.

#### Acceptance Criteria

1. WHEN the Infrastructure_Platform loads, THE Asset_Visualizer SHALL display a map centered on a UK metropolitan area
2. THE Asset_Visualizer SHALL render power substations as red circular markers with asset metadata
3. THE Asset_Visualizer SHALL render transport hubs as blue circular markers with connectivity information
4. THE Asset_Visualizer SHALL render telecommunications towers as green circular markers with coverage data
5. WHEN a user clicks an infrastructure asset, THE Asset_Visualizer SHALL display a popup with asset details and dependencies

### Requirement 2

**User Story:** As an emergency planner, I want to simulate infrastructure cascade failures, so that I can understand how initial failures propagate across sectors and plan appropriate responses.

#### Acceptance Criteria

1. WHEN a user clicks any infrastructure asset, THE Cascade_Simulator SHALL initiate a failure simulation from that asset
2. THE Cascade_Simulator SHALL identify dependent assets within configurable proximity radius
3. WHEN cascade propagation occurs, THE Asset_Visualizer SHALL animate the failure spread with timing delays
4. THE Cascade_Simulator SHALL apply cross-sector dependency rules from the Configuration_System
5. THE Asset_Visualizer SHALL update asset visual states to reflect failure progression using color coding

### Requirement 3

**User Story:** As a financial analyst, I want to see real-time economic impact calculations during cascade simulations, so that I can quantify the financial consequences of infrastructure failures.

#### Acceptance Criteria

1. WHEN a cascade simulation begins, THE Economic_Calculator SHALL compute immediate economic impacts using configured multipliers
2. THE Economic_Calculator SHALL accumulate costs over simulation duration with hourly rates
3. THE Infrastructure_Platform SHALL display a real-time economic dashboard containing total economic impact with animated counter, cost per hour rate, affected population count, vulnerable sites alert count, and expandable cost breakdown by category
4. THE Economic_Calculator SHALL apply peak hours multipliers based on current simulation time
5. THE Economic_Calculator SHALL factor in affected population counts and business disruption costs

### Requirement 4

**User Story:** As an infrastructure manager, I want to toggle between 2D practical and 3D photorealistic views, so that I can analyze infrastructure from different perspectives for planning and presentation purposes.

#### Acceptance Criteria

1. THE Asset_Visualizer SHALL provide a toggle control for switching between 2D and 3D viewing modes
2. WHEN in 3D mode, THE Asset_Visualizer SHALL render buildings with automatic height extrusion
3. THE Asset_Visualizer SHALL maintain infrastructure layer visibility across view mode changes
4. THE Asset_Visualizer SHALL preserve map center and zoom level when switching between modes
5. WHEN using photorealistic 3D mode, THE Asset_Visualizer SHALL load Google 3D tiles for realistic building representation

### Requirement 5

**User Story:** As a resilience planner, I want to identify critical infrastructure assets and compare investment scenarios, so that I can optimize spending for maximum resilience improvement.

#### Acceptance Criteria

1. THE Investment_Optimizer SHALL calculate criticality scores for all infrastructure assets based on downstream dependencies
2. THE Investment_Optimizer SHALL identify single-point-of-failure assets that lack redundancy
3. WHEN analyzing investments, THE Investment_Optimizer SHALL compute return-on-investment ratios for each option
4. THE Investment_Optimizer SHALL recommend optimal investment combinations within specified budget constraints
5. THE Infrastructure_Platform SHALL generate exportable investment plans with economic justification

### Requirement 6

**User Story:** As an emergency coordinator, I want to monitor vulnerable sites during infrastructure failures, so that I can prioritize protection of critical facilities and coordinate appropriate responses.

#### Acceptance Criteria

1. THE Vulnerable_Sites_Monitor SHALL identify hospitals, schools, and care homes within affected areas
2. WHEN vulnerable sites are impacted, THE Vulnerable_Sites_Monitor SHALL calculate risk levels based on backup power duration
3. THE Vulnerable_Sites_Monitor SHALL determine evacuation requirements for sites exceeding risk thresholds
4. THE Infrastructure_Platform SHALL display vulnerable site alerts with priority indicators
5. THE Vulnerable_Sites_Monitor SHALL display site icons differentiated by type with backup power countdown timers for affected sites
6. WHERE stakeholder notification is configured, THE Vulnerable_Sites_Monitor SHALL generate alert messages for responsible parties
7. FOR proof-of-concept purposes, THE Infrastructure_Platform SHALL log notification messages to console rather than sending actual SMS or email communications

### Requirement 7

**User Story:** As a system administrator, I want all economic parameters and cascade rules to be configurable through JSON files, so that I can update system behavior without code changes.

#### Acceptance Criteria

1. THE Configuration_System SHALL load economic multipliers from economic-multipliers.json with base costs, peak hours, and population impacts
2. THE Configuration_System SHALL load cascade dependency rules from cascade-rules.json with dependency rules, delays, and severity factors
3. THE Configuration_System SHALL load investment templates from investment-templates.json with ROI calculations and investment options
4. THE Configuration_System SHALL load vulnerable site definitions from vulnerable-sites.json with site priorities and stakeholder contacts
5. THE Configuration_System SHALL validate all JSON files against Zod schemas before loading
6. WHEN configuration files contain invalid data, THE Infrastructure_Platform SHALL display clear error messages and halt initialization
7. THE Configuration_System SHALL store all time durations in minutes with display conversion helpers
8. THE Infrastructure_Platform SHALL apply configuration changes without requiring application rebuild

### Requirement 8

**User Story:** As a decision maker, I want to export detailed reports of simulations and investment plans, so that I can share findings with stakeholders and support funding decisions.

#### Acceptance Criteria

1. THE Infrastructure_Platform SHALL generate PDF reports containing simulation results and economic analysis
2. THE Infrastructure_Platform SHALL include map screenshots and asset impact visualizations in exported reports
3. THE Infrastructure_Platform SHALL export investment optimization plans with ROI calculations and recommendations
4. THE Infrastructure_Platform SHALL include vulnerable site impact assessments in scenario reports
5. THE Infrastructure_Platform SHALL include in PDF exports executive summary, map screenshots with criticality overlay, critical asset analysis table, recommended investment table with ROI calculations, vulnerable site impact summary, and economic projection charts
6. THE Infrastructure_Platform SHALL format all exported documents with professional layouts and configurable organizational branding including logo and name

### Requirement 9

**User Story:** As a system user, I want clear error messages and graceful degradation when system components fail, so that I can understand what went wrong and continue working with available functionality.

#### Acceptance Criteria

1. WHEN configuration files fail to load or contain invalid data, THE Infrastructure_Platform SHALL display user-friendly error messages with specific validation failures
2. WHEN map tiles fail to load, THE Asset_Visualizer SHALL display fallback content and retry mechanisms
3. WHEN data sources are unavailable, THE Infrastructure_Platform SHALL show appropriate loading states and error notifications
4. THE Infrastructure_Platform SHALL continue operating with reduced functionality when non-critical components fail
5. WHEN API requests timeout or fail, THE Infrastructure_Platform SHALL provide clear feedback and suggest user actions
6. WHEN vector tile servers are unavailable, THE Asset_Visualizer SHALL display appropriate loading states and retry mechanisms
7. THE Infrastructure_Platform SHALL handle emergency site data loading failures gracefully with fallback messaging

### Requirement 10

**User Story:** As a presenter, I want to replay historical infrastructure failure events with cinematic camera animations, so that I can demonstrate real-world cascade impacts to decision-makers.

#### Acceptance Criteria

1. THE Story_Mode SHALL provide pre-configured historical scenarios including Storm Arwen 2021 and Thames Flood 2014
2. THE Asset_Visualizer SHALL execute automated camera flight paths between key locations during scenario playback
3. THE Infrastructure_Platform SHALL display timed narration overlays synchronized with scenario events
4. THE Story_Mode SHALL provide timeline controls including play, pause, reset, and playback speed adjustment
5. THE Infrastructure_Platform SHALL sequence asset failure animations according to historical timeline data

### Requirement 11

**User Story:** As a map user, I want to control the visibility and appearance of different infrastructure layers, so that I can focus on specific asset types and customize the visualization.

#### Acceptance Criteria

1. THE Layer_Controller SHALL provide toggle controls for each infrastructure layer type
2. THE Layer_Controller SHALL provide opacity sliders for adjusting layer transparency
3. THE Asset_Visualizer SHALL display criticality heat maps with configurable intensity
4. THE Asset_Visualizer SHALL highlight single-point-of-failure assets with pulsing visual indicators
5. THE Layer_Controller SHALL maintain layer state when switching between 2D and 3D view modes

### Requirement 12

**User Story:** As a system administrator, I want to switch between different data sources for infrastructure layers, so that I can choose the most reliable option and have fallback capabilities.

#### Acceptance Criteria

1. THE Infrastructure_Platform SHALL provide a data source selector with options for offline GeoJSON and Overpass API data
2. WHEN using offline GeoJSON data, THE Asset_Visualizer SHALL load pre-downloaded infrastructure data with no external dependencies
3. WHEN using Overpass API mode, THE Infrastructure_Platform SHALL load real-time data with rate limiting protection
4. THE Layer_Controller SHALL maintain layer visibility and styling when switching between offline and real-time data sources
5. THE Infrastructure_Platform SHALL remember the selected data source preference in browser storage
6. WHEN a data source fails, THE Infrastructure_Platform SHALL offer automatic switching to the alternative source
7. THE Infrastructure_Platform SHALL display the current active data source in the interface