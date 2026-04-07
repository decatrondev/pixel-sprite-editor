// --- Módulo: Gestor de Previsualización (previewManager.js) ---
// Propósito: Controlar el canvas de previsualización y el bucle de animación.

let editorState = null;
let previewCanvas = null;
let previewCtx = null;
let lastFrameTime = 0;
let currentFrameIndex = 0;
let animationSpeed = 8;
let isPlaying = true;

export function init(state) {
    editorState = state;
    setupPreviewCanvas();
    if (previewCanvas) {
        requestAnimationFrame(animationLoop);
    }
}

function setupPreviewCanvas() {
    previewCanvas = document.getElementById('animation-preview-canvas');
    
    if (!previewCanvas) return;
    
    previewCtx = previewCanvas.getContext('2d');
    previewCanvas.width = 128;
    previewCanvas.height = 128;
    
    setupSpeedControls();
}

function setupSpeedControls() {
    // Los controles ya están en el HTML, solo conectamos los eventos
    const playPauseBtn = document.getElementById('play-pause-btn');
    const speedSlider = document.getElementById('speed-slider');
    const speedDisplay = document.getElementById('speed-display');
    
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', togglePlayPause);
    }
    
    if (speedSlider) {
        speedSlider.addEventListener('input', (e) => {
            animationSpeed = parseInt(e.target.value);
            if (speedDisplay) {
                speedDisplay.textContent = `${animationSpeed} FPS`;
            }
        });
    }
}

function togglePlayPause() {
    isPlaying = !isPlaying;
    const btn = document.getElementById('play-pause-btn');
    if (btn) {
        btn.innerHTML = isPlaying ? '⏸️ Pausar' : '▶️ Reproducir';
    }
}

function showNoPreviewMessage() {
    const noPreview = document.getElementById('no-preview');
    if (noPreview) {
        noPreview.style.display = 'flex';
    }
}

function hideNoPreviewMessage() {
    const noPreview = document.getElementById('no-preview');
    if (noPreview) {
        noPreview.style.display = 'none';
    }
}

function animationLoop(timestamp) {
    if (!previewCanvas || !previewCtx) {
        requestAnimationFrame(animationLoop);
        return;
    }

    const activeAnimName = editorState.activeAnimation;
    
    // Si no hay animación activa, mostrar mensaje y limpiar
    if (!activeAnimName || !editorState.animations[activeAnimName] || !editorState.isImageLoaded) {
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        showNoPreviewMessage();
        requestAnimationFrame(animationLoop);
        return;
    }

    const animation = editorState.animations[activeAnimName];
    if (!animation || animation.frames.length === 0) {
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        showNoPreviewMessage();
        requestAnimationFrame(animationLoop);
        return;
    }

    // Si llegamos aquí, hay animación válida - ocultar mensaje
    hideNoPreviewMessage();

    // Si está pausado, mostrar frame actual sin avanzar
    if (!isPlaying) {
        const frameToDraw = animation.frames[currentFrameIndex % animation.frames.length];
        drawPreviewFrame(frameToDraw);
        requestAnimationFrame(animationLoop);
        return;
    }

    const timePerFrame = 1000 / animationSpeed;
    const deltaTime = timestamp - lastFrameTime;

    if (deltaTime >= timePerFrame) {
        lastFrameTime = timestamp;
        
        const frameToDraw = animation.frames[currentFrameIndex];
        drawPreviewFrame(frameToDraw);

        // Avanzar al siguiente fotograma
        currentFrameIndex = (currentFrameIndex + 1) % animation.frames.length;
    }

    requestAnimationFrame(animationLoop);
}

function drawPreviewFrame(frameIndex) {
    if (!editorState.spriteImage || !editorState.grid.isActive) return;

    const { width: frameWidth, height: frameHeight } = editorState.grid;
    const image = editorState.spriteImage;
    
    if (frameWidth <= 0 || frameHeight <= 0) return;

    const cols = Math.floor(image.width / frameWidth);
    const sourceX = (frameIndex % cols) * frameWidth;
    const sourceY = Math.floor(frameIndex / cols) * frameHeight;

    // Limpiar canvas
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    
    // Configurar filtro para píxeles nítidos
    previewCtx.imageSmoothingEnabled = false;
    
    try {
        previewCtx.drawImage(
            image,
            sourceX, sourceY,
            frameWidth, frameHeight,
            0, 0,
            previewCanvas.width, previewCanvas.height
        );
        
        // Dibujar información del frame
        previewCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        previewCtx.fillRect(2, 2, 50, 15);
        previewCtx.fillStyle = 'white';
        previewCtx.font = '10px Arial';
        previewCtx.fillText(`Frame ${frameIndex}`, 4, 12);
        
    } catch (error) {
        console.warn('Error al dibujar frame en preview:', error);
    }
}

export function resetPreview() {
    currentFrameIndex = 0;
}