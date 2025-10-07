// Canvas resizing
function resizeCanvas() {
    const container = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = container.clientWidth * dpr;
    canvas.height = container.clientHeight * dpr;
    
    canvas.style.width = container.clientWidth + 'px';
    canvas.style.height = container.clientHeight + 'px';
    
    ctx.scale(dpr, dpr);
    
    if (window.lastPreviewData) {
        drawPreview(window.lastPreviewData);
    }
}

// Main preview drawing function
function drawPreview(data) {
    const { pillars, holes, bounds } = data;
    
    const container = canvas.parentElement;
    const canvasWidth = container.clientWidth;
    const canvasHeight = container.clientHeight;
    
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    const innerWidth = bounds.maxX - bounds.minX;
    const innerHeight = bounds.maxY - bounds.minY;
    const wt = parseFloat(params.wallThickness.value);
    const totalWidth = innerWidth + 2 * wt;
    const totalHeight = innerHeight + 2 * wt;
    
    const scale = Math.min(canvasWidth, canvasHeight) * previewZoom / Math.max(totalWidth, totalHeight);
    
    const offsetX = canvasWidth / 2 - (bounds.minX + bounds.maxX) / 2 * scale;
    const offsetY = canvasHeight / 2 - (bounds.minY + bounds.maxY) / 2 * scale;
    
    const toScreen = (x, y) => ({
        x: x * scale + offsetX,
        y: y * scale + offsetY
    });
    
    // Draw walls
    ctx.fillStyle = 'rgba(100, 100, 100, 0.2)';
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    const wtScaled = wt * scale;
    ctx.fillRect(bounds.minX * scale + offsetX - wtScaled, bounds.minY * scale + offsetY - wtScaled, innerWidth * scale + 2*wtScaled, wtScaled);
    ctx.strokeRect(bounds.minX * scale + offsetX - wtScaled, bounds.minY * scale + offsetY - wtScaled, innerWidth * scale + 2*wtScaled, wtScaled);
    ctx.fillRect(bounds.minX * scale + offsetX - wtScaled, bounds.maxY * scale + offsetY, innerWidth * scale + 2*wtScaled, wtScaled);
    ctx.strokeRect(bounds.minX * scale + offsetX - wtScaled, bounds.maxY * scale + offsetY, innerWidth * scale + 2*wtScaled, wtScaled);
    ctx.fillRect(bounds.minX * scale + offsetX - wtScaled, bounds.minY * scale + offsetY, wtScaled, innerHeight * scale);
    ctx.strokeRect(bounds.minX * scale + offsetX - wtScaled, bounds.minY * scale + offsetY, wtScaled, innerHeight * scale);
    ctx.fillRect(bounds.maxX * scale + offsetX, bounds.minY * scale + offsetY, wtScaled, innerHeight * scale);
    ctx.strokeRect(bounds.maxX * scale + offsetX, bounds.minY * scale + offsetY, wtScaled, innerHeight * scale);
    
    // Draw floor outline
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2;
    ctx.strokeRect(
        bounds.minX * scale + offsetX,
        bounds.minY * scale + offsetY,
        innerWidth * scale,
        innerHeight * scale
    );
    
    // Draw holes
    const holeRadiusScaled = parseFloat(params.holeRadius.value) * scale;
    ctx.fillStyle = 'rgba(255, 100, 100, 0.5)';
    ctx.beginPath();
    holes.forEach(hole => {
        const pos = toScreen(hole.x, hole.y);
        ctx.moveTo(pos.x + holeRadiusScaled, pos.y);
        ctx.arc(pos.x, pos.y, holeRadiusScaled, 0, Math.PI * 2);
    });
    ctx.fill();
    
    // Draw pillars
    const pillarRadiusScaled = parseFloat(params.pillarRadius.value) * scale;
    ctx.fillStyle = 'rgba(50, 120, 200, 0.7)';
    ctx.beginPath();
    pillars.forEach(pillar => {
        const pos = toScreen(pillar.x, pillar.y);
        ctx.moveTo(pos.x + pillarRadiusScaled, pos.y);
        ctx.arc(pos.x, pos.y, pillarRadiusScaled, 0, Math.PI * 2);
    });
    ctx.fill();
    
    // Draw measurements if enabled
    if (showMeasurements) {
        drawMeasurements(data, scale, offsetX, offsetY, bounds);
    }
}

// Draw measurements on preview canvas
function drawMeasurements(data, scale, offsetX, offsetY, bounds) {
    const { pillars, holes } = data;
    const spacing = parseFloat(params.spacing.value);
    const pillarRadiusValue = parseFloat(params.pillarRadius.value);
    const holeRadiusValue = parseFloat(params.holeRadius.value);
    const floorPaddingX = parseFloat(params.floorPaddingX.value);
    const floorPaddingY = parseFloat(params.floorPaddingY.value);
    const wt = parseFloat(params.wallThickness.value);
    
    if (pillars.length < 2) return;
    
    // Find adjacent pillars for spacing annotation
    let pillar1 = null, pillar2 = null;
    const sortedPillars = [...pillars].sort((a, b) => a.y - b.y || a.x - b.x);
    
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
        const p1Screen = {
            x: pillar1.x * scale + offsetX,
            y: pillar1.y * scale + offsetY
        };
        const p2Screen = {
            x: pillar2.x * scale + offsetX,
            y: pillar2.y * scale + offsetY
        };
        
        drawDimensionLine(
            ctx, 
            p1Screen.x, p1Screen.y,
            p2Screen.x, p2Screen.y,
            `Spacing: ${spacing.toFixed(3)} mm (center-to-center)`,
            -40
        );
    }
    
    // Draw pillar radius
    if (pillars.length > 0) {
        const pillar = pillars[0];
        const pillarScreen = {
            x: pillar.x * scale + offsetX,
            y: pillar.y * scale + offsetY
        };
        const pillarRadiusScaled = pillarRadiusValue * scale;
        
        drawRadiusLine(
            ctx,
            pillarScreen.x,
            pillarScreen.y,
            pillarRadiusScaled,
            `Pillar r=${pillarRadiusValue.toFixed(3)} mm`,
            -45
        );
    }
    
    // Draw hole radius
    if (holes.length > 0) {
        const hole = holes[0];
        const holeScreen = {
            x: hole.x * scale + offsetX,
            y: hole.y * scale + offsetY
        };
        const holeRadiusScaled = holeRadiusValue * scale;
        
        drawRadiusLine(
            ctx,
            holeScreen.x,
            holeScreen.y,
            holeRadiusScaled,
            `Hole r=${holeRadiusValue.toFixed(3)} mm`,
            135
        );
    }
    
    const innerWidth = bounds.maxX - bounds.minX;
    const innerHeight = bounds.maxY - bounds.minY;
    
    const floorLeftX = bounds.minX * scale + offsetX;
    const floorTopY = bounds.minY * scale + offsetY;
    const wtScaled = wt * scale;
    const paddingXScaled = Math.abs(floorPaddingX * scale);
    const paddingYScaled = Math.abs(floorPaddingY * scale);
    
    // Draw padding Y
    if (Math.abs(floorPaddingY) > 0.001) {
        drawBracket(
            ctx,
            floorLeftX - wtScaled - 35,
            floorTopY,
            floorLeftX - wtScaled - 35,
            floorTopY + paddingYScaled,
            `Pad Y: ${Math.abs(floorPaddingY).toFixed(3)} mm`
        );
    }
    
    // Draw padding X
    if (Math.abs(floorPaddingX) > 0.001) {
        drawBracket(
            ctx,
            floorLeftX,
            floorTopY - wtScaled - 35,
            floorLeftX + paddingXScaled,
            floorTopY - wtScaled - 35,
            `Pad X: ${Math.abs(floorPaddingX).toFixed(3)} mm`
        );
    }
    
    // Draw wall thickness
    if (wt > 0) {
        drawBracket(
            ctx,
            floorLeftX - wtScaled,
            floorTopY + innerHeight * scale / 2,
            floorLeftX,
            floorTopY + innerHeight * scale / 2,
            `Wall: ${wt.toFixed(2)} mm`
        );
    }
}

// Helper: Draw dimension line with arrows
function drawDimensionLine(ctx, x1, y1, x2, y2, label, offset = 20) {
    ctx.save();
    ctx.strokeStyle = '#e74c3c';
    ctx.fillStyle = '#e74c3c';
    ctx.lineWidth = 1.5;
    
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const perpX = -dy / length * offset;
    const perpY = dx / length * offset;
    
    const startX = x1 + perpX;
    const startY = y1 + perpY;
    const endX = x2 + perpX;
    const endY = y2 + perpY;
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    const capSize = 8;
    ctx.beginPath();
    ctx.moveTo(startX - perpY/Math.abs(offset) * capSize, startY + perpX/Math.abs(offset) * capSize);
    ctx.lineTo(startX + perpY/Math.abs(offset) * capSize, startY - perpX/Math.abs(offset) * capSize);
    ctx.moveTo(endX - perpY/Math.abs(offset) * capSize, endY + perpX/Math.abs(offset) * capSize);
    ctx.lineTo(endX + perpY/Math.abs(offset) * capSize, endY - perpX/Math.abs(offset) * capSize);
    ctx.stroke();
    
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(startX, startY);
    ctx.moveTo(x2, y2);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const metrics = ctx.measureText(label);
    const padding = 4;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(midX - metrics.width/2 - padding, midY - 8, metrics.width + padding*2, 16);
    
    ctx.fillStyle = '#e74c3c';
    ctx.fillText(label, midX, midY);
    
    ctx.restore();
}

// Helper: Draw radius line
function drawRadiusLine(ctx, centerX, centerY, radius, label, angle = 45) {
    ctx.save();
    ctx.strokeStyle = '#e74c3c';
    ctx.fillStyle = '#e74c3c';
    ctx.lineWidth = 1.5;
    
    const rad = angle * Math.PI / 180;
    const endX = centerX + Math.cos(rad) * radius;
    const endY = centerY + Math.sin(rad) * radius;
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
    ctx.fill();
    
    const labelX = centerX + Math.cos(rad) * (radius + 20);
    const labelY = centerY + Math.sin(rad) * (radius + 20);
    
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const metrics = ctx.measureText(label);
    const padding = 4;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(labelX - metrics.width/2 - padding, labelY - 8, metrics.width + padding*2, 16);
    
    ctx.fillStyle = '#e74c3c';
    ctx.fillText(label, labelX, labelY);
    
    ctx.restore();
}

// Helper: Draw bracket
function drawBracket(ctx, x1, y1, x2, y2, label) {
    ctx.save();
    ctx.strokeStyle = '#9b59b6';
    ctx.fillStyle = '#9b59b6';
    ctx.lineWidth = 1.5;
    
    const isHorizontal = Math.abs(y2 - y1) < Math.abs(x2 - x1);
    const bracketSize = 10;
    
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
    
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const metrics = ctx.measureText(label);
    const padding = 4;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(midX - metrics.width/2 - padding, midY - 8, metrics.width + padding*2, 16);
    
    ctx.fillStyle = '#9b59b6';
    ctx.fillText(label, midX, midY);
    
    ctx.restore();
}

// Draw side view SVG
function drawSideView() {
    const floorThickness = parseFloat(params.floorThickness.value);
    const pillarHeight = parseFloat(params.pillarHeight.value);
    const totalHeight = floorThickness + pillarHeight;
    
    const svgWidth = 380;
    const svgHeight = 360;
    
    // Dynamic scale to fit content within viewport
    const maxHeightForContent = svgHeight - 60;
    const scale = maxHeightForContent / totalHeight;
    
    const scaledTotalHeight = totalHeight * scale;
    const baseY = svgHeight / 2 + scaledTotalHeight / 2;
    const floorWidth = 140;
    const pillarWidth = 50;
    const leftMargin = 60;
    
    const svg = `
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
    
    document.getElementById('sideView').innerHTML = svg;
    
    // Store for export
    window.lastSideViewSVG = svg;
}

// Update statistics display
function updateStats(data) {
    const { pillars, holes, bounds } = data;
    const innerWidth = bounds.maxX - bounds.minX;
    const innerHeight = bounds.maxY - bounds.minY;
    const wt = parseFloat(params.wallThickness.value);
    const totalWidth = innerWidth + 2 * wt;
    const totalHeight = innerHeight + 2 * wt;
    const totalHeightZ = parseFloat(params.floorThickness.value) + parseFloat(params.pillarHeight.value);
    const density = pillars.length / (innerWidth * innerHeight);
    
    document.getElementById('statPillars').textContent = pillars.length;
    document.getElementById('statHoles').textContent = holes.length;
    document.getElementById('statDims').textContent = `${innerWidth.toFixed(2)} × ${innerHeight.toFixed(2)} mm`;
    document.getElementById('statTotal').textContent = `${totalWidth.toFixed(2)} × ${totalHeight.toFixed(2)} mm`;
    document.getElementById('statDensity').textContent = `${density.toFixed(2)} pillars/mm²`;
    document.getElementById('statHeight').textContent = `${totalHeightZ.toFixed(2)} mm`;
}