// --- Módulo: Gestión de Historial (pixelArtHistory.js) ---
// Propósito: Manejar undo/redo y historial de cambios en el canvas.

let state = null;
let history = [];
let currentStep = -1;
const maxHistorySteps = 50;

export function init(pixelArtState) {
    state = pixelArtState;
    history = [];
    currentStep = -1;
    updateUndoRedoButtons();
}

export function saveState() {
    // Obtener datos actuales del canvas usando el contexto directamente
    state.ctx.willReadFrequently = true;
const imageData = state.ctx.getImageData(0, 0, state.canvasWidth, state.canvasHeight);
    
    // Si estamos en el medio del historial, eliminar pasos futuros
    if (currentStep < history.length - 1) {
        history = history.slice(0, currentStep + 1);
    }
    
    // Añadir nuevo estado
    history.push({
        imageData: imageData,
        timestamp: Date.now(),
        canvasWidth: state.canvasWidth,
        canvasHeight: state.canvasHeight
    });
    
    // Mantener límite de historial
    if (history.length > maxHistorySteps) {
        history.shift();
    } else {
        currentStep++;
    }
    
    updateUndoRedoButtons();
}

export function undo() {
    if (currentStep > 0) {
        currentStep--;
        restoreState(history[currentStep]);
        updateUndoRedoButtons();
        state.ui.showMessage('info', 'Cambio deshecho');
    }
}

export function redo() {
    if (currentStep < history.length - 1) {
        currentStep++;
        restoreState(history[currentStep]);
        updateUndoRedoButtons();
        state.ui.showMessage('info', 'Cambio rehecho');
    }
}

function restoreState(historyState) {
    if (!historyState) return;
    
    // Verificar si el tamaño del canvas cambió
    if (historyState.canvasWidth !== state.canvasWidth || 
        historyState.canvasHeight !== state.canvasHeight) {
        
        // Redimensionar canvas si es necesario usando el módulo correspondiente
        state.canvasModule.createCanvas(historyState.canvasWidth, historyState.canvasHeight);
        state.canvasWidth = historyState.canvasWidth;
        state.canvasHeight = historyState.canvasHeight;
        
        // Actualizar displays
        const widthInput = document.getElementById('canvas-width');
        const heightInput = document.getElementById('canvas-height');
        if (widthInput) widthInput.value = historyState.canvasWidth;
        if (heightInput) heightInput.value = historyState.canvasHeight;
        
        // Redibujar grid
        state.grid.drawGrid();
    }
    
    // Restaurar imagen usando el contexto directamente
    state.ctx.putImageData(historyState.imageData, 0, 0);
    
    // Actualizar preview usando el módulo correspondiente
    state.canvasModule.updatePreview();
    
    // Marcar proyecto como modificado
    if (window.markProjectAsModified) {
        window.markProjectAsModified();
    }
}

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    
    if (undoBtn) {
        undoBtn.disabled = currentStep <= 0;
        undoBtn.classList.toggle('opacity-50', currentStep <= 0);
    }
    
    if (redoBtn) {
        redoBtn.disabled = currentStep >= history.length - 1;
        redoBtn.classList.toggle('opacity-50', currentStep >= history.length - 1);
    }
}

export function clearHistory() {
    history = [];
    currentStep = -1;
    updateUndoRedoButtons();
}

export function getHistoryInfo() {
    return {
        totalSteps: history.length,
        currentStep: currentStep,
        canUndo: currentStep > 0,
        canRedo: currentStep < history.length - 1
    };
}