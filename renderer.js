// ============================================================================
// RENDERER MODULE - Pure Drawing Functions
// ============================================================================

const Renderer = {
    /**
     * Main drawing function - pure, no side effects
     */
    drawPreview(ctx, canvasWidth, canvasHeight, previewData, options) {
        const { zoom, showMeasurements, parameters } = options;
        const { pillars, holes, bounds } = previewData;
        
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        const transform = this._calculateTransform(
            bounds, 
            canvasWidth, 
            canvasHeight, 
            zoom,
            parameters.wallThickness
        );
        
        this._drawWalls(ctx, bounds, transform, parameters.wallThickness);
        this._drawFloor(ctx, bounds, transform);
        this._drawHoles(ctx, holes, transform, parameters.holeRadius);
        this._drawPillars(ctx, pillars, transform, parameters.pillarRadius);
        
        if (showMeasurements) {
            this._drawMeasurements(ctx, previewData, transform, parameters);
        }
        
        return ctx;
    },
    
    /**
     * Generate side view SVG
     */
    generateSideViewSVG(parameters) {
        const floorThickness = parameters.floorThickness;
        const pillarHeight = parameters.pillarHeight;
        const totalHeight = floorThickness + pillarHeight;
        
        const svgWidth = 380;
        const svgHeight = 360;
        const maxHeightForContent = svgHeight - 60;
        const scale = maxHeightForContent / totalHeight;
        
        const scaledTotalHeight = totalHeight * scale;
        const baseY = svgHeight / 2 + scaledTotalHeight / 2;
        const floorWidth = 140;
        const pillarWidth = 50;
        const leftMargin = 60;
        
        return `
            <svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="hatch" patternUnits="userSpaceOnUse" width="4" height="4">
                        <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="#999" stroke-width="0.5"/>
                    </pattern>
                </defs>
                
                <rect x="${leftMargin}" y="${baseY - floorThickness * scale}" width="${floorWidth}" height="${floorThickness * scale}" 
                      fill="url(#hatch)" stroke="#666" stroke-width="1.5"/>
                
                <rect x="${leftMargin + (floorWidth - pillarWidth) / 2}" y="${baseY - totalHeight * scale}" width="${pillarWidth}" height="${pillarHeight * scale}" 
                      fill="rgba(50, 120, 200, 0.5)" stroke="#357abd" stroke-width="2"/>
                
                <line x1="${leftMargin + floorWidth + 12}" y1="${baseY}" x2="${leftMargin + floorWidth + 12}" y2="${baseY - floorThickness * scale}" 
                      stroke="#e74c3c" stroke-width="2"/>
                <line x1="${leftMargin + floorWidth + 9}" y1="${baseY}" x2="${leftMargin + floorWidth + 15}" y2="${baseY}" 
                      stroke="#e74c3c" stroke-width="2"/>
                <line x1="${leftMargin + floorWidth + 9}" y1="${baseY - floorThickness * scale}" x2="${leftMargin + floorWidth + 15}" y2="${baseY - floorThickness * scale}" 
                      stroke="#e74c3c" stroke-width="2"/>
                <text x="${leftMargin + floorWidth + 20}" y="${baseY - floorThickness * scale / 2}" fill="#e74c3c" 
                      font-size="10" font-weight="bold" text-anchor="start" dominant-baseline="middle">
                    Floor: ${floorThickness.toFixed(1)} mm
                </text>
                
                <line x1="${leftMargin + floorWidth + 28}" y1="${baseY - floorThickness * scale}" x2="${leftMargin + floorWidth + 28}" y2="${baseY - totalHeight * scale}" 
                      stroke="#e74c3c" stroke-width="2"/>
                <line x1="${leftMargin + floorWidth + 25}" y1="${baseY - floorThickness * scale}" x2="${leftMargin + floorWidth + 31}" y2="${baseY - floorThickness * scale}" 
                      stroke="#e74c3c" stroke-width="2"/>
                <line x1="${leftMargin + floorWidth + 25}" y1="${baseY - totalHeight * scale}" x2="${leftMargin + floorWidth + 31}" y2="${baseY - totalHeight * scale}" 
                      stroke="#e74c3c" stroke-width="2"/>
                <text x="${leftMargin + floorWidth + 36}" y="${baseY - (floorThickness + pillarHeight/2) * scale}" fill="#e74c3c" 
                      font-size="10" font-weight="bold" text-anchor="start" dominant-baseline="middle">
                    Pillar: ${pillarHeight.toFixed(1)} mm
                </text>
                
                <line x1="${leftMargin - 20}" y1="${baseY}" x2="${leftMargin - 20}" y2="${baseY - totalHeight * scale}" 
                      stroke="#9b59b6" stroke-width="2" stroke-dasharray="4,4"/>
                <line x1="${leftMargin - 23}" y1="${baseY}" x2="${leftMargin - 17}" y2="${baseY}" 
                      stroke="#9b59b6" stroke-width="2"/>
                <line x1="${leftMargin - 23}" y1="${baseY - totalHeight * scale}" x2="${leftMargin - 17}" y2="${baseY - totalHeight * scale}" 
                      stroke="#9b59b6" stroke-width="2"/>
                <text x="${leftMargin - 30}" y="${baseY - totalHeight * scale / 2}" fill="#9b59b6" 
                      font-size="10" font-weight="bold" text-anchor="middle" dominant-baseline="middle"
                      transform="rotate(-90 ${leftMargin - 30} ${baseY - totalHeight * scale / 2})">
                    Total: ${totalHeight.toFixed(1)} mm
                </text>
                
                <line x1="10" y1="${baseY}" x2="${svgWidth - 10}" y2="${baseY}" stroke="#333" stroke-width="2.5"/>
                
                <text x="${svgWidth / 2}" y="${svgHeight - 10}" fill="#666" font-size="9" font-weight="500" text-anchor="middle">
                    Side View (mm)
                </text>
            </svg>
        `;
    },
    
    // ========================================================================
    // PRIVATE HELPERS
    // ========================================================================
    
    _calculateTransform(bounds, canvasWidth, canvasHeight, zoom, wallThickness) {
        const innerWidth = bounds.maxX - bounds.minX;
        const innerHeight = bounds.maxY - bounds.minY;
        const totalWidth = innerWidth + 2 * wallThickness;
        const totalHeight = innerHeight + 2 * wallThickness;
        
        const scale = Math.min(canvasWidth, canvasHeight) * zoom / Math.max(totalWidth, totalHeight);
        const offsetX = canvasWidth / 2 - (bounds.minX + bounds.maxX) / 2 * scale;
        const offsetY = canvasHeight / 2 - (bounds.minY + bounds.maxY) / 2 * scale;
        
        return { scale, offsetX, offsetY, bounds };
    },
    
    _drawWalls(ctx, bounds, transform, wallThickness) {
        const { scale, offsetX, offsetY } = transform;
        const innerWidth = bounds.maxX - bounds.minX;
        const innerHeight = bounds.maxY - bounds.minY;
        const wtScaled = wallThickness * scale;
        
        ctx.fillStyle = 'rgba(100, 100, 100, 0.2)';
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        
        const x = bounds.minX * scale + offsetX;
        const y = bounds.minY * scale + offsetY;
        const w = innerWidth * scale;
        const h = innerHeight * scale;
        
        // Top wall
        ctx.fillRect(x - wtScaled, y - wtScaled, w + 2*wtScaled, wtScaled);
        ctx.strokeRect(x - wtScaled, y - wtScaled, w + 2*wtScaled, wtScaled);
        
        // Bottom wall
        ctx.fillRect(x - wtScaled, y + h, w + 2*wtScaled, wtScaled);
        ctx.strokeRect(x - wtScaled, y + h, w + 2*wtScaled, wtScaled);
        
        // Left wall
        ctx.fillRect(x - wtScaled, y, wtScaled, h);
        ctx.strokeRect(x - wtScaled, y, wtScaled, h);
        
        // Right wall
        ctx.fillRect(x + w, y, wtScaled, h);
        ctx.strokeRect(x + w, y, wtScaled, h);
    },
    
    _drawFloor(ctx, bounds, transform) {
        const { scale, offsetX, offsetY } = transform;
        const innerWidth = bounds.maxX - bounds.minX;
        const innerHeight = bounds.maxY - bounds.minY;
        
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            bounds.minX * scale + offsetX,
            bounds.minY * scale + offsetY,
            innerWidth * scale,
            innerHeight * scale
        );
    },
    
    _drawHoles(ctx, holes, transform, holeRadius) {
        const { scale, offsetX, offsetY } = transform;
        const holeRadiusScaled = holeRadius * scale;
        
        ctx.fillStyle = 'rgba(255, 100, 100, 0.5)';
        ctx.beginPath();
        holes.forEach(hole => {
            const x = hole.x * scale + offsetX;
            const y = hole.y * scale + offsetY;
            ctx.moveTo(x + holeRadiusScaled, y);
            ctx.arc(x, y, holeRadiusScaled, 0, Math.PI * 2);
        });
        ctx.fill();
    },
    
    _drawPillars(ctx, pillars, transform, pillarRadius) {
        const { scale, offsetX, offsetY } = transform;
        const pillarRadiusScaled = pillarRadius * scale;
        
        ctx.fillStyle = 'rgba(50, 120, 200, 0.7)';
        ctx.beginPath();
        pillars.forEach(pillar => {
            const x = pillar.x * scale + offsetX;
            const y = pillar.y * scale + offsetY;
            ctx.moveTo(x + pillarRadiusScaled, y);
            ctx.arc(x, y, pillarRadiusScaled, 0, Math.PI * 2);
        });
        ctx.fill();
    },
    
    _drawMeasurements(ctx, previewData, transform, parameters) {
        const { pillars, holes } = previewData;
        const { bounds, scale, offsetX, offsetY } = transform;
        const spacing = parameters.spacing;
        const pillarRadiusValue = parameters.pillarRadius;
        const holeRadiusValue = parameters.holeRadius;
        const floorPaddingX = parameters.floorPaddingX;
        const floorPaddingY = parameters.floorPaddingY;
        const wt = parameters.wallThickness;
        
        if (pillars.length < 2) return;
        
        // Find adjacent pillars for spacing
        const sortedPillars = [...pillars].sort((a, b) => a.y - b.y || a.x - b.x);
        let pillar1 = null, pillar2 = null;
        
        for (let i = 0; i < sortedPillars.length - 1; i++) {
            const p1 = sortedPillars[i];
            const p2 = sortedPillars[i + 1];
            const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
            
            if (Math.abs(dist - spacing) < 0.01) {
                pillar1 = p1;
                pillar2 = p2;
                break;
            }
        }
        
        // Draw spacing dimension
        if (pillar1 && pillar2) {
            const spacingOffset = typeof MeasurementStyles !== 'undefined' 
                ? MeasurementStyles.get('spacingLabelOffset') : 0;
            this._drawDimensionLine(
                ctx, 
                pillar1.x * scale + offsetX, 
                pillar1.y * scale + offsetY,
                pillar2.x * scale + offsetX, 
                pillar2.y * scale + offsetY,
                `Spacing: ${spacing.toFixed(3)} mm`,
                undefined,
                spacingOffset
            );
        }
        
        // Draw pillar radius
        if (pillars.length > 0) {
            const pillar = pillars[0];
            this._drawRadiusLine(
                ctx,
                pillar.x * scale + offsetX,
                pillar.y * scale + offsetY,
                pillarRadiusValue * scale,
                `Pillar r=${pillarRadiusValue.toFixed(3)} mm`,
                -45
            );
        }
        
        // Draw hole radius
        if (holes.length > 0) {
            const hole = holes[0];
            this._drawRadiusLine(
                ctx,
                hole.x * scale + offsetX,
                hole.y * scale + offsetY,
                holeRadiusValue * scale,
                `Hole r=${holeRadiusValue.toFixed(3)} mm`,
                135
            );
        }
        
        // Calculate positions INSIDE the walls
        const innerWidth = bounds.maxX - bounds.minX;
        const innerHeight = bounds.maxY - bounds.minY;
        const floorLeftX = bounds.minX * scale + offsetX;
        const floorTopY = bounds.minY * scale + offsetY;
        
        // Find outermost pillar/hole positions
        const allPositions = [...pillars, ...holes];
        const xValues = allPositions.map(p => p.x);
        const yValues = allPositions.map(p => p.y);
        const leftmostX = Math.min(...xValues) * scale + offsetX;
        const topmostY = Math.min(...yValues) * scale + offsetY;
        
        // Get offsets from MeasurementStyles
        const padXOffset = typeof MeasurementStyles !== 'undefined' 
            ? MeasurementStyles.get('padXOffset') : -35;
        const padYOffset = typeof MeasurementStyles !== 'undefined' 
            ? MeasurementStyles.get('padYOffset') : -20;
        
        // Padding X: from floor left edge to leftmost pillar center (INSIDE walls)
        if (Math.abs(floorPaddingX) > 0.001) {
            this._drawBracket(
                ctx,
                floorLeftX,
                floorTopY + padXOffset,
                leftmostX,
                floorTopY + padXOffset,
                `Pad X: ${Math.abs(floorPaddingX).toFixed(3)} mm`
            );
        }
        
        // Padding Y: from floor top edge to topmost pillar center (INSIDE walls)
        if (Math.abs(floorPaddingY) > 0.001) {
            this._drawBracket(
                ctx,
                floorLeftX + padYOffset,
                floorTopY,
                floorLeftX + padYOffset,
                topmostY,
                `Pad Y: ${Math.abs(floorPaddingY).toFixed(3)} mm`
            );
        }
        
        // Wall thickness
        if (wt > 0) {
            const wtScaled = wt * scale;
            this._drawBracket(
                ctx,
                floorLeftX - wtScaled,
                floorTopY + innerHeight * scale / 2,
                floorLeftX,
                floorTopY + innerHeight * scale / 2,
                `Wall: ${wt.toFixed(2)} mm`
            );
        }
    },
    
    _drawDimensionLine(ctx, x1, y1, x2, y2, label, offset, labelOffsetY = 0) {
        const styles = typeof MeasurementStyles !== 'undefined' ? MeasurementStyles.getAll() : {};
        const color = styles.dimensionColor || '#e74c3c';
        const lineWidth = styles.lineWidth || 1.5;
        const capSize = styles.capSize || 8;
        const dashPattern = styles.dashPattern || [3, 3];
        const fontSize = styles.fontSize || 11;
        const fontWeight = styles.fontWeight || 'bold';
        const labelBg = styles.labelBg || '#ffffff';
        const labelOpacity = styles.labelOpacity !== undefined ? styles.labelOpacity : 0.95;
        const labelPadding = styles.labelPadding || 4;
        const defaultOffset = styles.measurementOffset || -40;
        
        if (offset === undefined) offset = defaultOffset;
        
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = lineWidth;
        
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const perpX = -dy / length * offset;
        const perpY = dx / length * offset;
        
        const startX = x1 + perpX;
        const startY = y1 + perpY;
        const endX = x2 + perpX;
        const endY = y2 + perpY;
        
        // Main line
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Arrows
        const arrowAngle = Math.PI / 6;
        const arrowDx = endX - startX;
        const arrowDy = endY - startY;
        const arrowLength = Math.sqrt(arrowDx * arrowDx + arrowDy * arrowDy);
        const arrowUnitX = arrowDx / arrowLength;
        const arrowUnitY = arrowDy / arrowLength;
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(
            startX + capSize * (arrowUnitX * Math.cos(arrowAngle) + arrowUnitY * Math.sin(arrowAngle)),
            startY + capSize * (arrowUnitY * Math.cos(arrowAngle) - arrowUnitX * Math.sin(arrowAngle))
        );
        ctx.moveTo(startX, startY);
        ctx.lineTo(
            startX + capSize * (arrowUnitX * Math.cos(arrowAngle) - arrowUnitY * Math.sin(arrowAngle)),
            startY + capSize * (arrowUnitY * Math.cos(arrowAngle) + arrowUnitX * Math.sin(arrowAngle))
        );
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - capSize * (arrowUnitX * Math.cos(arrowAngle) + arrowUnitY * Math.sin(arrowAngle)),
            endY - capSize * (arrowUnitY * Math.cos(arrowAngle) - arrowUnitX * Math.sin(arrowAngle))
        );
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - capSize * (arrowUnitX * Math.cos(arrowAngle) - arrowUnitY * Math.sin(arrowAngle)),
            endY - capSize * (arrowUnitY * Math.cos(arrowAngle) + arrowUnitX * Math.sin(arrowAngle))
        );
        ctx.stroke();
        
        // Extension lines
        ctx.setLineDash(dashPattern);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(startX, startY);
        ctx.moveTo(x2, y2);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Label
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2 + labelOffsetY;
        ctx.font = `${fontWeight} ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const metrics = ctx.measureText(label);
        if (labelOpacity > 0) {
            ctx.fillStyle = labelBg;
            ctx.globalAlpha = labelOpacity;
            ctx.fillRect(midX - metrics.width/2 - labelPadding, midY - fontSize/2 - 2, metrics.width + labelPadding*2, fontSize + 4);
            ctx.globalAlpha = 1;
        }
        
        ctx.fillStyle = color;
        ctx.fillText(label, midX, midY);
        
        ctx.restore();
    },
    
    _drawRadiusLine(ctx, centerX, centerY, radius, label, angle = 45) {
        const styles = typeof MeasurementStyles !== 'undefined' ? MeasurementStyles.getAll() : {};
        const color = styles.dimensionColor || '#e74c3c';
        const lineWidth = styles.lineWidth || 1.5;
        const dotSize = styles.dotSize || 2;
        const labelOffset = styles.labelOffset || 20;
        const fontSize = styles.fontSize || 11;
        const fontWeight = styles.fontWeight || 'bold';
        const labelBg = styles.labelBg || '#ffffff';
        const labelOpacity = styles.labelOpacity !== undefined ? styles.labelOpacity : 0.95;
        const labelPadding = styles.labelPadding || 4;
        
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = lineWidth;
        
        const rad = angle * Math.PI / 180;
        const endX = centerX + Math.cos(rad) * radius;
        const endY = centerY + Math.sin(rad) * radius;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, dotSize, 0, Math.PI * 2);
        ctx.fill();
        
        const labelX = centerX + Math.cos(rad) * (radius + labelOffset);
        const labelY = centerY + Math.sin(rad) * (radius + labelOffset);
        
        ctx.font = `${fontWeight} ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const metrics = ctx.measureText(label);
        if (labelOpacity > 0) {
            ctx.fillStyle = labelBg;
            ctx.globalAlpha = labelOpacity;
            ctx.fillRect(labelX - metrics.width/2 - labelPadding, labelY - fontSize/2 - 2, metrics.width + labelPadding*2, fontSize + 4);
            ctx.globalAlpha = 1;
        }
        
        ctx.fillStyle = color;
        ctx.fillText(label, labelX, labelY);
        
        ctx.restore();
    },
    
    _drawBracket(ctx, x1, y1, x2, y2, label) {
        const styles = typeof MeasurementStyles !== 'undefined' ? MeasurementStyles.getAll() : {};
        const color = styles.bracketColor || '#9b59b6';
        const lineWidth = styles.lineWidth || 1.5;
        const bracketSize = styles.bracketSize || 10;
        const fontSize = styles.fontSize || 11;
        const fontWeight = styles.fontWeight || 'bold';
        const labelBg = styles.labelBg || '#ffffff';
        const labelOpacity = styles.labelOpacity !== undefined ? styles.labelOpacity : 0.95;
        const labelPadding = styles.labelPadding || 4;
        const bracketLabelOffset = styles.bracketLabelOffset || 12;
        const rotateVerticalLabels = styles.rotateVerticalLabels !== undefined ? styles.rotateVerticalLabels : true;
        
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = lineWidth;
        
        const isHorizontal = Math.abs(y2 - y1) < Math.abs(x2 - x1);
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        
        if (isHorizontal) {
            ctx.beginPath();
            ctx.moveTo(x1, y1 - bracketSize/2);
            ctx.lineTo(x1, y1 + bracketSize/2);
            ctx.moveTo(x2, y2 - bracketSize/2);
            ctx.lineTo(x2, y2 + bracketSize/2);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.moveTo(x1 - bracketSize/2, y1);
            ctx.lineTo(x1 + bracketSize/2, y1);
            ctx.moveTo(x2 - bracketSize/2, y2);
            ctx.lineTo(x2 + bracketSize/2, y2);
            ctx.stroke();
        }
        
        let labelX = (x1 + x2) / 2;
        let labelY = (y1 + y2) / 2;
        
        ctx.font = `${fontWeight} ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const metrics = ctx.measureText(label);
        
        if (isHorizontal) {
            labelY -= bracketLabelOffset;
            if (labelOpacity > 0) {
                ctx.fillStyle = labelBg;
                ctx.globalAlpha = labelOpacity;
                ctx.fillRect(labelX - metrics.width/2 - labelPadding, labelY - fontSize/2 - 2, metrics.width + labelPadding*2, fontSize + 4);
                ctx.globalAlpha = 1;
            }
            ctx.fillStyle = color;
            ctx.fillText(label, labelX, labelY);
        } else {
            labelX -= bracketLabelOffset;
            if (rotateVerticalLabels) {
                ctx.save();
                ctx.translate(labelX, labelY);
                ctx.rotate(-Math.PI / 2);
                if (labelOpacity > 0) {
                    ctx.fillStyle = labelBg;
                    ctx.globalAlpha = labelOpacity;
                    ctx.fillRect(-metrics.width/2 - labelPadding, -fontSize/2 - 2, metrics.width + labelPadding*2, fontSize + 4);
                    ctx.globalAlpha = 1;
                }
                ctx.fillStyle = color;
                ctx.fillText(label, 0, 0);
                ctx.restore();
            } else {
                if (labelOpacity > 0) {
                    ctx.fillStyle = labelBg;
                    ctx.globalAlpha = labelOpacity;
                    ctx.fillRect(labelX - metrics.width/2 - labelPadding, labelY - fontSize/2 - 2, metrics.width + labelPadding*2, fontSize + 4);
                    ctx.globalAlpha = 1;
                }
                ctx.fillStyle = color;
                ctx.fillText(label, labelX, labelY);
            }
        }
        
        ctx.restore();
    }
};