// --- Módulo: Gestión de Grid (pixelArtGrid.js) ---
// Propósito: Manejar el grid de píxeles y guías visuales.

let state = null;

export function init(pixelArtState) {
    state = pixelArtState;
}

export function drawGrid() {
    if (!state.showGrid || !state.gridCtx) return;
    
    const gridCtx = state.gridCtx;
    const width = state.canvasWidth;
    const height = state.canvasHeight;
    
    // Limpiar canvas del grid
    gridCtx.clearRect(0, 0, width, height);
    
    // Configurar estilo del grid
    gridCtx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    gridCtx.lineWidth = 0.5;
    
    // Dibujar líneas verticales
    for (let x = 0; x <= width; x++) {
        gridCtx.beginPath();
        gridCtx.moveTo(x, 0);
        gridCtx.lineTo(x, height);
        gridCtx.stroke();
    }
    
    // Dibujar líneas horizontales
    for (let y = 0; y <= height; y++) {
        gridCtx.beginPath();
        gridCtx.moveTo(0, y);
        gridCtx.lineTo(width, y);
        gridCtx.stroke();
    }
}

export function toggleGrid(show) {
    state.showGrid = show;
    
    if (show) {
        drawGrid();
        state.gridCanvas.style.display = 'block';
    } else {
        state.gridCanvas.style.display = 'none';
    }
}