// --- Módulo: Gestión de Frames (pixelArtFrames.js) ---
let state = null;
let frames = [];
let currentFrameIndex = 0;
let exportBackgroundColor = 'transparent'; // Nuevo: color de fondo para exportación

export function init(pixelArtState) {
    state = pixelArtState;
    frames = [];
    currentFrameIndex = 0;
    setupFrameEvents();
    setupBackgroundColorEvents(); // Nuevo
    createInitialFrame();
}

function setupFrameEvents() {
    document.getElementById('add-frame-btn')?.addEventListener('click', addFrame);
    document.getElementById('duplicate-frame-btn')?.addEventListener('click', duplicateFrame);
    document.getElementById('delete-frame-btn')?.addEventListener('click', deleteFrame);
    document.getElementById('prev-frame-btn')?.addEventListener('click', prevFrame);
    document.getElementById('next-frame-btn')?.addEventListener('click', nextFrame);
}

// NUEVO: Configurar eventos para el selector de color de fondo
function setupBackgroundColorEvents() {
    const bgRadios = document.querySelectorAll('input[name="bg-color"]');
    const customBgPicker = document.getElementById('custom-bg-color-picker');
    const bgColorPicker = document.getElementById('bg-color-picker');
    
    bgRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const value = e.target.value;
            
            if (value === 'transparent') {
                exportBackgroundColor = 'transparent';
                if (customBgPicker) customBgPicker.style.display = 'none';
            } else if (value === 'white') {
                exportBackgroundColor = '#FFFFFF';
                if (customBgPicker) customBgPicker.style.display = 'none';
            } else if (value === 'custom') {
                if (customBgPicker) customBgPicker.style.display = 'block';
                if (bgColorPicker) {
                    exportBackgroundColor = bgColorPicker.value;
                }
            }
        });
    });
    
    if (bgColorPicker) {
        bgColorPicker.addEventListener('change', (e) => {
            exportBackgroundColor = e.target.value;
        });
    }
}

function createInitialFrame() {
    // Crear frame inicial SIEMPRE transparente
    const canvas = document.createElement('canvas');
    canvas.width = state.canvasWidth;
    canvas.height = state.canvasHeight;
    const ctx = canvas.getContext('2d');
    
    // Canvas transparente por defecto
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    frames = [imageData];
    currentFrameIndex = 0;
    updateFrameDisplay();
}

export function addFrame() {
    saveCurrentFrame();
    
    const canvas = document.createElement('canvas');
    canvas.width = state.canvasWidth;
    canvas.height = state.canvasHeight;
    const ctx = canvas.getContext('2d');
    
    // Nuevo frame transparente
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const newFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    frames.push(newFrame);
    currentFrameIndex = frames.length - 1;
    
    updateFrameDisplay();
    loadCurrentFrame();
    state.ui.showMessage('success', `Frame ${currentFrameIndex + 1} creado`);
}

export function duplicateFrame() {
    saveCurrentFrame();
    
    const currentFrame = frames[currentFrameIndex];
    const canvas = document.createElement('canvas');
    canvas.width = state.canvasWidth;
    canvas.height = state.canvasHeight;
    const ctx = canvas.getContext('2d');
    
    ctx.putImageData(currentFrame, 0, 0);
    const duplicatedFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    frames.splice(currentFrameIndex + 1, 0, duplicatedFrame);
    currentFrameIndex++;
    
    updateFrameDisplay();
    loadCurrentFrame();
    state.ui.showMessage('success', `Frame ${currentFrameIndex + 1} duplicado`);
}

export function deleteFrame() {
    if (frames.length <= 1) {
        state.ui.showMessage('error', 'No puedes eliminar el único frame');
        return;
    }
    
    if (confirm(`¿Eliminar el frame ${currentFrameIndex + 1}?`)) {
        frames.splice(currentFrameIndex, 1);
        
        if (currentFrameIndex >= frames.length) {
            currentFrameIndex = frames.length - 1;
        }
        
        updateFrameDisplay();
        loadCurrentFrame();
        state.ui.showMessage('info', 'Frame eliminado');
    }
}

function prevFrame() {
    if (currentFrameIndex > 0) {
        saveCurrentFrame();
        currentFrameIndex--;
        updateFrameDisplay();
        loadCurrentFrame();
    }
}

function nextFrame() {
    if (currentFrameIndex < frames.length - 1) {
        saveCurrentFrame();
        currentFrameIndex++;
        updateFrameDisplay();
        loadCurrentFrame();
    }
}

export function saveCurrentFrame() {
    const imageData = state.ctx.getImageData(0, 0, state.canvasWidth, state.canvasHeight);
    frames[currentFrameIndex] = imageData;
}

function loadCurrentFrame() {
    if (frames[currentFrameIndex]) {
        state.ctx.putImageData(frames[currentFrameIndex], 0, 0);
        state.canvasModule.updatePreview();
    }
}

function updateFrameDisplay() {
    const frameCounter = document.getElementById('frame-counter');
    const currentFrameDisplay = document.getElementById('current-frame-display');
    const prevBtn = document.getElementById('prev-frame-btn');
    const nextBtn = document.getElementById('next-frame-btn');
    const deleteBtn = document.getElementById('delete-frame-btn');
    
    if (frameCounter) frameCounter.textContent = `${currentFrameIndex + 1}/${frames.length}`;
    if (currentFrameDisplay) currentFrameDisplay.textContent = `Frame ${currentFrameIndex + 1}`;
    if (prevBtn) prevBtn.disabled = currentFrameIndex === 0;
    if (nextBtn) nextBtn.disabled = currentFrameIndex === frames.length - 1;
    if (deleteBtn) deleteBtn.disabled = frames.length <= 1;
}

function updateTransparencyCheckbox() {
    // Ya no usamos checkbox de transparencia
}

// CORREGIDO: Aplicar color de fondo SOLO al exportar
export function getAllFramesAsDataURLs() {
    saveCurrentFrame();
    return frames.map((frame, index) => {
        const canvas = document.createElement('canvas');
        canvas.width = state.canvasWidth;
        canvas.height = state.canvasHeight;
        const ctx = canvas.getContext('2d');
        
        // Aplicar color de fondo SOLO si no es transparente
        if (exportBackgroundColor !== 'transparent') {
            ctx.fillStyle = exportBackgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // Dibujar el frame encima del fondo
        ctx.putImageData(frame, 0, 0);
        
        return {
            index: index,
            dataURL: canvas.toDataURL('image/png')
        };
    });
}

export function getCurrentFrameIndex() {
    return currentFrameIndex;
}

// MODIFICADO: Siempre devuelve true ya que el canvas es siempre transparente
export function isTransparentBackground() {
    return true;
}

// NUEVO: Obtener el color de fondo para exportación
export function getExportBackgroundColor() {
    return exportBackgroundColor;
}

// NUEVO: Establecer el color de fondo para exportación
export function setExportBackgroundColor(color) {
    exportBackgroundColor = color;
    
    // Actualizar UI
    const bgRadios = document.querySelectorAll('input[name="bg-color"]');
    const customBgPicker = document.getElementById('custom-bg-color-picker');
    const bgColorPicker = document.getElementById('bg-color-picker');
    
    if (color === 'transparent') {
        bgRadios.forEach(r => { if (r.value === 'transparent') r.checked = true; });
        if (customBgPicker) customBgPicker.style.display = 'none';
    } else if (color === '#FFFFFF') {
        bgRadios.forEach(r => { if (r.value === 'white') r.checked = true; });
        if (customBgPicker) customBgPicker.style.display = 'none';
    } else {
        bgRadios.forEach(r => { if (r.value === 'custom') r.checked = true; });
        if (customBgPicker) customBgPicker.style.display = 'block';
        if (bgColorPicker) bgColorPicker.value = color;
    }
}

export function setCurrentFrame(frameIndex) {
    if (frameIndex >= 0 && frameIndex < frames.length) {
        saveCurrentFrame();
        currentFrameIndex = frameIndex;
        updateFrameDisplay();
        loadCurrentFrame();
    }
}

export function loadFramesFromData(framesData) {
    if (!framesData || !Array.isArray(framesData) || framesData.length === 0) {
        return;
    }
    
    frames = [];
    
    // Cargar cada frame desde los datos
    framesData.forEach((frameData, index) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = state.canvasWidth;
            canvas.height = state.canvasHeight;
            const ctx = canvas.getContext('2d');
            
            // Siempre transparente
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            frames[index] = imageData;
            
            // Si es el último frame y es el frame actual, cargarlo
            if (index === framesData.length - 1) {
                if (currentFrameIndex < frames.length) {
                    loadCurrentFrame();
                }
                updateFrameDisplay();
            }
        };
        img.src = frameData.dataURL;
    });
    
    // Asegurar que tenemos al menos un frame
    if (frames.length === 0) {
        createInitialFrame();
    }
}

export function getFrameCount() {
    return frames.length;
}

export function getAllFrames() {
    return frames;
}

// Función para redimensionar frames cuando cambian las dimensiones del canvas
export function resizeFrames(newWidth, newHeight) {
    frames = frames.map(frame => {
        const oldCanvas = document.createElement('canvas');
        oldCanvas.width = state.canvasWidth;
        oldCanvas.height = state.canvasHeight;
        const oldCtx = oldCanvas.getContext('2d');
        oldCtx.putImageData(frame, 0, 0);
        
        const newCanvas = document.createElement('canvas');
        newCanvas.width = newWidth;
        newCanvas.height = newHeight;
        const newCtx = newCanvas.getContext('2d');
        
        // Siempre transparente
        newCtx.clearRect(0, 0, newWidth, newHeight);
        
        // Dibujar el contenido anterior
        newCtx.drawImage(oldCanvas, 0, 0);
        
        return newCtx.getImageData(0, 0, newWidth, newHeight);
    });
    
    loadCurrentFrame();
    updateFrameDisplay();
}