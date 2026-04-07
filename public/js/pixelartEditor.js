// --- Controlador Principal del Editor de Pixel Art (pixelartEditor.js) ---
// PropÃ³sito: Orquestar todos los mÃ³dulos del editor de pixel art.

import * as pixelArtCanvas from './modules/pixelart/pixelArtCanvas.js';
import * as pixelArtTools from './modules/pixelart/pixelArtTools.js';
import * as pixelArtPalette from './modules/pixelart/pixelArtPalette.js';
import * as pixelArtHistory from './modules/pixelart/pixelArtHistory.js';
import * as pixelArtExport from './modules/pixelart/pixelArtExport.js';
import * as pixelArtGrid from './modules/pixelart/pixelArtGrid.js';
import * as pixelArtProject from './modules/pixelart/pixelArtProject.js';
import * as pixelArtFrames from './modules/pixelart/pixelArtFrames.js';
import * as uiManager from './modules/uiManager.js';

// Estado global del editor de pixel art
const pixelArtState = {
    // Canvas y contexto
    canvas: null,
    ctx: null,
    gridCanvas: null,
    gridCtx: null,
    previewCanvas: null,
    previewCtx: null,
    
    frames: pixelArtFrames,

    // ConfiguraciÃ³n del lienzo - CORREGIDO: cambio de 32x32 a 64x64
    canvasWidth: 64,
    canvasHeight: 64,
    pixelSize: 12, // Zoom level
    showGrid: true,
    
    // Herramientas y estado de dibujo
    selectedTool: 'brush',
    brushSize: 1,
    selectedColor: '#000000',
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    
    // Paleta de colores
    colorPalette: [],
    currentPalettePreset: 'default',
    
    // Proyecto actual
    currentProject: null,
    isProjectModified: false,
    
    // Referencias a mÃ³dulos (correctas)
    canvasModule: pixelArtCanvas,
    tools: pixelArtTools,
    palette: pixelArtPalette,
    history: pixelArtHistory,
    export: pixelArtExport,
    grid: pixelArtGrid,
    project: pixelArtProject,
    ui: uiManager
};

// --- FunciÃ³n de InicializaciÃ³n Principal ---
function init() {
    console.log('Pixel Art Editor iniciando...');

    // Validar elementos esenciales del DOM - SIN tools-grid
    const essentialElements = [
        'pixel-canvas', 'grid-overlay', 'preview-canvas',
        'color-palette', 'current-color'
    ];
    
    const missingElement = essentialElements.find(id => !document.getElementById(id));
    if (missingElement) {
        console.error(`Elemento crÃ­tico no encontrado: ${missingElement}`);
        uiManager.showMessage('error', 'Error de inicializaciÃ³n del editor.');
        return;
    }

    // Inicializar canvas y contextos
    initCanvases();
    
    // Inicializar mÃ³dulos en orden especÃ­fico
    try {
        pixelArtCanvas.init(pixelArtState);
        pixelArtGrid.init(pixelArtState);
        pixelArtPalette.init(pixelArtState);
        pixelArtTools.init(pixelArtState);
        pixelArtHistory.init(pixelArtState);
        pixelArtExport.init(pixelArtState);
        pixelArtFrames.init(pixelArtState);
        
        // Solo inicializar proyectos si el usuario estÃ¡ registrado
        if (document.getElementById('save-project-btn')) {
            pixelArtProject.init(pixelArtState);
        } else {
            // Ocultar funciones de proyecto para usuarios sin login
            hideProjectFeatures();
        }
        
        // Configurar event listeners globales
        setupGlobalEventListeners();
        
        // Dibujar estado inicial
        drawInitialState();
        
        console.log('Pixel Art Editor inicializado correctamente.');
        uiManager.showMessage('success', 'Editor de pixel art listo para usar.');
        
    } catch (error) {
        console.error('Error durante la inicializaciÃ³n:', error);
        uiManager.showMessage('error', 'Error al inicializar el editor.');
    }
}

function hideProjectFeatures() {
    // Ocultar elementos relacionados con proyectos para usuarios no logueados
    const projectElements = [
        'save-project-btn',
        'new-project-btn', 
        'project-name',
        'projects-list'
    ];
    
    projectElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'none';
        }
    });
    
    // Ocultar secciones completas si existen
    const projectSections = document.querySelectorAll('.project-section, .projects-panel');
    projectSections.forEach(section => {
        section.style.display = 'none';
    });
}

function initCanvases() {
    // Canvas principal
    pixelArtState.canvas = document.getElementById('pixel-canvas');
    pixelArtState.ctx = pixelArtState.canvas.getContext('2d');
    
    // Canvas del grid
    pixelArtState.gridCanvas = document.getElementById('grid-overlay');
    pixelArtState.gridCtx = pixelArtState.gridCanvas.getContext('2d');
    
    // Canvas de preview
    pixelArtState.previewCanvas = document.getElementById('preview-canvas');
    pixelArtState.previewCtx = pixelArtState.previewCanvas.getContext('2d');
    
    // Configurar propiedades de renderizado y willReadFrequently
    [pixelArtState.ctx, pixelArtState.gridCtx, pixelArtState.previewCtx].forEach(ctx => {
        ctx.imageSmoothingEnabled = false;
        ctx.webkitImageSmoothingEnabled = false;
        ctx.mozImageSmoothingEnabled = false;
        ctx.msImageSmoothingEnabled = false;
        ctx.willReadFrequently = true; // Para evitar warning de performance
    });
}

function setupGlobalEventListeners() {
    // Controles de zoom
    document.getElementById('zoom-in')?.addEventListener('click', () => {
        pixelArtCanvas.zoomIn();
        updateZoomDisplay();
    });
    
    document.getElementById('zoom-out')?.addEventListener('click', () => {
        pixelArtCanvas.zoomOut();
        updateZoomDisplay();
    });
    
    // Undo/Redo
    document.getElementById('undo-btn')?.addEventListener('click', () => {
        pixelArtHistory.undo();
    });
    
    document.getElementById('redo-btn')?.addEventListener('click', () => {
        pixelArtHistory.redo();
    });
    
    // Limpiar canvas
    document.getElementById('clear-canvas-btn')?.addEventListener('click', () => {
        if (confirm('Â¿EstÃ¡s seguro de que quieres limpiar el lienzo?')) {
            pixelArtCanvas.clearCanvas();
            pixelArtHistory.saveState();
        }
    });
    
    // Redimensionar canvas
    document.getElementById('resize-canvas-btn')?.addEventListener('click', () => {
        const width = parseInt(document.getElementById('canvas-width').value);
        const height = parseInt(document.getElementById('canvas-height').value);
        
        if (width && height && width > 0 && height > 0) {
            resizeCanvas(width, height);
        } else {
            uiManager.showMessage('error', 'Dimensiones invÃ¡lidas.');
        }
    });

    // Aplicar tamaÃ±o del canvas
    document.getElementById('apply-size-btn')?.addEventListener('click', () => {
        const width = parseInt(document.getElementById('canvas-width').value);
        const height = parseInt(document.getElementById('canvas-height').value);
        
        if (width && height && width > 0 && height > 0) {
            resizeCanvas(width, height);
        } else {
            uiManager.showMessage('error', 'Dimensiones invÃ¡lidas.');
        }
    });
    
    // Toggle grid
    document.getElementById('show-grid')?.addEventListener('change', (e) => {
        pixelArtState.showGrid = e.target.checked;
        pixelArtGrid.toggleGrid(pixelArtState.showGrid);
    });
    
    // Exportar PNG
    document.getElementById('export-png-btn')?.addEventListener('click', () => {
        pixelArtExport.exportAsPNG();
    });
    
    // Exportar a editor de sprites
    document.getElementById('export-to-sprites-btn')?.addEventListener('click', () => {
        exportToSpritesEditor();
    });

    // Nuevo proyecto
    document.getElementById('new-project-btn')?.addEventListener('click', () => {
        if (confirm('Â¿EstÃ¡s seguro? Se perderÃ¡n los cambios no guardados.')) {
            startNewProject();
        }
    });
    
    // Atajos de teclado
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Prevenir menÃº contextual en el canvas
    pixelArtState.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

function handleKeyboardShortcuts(e) {
    // Solo procesar si no estamos en un input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    switch (e.key.toLowerCase()) {
        case 'b':
            pixelArtTools.selectTool('brush');
            break;
        case 'e':
            pixelArtTools.selectTool('eraser');
            break;
        case 'g':
            pixelArtTools.selectTool('bucket');
            break;
        case 'i':
            pixelArtTools.selectTool('eyedropper');
            break;
        case 'l':
            pixelArtTools.selectTool('line');
            break;
        case 'r':
            pixelArtTools.selectTool('rectangle');
            break;
        case 'z':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                if (e.shiftKey) {
                    pixelArtHistory.redo();
                } else {
                    pixelArtHistory.undo();
                }
            }
            break;
        case '+':
        case '=':
            e.preventDefault();
            pixelArtCanvas.zoomIn();
            updateZoomDisplay();
            break;
        case '-':
            e.preventDefault();
            pixelArtCanvas.zoomOut();
            updateZoomDisplay();
            break;
    }
}

function drawInitialState() {
    // Crear canvas inicial - CORREGIDO: usar 64x64
    pixelArtCanvas.createCanvas(pixelArtState.canvasWidth, pixelArtState.canvasHeight);
    
    // Inicializar paleta por defecto
    pixelArtPalette.loadPreset('default');
    
    // Dibujar grid inicial
    pixelArtGrid.drawGrid();
    
    // Actualizar preview
    pixelArtCanvas.updatePreview();
    
    // Actualizar displays
    updateCanvasDimensionsDisplay();
    updateZoomDisplay();
    
    // Guardar estado inicial en el historial
    pixelArtHistory.saveState();
}

function resizeCanvas(newWidth, newHeight) {
    // Validar lÃ­mites basados en el tipo de usuario
    const isLoggedIn = document.getElementById('save-project-btn') !== null;
    const maxSize = isLoggedIn ? 256 : 64;
    
    if (newWidth > maxSize || newHeight > maxSize) {
        uiManager.showMessage('error', `TamaÃ±o mÃ¡ximo permitido: ${maxSize}x${maxSize}px`);
        return;
    }
    
    if (newWidth < 8 || newHeight < 8) {
        uiManager.showMessage('error', 'TamaÃ±o mÃ­nimo: 8x8px');
        return;
    }
    
    // Preguntar si quiere mantener el contenido actual
    const keepContent = confirm('Â¿Quieres mantener el contenido actual del lienzo?');
    
    if (keepContent) {
        pixelArtCanvas.resizeCanvas(newWidth, newHeight, true);
    } else {
        pixelArtCanvas.createCanvas(newWidth, newHeight);
    }
    
    // Actualizar estado
    pixelArtState.canvasWidth = newWidth;
    pixelArtState.canvasHeight = newHeight;
    
    // Redibujar elementos
    pixelArtGrid.drawGrid();
    pixelArtCanvas.updatePreview();
    updateCanvasDimensionsDisplay();
    
    // Guardar en historial
    pixelArtHistory.saveState();
    
    uiManager.showMessage('success', `Lienzo redimensionado a ${newWidth}x${newHeight}px`);
}

function startNewProject() {
    // Limpiar canvas
    pixelArtCanvas.clearCanvas();
    
    // Resetear configuraciones
    pixelArtTools.selectTool('brush');
    pixelArtTools.setBrushSize(1);
    pixelArtPalette.setSelectedColor('#000000');
    
    // Limpiar historial
    pixelArtHistory.clearHistory();
    pixelArtHistory.saveState();
    
    // Limpiar nombre del proyecto si existe
    const projectNameInput = document.getElementById('project-name');
    if (projectNameInput) {
        projectNameInput.value = '';
    }
    
    uiManager.showMessage('info', 'Nuevo proyecto iniciado.');
}

function exportToSpritesEditor() {
    // Exportar la imagen actual y redirigir al editor de sprites
    const imageData = pixelArtExport.getImageDataURL();
    
    // Guardar en sessionStorage para el editor de sprites
    sessionStorage.setItem('pixelart_export', JSON.stringify({
        imageData: imageData,
        width: pixelArtState.canvasWidth,
        height: pixelArtState.canvasHeight,
        timestamp: Date.now()
    }));
    
    // Redirigir al editor de sprites
    window.location.href = '/editor?from=pixelart';
}

function updateCanvasDimensionsDisplay() {
    const display = document.getElementById('canvas-dimensions');
    const widthInput = document.getElementById('canvas-width');
    const heightInput = document.getElementById('canvas-height');
    
    if (display) {
        display.textContent = `${pixelArtState.canvasWidth}x${pixelArtState.canvasHeight}`;
    }
    if (widthInput) widthInput.value = pixelArtState.canvasWidth;
    if (heightInput) heightInput.value = pixelArtState.canvasHeight;
}

function updateZoomDisplay() {
    const zoomLevel = document.getElementById('zoom-level');
    const currentZoom = document.getElementById('current-zoom');
    const percentage = Math.round((pixelArtState.pixelSize / 12) * 100);
    
    if (zoomLevel) zoomLevel.textContent = `${percentage}%`;
    if (currentZoom) currentZoom.textContent = `${percentage}%`;
}

// Funciones pÃºblicas para acceso desde mÃ³dulos
window.pixelArtState = pixelArtState;

// FunciÃ³n para marcar proyecto como modificado
window.markProjectAsModified = function() {
    pixelArtState.isProjectModified = true;
    // Actualizar UI si es necesario
    const saveBtn = document.getElementById('save-project-btn');
    if (saveBtn && !saveBtn.textContent.includes('*')) {
        saveBtn.textContent += ' *';
    }
};

// Inicializar cuando el DOM estÃ© listo
document.addEventListener('DOMContentLoaded', init);