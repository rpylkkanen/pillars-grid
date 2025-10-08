// ============================================================================
// MEASUREMENT STYLES - Centralized visual configuration (like matplotlib rcParams)
// ============================================================================

const MeasurementStyles = {
    // Current active styles
    current: {
        fontSize: 14,
        fontWeight: 'bold',
        dimensionColor: '#e74c3c',
        bracketColor: '#9b59b6',
        lineWidth: 2,
        labelBg: '#ffffff',
        labelOpacity: 0,
        labelPadding: 2,
        dashPattern: [3, 3],
        capSize: 12,
        bracketSize: 12,
        dotSize: 4,
        labelOffset: 20,
        measurementOffset: -60,
        bracketLabelOffset: 30,
        spacingLabelOffset: -20,
        padXOffset: -16,
        padYOffset: -16,
        rotateVerticalLabels: true
    },
    
    // Default styles (for reset)
    defaults: {
        fontSize: 11,
        fontWeight: 'bold',
        dimensionColor: '#e74c3c',
        bracketColor: '#9b59b6',
        lineWidth: 1.5,
        labelBg: '#ffffff',
        labelOpacity: 0.95,
        labelPadding: 4,
        dashPattern: [3, 3],
        capSize: 8,
        bracketSize: 10,
        dotSize: 2,
        labelOffset: 20,
        measurementOffset: -40,
        bracketLabelOffset: 12,
        spacingLabelOffset: 0,
        padXOffset: -35,
        padYOffset: -20,
        rotateVerticalLabels: true
    },
    
    /**
     * Get a style value
     */
    get(key) {
        return this.current[key];
    },
    
    /**
     * Set a style value
     */
    set(key, value) {
        this.current[key] = value;
    },
    
    /**
     * Update multiple style values
     */
    update(styles) {
        Object.assign(this.current, styles);
    },
    
    /**
     * Reset to defaults
     */
    reset() {
        this.current = { ...this.defaults };
    },
    
    /**
     * Load from JSON object
     */
    load(jsonObj) {
        // Convert dashPattern string to array if needed
        if (typeof jsonObj.dashPattern === 'string') {
            jsonObj.dashPattern = jsonObj.dashPattern.split(',').map(x => parseFloat(x.trim()));
        }
        this.update(jsonObj);
    },
    
    /**
     * Load from JSON file
     */
    async loadFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    this.load(data);
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    },
    
    /**
     * Export current styles as JSON
     */
    export() {
        // Convert dashPattern array to string for JSON
        const exported = { ...this.current };
        exported.dashPattern = exported.dashPattern.join(',');
        return exported;
    },
    
    /**
     * Download current styles as JSON file
     */
    downloadAsFile(filename = 'measurement-styles.json') {
        const data = this.export();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    
    /**
     * Get all current styles
     */
    getAll() {
        return { ...this.current };
    }
};

// Initialize with defaults on load
// To auto-load saved styles, you could check localStorage here:
// const saved = localStorage.getItem('measurementStyles');
// if (saved) MeasurementStyles.load(JSON.parse(saved));