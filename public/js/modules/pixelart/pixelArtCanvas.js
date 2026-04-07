// --- MÃ³dulo: GestiÃ³n del Canvas de Pixel Art (pixelArtCanvas.js) ---
// PropÃ³sito: Manejar el canvas principal, zoom, y renderizado.

let state = null;

export function init(pixelArtState) {
    state = pixelArtState;
    setupCanvasEvents();
}

function setupCanvasEvents() {
    const canvas = state.canvas;
    
    // Mouse events para dibujar
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    
    // Touch events para dispositivos mÃ³viles (marcados como pasivos)
    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('touchmove', handleTouch, { passive: false });
    canvas.addEventListener('touchend', stopDrawing, { passive: true });
}

function startDrawing(e) {
    state.isDrawing = true;
    
    // CORREGIDO: mejorar cálculo de posición considerando scroll
    const coords = getCanvasCoordinates(e);
    
    state.lastX = coords.x;
    state.lastY = coords.y;
    
    // Ejecutar herramienta seleccionada
    state.tools.executeToolAction(coords.x, coords.y, 'start');
}

function draw(e) {
    if (!state.isDrawing) return;
    
    // CORREGIDO: mejorar cálculo de posición considerando scroll
    const coords = getCanvasCoordinates(e);
    
    // Solo dibujar si la posiciÃ³n cambiÃ³
    if (coords.x !== state.lastX || coords.y !== state.lastY) {
        state.tools.executeToolAction(coords.x, coords.y, 'draw');
        state.lastX = coords.x;
        state.lastY = coords.y;
    }
}

function stopDrawing() {
    if (state.isDrawing) {
        state.isDrawing = false;
        state.tools.executeToolAction(state.lastX, state.lastY, 'end');
        
        // Guardar estado en historial
        state.history.saveState();
        
        // Marcar proyecto como modificado
        if (window.markProjectAsModified) {
            window.markProjectAsModified();
        }
        
        // Actualizar preview
        updatePreview();
    }
}

// NUEVO: función mejorada para obtener coordenadas del canvas
function getCanvasCoordinates(e) {
    const canvas = state.canvas;
    const rect = canvas.getBoundingClientRect();
    const container = document.getElementById('canvas-container');
    
    // Obtener posición del mouse/touch relativa al viewport
    let clientX = e.clientX;
    let clientY = e.clientY;
    
    // Si es un evento de touch, usar las coordenadas del primer touch
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    }
    
    // CORREGIDO: calcular posición considerando scroll del container
    const scrollLeft = container ? container.scrollLeft : 0;
    const scrollTop = container ? container.scrollTop : 0;
    
    // Posición relativa al canvas considerando el scroll
    const x = Math.floor((clientX - rect.left + scrollLeft) / state.pixelSize);
    const y = Math.floor((clientY - rect.top + scrollTop) / state.pixelSize);
    
    // Asegurar que las coordenadas estén dentro de los límites
    return {
        x: Math.max(0, Math.min(x, state.canvasWidth - 1)),
        y: Math.max(0, Math.min(y, state.canvasHeight - 1))
    };
}

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    if (touch) {
        // CORREGIDO: usar la nueva función getCanvasCoordinates
        const coords = getCanvasCoordinates(e);
        
        const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                         e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        
        // Agregar coordenadas calculadas al evento
        mouseEvent.canvasX = coords.x;
        mouseEvent.canvasY = coords.y;
        
        state.canvas.dispatchEvent(mouseEvent);
    }
}

export function createCanvas(width, height) {
    state.canvasWidth = width;
    state.canvasHeight = height;
    
    // Configurar tamaÃ±o del canvas principal
    state.canvas.width = width;
    state.canvas.height = height;
    
    // Configurar tamaÃ±o visual con zoom
    const displayWidth = width * state.pixelSize;
    const displayHeight = height * state.pixelSize;
    
    state.canvas.style.width = displayWidth + 'px';
    state.canvas.style.height = displayHeight + 'px';
    
    // Configurar canvas del grid
    state.gridCanvas.width = width;
    state.gridCanvas.height = height;
    state.gridCanvas.style.width = displayWidth + 'px';
    state.gridCanvas.style.height = displayHeight + 'px';
    
    // CORREGIDO: configurar canvas de preview con mejor tamaño
    state.previewCanvas.width = width;
    state.previewCanvas.height = height;
    const previewSize = Math.max(width * 4, 128); // Más grande y proporcional
    state.previewCanvas.style.width = previewSize + 'px';
    state.previewCanvas.style.height = previewSize + 'px';
    
    // Limpiar canvas (transparente por defecto)
    clearCanvas();
    
    // Redibujar grid
    state.grid.drawGrid();
    
    // CORREGIDO: ajustar scroll del container si es necesario
    adjustCanvasContainer();
}

// NUEVO: función para ajustar el contenedor del canvas
function adjustCanvasContainer() {
    const container = document.getElementById('canvas-container');
    if (!container) return;
    
    // Calcular si necesitamos scroll
    const displayWidth = state.canvasWidth * state.pixelSize;
    const displayHeight = state.canvasHeight * state.pixelSize;
    
    // Ajustar el contenedor para permitir scroll cuando sea necesario
    if (displayWidth > container.clientWidth || displayHeight > container.clientHeight) {
        container.style.overflow = 'auto';
    } else {
        container.style.overflow = 'hidden';
    }
}

export function resizeCanvas(newWidth, newHeight, keepContent = false) {
    let imageData = null;
    
    if (keepContent) {
        // Guardar contenido actual
        imageData = state.ctx.getImageData(0, 0, state.canvasWidth, state.canvasHeight);
    }
    
    // Crear nuevo canvas
    createCanvas(newWidth, newHeight);
    
    if (keepContent && imageData) {
        // Restaurar contenido en la nueva posiciÃ³n
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = imageData.width;
        tempCanvas.height = imageData.height;
        tempCtx.putImageData(imageData, 0, 0);
        
        // Dibujar el contenido anterior en el nuevo canvas
        state.ctx.drawImage(tempCanvas, 0, 0);
    }
    
    // NUEVO: Redimensionar frames tambiÃ©n
    if (state.frames && state.frames.resizeFrames) {
        state.frames.resizeFrames(newWidth, newHeight);
    }
    
    updatePreview();
}

// CORREGIDO: clearCanvas ahora respeta la transparencia
export function clearCanvas() {
    // Siempre limpiar haciendo transparente
    state.ctx.clearRect(0, 0, state.canvasWidth, state.canvasHeight);
    updatePreview();
}

export function setPixel(x, y, color) {
    if (x < 0 || x >= state.canvasWidth || y < 0 || y >= state.canvasHeight) return;
    
    state.ctx.fillStyle = color;
    state.ctx.fillRect(x, y, 1, 1);
}

export function getPixel(x, y) {
    if (x < 0 || x >= state.canvasWidth || y < 0 || y >= state.canvasHeight) {
        return null;
    }
    
    const imageData = state.ctx.getImageData(x, y, 1, 1);
    const data = imageData.data;
    
    // Si es transparente, devolver null o un color especial
    if (data[3] === 0) {
        return 'transparent';
    }
    
    // Convertir RGBA a hex
    const r = data[0].toString(16).padStart(2, '0');
    const g = data[1].toString(16).padStart(2, '0');
    const b = data[2].toString(16).padStart(2, '0');
    
    return `#${r}${g}${b}`;
}

export function fillArea(startX, startY, targetColor, replacementColor) {
    if (targetColor === replacementColor) return;
    
    const imageData = state.ctx.getImageData(0, 0, state.canvasWidth, state.canvasHeight);
    const data = imageData.data;
    
    // Manejar transparencia
    let targetRGB;
    if (targetColor === 'transparent') {
        targetRGB = { r: 0, g: 0, b: 0, a: 0 };
    } else {
        targetRGB = hexToRgb(targetColor);
        targetRGB.a = 255;
    }
    
    const replacementRGB = hexToRgb(replacementColor);
    
    if (!targetRGB || !replacementRGB) return;
    
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
        
        // Comparar incluyendo alpha
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
        data[index + 3] = 255; // Alpha
        
        // Agregar pÃ­xeles adyacentes al stack
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    
    state.ctx.putImageData(imageData, 0, 0);
}

export function drawLine(x0, y0, x1, y1, color) {
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

export function drawRectangle(x0, y0, x1, y1, color, filled = false) {
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
        // Dibujar bordes
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

export function zoomIn() {
    if (state.pixelSize < 24) {
        state.pixelSize += 2;
        updateCanvasSize();
    }
}

export function zoomOut() {
    if (state.pixelSize > 4) {
        state.pixelSize -= 2;
        updateCanvasSize();
    }
}

function updateCanvasSize() {
    const displayWidth = state.canvasWidth * state.pixelSize;
    const displayHeight = state.canvasHeight * state.pixelSize;
    
    state.canvas.style.width = displayWidth + 'px';
    state.canvas.style.height = displayHeight + 'px';
    
    state.gridCanvas.style.width = displayWidth + 'px';
    state.gridCanvas.style.height = displayHeight + 'px';
    
    // Redibujar grid con nuevo tamaÃ±o
    state.grid.drawGrid();
    
    // CORREGIDO: ajustar container después del zoom
    adjustCanvasContainer();
}

export function updatePreview() {
    const previewCtx = state.previewCtx;
    previewCtx.clearRect(0, 0, state.previewCanvas.width, state.previewCanvas.height);
    
    // Copiar contenido del canvas principal al preview
    previewCtx.drawImage(state.canvas, 0, 0);
}

export function getCanvasDataURL() {
    return state.canvas.toDataURL('image/png');
}

export function getCanvasImageData() {
    return state.ctx.getImageData(0, 0, state.canvasWidth, state.canvasHeight);
}

export function putCanvasImageData(imageData) {
    state.ctx.putImageData(imageData, 0, 0);
    updatePreview();
}

// Funciones auxiliares
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}