// ============================================================================
// API MODULE - Server Communication
// ============================================================================

const API = {
    baseUrl: window.location.hostname === 'localhost' 
        ? 'http://localhost:5000' 
        : window.location.origin,
    
    /**
     * Fetch preview data (lightweight, positions only)
     * @param {Object} parameters - API-formatted parameters
     * @returns {Promise<Object>} { pillars, holes, bounds }
     */
    async fetchPreview(parameters) {
        try {
            const response = await fetch(`${this.baseUrl}/preview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(parameters)
            });
            
            if (!response.ok) {
                throw new Error(`Preview failed: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Preview error:', error);
            throw error;
        }
    },
    
    /**
     * Generate full STL file
     * @param {Object} parameters - API-formatted parameters
     * @returns {Promise<Object>} { blob, metadata: { time, dimensions } }
     */
    async generateSTL(parameters) {
        try {
            const response = await fetch(`${this.baseUrl}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(parameters)
            });
            
            if (!response.ok) {
                throw new Error(`Generation failed: ${response.statusText}`);
            }
            
            const blob = await response.blob();
            const metadata = {
                time: response.headers.get('X-Generation-Time'),
                dimensions: response.headers.get('X-Dimensions')
            };
            
            return { blob, metadata };
        } catch (error) {
            console.error('Generation error:', error);
            throw error;
        }
    }
};