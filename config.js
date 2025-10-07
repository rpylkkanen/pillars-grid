// API Configuration
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : window.location.origin;

// Canvas setup
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Global state
let debounceTimer = null;
let isUpdating = false;
let pendingUpdate = false;
let previewZoom = 0.85;
let widthLocked = false;
let heightLocked = false;
let showMeasurements = false;

// Parameter elements
const params = {
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
    linkPadding: document.getElementById('linkPadding'),
    wallThickness: document.getElementById('wallThickness'),
    wallThicknessNum: document.getElementById('wallThicknessNum'),
    jitter: document.getElementById('jitter'),
    jitterNum: document.getElementById('jitterNum'),
    holeProb: document.getElementById('holeProb'),
    holeProbNum: document.getElementById('holeProbNum'),
    seed: document.getElementById('seed')
};

// Dual input pairs for slider/number synchronization
const dualPairs = [
    ['rows', 'rowsNum'], ['cols', 'colsNum'], ['spacing', 'spacingNum'],
    ['pillarRadius', 'pillarRadiusNum'], ['pillarHeight', 'pillarHeightNum'],
    ['holeRadius', 'holeRadiusNum'], ['floorThickness', 'floorThicknessNum'],
    ['floorPaddingX', 'floorPaddingXNum'], ['floorPaddingY', 'floorPaddingYNum'],
    ['wallThickness', 'wallThicknessNum'], ['jitter', 'jitterNum'], ['holeProb', 'holeProbNum']
];