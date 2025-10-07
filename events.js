// Setup all event listeners

function setupEventListeners() {
    // Dual input synchronization
    dualPairs.forEach(([slider, number]) => {
        const sliderEl = params[slider];
        const numberEl = params[number];
        
        sliderEl.addEventListener('input', () => {
            const val = sliderEl.value;
            numberEl.value = val;
            const valueSpan = document.getElementById(slider + 'Value');
            if (valueSpan) valueSpan.textContent = val;
            
            if ((slider === 'floorPaddingX' || slider === 'floorPaddingY') && params.linkPadding.checked) {
                const otherSlider = slider === 'floorPaddingX' ? 'floorPaddingY' : 'floorPaddingX';
                const otherNumber = number.replace('X', 'Y').replace('Y', slider === 'floorPaddingX' ? 'Y' : 'X');
                params[otherSlider].value = val;
                params[otherNumber].value = val;
                const otherSpan = document.getElementById(otherSlider + 'Value');
                if (otherSpan) otherSpan.textContent = val;
            }
            
            debouncedUpdate();
        });
        
        numberEl.addEventListener('input', () => {
            const val = numberEl.value;
            sliderEl.value = val;
            const valueSpan = document.getElementById(slider + 'Value');
            if (valueSpan) valueSpan.textContent = val;
            
            if ((number === 'floorPaddingXNum' || number === 'floorPaddingYNum') && params.linkPadding.checked) {
                const otherSlider = slider === 'floorPaddingX' ? 'floorPaddingY' : 'floorPaddingX';
                const otherNumber = number.replace('X', 'Y').replace('Y', number === 'floorPaddingXNum' ? 'Y' : 'X');
                params[otherSlider].value = val;
                params[otherNumber].value = val;
                const otherSpan = document.getElementById(otherSlider + 'Value');
                if (otherSpan) otherSpan.textContent = val;
            }
            
            debouncedUpdate();
        });
    });
    
    // Range value display updates
    Object.entries(params).forEach(([key, input]) => {
        if (input.type === 'range' && !key.endsWith('Num')) {
            const valueSpan = document.getElementById(key + 'Value');
            if (valueSpan) {
                input.addEventListener('input', () => {
                    valueSpan.textContent = input.value;
                });
            }
        }
    });
    
    // Layout type change
    params.layoutType.addEventListener('change', () => {
        const isOrganic = params.layoutType.value === 'organic';
        document.getElementById('organicControls').style.display = isOrganic ? 'block' : 'none';
        debouncedUpdate();
    });
    
    // Other inputs
    params.seed.addEventListener('change', debouncedUpdate);
    params.linkPadding.addEventListener('change', debouncedUpdate);
    
    // Width lock
    document.getElementById('lockWidth').addEventListener('click', () => {
        const targetWidth = parseFloat(document.getElementById('targetWidth').value);
        if (isNaN(targetWidth) || !window.lastPreviewData) return;
        
        widthLocked = !widthLocked;
        document.getElementById('lockWidth').textContent = widthLocked ? 'Unlock Width' : 'Lock Width';
        document.getElementById('lockWidth').style.background = widthLocked ? '#e74c3c' : '#4a90e2';
        
        if (widthLocked) {
            const { pillars, holes } = window.lastPreviewData;
            const allPositions = [...pillars, ...holes];
            const xValues = allPositions.map(p => p.x);
            const rawWidth = Math.max(...xValues) - Math.min(...xValues);
            const requiredPaddingX = (targetWidth - rawWidth) / 2;
            
            params.floorPaddingX.value = requiredPaddingX.toFixed(5);
            params.floorPaddingXNum.value = requiredPaddingX.toFixed(5);
            document.getElementById('floorPaddingXValue').textContent = requiredPaddingX.toFixed(5);
            debouncedUpdate();
        }
    });
    
    // Height lock
    document.getElementById('lockHeight').addEventListener('click', () => {
        const targetHeight = parseFloat(document.getElementById('targetHeight').value);
        if (isNaN(targetHeight) || !window.lastPreviewData) return;
        
        heightLocked = !heightLocked;
        document.getElementById('lockHeight').textContent = heightLocked ? 'Unlock Height' : 'Lock Height';
        document.getElementById('lockHeight').style.background = heightLocked ? '#e74c3c' : '#4a90e2';
        
        if (heightLocked) {
            const { pillars, holes } = window.lastPreviewData;
            const allPositions = [...pillars, ...holes];
            const yValues = allPositions.map(p => p.y);
            const rawHeight = Math.max(...yValues) - Math.min(...yValues);
            const requiredPaddingY = (targetHeight - rawHeight) / 2;
            
            params.floorPaddingY.value = requiredPaddingY.toFixed(5);
            params.floorPaddingYNum.value = requiredPaddingY.toFixed(5);
            document.getElementById('floorPaddingYValue').textContent = requiredPaddingY.toFixed(5);
            debouncedUpdate();
        }
    });
    
    // Zoom control
    const zoomSlider = document.getElementById('zoomSlider');
    const zoomValue = document.getElementById('zoomValue');
    zoomSlider.addEventListener('input', () => {
        previewZoom = parseFloat(zoomSlider.value);
        zoomValue.textContent = Math.round(previewZoom * 100) + '%';
        if (window.lastPreviewData) {
            drawPreview(window.lastPreviewData);
        }
    });
    
    // Measurements toggle
    const measurementsToggle = document.getElementById('showMeasurements');
    measurementsToggle.addEventListener('change', () => {
        showMeasurements = measurementsToggle.checked;
        document.getElementById('sideView').style.display = showMeasurements ? 'block' : 'none';
        if (window.lastPreviewData) {
            drawPreview(window.lastPreviewData);
            if (showMeasurements) {
                drawSideView();
            }
        }
    });
    
    // Generate STL button
    document.getElementById('generateBtn').addEventListener('click', async () => {
        const btn = document.getElementById('generateBtn');
        const status = document.getElementById('status');
        
        btn.disabled = true;
        
        const startTime = Date.now();
        const timer = setInterval(() => {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            status.textContent = `Generating... ${elapsed}s`;
        }, 100);
        
        const data = {
            layout_type: params.layoutType.value,
            rows: parseInt(params.rows.value),
            cols: parseInt(params.cols.value),
            spacing: parseFloat(params.spacing.value),
            pillar_radius: parseFloat(params.pillarRadius.value),
            pillar_height: parseFloat(params.pillarHeight.value),
            hole_radius: parseFloat(params.holeRadius.value),
            floor_thickness: parseFloat(params.floorThickness.value),
            floor_padding_x: parseFloat(params.floorPaddingX.value),
            floor_padding_y: parseFloat(params.floorPaddingY.value),
            wall_thickness: parseFloat(params.wallThickness.value),
            hole_probability: parseFloat(params.holeProb.value),
            jitter: parseFloat(params.jitter.value),
            seed: parseInt(params.seed.value)
        };
        
        try {
            const response = await fetch(`${API_URL}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            clearInterval(timer);
            
            const genTime = response.headers.get('X-Generation-Time');
            const dims = response.headers.get('X-Dimensions');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pillar_grid_${params.layoutType.value}.stl`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            status.textContent = `Generated in ${genTime}s (${dims})`;
            
            setTimeout(() => {
                status.textContent = '';
            }, 5000);
            
        } catch (error) {
            clearInterval(timer);
            status.textContent = `Error: ${error.message}`;
            console.error('Generation error:', error);
        } finally {
            btn.disabled = false;
        }
    });
    
    // Export buttons
    document.getElementById('exportParamsBtn').addEventListener('click', exportParameters);
    document.getElementById('exportImageBtn').addEventListener('click', exportImage);
    
    // Load parameters
    document.getElementById('loadParamsInput').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        loadParameters(file);
        event.target.value = '';
    });
}

// Debounced update function
function debouncedUpdate() {
    pendingUpdate = true;
    
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    
    debounceTimer = setTimeout(() => {
        if (!isUpdating && pendingUpdate) {
            updatePreview();
        }
    }, 10);
}

// Update preview from API
async function updatePreview() {
    if (isUpdating) {
        pendingUpdate = true;
        return;
    }
    
    isUpdating = true;
    pendingUpdate = false;
    
    const data = {
        layout_type: params.layoutType.value,
        rows: parseInt(params.rows.value),
        cols: parseInt(params.cols.value),
        spacing: parseFloat(params.spacing.value),
        floor_padding_x: parseFloat(params.floorPaddingX.value),
        floor_padding_y: parseFloat(params.floorPaddingY.value),
        hole_probability: parseFloat(params.holeProb.value),
        jitter: parseFloat(params.jitter.value),
        seed: parseInt(params.seed.value)
    };
    
    try {
        const response = await fetch(`${API_URL}/preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        window.lastPreviewData = result;
        
        let paddingChanged = false;
        
        if (widthLocked) {
            const targetWidth = parseFloat(document.getElementById('targetWidth').value);
            if (!isNaN(targetWidth)) {
                const { pillars, holes } = result;
                const allPositions = [...pillars, ...holes];
                const xValues = allPositions.map(p => p.x);
                const rawWidth = Math.max(...xValues) - Math.min(...xValues);
                const requiredPaddingX = (targetWidth - rawWidth) / 2;
                
                params.floorPaddingX.value = requiredPaddingX.toFixed(5);
                params.floorPaddingXNum.value = requiredPaddingX.toFixed(5);
                document.getElementById('floorPaddingXValue').textContent = requiredPaddingX.toFixed(5);
                paddingChanged = true;
            }
        }
        
        if (heightLocked) {
            const targetHeight = parseFloat(document.getElementById('targetHeight').value);
            if (!isNaN(targetHeight)) {
                const { pillars, holes } = result;
                const allPositions = [...pillars, ...holes];
                const yValues = allPositions.map(p => p.y);
                const rawHeight = Math.max(...yValues) - Math.min(...yValues);
                const requiredPaddingY = (targetHeight - rawHeight) / 2;
                
                params.floorPaddingY.value = requiredPaddingY.toFixed(5);
                params.floorPaddingYNum.value = requiredPaddingY.toFixed(5);
                document.getElementById('floorPaddingYValue').textContent = requiredPaddingY.toFixed(5);
                paddingChanged = true;
            }
        }
        
        if (paddingChanged) {
            const newData = {
                layout_type: params.layoutType.value,
                rows: parseInt(params.rows.value),
                cols: parseInt(params.cols.value),
                spacing: parseFloat(params.spacing.value),
                floor_padding_x: parseFloat(params.floorPaddingX.value),
                floor_padding_y: parseFloat(params.floorPaddingY.value),
                hole_probability: parseFloat(params.holeProb.value),
                jitter: parseFloat(params.jitter.value),
                seed: parseInt(params.seed.value)
            };
            
            const newResponse = await fetch(`${API_URL}/preview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newData)
            });
            
            const updatedResult = await newResponse.json();
            window.lastPreviewData = updatedResult;
            drawPreview(updatedResult);
            updateStats(updatedResult);
        } else {
            drawPreview(result);
            updateStats(result);
        }
        
        if (showMeasurements) {
            drawSideView();
        }
    } catch (error) {
        console.error('Preview error:', error);
    } finally {
        isUpdating = false;
        
        if (pendingUpdate) {
            setTimeout(() => updatePreview(), 10);
        }
    }
}