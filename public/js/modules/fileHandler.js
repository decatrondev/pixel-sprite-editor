// --- Módulo: Manejador de Archivos (fileHandler.js) ---
// Propósito: Gestionar la carga de archivos, ya sea arrastrando o seleccionando.

let editorState = null;
let dropZone = null;
let fileInput = null;

export function init(state) {
    editorState = state;
    // Cachear los elementos del DOM para un acceso más rápido y seguro
    dropZone = document.getElementById('drop-zone');
    fileInput = document.getElementById('file-input');

    if (!dropZone || !fileInput) {
        console.error("Error crítico: No se encontraron los elementos 'drop-zone' o 'file-input'.");
        return;
    }
    
    setupEventListeners();
}

// --- Funciones de Eventos ---

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    preventDefaults(e);
    if (!editorState.isImageLoaded) {
        dropZone.classList.add('bg-indigo-50');
    }
}

function unhighlight(e) {
    preventDefaults(e);
    dropZone.classList.remove('bg-indigo-50');
}

function handleDrop(e) {
    unhighlight(e); // Esto también previene los defaults

    if (editorState.isImageLoaded) return;

    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function handleFileSelect(e) {
    if (editorState.isImageLoaded) return;
    const files = e.target.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
    // Resetear el input para poder subir el mismo archivo otra vez si se desea
    e.target.value = null;
}

function setupEventListeners() {
    // Evento de clic para abrir el selector de archivos
    dropZone.addEventListener('click', () => {
        if (!editorState.isImageLoaded) {
            fileInput.click();
        }
    });
    
    // Es crucial prevenir el comportamiento por defecto en el documento
    // para evitar que el navegador abra el archivo soltado.
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Feedback visual al arrastrar sobre la zona específica
    dropZone.addEventListener('dragenter', highlight, false);
    dropZone.addEventListener('dragover', highlight, false);
    dropZone.addEventListener('dragleave', unhighlight, false);
    
    // Manejar el archivo cuando se suelta sobre la zona
    dropZone.addEventListener('drop', handleDrop, false);

    // Manejar cuando se selecciona un archivo con el input
    fileInput.addEventListener('change', handleFileSelect, false);
}


// --- Lógica de Procesamiento de Archivos ---

function processFile(file) {
    if (!file.type.startsWith('image/')) {
        editorState.uiManager.showMessage('error', 'Por favor, sube un archivo de imagen válido.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            editorState.spriteImage = img;
            editorState.spriteImage.name = file.name;
            editorState.isImageLoaded = true;
            editorState.canvasManager.drawImageOnCanvas(img);
            editorState.animationManager.resetAnimations();
            
            // Ocultar el texto de la drop-zone para dar feedback visual
            const dropZoneContent = document.querySelector('#drop-zone > div');
            if(dropZoneContent) dropZoneContent.classList.add('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

export function loadImageFromUrl(url) {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
        editorState.spriteImage = img;
        editorState.isImageLoaded = true;
        editorState.canvasManager.drawImageOnCanvas(img);
        
        // Ocultar también el texto de la drop-zone al cargar un proyecto
        const dropZoneContent = document.querySelector('#drop-zone > div');
        if(dropZoneContent) dropZoneContent.classList.add('hidden');
    };
    img.onerror = () => {
        editorState.uiManager.showMessage('error', 'No se pudo cargar la imagen del proyecto.');
    };
    img.src = url;
}

