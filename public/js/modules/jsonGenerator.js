// --- Módulo: Generador de JSON (jsonGenerator.js) ---
// Propósito: Recopilar los datos del estado y generar el archivo JSON final.

let editorState = null;

export function init(state) {
    editorState = state;
}

// SOLUCIÓN: Exportamos 'generateJson' de nuevo para que otros módulos (como apiManager) puedan usarla.
export function generateJson() {
    const { spriteImage, grid } = editorState;
    if (!spriteImage) {
        editorState.uiManager.showMessage('error', "No hay una imagen cargada para generar el JSON.");
        return null;
    }
    
    const animations = editorState.animationManager.getAnimationsData();

    if (!grid.width || Object.keys(animations).length === 0) {
        editorState.uiManager.showMessage('error', "Define el grid y crea al menos una animación para generar el JSON.");
        return null;
    }

    // Calcular columnas y filas para el JSON
    const cols = Math.floor(spriteImage.width / grid.width);
    const rows = Math.floor(spriteImage.height / grid.height);

    const output = {
        meta: {
            app: "Pixel Sprite Editor",
            version: "1.0.0",
            image: spriteImage.name || 'sprite.png',
        },
        frames: {
            width: grid.width,
            height: grid.height,
            cols: cols,
            rows: rows,
        },
        animations: animations
    };

    return JSON.stringify(output, null, 2);
}

function downloadJson(content, filename = 'sprite-config.json') {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

// Esta es la función que llama el botón de la UI para descargar el archivo.
export function generateAndDownloadJson() {
    const content = generateJson();
    if (content) {
        downloadJson(content);
    }
}

