// Export parameters to text file
function exportParameters() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    
    const { pillars, holes, bounds } = window.lastPreviewData || { pillars: [], holes: [], bounds: {} };
    const innerWidth = bounds.maxX ? (bounds.maxX - bounds.minX).toFixed(3) : 'N/A';
    const innerHeight = bounds.maxY ? (bounds.maxY - bounds.minY).toFixed(3) : 'N/A';
    const wt = parseFloat(params.wallThickness.value);
    const totalWidth = bounds.maxX ? (bounds.maxX - bounds.minX + 2 * wt).toFixed(3) : 'N/A';
    const totalHeight = bounds.maxY ? (bounds.maxY - bounds.minY + 2 * wt).toFixed(3) : 'N/A';
    
    const content = `PILLAR GRID PARAMETERS
Generated: ${new Date().toLocaleString()}

=== LAYOUT ===
Type: ${params.layoutType.value}
Rows: ${params.rows.value}
Columns: ${params.cols.value}
Spacing: ${params.spacing.value} mm (center-to-center distance between adjacent pillars)

=== PILLAR GEOMETRY ===
Pillar Radius: ${params.pillarRadius.value} mm
Pillar Height: ${params.pillarHeight.value} mm
Total Height (Floor + Pillar): ${(parseFloat(params.floorThickness.value) + parseFloat(params.pillarHeight.value)).toFixed(3)} mm

=== HOLE GEOMETRY ===
Hole Radius: ${params.holeRadius.value} mm

=== FLOOR ===
Floor Thickness: ${params.floorThickness.value} mm
Floor Padding X: ${params.floorPaddingX.value} mm (horizontal distance from outermost pillars/holes to inner floor edge)
Floor Padding Y: ${params.floorPaddingY.value} mm (vertical distance from outermost pillars/holes to inner floor edge)
Inner Floor Dimensions: ${innerWidth} × ${innerHeight} mm (excluding walls)

=== WALLS ===
Wall Thickness: ${params.wallThickness.value} mm
Total Outer Dimensions: ${totalWidth} × ${totalHeight} mm (including walls)

=== ORGANIC LAYOUT (if applicable) ===
Jitter: ${params.jitter.value} mm (random position deviation)
Hole Probability: ${params.holeProb.value} (0.0 to 1.0)
Random Seed: ${params.seed.value}

=== STATISTICS ===
Total Pillars: ${pillars.length}
Total Holes: ${holes.length}
Pillar Density: ${innerWidth !== 'N/A' && innerHeight !== 'N/A' ? (pillars.length / (parseFloat(innerWidth) * parseFloat(innerHeight))).toFixed(4) : 'N/A'} pillars/mm²

=== NOTES ===
- Spacing is measured center-to-center between adjacent pillars
- Floor padding is the gap between the outermost elements and the inner edge of the floor (before walls)
- Inner floor dimensions exclude wall thickness
- Total outer dimensions include wall thickness on all sides
- For hex layouts, row spacing is automatically calculated as spacing × √3/2
`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pillar_grid_params_${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    document.getElementById('status').textContent = 'Parameters exported';
    setTimeout(() => {
        document.getElementById('status').textContent = '';
    }, 3000);
}

// Load parameters from text file
function loadParameters(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target.result;
            const lines = content.split('\n');
            
            const parseValue = (line) => {
                const match = line.match(/:\s*(.+?)(?:\s*\(|$)/);
                return match ? match[1].trim() : null;
            };
            
            lines.forEach(line => {
                if (line.includes('Type:')) {
                    const value = parseValue(line);
                    if (value) params.layoutType.value = value;
                } else if (line.includes('Rows:')) {
                    const value = parseValue(line);
                    if (value) {
                        params.rows.value = value;
                        params.rowsNum.value = value;
                        document.getElementById('rowsValue').textContent = value;
                    }
                } else if (line.includes('Columns:')) {
                    const value = parseValue(line);
                    if (value) {
                        params.cols.value = value;
                        params.colsNum.value = value;
                        document.getElementById('colsValue').textContent = value;
                    }
                } else if (line.includes('Spacing:')) {
                    const value = parseFloat(parseValue(line));
                    if (!isNaN(value)) {
                        params.spacing.value = value;
                        params.spacingNum.value = value;
                        document.getElementById('spacingValue').textContent = value;
                    }
                } else if (line.includes('Pillar Radius:')) {
                    const value = parseFloat(parseValue(line));
                    if (!isNaN(value)) {
                        params.pillarRadius.value = value;
                        params.pillarRadiusNum.value = value;
                        document.getElementById('pillarRadiusValue').textContent = value;
                    }
                } else if (line.includes('Pillar Height:')) {
                    const value = parseFloat(parseValue(line));
                    if (!isNaN(value)) {
                        params.pillarHeight.value = value;
                        params.pillarHeightNum.value = value;
                        document.getElementById('pillarHeightValue').textContent = value;
                    }
                } else if (line.includes('Hole Radius:')) {
                    const value = parseFloat(parseValue(line));
                    if (!isNaN(value)) {
                        params.holeRadius.value = value;
                        params.holeRadiusNum.value = value;
                        document.getElementById('holeRadiusValue').textContent = value;
                    }
                } else if (line.includes('Floor Thickness:')) {
                    const value = parseFloat(parseValue(line));
                    if (!isNaN(value)) {
                        params.floorThickness.value = value;
                        params.floorThicknessNum.value = value;
                        document.getElementById('floorThicknessValue').textContent = value;
                    }
                } else if (line.includes('Floor Padding X:')) {
                    const value = parseFloat(parseValue(line));
                    if (!isNaN(value)) {
                        params.floorPaddingX.value = value;
                        params.floorPaddingXNum.value = value;
                        document.getElementById('floorPaddingXValue').textContent = value;
                    }
                } else if (line.includes('Floor Padding Y:')) {
                    const value = parseFloat(parseValue(line));
                    if (!isNaN(value)) {
                        params.floorPaddingY.value = value;
                        params.floorPaddingYNum.value = value;
                        document.getElementById('floorPaddingYValue').textContent = value;
                    }
                } else if (line.includes('Wall Thickness:')) {
                    const value = parseFloat(parseValue(line));
                    if (!isNaN(value)) {
                        params.wallThickness.value = value;
                        params.wallThicknessNum.value = value;
                        document.getElementById('wallThicknessValue').textContent = value;
                    }
                } else if (line.includes('Jitter:')) {
                    const value = parseFloat(parseValue(line));
                    if (!isNaN(value)) {
                        params.jitter.value = value;
                        params.jitterNum.value = value;
                        document.getElementById('jitterValue').textContent = value;
                    }
                } else if (line.includes('Hole Probability:')) {
                    const value = parseFloat(parseValue(line));
                    if (!isNaN(value)) {
                        params.holeProb.value = value;
                        params.holeProbNum.value = value;
                        document.getElementById('holeProbValue').textContent = value;
                    }
                } else if (line.includes('Random Seed:')) {
                    const value = parseValue(line);
                    if (value) params.seed.value = value;
                }
            });
            
            const isOrganic = params.layoutType.value === 'organic';
            document.getElementById('organicControls').style.display = isOrganic ? 'block' : 'none';
            
            updatePreview();
            
            document.getElementById('status').textContent = 'Parameters loaded';
            setTimeout(() => {
                document.getElementById('status').textContent = '';
            }, 3000);
            
        } catch (error) {
            document.getElementById('status').textContent = `Error loading file: ${error.message}`;
            console.error('Load error:', error);
        }
    };
    
    reader.readAsText(file);
}