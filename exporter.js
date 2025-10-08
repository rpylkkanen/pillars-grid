// ============================================================================
// EXPORTER MODULE - All export functionality
// ============================================================================

const Exporter = {
    /**
     * Export preview image (canvas + side view)
     * Uses html2canvas to capture what's visible
     */
    async exportImage(containerElement) {
        try {
            // Load html2canvas if not already loaded
            if (typeof html2canvas === 'undefined') {
                await this._loadHtml2Canvas();
            }
            
            const canvas = await html2canvas(containerElement, {
                backgroundColor: '#ffffff',
                scale: window.devicePixelRatio || 1,
                useCORS: true
            });
            
            const timestamp = this._getTimestamp();
            await this._downloadCanvasAsImage(canvas, `pillar_grid_preview_${timestamp}.png`);
            
            return true;
        } catch (error) {
            console.error('Image export error:', error);
            throw new Error(`Export failed: ${error.message}`);
        }
    },
    
    /**
     * Export parameters to text file
     */
    exportParameters(parameters, previewData) {
        const timestamp = this._getTimestamp();
        const content = this._formatParametersText(parameters, previewData);
        this._downloadText(content, `pillar_grid_params_${timestamp}.txt`);
    },
    
    /**
     * Load parameters from text file
     */
    async loadParameters(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const params = this._parseParametersText(e.target.result);
                    resolve(params);
                } catch (error) {
                    reject(new Error(`Parse error: ${error.message}`));
                }
            };
            
            reader.onerror = () => reject(new Error('File read error'));
            reader.readAsText(file);
        });
    },
    
    /**
     * Download STL blob
     */
    downloadSTL(blob, layoutType) {
        const timestamp = this._getTimestamp();
        const filename = `pillar_grid_${layoutType}_${timestamp}.stl`;
        this._downloadBlob(blob, filename);
    },
    
    // ========================================================================
    // PRIVATE HELPERS
    // ========================================================================
    
    _loadHtml2Canvas() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },
    
    _downloadCanvasAsImage(canvas, filename) {
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                this._downloadBlob(blob, filename);
                resolve();
            });
        });
    },
    
    _downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    
    _downloadText(text, filename) {
        const blob = new Blob([text], { type: 'text/plain' });
        this._downloadBlob(blob, filename);
    },
    
    _getTimestamp() {
        return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    },
    
    _formatParametersText(parameters, previewData) {
        const stats = previewData ? {
            pillars: previewData.pillars || [],
            holes: previewData.holes || [],
            bounds: previewData.bounds || {}
        } : { pillars: [], holes: [], bounds: {} };
        
        const innerWidth = stats.bounds.maxX ? 
            (stats.bounds.maxX - stats.bounds.minX).toFixed(3) : 'N/A';
        const innerHeight = stats.bounds.maxY ? 
            (stats.bounds.maxY - stats.bounds.minY).toFixed(3) : 'N/A';
        const wt = parameters.wallThickness;
        const totalWidth = stats.bounds.maxX ? 
            (stats.bounds.maxX - stats.bounds.minX + 2 * wt).toFixed(3) : 'N/A';
        const totalHeight = stats.bounds.maxY ? 
            (stats.bounds.maxY - stats.bounds.minY + 2 * wt).toFixed(3) : 'N/A';
        
        return `PILLAR GRID PARAMETERS
Generated: ${new Date().toLocaleString()}

=== LAYOUT ===
Type: ${parameters.layoutType}
Rows: ${parameters.rows}
Columns: ${parameters.cols}
Spacing: ${parameters.spacing} mm (center-to-center distance between adjacent pillars)

=== PILLAR GEOMETRY ===
Pillar Radius: ${parameters.pillarRadius} mm
Pillar Height: ${parameters.pillarHeight} mm
Total Height (Floor + Pillar): ${(parameters.floorThickness + parameters.pillarHeight).toFixed(3)} mm

=== HOLE GEOMETRY ===
Hole Radius: ${parameters.holeRadius} mm

=== FLOOR ===
Floor Thickness: ${parameters.floorThickness} mm
Floor Padding X: ${parameters.floorPaddingX} mm (horizontal distance from outermost pillars/holes to inner floor edge)
Floor Padding Y: ${parameters.floorPaddingY} mm (vertical distance from outermost pillars/holes to inner floor edge)
Inner Floor Dimensions: ${innerWidth} × ${innerHeight} mm (excluding walls)

=== WALLS ===
Wall Thickness: ${parameters.wallThickness} mm
Total Outer Dimensions: ${totalWidth} × ${totalHeight} mm (including walls)

=== ORGANIC LAYOUT (if applicable) ===
Jitter: ${parameters.jitter} mm (random position deviation)
Hole Probability: ${parameters.holeProb} (0.0 to 1.0)
Random Seed: ${parameters.seed}

=== STATISTICS ===
Total Pillars: ${stats.pillars.length}
Total Holes: ${stats.holes.length}
Pillar Density: ${innerWidth !== 'N/A' && innerHeight !== 'N/A' ? 
    (stats.pillars.length / (parseFloat(innerWidth) * parseFloat(innerHeight))).toFixed(4) : 'N/A'} pillars/mm²

=== NOTES ===
- Spacing is measured center-to-center between adjacent pillars
- Floor padding is the gap between the outermost elements and the inner edge of the floor (before walls)
- Inner floor dimensions exclude wall thickness
- Total outer dimensions include wall thickness on all sides
- For hex layouts, row spacing is automatically calculated as spacing × √3/2
`;
    },
    
    _parseParametersText(text) {
        const lines = text.split('\n');
        const params = {};
        
        const parseValue = (line) => {
            const match = line.match(/:\s*(.+?)(?:\s*\(|$)/);
            return match ? match[1].trim() : null;
        };
        
        lines.forEach(line => {
            if (line.includes('Type:')) {
                const value = parseValue(line);
                if (value) params.layoutType = value;
            } else if (line.includes('Rows:')) {
                const value = parseValue(line);
                if (value) params.rows = parseInt(value);
            } else if (line.includes('Columns:')) {
                const value = parseValue(line);
                if (value) params.cols = parseInt(value);
            } else if (line.includes('Spacing:')) {
                const value = parseFloat(parseValue(line));
                if (!isNaN(value)) params.spacing = value;
            } else if (line.includes('Pillar Radius:')) {
                const value = parseFloat(parseValue(line));
                if (!isNaN(value)) params.pillarRadius = value;
            } else if (line.includes('Pillar Height:')) {
                const value = parseFloat(parseValue(line));
                if (!isNaN(value)) params.pillarHeight = value;
            } else if (line.includes('Hole Radius:')) {
                const value = parseFloat(parseValue(line));
                if (!isNaN(value)) params.holeRadius = value;
            } else if (line.includes('Floor Thickness:')) {
                const value = parseFloat(parseValue(line));
                if (!isNaN(value)) params.floorThickness = value;
            } else if (line.includes('Floor Padding X:')) {
                const value = parseFloat(parseValue(line));
                if (!isNaN(value)) params.floorPaddingX = value;
            } else if (line.includes('Floor Padding Y:')) {
                const value = parseFloat(parseValue(line));
                if (!isNaN(value)) params.floorPaddingY = value;
            } else if (line.includes('Wall Thickness:')) {
                const value = parseFloat(parseValue(line));
                if (!isNaN(value)) params.wallThickness = value;
            } else if (line.includes('Jitter:')) {
                const value = parseFloat(parseValue(line));
                if (!isNaN(value)) params.jitter = value;
            } else if (line.includes('Hole Probability:')) {
                const value = parseFloat(parseValue(line));
                if (!isNaN(value)) params.holeProb = value;
            } else if (line.includes('Random Seed:')) {
                const value = parseValue(line);
                if (value) params.seed = parseInt(value);
            }
        });
        
        return params;
    }
};