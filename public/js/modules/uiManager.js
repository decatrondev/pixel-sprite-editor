// --- Módulo: Gestor de UI (uiManager.js) ---
// Propósito: Manejar todas las interacciones del DOM que no son del canvas.

let editorState = null;

export function init(state) {
    editorState = state;
    setupEventListeners();
}

function setupEventListeners() {
    const defineGridBtn = document.getElementById('define-grid-btn');
    if (defineGridBtn) {
        defineGridBtn.addEventListener('click', () => {
            const width = parseInt(document.getElementById('frame-width').value, 10);
            const height = parseInt(document.getElementById('frame-height').value, 10);
            if (width > 0 && height > 0) {
                editorState.canvasManager.defineGrid(width, height);
            } else {
                showMessage('error', 'El ancho y alto del fotograma deben ser números positivos.');
            }
        });
    }

    const createAnimBtn = document.getElementById('create-anim-btn');
    if (createAnimBtn) {
        createAnimBtn.addEventListener('click', () => {
            const animNameInput = document.getElementById('anim-name');
            const name = animNameInput.value.trim();
            if (name) {
                editorState.animationManager.createAnimation(name);
                animNameInput.value = '';
            } else {
                showMessage('error', 'Por favor, introduce un nombre para la animación.');
            }
        });
    }

    const generateJsonBtn = document.getElementById('generate-json-btn');
    if (generateJsonBtn) {
        generateJsonBtn.addEventListener('click', () => {
             editorState.jsonGenerator.generateAndDownloadJson();
        });
    }
    
    const saveProjectBtn = document.getElementById('save-project-btn');
    if (saveProjectBtn) {
        saveProjectBtn.addEventListener('click', async () => {
            const projectNameInput = document.getElementById('project-name');
            const projectName = projectNameInput.value.trim();
            
            if (!projectName) {
                showMessage('error', 'Por favor, dale un nombre a tu proyecto.');
                return;
            }

            // Validar nombre del proyecto
            if (projectName.length < 3) {
                showMessage('error', 'El nombre del proyecto debe tener al menos 3 caracteres.');
                return;
            }

            if (projectName.length > 50) {
                showMessage('error', 'El nombre del proyecto no puede exceder 50 caracteres.');
                return;
            }

            // Validar caracteres permitidos
            if (!/^[a-zA-Z0-9\s\-_]+$/.test(projectName)) {
                showMessage('error', 'El nombre solo puede contener letras, números, espacios, guiones y guiones bajos.');
                return;
            }

            // Deshabilitar el botón para prevenir clicks múltiples
            saveProjectBtn.disabled = true;
            const originalText = saveProjectBtn.textContent;
            
            const isEditing = editorState.apiManager.getCurrentProjectId && 
                             editorState.apiManager.getCurrentProjectId() !== null;
            saveProjectBtn.textContent = isEditing ? 'Actualizando...' : 'Guardando...';

            try {
                await editorState.apiManager.saveProject(projectName);
            } catch (error) {
                console.error("Fallo la operación de guardado:", error);
            } finally {
                // Reactivar el botón
                saveProjectBtn.disabled = false;
                saveProjectBtn.textContent = originalText;
            }
        });
    }

    // Botón para nuevo proyecto
    const newProjectBtn = document.getElementById('new-project-btn');
    if (newProjectBtn) {
        newProjectBtn.addEventListener('click', () => {
            if (confirm('¿Estás seguro? Se perderán los cambios no guardados del proyecto actual.')) {
                editorState.apiManager.startNewProject();
                // Resetear la interfaz
                document.getElementById('project-name').value = '';
                editorState.animationManager.resetAnimations();
                editorState.grid.isActive = false;
                
                // Limpiar canvas
                const canvas = document.getElementById('editor-canvas');
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                canvas.classList.add('opacity-0');
                
                // Mostrar drop zone
                const dropZoneContent = document.querySelector('#drop-zone > div');
                if(dropZoneContent) dropZoneContent.classList.remove('hidden');
                
                // Reset estado
                editorState.spriteImage = null;
                editorState.isImageLoaded = false;
            }
        });
    }
}

export function renderAnimationsList(animations, activeAnimationName) {
    const list = document.getElementById('animations-list');
    if (!list) return;

    list.innerHTML = '';
    if (Object.keys(animations).length === 0) {
        list.innerHTML = '<li class="text-gray-500 text-sm p-2">No hay animaciones.</li>';
        return;
    }

    for (const name in animations) {
        const anim = animations[name];
        const isActive = name === activeAnimationName;
        const li = document.createElement('li');
        li.className = `p-2 rounded-md cursor-pointer flex justify-between items-center transition-all ${isActive ? 'bg-indigo-100 border-l-4 border-indigo-500' : 'hover:bg-gray-100'}`;
        li.innerHTML = `
            <div class="flex-1">
                <span class="font-bold ${isActive ? 'text-indigo-700' : ''}">${name}</span>
                <div class="text-xs text-gray-600 mt-1">
                    <span class="bg-gray-200 px-2 py-1 rounded">${anim.frames.length} frames</span>
                    <span class="ml-1 text-gray-500">[${anim.frames.join(', ')}]</span>
                </div>
            </div>
            <button data-anim-name="${name}" class="delete-anim-btn text-red-500 hover:text-red-700 text-sm font-semibold ml-2 px-2 py-1 hover:bg-red-100 rounded">✕</button>
        `;

        li.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-anim-btn')) {
                editorState.animationManager.setActiveAnimation(name);
                editorState.previewManager.resetPreview(); // Reset preview cuando cambiamos animación
            }
        });
        
        li.querySelector('.delete-anim-btn').addEventListener('click', (e) => {
             e.stopPropagation();
             if (confirm(`¿Eliminar la animación "${name}"?`)) {
                 editorState.animationManager.deleteAnimation(name);
             }
        });
        
        list.appendChild(li);
    }
}

export function renderProjectsList(projects) {
    const list = document.getElementById('projects-list');
    if (!list) return;

    list.innerHTML = '';
    if (!projects || projects.length === 0) {
        list.innerHTML = '<li class="text-gray-500 text-sm p-3 bg-gray-50 rounded text-center col-span-full">No tienes proyectos guardados.</li>';
        return;
    }
    
    projects.forEach(project => {
        const li = document.createElement('li');
        li.className = 'p-4 rounded-md cursor-pointer hover:bg-gray-100 border border-gray-200 transition-all hover:border-indigo-300 hover:shadow-md bg-white';
        
        const isCurrentProject = editorState.apiManager.getCurrentProjectId && 
                                 editorState.apiManager.getCurrentProjectId() === project.id;
        
        li.innerHTML = `
            <div class="mb-3">
                <div class="font-medium text-gray-900 ${isCurrentProject ? 'text-indigo-700' : ''} truncate" title="${project.project_name}">
                    ${project.project_name}
                </div>
                <div class="text-xs text-gray-500 mt-1">
                    ${isCurrentProject ? '<span class="text-indigo-600 font-medium">● Editando</span><br>' : ''}
                    <span>Actualizado: ${new Date(project.updated_at).toLocaleDateString()}</span>
                </div>
            </div>
            <div class="flex gap-1 justify-center">
                <button class="load-project-btn bg-blue-500 text-white text-xs px-3 py-1 rounded hover:bg-blue-600 transition-colors" data-project-id="${project.id}">
                    Cargar
                </button>
                <button class="delete-project-btn bg-red-500 text-white text-xs px-3 py-1 rounded hover:bg-red-600 transition-colors" data-project-id="${project.id}" data-project-name="${project.project_name}">
                    Eliminar
                </button>
            </div>
        `;

        // Event listener para cargar proyecto
        li.querySelector('.load-project-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            editorState.apiManager.loadProject(project.id);
        });

        // Event listener para eliminar proyecto
        li.querySelector('.delete-project-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            editorState.apiManager.deleteProject(project.id, project.project_name);
        });
        
        list.appendChild(li);
    });
}

export function updateSaveButtonState(isEditing, projectName = '') {
    const saveBtn = document.getElementById('save-project-btn');
    if (!saveBtn) return;

    if (isEditing) {
        saveBtn.textContent = `Actualizar "${projectName}"`;
        saveBtn.className = saveBtn.className.replace('bg-purple-600 hover:bg-purple-700', 'bg-orange-600 hover:bg-orange-700');
    } else {
        saveBtn.textContent = 'Guardar Nuevo Proyecto';
        saveBtn.className = saveBtn.className.replace('bg-orange-600 hover:bg-orange-700', 'bg-purple-600 hover:bg-purple-700');
    }
}

export function showMessage(type, message) {
    const messageBox = document.getElementById('message-box');
    if (!messageBox) return;

    messageBox.textContent = message;
    messageBox.className = 'p-3 rounded-md mb-4 text-center font-medium ';

    if (type === 'success') {
        messageBox.classList.add('bg-green-100', 'text-green-800', 'border', 'border-green-200');
    } else if (type === 'error') {
        messageBox.classList.add('bg-red-100', 'text-red-800', 'border', 'border-red-200');
    } else if (type === 'warning') {
        messageBox.classList.add('bg-yellow-100', 'text-yellow-800', 'border', 'border-yellow-200');
    } else {
        messageBox.classList.add('bg-blue-100', 'text-blue-800', 'border', 'border-blue-200');
    }

    messageBox.classList.remove('hidden');

    // Auto ocultar después de un tiempo
    setTimeout(() => {
        messageBox.classList.add('hidden');
    }, type === 'error' ? 6000 : 4000); // Los errores se muestran más tiempo
}

// Nueva función para mostrar mensajes específicos de animaciones en el área lateral
export function showAnimationMessage(type, message) {
    const animationMessages = document.getElementById('animation-messages');
    if (!animationMessages) {
        // Fallback al mensaje principal si no existe el área específica
        showMessage(type, message);
        return;
    }

    // Crear elemento de mensaje
    const messageElement = document.createElement('div');
    messageElement.className = `p-2 rounded mb-2 text-xs animate-pulse`;
    
    // Limpiar mensajes anteriores del placeholder
    const placeholder = animationMessages.querySelector('.text-gray-500');
    if (placeholder) {
        placeholder.remove();
    }

    if (type === 'success') {
        messageElement.classList.add('bg-green-100', 'text-green-700', 'border-l-2', 'border-green-400');
        messageElement.innerHTML = `✓ ${message}`;
    } else if (type === 'error') {
        messageElement.classList.add('bg-red-100', 'text-red-700', 'border-l-2', 'border-red-400');
        messageElement.innerHTML = `✗ ${message}`;
    } else if (type === 'warning') {
        messageElement.classList.add('bg-yellow-100', 'text-yellow-700', 'border-l-2', 'border-yellow-400');
        messageElement.innerHTML = `⚠ ${message}`;
    } else {
        messageElement.classList.add('bg-blue-100', 'text-blue-700', 'border-l-2', 'border-blue-400');
        messageElement.innerHTML = `ℹ ${message}`;
    }

    // Añadir timestamp
    const timestamp = new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
    messageElement.innerHTML += ` <span class="text-gray-500">${timestamp}</span>`;

    // Insertar al principio (mensajes más recientes arriba)
    animationMessages.insertBefore(messageElement, animationMessages.firstChild);

    // Limitar a 10 mensajes máximo
    while (animationMessages.children.length > 10) {
        animationMessages.removeChild(animationMessages.lastChild);
    }

    // Scroll al top para mostrar el mensaje más reciente
    animationMessages.scrollTop = 0;

    // Quitar la animación después de un tiempo
    setTimeout(() => {
        messageElement.classList.remove('animate-pulse');
    }, 2000);
}