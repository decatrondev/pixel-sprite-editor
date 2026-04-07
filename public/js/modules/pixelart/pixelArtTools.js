// --- Módulo: Herramientas de Dibujo (pixelArtTools.js) ---
// Propósito: Gestionar todas las herramientas de dibujo del editor.

let state = null;
let tempImageData = null; // Para preview de líneas y formas
let startX = 0, startY = 0; // Para herramientas que requieren start/end

export function init(pixelArtState) {
    state = pixelArtState;
    setupToolEvents();
    setupSizeEvents();
}

function setupToolEvents() {
    // CORREGIDO: Buscar botones de herramientas por ID específico
    const toolButtons = [
        { id: 'brush-tool', tool: 'brush' },
        { id: 'eraser-tool', tool: 'eraser' },
        { id: 'bucket-tool', tool: 'bucket' },
        { id: 'eyedropper-tool', tool: 'eyedropper' }
    ];
    
    toolButtons.forEach(({ id, tool }) => {
        const button = document.getElementById(id);
        if (button) {
            button.dataset.tool = tool;
            button.addEventListener('click', () => selectTool(tool));
        }
    });
    
    // También buscar por data-tool para compatibilidad
    const dataToolButtons = document.querySelectorAll('[data-tool]');
    dataToolButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tool = button.dataset.tool;
            selectTool(tool);
        });
    });
}

function setupSizeEvents() {
    const sizeButtons = document.querySelectorAll('.size-btn');
    sizeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const size = parseInt(button.dataset.size);
            setBrushSize(size);
        });
    });
}

export function selectTool(toolName) {
    state.selectedTool = toolName;
    
    // Actualizar UI - remover active de todos los botones
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Agregar active al botón seleccionado
    const selectedButton = document.querySelector(`[data-tool="${toolName}"]`) || 
                           document.getElementById(`${toolName}-tool`);
    if (selectedButton) {
        selectedButton.classList.add('active');
    }
    
    // Cambiar cursor del canvas según la herramienta
    updateCanvasCursor(toolName);
    
    // Mensaje informativo
    const toolNames = {
        brush: 'Pincel',
        eraser: 'Goma de borrar',
        bucket: 'Balde de relleno',
        eyedropper: 'Cuentagotas',
        line: 'Línea',
        rectangle: 'Rectángulo'
    };
    
    if (state.ui && state.ui.showMessage) {
        state.ui.showMessage('info', `Herramienta seleccionada: ${toolNames[toolName]}`);
    }
}

export function setBrushSize(size) {
    state.brushSize = size;
    
    // Actualizar UI
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const selectedButton = document.querySelector(`[data-size="${size}"]`);
    if (selectedButton) {
        selectedButton.classList.add('active');
    }
}

function updateCanvasCursor(tool) {
    const canvas = state.canvas;
    if (!canvas) return;
    
    switch (tool) {
        case 'brush':
            canvas.style.cursor = 'crosshair';
            break;
        case 'eraser':
            canvas.style.cursor = 'crosshair';
            break;
        case 'bucket':
            canvas.style.cursor = 'crosshair';
            break;
        case 'eyedropper':
            canvas.style.cursor = 'crosshair';
            break;
        case 'line':
        case 'rectangle':
            canvas.style.cursor = 'crosshair';
            break;
        default:
            canvas.style.cursor = 'default';
    }
}

export function executeToolAction(x, y, action) {
    switch (state.selectedTool) {
        case 'brush':
            handleBrush(x, y, action);
            break;
        case 'eraser':
            handleEraser(x, y, action);
            break;
        case 'bucket':
            if (action === 'start') handleBucket(x, y);
            break;
        case 'eyedropper':
            if (action === 'start') handleEyedropper(x, y);
            break;
        case 'line':
            handleLine(x, y, action);
            break;
        case 'rectangle':
            handleRectangle(x, y, action);
            break;
    }
}

function handleBrush(x, y, action) {
    if (action === 'start' || action === 'draw') {
        drawBrush(x, y, state.selectedColor);
    }
}

function handleEraser(x, y, action) {
    if (action === 'start' || action === 'draw') {
        // Comprobar si el fondo es transparente
        const isTransparent = state.frames && state.frames.isTransparentBackground && 
                              state.frames.isTransparentBackground();
        
        if (isTransparent) {
            // Para fondo transparente, limpiar píxeles
            eraseToTransparent(x, y);
        } else {
            // Para fondo blanco, dibujar en blanco
            drawBrush(x, y, '#FFFFFF');
        }
    }
}

function handleBucket(x, y) {
    const targetColor = getPixel(x, y);
    if (targetColor && targetColor !== state.selectedColor) {
        fillArea(x, y, targetColor, state.selectedColor);
        updatePreview();
    }
}

function handleEyedropper(x, y) {
    const color = getPixel(x, y);
    if (color) {
        state.selectedColor = color;
        state.palette.setSelectedColor(color);
        if (state.ui && state.ui.showMessage) {
            state.ui.showMessage('success', `Color seleccionado: ${color}`);
        }
    }
}

function handleLine(x, y, action) {
    switch (action) {
        case 'start':
            startX = x;
            startY = y;
            tempImageData = getCanvasImageData();
            break;
        case 'draw':
            if (tempImageData) {
                putCanvasImageData(tempImageData);
                drawLine(startX, startY, x, y, state.selectedColor);
            }
            break;
        case 'end':
            if (tempImageData) {
                putCanvasImageData(tempImageData);
                drawLine(startX, startY, x, y, state.selectedColor);
                tempImageData = null;
            }
            break;
    }
}

function handleRectangle(x, y, action) {
    switch (action) {
        case 'start':
            startX = x;
            startY = y;
            tempImageData = getCanvasImageData();
            break;
        case 'draw':
            if (tempImageData) {
                putCanvasImageData(tempImageData);
                drawRectangle(startX, startY, x, y, state.selectedColor, false);
            }
            break;
        case 'end':
            if (tempImageData) {
                putCanvasImageData(tempImageData);
                const filled = window.event && window.event.shiftKey;
                drawRectangle(startX, startY, x, y, state.selectedColor, filled);
                tempImageData = null;
            }
            break;
    }
}

function drawBrush(x, y, color) {
    const size = state.brushSize;
    
    if (size === 1) {
        setPixel(x, y, color);
    } else {
        const radius = Math.floor(size / 2);
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                if (size === 2 || (dx * dx + dy * dy <= radius * radius)) {
                    setPixel(x + dx, y + dy, color);
                }
            }
        }
    }
    
    updatePreview();
}

function eraseToTransparent(x, y) {
    const size = state.brushSize;
    
    if (size === 1) {
        clearPixel(x, y);
    } else {
        const radius = Math.floor(size / 2);
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                if (size === 2 || (dx * dx + dy * dy <= radius * radius)) {
                    clearPixel(x + dx, y + dy);
                }
            }
        }
    }
    
    updatePreview();
}

function clearPixel(x, y) {
    if (x < 0 || x >= state.canvasWidth || y < 0 || y >= state.canvasHeight) return;
    
    // Limpiar píxel (hacerlo transparente)
    state.ctx.clearRect(x, y, 1, 1);
}

function setPixel(x, y, color) {
    if (x < 0 || x >= state.canvasWidth || y < 0 || y >= state.canvasHeight) return;
    state.ctx.fillStyle = color;
    state.ctx.fillRect(x, y, 1, 1);
}

function getPixel(x, y) {
    if (x < 0 || x >= state.canvasWidth || y < 0 || y >= state.canvasHeight) {
        return null;
    }
    
    const imageData = state.ctx.getImageData(x, y, 1, 1);
    const data = imageData.data;
    
    // Verificar si es transparente
    if (data[3] === 0) {
        return 'transparent';
    }
    
    // Convertir RGBA a hex
    const r = data[0].toString(16).padStart(2, '0');
    const g = data[1].toString(16).padStart(2, '0');
    const b = data[2].toString(16).padStart(2, '0');
    
    return `#${r}${g}${b}`;
}

function fillArea(startX, startY, targetColor, replacementColor) {
    if (targetColor === replacementColor) return;
    
    const imageData = state.ctx.getImageData(0, 0, state.canvasWidth, state.canvasHeight);
    const data = imageData.data;
    
    // Manejar transparente
    let targetRGB = null;
    if (targetColor === 'transparent') {
        targetRGB = { r: 0, g: 0, b: 0, a: 0 };
    } else {
        targetRGB = hexToRgb(targetColor);
        if (targetRGB) targetRGB.a = 255;
    }
    
    const replacementRGB = hexToRgb(replacementColor);
    if (!targetRGB || !replacementRGB) return;
    
    replacementRGB.a = 255;
    
    const stack = [[startX, startY]];
    const visited = new Set();
    
    while (stack.length > 0) {
        const [x, y] = stack.pop();
        const key = `${x},${y}`;
        
        if (visited.has(key) || x < 0 || x >= state.canvasWidth || y < 0 || y >= state.canvasHeight) {
            continue;
        }
        
        const index = (y * state.canvasWidth + x) * 4;
        const currentR = data[index];
        const currentG = data[index + 1];
        const currentB = data[index + 2];
        const currentA = data[index + 3];
        
        // Comparar con color objetivo
        if (targetColor === 'transparent') {
            if (currentA !== 0) continue;
        } else {
            if (currentR !== targetRGB.r || currentG !== targetRGB.g || currentB !== targetRGB.b) {
                continue;
            }
        }
        
        visited.add(key);
        
        // Cambiar el color del pixel
        data[index] = replacementRGB.r;
        data[index + 1] = replacementRGB.g;
        data[index + 2] = replacementRGB.b;
        data[index + 3] = replacementRGB.a;
        
        // Agregar píxeles adyacentes al stack
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    
    state.ctx.putImageData(imageData, 0, 0);
}

function drawLine(x0, y0, x1, y1, color) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    
    let x = x0;
    let y = y0;
    
    while (true) {
        setPixel(x, y, color);
        
        if (x === x1 && y === y1) break;
        
        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x += sx;
        }
        if (e2 < dx) {
            err += dx;
            y += sy;
        }
    }
}

function drawRectangle(x0, y0, x1, y1, color, filled = false) {
    const startX = Math.min(x0, x1);
    const startY = Math.min(y0, y1);
    const endX = Math.max(x0, x1);
    const endY = Math.max(y0, y1);
    
    if (filled) {
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                setPixel(x, y, color);
            }
        }
    } else {
        for (let x = startX; x <= endX; x++) {
            setPixel(x, startY, color);
            setPixel(x, endY, color);
        }
        for (let y = startY; y <= endY; y++) {
            setPixel(startX, y, color);
            setPixel(endX, y, color);
        }
    }
}

function getCanvasImageData() {
    return state.ctx.getImageData(0, 0, state.canvasWidth, state.canvasHeight);
}

function putCanvasImageData(imageData) {
    state.ctx.putImageData(imageData, 0, 0);
}

function updatePreview() {
    if (state.previewCtx && state.previewCanvas && state.canvas) {
        state.previewCtx.clearRect(0, 0, state.previewCanvas.width, state.previewCanvas.height);
        state.previewCtx.drawImage(state.canvas, 0, 0);
    }
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// Funciones públicas adicionales
export function getCurrentTool() {
    return state.selectedTool;
}

export function getBrushSize() {
    return state.brushSize;
}

export function setColor(color) {
    state.selectedColor = color;
}