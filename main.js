// Main initialization

// Setup canvas resizing
resizeCanvas();
new ResizeObserver(resizeCanvas).observe(canvas.parentElement);

// Setup all event listeners
setupEventListeners();

// Show organic controls if needed
if (params.layoutType.value === 'organic') {
    document.getElementById('organicControls').style.display = 'block';
}

// Initial preview
updatePreview();