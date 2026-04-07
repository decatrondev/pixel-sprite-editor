// --- Módulo Principal del Editor (editor.js) ---
// Propósito: Orquestar todos los demás módulos del editor.

import * as fileHandler from './modules/fileHandler.js';
import * as canvasManager from './modules/canvasManager.js';
import * as animationManager from './modules/animationManager.js';
import * as jsonGenerator from './modules/jsonGenerator.js';
import * as uiManager from './modules/uiManager.js';
import * as apiManager from './modules/apiManager.js';
import * as previewManager from './modules/previewManager.js';

// El estado global de la aplicación que compartirán todos los módulos
const editorState = {
    spriteImage: null,
    isImageLoaded: false,
    grid: {
        width: 0,
        height: 0,
        isActive: false
    },
    animations: {},
    activeAnimation: null,
    // Referencias a los módulos para que puedan llamarse entre sí
    fileHandler,
    canvasManager,
    animationManager,
    jsonGenerator,
    uiManager,
    apiManager,
    previewManager,
};

// --- Función de Inicialización Principal ---
function init() {
    console.log('Editor listo. Validando entorno...');

    // VALIDACIÓN CRÍTICA: Antes de hacer nada, nos aseguramos de que los
    // elementos HTML esenciales para la aplicación existan en el DOM.
    const essentialElementIDs = ['drop-zone', 'file-input', 'editor-canvas', 'define-grid-btn'];
    const missingElement = essentialElementIDs.find(id => !document.getElementById(id));

    if (missingElement) {
        const errorMessage = `Error Crítico de Inicialización: El elemento HTML con el ID '${missingElement}' no se encontró. El editor no puede continuar.`;
        console.error(errorMessage);
        alert(errorMessage);
        return;
    }

    console.log('Validación completada. Inicializando módulos...');
    
    // Pasar el estado global a cada módulo para que lo inicialicen
    fileHandler.init(editorState);
    canvasManager.init(editorState);
    animationManager.init(editorState);
    uiManager.init(editorState);
    jsonGenerator.init(editorState);
    previewManager.init(editorState); // Activar el preview manager
    
    // Solo inicializar el apiManager si los elementos del usuario existen
    if (document.getElementById('save-project-btn')) {
        apiManager.init(editorState);
    }

    console.log('Módulos inicializados correctamente.');
}

// Iniciar el editor una vez que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', init);