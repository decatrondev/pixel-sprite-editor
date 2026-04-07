// --- Módulo: Gestor del Canvas (canvasManager.js) ---
// Propósito: Controlar todo lo que se dibuja en el canvas principal.

let editorState = null;
let canvas = null;
let ctx = null;

export function init(state) {
    editorState = state;
    canvas = document.getElementById('editor-canvas');
    
    if (!canvas) {
        console.error("Error crítico: El elemento <canvas id='editor-canvas'> no se pudo encontrar.");
        return;
    }
    
    ctx = canvas.getContext('2d');
    setupEventListeners();
}

function setupEventListeners() {
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('contextmenu', handleCanvasRightClick); // Clic derecho
    canvas.addEventListener('mousemove', handleCanvasMouseMove);
    canvas.addEventListener('mouseleave', () => redrawCanvasAndHighlights());
}

// Nueva función para manejar clic derecho (deseleccionar frames)
function handleCanvasRightClick(event) {
    event.preventDefault(); // Prevenir menú contextual del navegador
    
    if (!editorState.isImageLoaded || !editorState.grid.isActive || !editorState.activeAnimation) {
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    
    const frameIndex = getFrameNumberFromCoordinates(x, y);

    if (frameIndex !== -1) {
        editorState.animationManager.removeFrameFromActiveAnimation(frameIndex);
    }
}

// --- Funciones de Dibujo Mejoradas ---

function _drawAnimationHighlights() {
    if (!ctx || !editorState.activeAnimation || !editorState.grid.isActive) return;
    
    const animation = editorState.animations[editorState.activeAnimation];
    if (!animation || animation.frames.length === 0) return;

    ctx.fillStyle = 'rgba(0, 100, 255, 0.3)'; // Resaltado azul más sutil

    const gridW = editorState.grid.width;
    const gridH = editorState.grid.height;
    if (gridW <= 0 || gridH <= 0) return;
    
    const columns = Math.floor(canvas.width / gridW);

    animation.frames.forEach(frameIndex => {
        const row = Math.floor(frameIndex / columns);
        const col = frameIndex % columns;
        const x = col * gridW;
        const y = row * gridH;
        
        // Verificar que el frame esté dentro del canvas
        if (x + gridW <= canvas.width && y + gridH <= canvas.height) {
            ctx.fillRect(x, y, gridW, gridH);
            
            // Añadir borde para mejor visibilidad
            ctx.strokeStyle = 'rgba(0, 100, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, gridW, gridH);
        }
    });
}

export function redrawCanvasAndHighlights() {
    if (!ctx || !canvas) return;
    
    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar imagen si existe
    if (editorState.spriteImage && editorState.isImageLoaded) {
        ctx.drawImage(editorState.spriteImage, 0, 0);
    }
    
    // Dibujar grid si está activo
    if (editorState.grid.isActive) {
        drawGrid();
    }
    
    // Dibujar highlights de animaciones
    _drawAnimationHighlights();
}

export function drawImageOnCanvas(img) {
    if (!canvas || !ctx || !img) return;
    
    // Configurar tamaño del canvas
    canvas.width = img.width;
    canvas.height = img.height;
    
    // Hacer visible el canvas
    canvas.classList.remove('opacity-0');
    canvas.classList.add('has-image'); // Clase para el cursor
    
    // Redibujar todo
    redrawCanvasAndHighlights();
}

export function drawGrid() {
    if (!ctx || !editorState.grid.isActive) return;

    const { width, height } = editorState.grid;
    if (width <= 0 || height <= 0) return;

    ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
    ctx.lineWidth = 1;
    ctx.font = '10px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    let frameNumber = 0;
    for (let y = 0; y < canvas.height; y += height) {
        for (let x = 0; x < canvas.width; x += width) {
            // Verificar que el rectángulo esté completamente dentro del canvas
            if (x + width <= canvas.width && y + height <= canvas.height) {
                ctx.strokeRect(x, y, width, height);
                
                // Dibujar número de frame con fondo
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(x + 1, y + 1, 20, 12);
                ctx.fillStyle = 'white';
                ctx.fillText(frameNumber, x + 3, y + 3);
                
                frameNumber++;
            }
        }
    }
}

export function defineGrid(width, height) {
    if (!editorState.isImageLoaded) {
        editorState.uiManager.showMessage('error', 'Carga una imagen antes de definir el grid.');
        return false;
    }

    // Validaciones mejoradas
    if (width <= 0 || height <= 0) {
        editorState.uiManager.showMessage('error', 'El ancho y alto deben ser números positivos.');
        return false;
    }

    if (editorState.spriteImage.width % width !== 0 || editorState.spriteImage.height % height !== 0) {
        editorState.uiManager.showMessage('error', 
            `Las dimensiones de la imagen (${editorState.spriteImage.width}x${editorState.spriteImage.height}) no son divisibles por el tamaño del grid (${width}x${height}).`);
        return false;
    }

    // Actualizar estado del grid
    editorState.grid.width = width;
    editorState.grid.height = height;
    editorState.grid.isActive = true;
    
    // Redibujar canvas
    redrawCanvasAndHighlights();
    
    // Calcular información útil para el usuario
    const totalFrames = (editorState.spriteImage.width / width) * (editorState.spriteImage.height / height);
    editorState.uiManager.showMessage('success', 
        `Grid aplicado: ${width}x${height}px. Total de frames disponibles: ${totalFrames}`);
    
    return true;
}

// --- Funciones de Interacción Mejoradas ---

function getFrameNumberFromCoordinates(x, y) {
    if (!editorState.grid.isActive) return -1;
    
    const gridWidth = editorState.grid.width;
    const gridHeight = editorState.grid.height;
    if (gridWidth <= 0 || gridHeight <= 0) return -1;
    
    const columns = Math.floor(canvas.width / gridWidth);
    const col = Math.floor(x / gridWidth);
    const row = Math.floor(y / gridHeight);
    
    // Verificar que estemos dentro de los límites
    if (col >= columns || col < 0 || row < 0) return -1;
    if (col * gridWidth + gridWidth > canvas.width || row * gridHeight + gridHeight > canvas.height) return -1;
    
    return row * columns + col;
}

function handleCanvasClick(event) {
    if (!editorState.isImageLoaded || !editorState.grid.isActive) {
        if (!editorState.isImageLoaded) {
            editorState.uiManager.showMessage('error', 'Carga una imagen primero.');
        } else {
            editorState.uiManager.showMessage('error', 'Define un grid primero.');
        }
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    
    const frameIndex = getFrameNumberFromCoordinates(x, y);

    if (frameIndex !== -1) {
        editorState.animationManager.addFrameToActiveAnimation(frameIndex);
    }
}

function handleCanvasMouseMove(event) {
    if (!editorState.isImageLoaded || !editorState.grid.isActive) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    const frameIndex = getFrameNumberFromCoordinates(x, y);
    
    redrawCanvasAndHighlights();

    if (frameIndex !== -1) {
        const gridW = editorState.grid.width;
        const gridH = editorState.grid.height;
        const columns = Math.floor(canvas.width / gridW);
        const col = frameIndex % columns;
        const row = Math.floor(frameIndex / columns);

        // Highlight amarillo para el frame bajo el cursor
        ctx.fillStyle = 'rgba(255, 255, 0, 0.4)';
        ctx.fillRect(col * gridW, row * gridH, gridW, gridH);
        
        // Mostrar número de frame
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(col * gridW + 2, row * gridH + 2, 25, 15);
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText(`#${frameIndex}`, col * gridW + 5, row * gridH + 13);
    }
}