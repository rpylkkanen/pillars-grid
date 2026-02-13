// ============================================================================
// UI CONTROLLER - Coordinates all modules
// ============================================================================

const UIController = {
    // DOM references
    canvas: null,
    ctx: null,
    elements: {},
    
    // Update management
    updateTimer: null,
    isUpdating: false,
    updateRequestId: 0,
    pendingUpdate: false,
    
    /**
     * Initialize the application
     */
    init() {
        this._setupDOM();
        this._setupCanvas();
        this._bindEvents();
        this._syncUIFromState();
        this.scheduleUpdate();
    },
    
    /**
     * Schedule a preview update (debounced)
     */
    scheduleUpdate() {
        clearTimeout(this.updateTimer);
        this.updateTimer = setTimeout(() => this.update(), 0);
    },
    
    /**
     * Main update cycle
     */
    async update() {
        // If already updating, mark that we need another update and return
        if (this.isUpdating) {
            this.pendingUpdate = true;
            this._showPreviewLoading();
            return;
        }
        
        this.isUpdating = true;
        this.pendingUpdate = false;
        this._showPreviewLoading();
        const currentRequestId = ++this.updateRequestId;
        
        try {
            this._applyDimensionLocks();
            
            const apiParams = State.getAPIParameters();
            const data = await API.fetchPreview(apiParams);
            
            if (currentRequestId !== this.updateRequestId) {
                return;
            }
            
            State.setPreviewData(data);
            
            const needsSecondFetch = this._adjustForLocks(data);
            
            if (needsSecondFetch) {
                const newApiParams = State.getAPIParameters();
                const newData = await API.fetchPreview(newApiParams);
                
                if (currentRequestId !== this.updateRequestId) {
                    return;
                }
                
                State.setPreviewData(newData);
            }
            
            this._render();
            this._updateStats();
            
        } catch (error) {
            if (currentRequestId === this.updateRequestId) {
                console.error('Update error:', error);
                this._showStatus(`Error: ${error.message}`, 'error');
            }
        } finally {
            this.isUpdating = false;
            
            // If changes happened while updating, trigger another update
            if (this.pendingUpdate) {
                this.pendingUpdate = false;
                setTimeout(() => this.update(), 50);
            } else {
                this._hidePreviewLoading();
            }
        }
    },
    
    /**
     * Generate and download STL
     */
    async generateSTL() {
        const btn = this.elements.generateBtn;
        btn.disabled = true;
        
        const startTime = Date.now();
        const timer = setInterval(() => {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            this._showStatus(`Generating... ${elapsed}s`);
        }, 100);
        
        try {
            const apiParams = State.getAPIParameters();
            const { blob, metadata } = await API.generateSTL(apiParams);
            
            clearInterval(timer);
            
            Exporter.downloadSTL(blob, State.parameters.layoutType);
            
            this._showStatus(
                `Generated in ${metadata.time}s (${metadata.dimensions})`,
                'success'
            );
            
            setTimeout(() => this._showStatus(''), 5000);
            
        } catch (error) {
            clearInterval(timer);
            this._showStatus(`Error: ${error.message}`, 'error');
            console.error('Generation error:', error);
        } finally {
            btn.disabled = false;
        }
    },
    
    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================
    
    _setupDOM() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.elements = {
            // Input elements
            layoutType: document.getElementById('layoutType'),
            rows: document.getElementById('rows'),
            rowsNum: document.getElementById('rowsNum'),
            cols: document.getElementById('cols'),
            colsNum: document.getElementById('colsNum'),
            spacing: document.getElementById('spacing'),
            spacingNum: document.getElementById('spacingNum'),
            pillarRadius: document.getElementById('pillarRadius'),
            pillarRadiusNum: document.getElementById('pillarRadiusNum'),
            pillarHeight: document.getElementById('pillarHeight'),
            pillarHeightNum: document.getElementById('pillarHeightNum'),
            holeRadius: document.getElementById('holeRadius'),
            holeRadiusNum: document.getElementById('holeRadiusNum'),
            floorThickness: document.getElementById('floorThickness'),
            floorThicknessNum: document.getElementById('floorThicknessNum'),
            floorPaddingX: document.getElementById('floorPaddingX'),
            floorPaddingXNum: document.getElementById('floorPaddingXNum'),
            floorPaddingY: document.getElementById('floorPaddingY'),
            floorPaddingYNum: document.getElementById('floorPaddingYNum'),
            wallThickness: document.getElementById('wallThickness'),
            wallThicknessNum: document.getElementById('wallThicknessNum'),
            jitter: document.getElementById('jitter'),
            jitterNum: document.getElementById('jitterNum'),
            holeProb: document.getElementById('holeProb'),
            holeProbNum: document.getElementById('holeProbNum'),
            seed: document.getElementById('seed'),
            linkPadding: document.getElementById('linkPadding'),
            lloydIterations: document.getElementById('lloydIterations'),
            lloydIterationsNum: document.getElementById('lloydIterationsNum'),
            holeProbVoronoi: document.getElementById('holeProbVoronoi'),
            holeProbVoronoiNum: document.getElementById('holeProbVoronoiNum'),
            seedVoronoi: document.getElementById('seedVoronoi'),
            voronoiControls: document.getElementById('voronoiControls'),

            // UI controls
            zoomSlider: document.getElementById('zoomSlider'),
            showMeasurements: document.getElementById('showMeasurements'),
            lockWidth: document.getElementById('lockWidth'),
            lockHeight: document.getElementById('lockHeight'),
            targetWidth: document.getElementById('targetWidth'),
            targetHeight: document.getElementById('targetHeight'),
            
            // Buttons
            generateBtn: document.getElementById('generateBtn'),
            exportParamsBtn: document.getElementById('exportParamsBtn'),
            exportImageBtn: document.getElementById('exportImageBtn'),
            loadParamsInput: document.getElementById('loadParamsInput'),
            
            // Display
            status: document.getElementById('status'),
            sideView: document.getElementById('sideView'),
            organicControls: document.getElementById('organicControls')
        };
    },
    
    _setupCanvas() {
        this._resizeCanvas();
        
        const resizeObserver = new ResizeObserver(() => {
            this._resizeCanvas();
        });
        resizeObserver.observe(this.canvas.parentElement);
    },
    
    _resizeCanvas() {
        const container = this.canvas.parentElement;
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = container.clientWidth * dpr;
        this.canvas.height = container.clientHeight * dpr;
        
        this.canvas.style.width = container.clientWidth + 'px';
        this.canvas.style.height = container.clientHeight + 'px';
        
        this.ctx.scale(dpr, dpr);
        
        if (State.previewData) {
            this._render();
        }
    },
    
    _bindEvents() {
        // Parameter dual inputs (slider + number)
        const dualPairs = [
            ['rows', 'rowsNum'], 
            ['cols', 'colsNum'], 
            ['spacing', 'spacingNum'],
            ['pillarRadius', 'pillarRadiusNum'], 
            ['pillarHeight', 'pillarHeightNum'],
            ['holeRadius', 'holeRadiusNum'], 
            ['floorThickness', 'floorThicknessNum'],
            ['floorPaddingX', 'floorPaddingXNum'], 
            ['floorPaddingY', 'floorPaddingYNum'],
            ['wallThickness', 'wallThicknessNum'], 
            ['jitter', 'jitterNum'], 
            ['holeProb', 'holeProbNum'],
            ['lloydIterations', 'lloydIterationsNum'],
            ['holeProbVoronoi', 'holeProbVoronoiNum']
        ];
        
        dualPairs.forEach(([sliderKey, numberKey]) => {
            const slider = this.elements[sliderKey];
            const number = this.elements[numberKey];
            const paramKey = this._getParamKey(sliderKey);
            
            slider.addEventListener('input', (e) => {
                const value = this._parseValue(paramKey, e.target.value);
                State.setParameter(paramKey, value);
                number.value = e.target.value;
                this._updateValueDisplay(sliderKey, e.target.value);
                this._handleLinkedPadding(paramKey, value);
                this.scheduleUpdate();
            });
            
            number.addEventListener('input', (e) => {
                const value = this._parseValue(paramKey, e.target.value);
                State.setParameter(paramKey, value);
                slider.value = e.target.value;
                this._updateValueDisplay(sliderKey, e.target.value);
                this._handleLinkedPadding(paramKey, value);
                this.scheduleUpdate();
            });
        });
        
        // Layout type
        this.elements.layoutType.addEventListener('change', (e) => {
            State.setParameter('layoutType', e.target.value);
            this._toggleOrganicControls();
            this.scheduleUpdate();
        });
        
        // Seed
        this.elements.seed.addEventListener('change', (e) => {
            State.setParameter('seed', parseInt(e.target.value));
            this.scheduleUpdate();
        });

        // Voronoi seed
        this.elements.seedVoronoi.addEventListener('change', (e) => {
            State.setParameter('seed', parseInt(e.target.value));
            this.scheduleUpdate();
        });
        
        // Link padding checkbox
        this.elements.linkPadding.addEventListener('change', (e) => {
            State.setUIState('linkPadding', e.target.checked);
        });
        
        // Zoom control
        this.elements.zoomSlider.addEventListener('input', (e) => {
            State.setUIState('zoom', parseFloat(e.target.value));
            document.getElementById('zoomValue').textContent = 
                Math.round(State.ui.zoom * 100) + '%';
            this._render();
        });
        
        // Measurements toggle
        this.elements.showMeasurements.addEventListener('change', (e) => {
            State.setUIState('showMeasurements', e.target.checked);
            this.elements.sideView.style.display = e.target.checked ? 'block' : 'none';
            this._render();
        });
        
        // Dimension locks
        this.elements.lockWidth.addEventListener('click', () => {
            const target = parseFloat(this.elements.targetWidth.value);
            if (!isNaN(target) && State.previewData) {
                State.toggleLock('width', target);
                this._updateLockButton('width');
                this.scheduleUpdate();
            }
        });
        
        this.elements.lockHeight.addEventListener('click', () => {
            const target = parseFloat(this.elements.targetHeight.value);
            if (!isNaN(target) && State.previewData) {
                State.toggleLock('height', target);
                this._updateLockButton('height');
                this.scheduleUpdate();
            }
        });
        
        // Generate STL
        this.elements.generateBtn.addEventListener('click', () => {
            this.generateSTL();
        });
        
        // Export buttons
        this.elements.exportParamsBtn.addEventListener('click', () => {
            Exporter.exportParameters(State.parameters, State.previewData);
            this._showStatus('Parameters exported', 'success');
            setTimeout(() => this._showStatus(''), 3000);
        });
        
        this.elements.exportImageBtn.addEventListener('click', async () => {
            try {
                this._showStatus('Exporting image...');
                const container = document.querySelector('.canvas-container');
                await Exporter.exportImage(container);
                this._showStatus('Image exported', 'success');
                setTimeout(() => this._showStatus(''), 3000);
            } catch (error) {
                this._showStatus(`Export failed: ${error.message}`, 'error');
                setTimeout(() => this._showStatus(''), 5000);
            }
        });
        
        // Load parameters
        this.elements.loadParamsInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const params = await Exporter.loadParameters(file);
                State.setParameters(params);
                this._syncUIFromState();
                this._toggleOrganicControls();
                this.scheduleUpdate();
                this._showStatus('Parameters loaded', 'success');
                setTimeout(() => this._showStatus(''), 3000);
            } catch (error) {
                this._showStatus(`Load error: ${error.message}`, 'error');
                console.error('Load error:', error);
            }
            
            e.target.value = '';
        });
    },
    
    _render() {
        if (!State.previewData) return;
        
        const container = this.canvas.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        Renderer.drawPreview(
            this.ctx,
            width,
            height,
            State.previewData,
            {
                zoom: State.ui.zoom,
                showMeasurements: State.ui.showMeasurements,
                parameters: State.parameters
            }
        );
        
        if (State.ui.showMeasurements) {
            const svg = Renderer.generateSideViewSVG(State.parameters);
            this.elements.sideView.innerHTML = svg;
        }
    },
    
    _applyDimensionLocks() {
        // This sets initial padding values before fetch
        // The real adjustment happens in _adjustForLocks after we get data
    },
    
    _adjustForLocks(data) {
        let changed = false;
        
        if (State.isLocked('width')) {
            const target = State.getLockTarget('width');
            const xValues = [...data.pillars, ...data.holes].map(p => p.x);
            const rawWidth = Math.max(...xValues) - Math.min(...xValues);
            const requiredPadding = (target - rawWidth) / 2;
            
            if (Math.abs(State.parameters.floorPaddingX - requiredPadding) > 0.00001) {
                State.setParameter('floorPaddingX', requiredPadding);
                this._syncPaddingUI('floorPaddingX', requiredPadding);
                changed = true;
            }
        }
        
        if (State.isLocked('height')) {
            const target = State.getLockTarget('height');
            const yValues = [...data.pillars, ...data.holes].map(p => p.y);
            const rawHeight = Math.max(...yValues) - Math.min(...yValues);
            const requiredPadding = (target - rawHeight) / 2;
            
            if (Math.abs(State.parameters.floorPaddingY - requiredPadding) > 0.00001) {
                State.setParameter('floorPaddingY', requiredPadding);
                this._syncPaddingUI('floorPaddingY', requiredPadding);
                changed = true;
            }
        }
        
        return changed;
    },
    
    _updateStats() {
        const stats = State.getStatistics();
        if (!stats) return;
        
        document.getElementById('statPillars').textContent = stats.pillarCount;
        document.getElementById('statHoles').textContent = stats.holeCount;
        document.getElementById('statDims').textContent = 
            `${stats.innerDimensions.width.toFixed(2)} × ${stats.innerDimensions.height.toFixed(2)} mm`;
        document.getElementById('statTotal').textContent = 
            `${stats.totalDimensions.width.toFixed(2)} × ${stats.totalDimensions.height.toFixed(2)} mm`;
        document.getElementById('statDensity').textContent = 
            `${stats.density.toFixed(2)} pillars/mm²`;
        document.getElementById('statHeight').textContent = 
            `${stats.totalHeightZ.toFixed(2)} mm`;
    },
    
    _syncUIFromState() {
        // Sync all UI elements from State
        Object.entries(State.parameters).forEach(([key, value]) => {
            const elementKey = this._getElementKey(key);
            const element = this.elements[elementKey];
            const numberElement = this.elements[elementKey + 'Num'];
            
            if (element) {
                element.value = value;
                if (numberElement) numberElement.value = value;
                this._updateValueDisplay(elementKey, value);
            }
        });
        
        this.elements.zoomSlider.value = State.ui.zoom;
        document.getElementById('zoomValue').textContent = 
            Math.round(State.ui.zoom * 100) + '%';
        
        this.elements.showMeasurements.checked = State.ui.showMeasurements;
        this.elements.linkPadding.checked = State.ui.linkPadding;
    },
    
    _syncPaddingUI(param, value) {
        const elementKey = this._getElementKey(param);
        this.elements[elementKey].value = value.toFixed(5);
        this.elements[elementKey + 'Num'].value = value.toFixed(5);
        this._updateValueDisplay(elementKey, value.toFixed(5));
    },
    
    _handleLinkedPadding(paramKey, value) {
        if (!State.ui.linkPadding) return;
        
        if (paramKey === 'floorPaddingX') {
            State.setParameter('floorPaddingY', value);
            this._syncPaddingUI('floorPaddingY', value);
        } else if (paramKey === 'floorPaddingY') {
            State.setParameter('floorPaddingX', value);
            this._syncPaddingUI('floorPaddingX', value);
        }
    },
    
    _toggleOrganicControls() {
        const layoutType = State.parameters.layoutType;
        const isOrganic = layoutType === 'organic';
        const isVoronoi = layoutType === 'voronoi';
        
        this.elements.organicControls.style.display = isOrganic ? 'block' : 'none';
        this.elements.voronoiControls.style.display = isVoronoi ? 'block' : 'none';
        
        // Sync shared parameters between organic and voronoi
        if (isVoronoi) {
            this.elements.holeProbVoronoi.value = State.parameters.holeProb;
            this.elements.holeProbVoronoiNum.value = State.parameters.holeProb;
            this.elements.seedVoronoi.value = State.parameters.seed;
            this._updateValueDisplay('holeProbVoronoi', State.parameters.holeProb);
        }
    },
    
    _updateLockButton(dimension) {
        const button = this.elements[dimension === 'width' ? 'lockWidth' : 'lockHeight'];
        const isLocked = State.isLocked(dimension);
        
        button.textContent = isLocked ? `Unlock ${dimension === 'width' ? 'Width' : 'Height'}` : 
            `Lock ${dimension === 'width' ? 'Width' : 'Height'}`;
        button.style.background = isLocked ? '#e74c3c' : '#4a90e2';
    },
    
    _updateValueDisplay(elementKey, value) {
        const valueSpan = document.getElementById(elementKey + 'Value');
        if (valueSpan) valueSpan.textContent = value;
    },
    
    _showStatus(message, type = '') {
        this.elements.status.textContent = message;
        this.elements.status.className = 'generation-status ' + type;
    },
    
    _showPreviewLoading() {
        this._showStatus('⟳ Updating preview...', 'loading');
    },
    
    _hidePreviewLoading() {
        if (this.elements.status && this.elements.status.classList.contains('loading')) {
            this._showStatus('', '');
        }
    },
    
    _getParamKey(elementKey) {
        // Convert element key to parameter key (camelCase)
        const map = {
            'rows': 'rows',
            'cols': 'cols',
            'spacing': 'spacing',
            'pillarRadius': 'pillarRadius',
            'pillarHeight': 'pillarHeight',
            'holeRadius': 'holeRadius',
            'floorThickness': 'floorThickness',
            'floorPaddingX': 'floorPaddingX',
            'floorPaddingY': 'floorPaddingY',
            'wallThickness': 'wallThickness',
            'jitter': 'jitter',
            'holeProb': 'holeProb',
            'lloydIterations': 'lloydIterations',
            'holeProbVoronoi': 'holeProb'
        };
        return map[elementKey] || elementKey;
    },
    
    _getElementKey(paramKey) {
        // Same mapping, just for clarity
        return paramKey;
    },
    
    _parseValue(paramKey, value) {
        if (['rows', 'cols', 'seed', 'lloydIterations'].includes(paramKey)) {
            return parseInt(value);
        }
        return parseFloat(value);
    }
};