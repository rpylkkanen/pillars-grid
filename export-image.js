// Export the visible preview exactly as shown (canvas + side view)
// Export the visible preview (canvas + side view) exactly as shown on screen
async function exportImage() {
    const status = document.getElementById('status');
    const container = document.querySelector('.canvas-container');
    if (!container) {
        status.textContent = 'Preview not found';
        return;
    }

    status.textContent = 'Exporting image...';

    try {
        // Load html2canvas dynamically if not already loaded
        if (typeof html2canvas === 'undefined') {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        // Use html2canvas to capture exactly what’s shown
        const canvas = await html2canvas(container, {
            backgroundColor: '#ffffff', // white background
            scale: window.devicePixelRatio || 1,
            useCORS: true
        });

        // Export the rasterized result
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pillar_grid_preview_${timestamp}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });

        status.textContent = 'Image exported';
        setTimeout(() => (status.textContent = ''), 3000);
    } catch (err) {
        console.error(err);
        status.textContent = 'Export failed: ' + err.message;
        setTimeout(() => (status.textContent = ''), 5000);
    }
}