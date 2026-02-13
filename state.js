// ============================================================================
// STATE MODULE - Single Source of Truth
// ============================================================================

const State = {
    // All parameters in one structured object
    parameters: {
        layoutType: 'hex-checkerboard',
        rows: 10,
        cols: 10,
        spacing: 0.35,
        pillarRadius: 0.125,
        pillarHeight: 10.0,
        holeRadius: 0.10,
        floorThickness: 2.0,
        floorPaddingX: 0.25,
        floorPaddingY: 0.25,
        wallThickness: 2.0,
        jitter: 0.05,
        holeProb: 0.20,
        seed: 42,
        lloydIterations: 0
    },
    
    // Server response data
    previewData: null, // { pillars: [], holes: [], bounds: {} }
    
    // UI state
    ui: {
        zoom: 0.85,
        showMeasurements: false,
        isGenerating: false,
        linkPadding: true
    },
    
    // Dimension locks
    locks: {
        width: { active: false, target: null },
        height: { active: false, target: null }
    },
    
    // State mutation methods
    setParameter(key, value) {
        this.parameters[key] = value;
    },
    
    setParameters(params) {
        Object.assign(this.parameters, params);
    },
    
    setPreviewData(data) {
        this.previewData = data;
    },
    
    setUIState(key, value) {
        this.ui[key] = value;
    },
    
    toggleLock(dimension, targetValue) {
        const lock = this.locks[dimension];
        lock.active = !lock.active;
        lock.target = lock.active ? targetValue : null;
    },
    
    isLocked(dimension) {
        return this.locks[dimension].active;
    },
    
    getLockTarget(dimension) {
        return this.locks[dimension].target;
    },
    
    // Get parameters formatted for API
    getAPIParameters() {
        return {
            layout_type: this.parameters.layoutType,
            rows: parseInt(this.parameters.rows),
            cols: parseInt(this.parameters.cols),
            spacing: parseFloat(this.parameters.spacing),
            pillar_radius: parseFloat(this.parameters.pillarRadius),
            pillar_height: parseFloat(this.parameters.pillarHeight),
            hole_radius: parseFloat(this.parameters.holeRadius),
            floor_thickness: parseFloat(this.parameters.floorThickness),
            floor_padding_x: parseFloat(this.parameters.floorPaddingX),
            floor_padding_y: parseFloat(this.parameters.floorPaddingY),
            wall_thickness: parseFloat(this.parameters.wallThickness),
            hole_probability: parseFloat(this.parameters.holeProb),
            jitter: parseFloat(this.parameters.jitter),
            lloyd_iterations: parseInt(this.parameters.lloydIterations),  // ADD THIS
            seed: parseInt(this.parameters.seed)
        };
    },
    
    // Calculate derived values
    getStatistics() {
        if (!this.previewData) return null;
        
        const { pillars, holes, bounds } = this.previewData;
        const innerWidth = bounds.maxX - bounds.minX;
        const innerHeight = bounds.maxY - bounds.minY;
        const wt = this.parameters.wallThickness;
        const totalWidth = innerWidth + 2 * wt;
        const totalHeight = innerHeight + 2 * wt;
        const totalHeightZ = this.parameters.floorThickness + this.parameters.pillarHeight;
        const density = pillars.length / (innerWidth * innerHeight);
        
        return {
            pillarCount: pillars.length,
            holeCount: holes.length,
            innerDimensions: { width: innerWidth, height: innerHeight },
            totalDimensions: { width: totalWidth, height: totalHeight },
            totalHeightZ,
            density
        };
    }
};