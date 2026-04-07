// --- Módulo: Gestor de Animaciones (animationManager.js) ---
// Propósito: Gestionar la creación, eliminación y modificación de las animaciones.

let editorState = null;

// --- Funciones de Inicialización y Estado ---
export function init(state) {
    editorState = state;
    render();
}

export function getAnimationsData() {
    return editorState.animations;
}

// --- Lógica de Gestión de Animaciones ---
export function createAnimation(name) {
    // Validar nombre de animación
    if (!name || name.trim() === '') {
        editorState.uiManager.showMessage('error', 'El nombre de la animación no puede estar vacío.');
        return;
    }

    const trimmedName = name.trim();
    
    // Validar caracteres permitidos
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmedName)) {
        editorState.uiManager.showMessage('error', 'El nombre solo puede contener letras, números, espacios, guiones y guiones bajos.');
        return;
    }

    // Verificar si ya existe
    if (editorState.animations[trimmedName]) {
        editorState.uiManager.showMessage('error', `La animación "${trimmedName}" ya existe.`);
        return;
    }

    // Crear nueva animación
    editorState.animations[trimmedName] = { 
        frames: [],
        speed: 8 // FPS por defecto
    };
    
    setActiveAnimation(trimmedName);
    editorState.uiManager.showMessage('success', `Animación "${trimmedName}" creada y seleccionada.`);
    
    // Si hay preview manager, resetear
    if (editorState.previewManager && editorState.previewManager.resetPreview) {
        editorState.previewManager.resetPreview();
    }
}

export function deleteAnimation(name) {
    if (!editorState.animations[name]) {
        editorState.uiManager.showAnimationMessage('warning', `La animación "${name}" no existe.`);
        return;
    }

    delete editorState.animations[name];

    // Si borramos la activa, seleccionar la primera que quede o ninguna
    if (editorState.activeAnimation === name) {
        const remainingAnimations = Object.keys(editorState.animations);
        editorState.activeAnimation = remainingAnimations.length > 0 ? remainingAnimations[0] : null;
        
        if (editorState.activeAnimation) {
            editorState.uiManager.showAnimationMessage('info', `Animación "${name}" eliminada. Ahora editando "${editorState.activeAnimation}".`);
        } else {
            editorState.uiManager.showAnimationMessage('info', `Animación "${name}" eliminada. No hay animaciones activas.`);
        }
    } else {
        editorState.uiManager.showAnimationMessage('info', `Animación "${name}" eliminada.`);
    }

    render();
    
    // Resetear preview si es necesario
    if (editorState.previewManager && editorState.previewManager.resetPreview) {
        editorState.previewManager.resetPreview();
    }
}

export function setActiveAnimation(name) {
    if (!editorState.animations[name]) {
        editorState.uiManager.showAnimationMessage('error', `La animación "${name}" no existe.`);
        return;
    }

    // Actualizar el estado global
    editorState.activeAnimation = name;
    render();
    
    // Resetear el preview para la nueva animación
    if (editorState.previewManager && editorState.previewManager.resetPreview) {
        editorState.previewManager.resetPreview();
    }
    
    const animation = editorState.animations[name];
    const frameCount = animation.frames.length;
    editorState.uiManager.showAnimationMessage('info', `Animación "${name}" seleccionada (${frameCount} frames).`);
}

export function addFrameToActiveAnimation(frameIndex) {
    if (!editorState.activeAnimation) {
        editorState.uiManager.showMessage('error', 'Selecciona o crea una animación primero.');
        return;
    }

    // Validar que el frame sea un número válido
    if (typeof frameIndex !== 'number' || frameIndex < 0) {
        editorState.uiManager.showAnimationMessage('error', 'Índice de frame inválido.');
        return;
    }

    const activeAnim = editorState.animations[editorState.activeAnimation];
    
    if (!activeAnim.frames.includes(frameIndex)) {
        activeAnim.frames.push(frameIndex);
        activeAnim.frames.sort((a, b) => a - b); // Mantener los fotogramas ordenados
        render();
        editorState.uiManager.showAnimationMessage('success', `Frame ${frameIndex} añadido a "${editorState.activeAnimation}".`);
    } else {
        editorState.uiManager.showAnimationMessage('warning', `El frame ${frameIndex} ya está en la animación.`);
    }
}

export function removeFrameFromActiveAnimation(frameIndex) {
    if (!editorState.activeAnimation) {
        editorState.uiManager.showAnimationMessage('error', 'Selecciona una animación primero.');
        return;
    }

    const activeAnim = editorState.animations[editorState.activeAnimation];
    const framePosition = activeAnim.frames.indexOf(frameIndex);
    
    if (framePosition !== -1) {
        activeAnim.frames.splice(framePosition, 1);
        render();
        editorState.uiManager.showAnimationMessage('info', `Frame ${frameIndex} eliminado de "${editorState.activeAnimation}".`);
    } else {
        editorState.uiManager.showAnimationMessage('warning', `El frame ${frameIndex} no está en la animación actual.`);
    }
}

export function duplicateAnimation(originalName, newName) {
    if (!editorState.animations[originalName]) {
        editorState.uiManager.showAnimationMessage('error', `La animación "${originalName}" no existe.`);
        return;
    }

    if (editorState.animations[newName]) {
        editorState.uiManager.showAnimationMessage('error', `Ya existe una animación llamada "${newName}".`);
        return;
    }

    // Crear copia profunda de la animación
    const originalAnim = editorState.animations[originalName];
    editorState.animations[newName] = {
        frames: [...originalAnim.frames],
        speed: originalAnim.speed || 8
    };

    setActiveAnimation(newName);
    editorState.uiManager.showAnimationMessage('success', `Animación "${originalName}" duplicada como "${newName}".`);
}

export function renameAnimation(oldName, newName) {
    if (!editorState.animations[oldName]) {
        editorState.uiManager.showAnimationMessage('error', `La animación "${oldName}" no existe.`);
        return;
    }

    if (editorState.animations[newName]) {
        editorState.uiManager.showAnimationMessage('error', `Ya existe una animación llamada "${newName}".`);
        return;
    }

    // Copiar la animación con el nuevo nombre
    editorState.animations[newName] = editorState.animations[oldName];
    delete editorState.animations[oldName];

    // Si era la animación activa, actualizar la referencia
    if (editorState.activeAnimation === oldName) {
        editorState.activeAnimation = newName;
    }

    render();
    editorState.uiManager.showAnimationMessage('success', `Animación renombrada de "${oldName}" a "${newName}".`);
}

export function setAnimationSpeed(animationName, speed) {
    if (!editorState.animations[animationName]) {
        editorState.uiManager.showAnimationMessage('error', `La animación "${animationName}" no existe.`);
        return;
    }

    if (speed < 1 || speed > 60) {
        editorState.uiManager.showAnimationMessage('error', 'La velocidad debe estar entre 1 y 60 FPS.');
        return;
    }

    editorState.animations[animationName].speed = speed;
    editorState.uiManager.showAnimationMessage('info', `Velocidad de "${animationName}" establecida a ${speed} FPS.`);
}

export function clearAnimation(animationName) {
    if (!editorState.animations[animationName]) {
        editorState.uiManager.showAnimationMessage('error', `La animación "${animationName}" no existe.`);
        return;
    }

    editorState.animations[animationName].frames = [];
    render();
    editorState.uiManager.showAnimationMessage('info', `Frames de "${animationName}" eliminados.`);
}

export function reorderFrames(animationName, newOrder) {
    if (!editorState.animations[animationName]) {
        editorState.uiManager.showAnimationMessage('error', `La animación "${animationName}" no existe.`);
        return;
    }

    if (!Array.isArray(newOrder)) {
        editorState.uiManager.showAnimationMessage('error', 'El orden debe ser un array de números.');
        return;
    }

    editorState.animations[animationName].frames = newOrder;
    render();
    editorState.uiManager.showAnimationMessage('success', `Orden de frames actualizado para "${animationName}".`);
}

export function loadAnimations(jsonData) {
    try {
        // Validar que jsonData sea un objeto válido
        if (!jsonData || typeof jsonData !== 'object') {
            editorState.uiManager.showMessage('error', 'Datos de animación inválidos.');
            return;
        }

        // Limpiar animaciones existentes
        editorState.animations = {};
        editorState.activeAnimation = null;

        // Cargar las nuevas animaciones
        Object.keys(jsonData).forEach(animName => {
            const animData = jsonData[animName];
            
            // Validar estructura de datos
            if (animData && Array.isArray(animData.frames)) {
                editorState.animations[animName] = {
                    frames: [...animData.frames],
                    speed: animData.speed || 8
                };
            }
        });

        // Seleccionar la primera animación si existe
        const firstAnimation = Object.keys(editorState.animations)[0];
        if (firstAnimation) {
            editorState.activeAnimation = firstAnimation;
        }

        render();
        
        const animCount = Object.keys(editorState.animations).length;
        editorState.uiManager.showMessage('success', `${animCount} animación(es) cargada(s) correctamente.`);
        
        // Resetear preview
        if (editorState.previewManager && editorState.previewManager.resetPreview) {
            editorState.previewManager.resetPreview();
        }

    } catch (error) {
        console.error('Error al cargar animaciones:', error);
        editorState.uiManager.showMessage('error', 'Error al procesar los datos de animación.');
    }
}

export function resetAnimations() {
    editorState.animations = {};
    editorState.activeAnimation = null;
    render();
    editorState.uiManager.showAnimationMessage('info', 'Todas las animaciones han sido eliminadas.');
}

export function getAnimationStats() {
    const stats = {
        totalAnimations: Object.keys(editorState.animations).length,
        activeAnimation: editorState.activeAnimation,
        totalFrames: 0,
        averageFramesPerAnimation: 0
    };

    if (stats.totalAnimations > 0) {
        stats.totalFrames = Object.values(editorState.animations)
            .reduce((total, anim) => total + anim.frames.length, 0);
        stats.averageFramesPerAnimation = Math.round(stats.totalFrames / stats.totalAnimations);
    }

    return stats;
}

// --- Función de Renderizado Central ---
function render() {
    // 1. Le decimos a la UI que se actualice con los nuevos datos.
    editorState.uiManager.renderAnimationsList(editorState.animations, editorState.activeAnimation);
    
    // 2. Le decimos al canvas que se redibuje por completo.
    //    Este ya sabe qué resaltar gracias al estado global actualizado.
    if (editorState.canvasManager && editorState.canvasManager.redrawCanvasAndHighlights) {
        editorState.canvasManager.redrawCanvasAndHighlights();
    }
}