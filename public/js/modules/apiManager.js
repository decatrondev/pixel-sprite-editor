// --- Módulo: Gestor de API (apiManager.js) ---
// Propósito: Manejar las llamadas fetch al backend para guardar/cargar proyectos.

let editorState = null;
let currentProjectId = null; // Para saber si estamos editando un proyecto existente
let currentProjectName = null;

export function init(state) {
    editorState = state;
    loadUserProjects();
}

export async function saveProject(projectName) {
    if (!editorState.isImageLoaded) {
        editorState.uiManager.showMessage('error', 'No hay ninguna imagen cargada para guardar.');
        return;
    }

    // Validar que existan animaciones antes de guardar
    if (Object.keys(editorState.animations).length === 0) {
        editorState.uiManager.showMessage('error', 'Crea al menos una animación antes de guardar el proyecto.');
        return;
    }

    // Determinar si es actualización o nuevo proyecto
    const isUpdate = currentProjectId !== null && currentProjectName === projectName;

    try {
        // Si es actualización, solo enviar los datos JSON
        if (isUpdate) {
            const fullJsonData = editorState.jsonGenerator.generateJson();
            if (!fullJsonData) {
                throw new Error("No se pudieron generar los datos del proyecto.");
            }

            const response = await fetch('/api/save-project', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    projectId: currentProjectId,
                    jsonData: fullJsonData,
                    isUpdate: true
                })
            });

            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                editorState.uiManager.showMessage('success', 'Proyecto actualizado correctamente.');
                loadUserProjects();
            } else {
                editorState.uiManager.showMessage('error', result.message || 'No se pudo actualizar el proyecto.');
            }
            return;
        }

        // Si es proyecto nuevo, necesitamos la imagen
        const canvas = document.getElementById('editor-canvas');
        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('No se pudo crear la imagen'));
            }, 'image/png');
        });

        const formData = new FormData();
        formData.append('projectName', projectName);
        formData.append('spriteImage', blob, editorState.spriteImage.name || 'sprite.png');
        
        const fullJsonData = editorState.jsonGenerator.generateJson();
        if (!fullJsonData) {
            throw new Error("No se pudieron generar los datos del proyecto.");
        }

        formData.append('jsonData', fullJsonData);
        formData.append('isUpdate', 'false');

        editorState.uiManager.showMessage('info', 'Guardando proyecto nuevo...');

        const response = await fetch('/api/save-project', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }
        
        const result = await response.json();

        if (result.success) {
            // Actualizar el estado para indicar que ahora estamos editando este proyecto
            currentProjectId = result.projectId;
            currentProjectName = projectName;
            
            editorState.uiManager.showMessage('success', result.message);
            editorState.uiManager.updateSaveButtonState(true, projectName);
            loadUserProjects();
        } else {
            editorState.uiManager.showMessage('error', result.message || 'No se pudo guardar el proyecto.');
        }

    } catch (error) {
        console.error('Error al guardar proyecto:', error);
        editorState.uiManager.showMessage('error', 'Error al procesar o enviar los datos.');
        throw error;
    }
}

export async function loadProject(projectId) {
    try {
        editorState.uiManager.showMessage('info', 'Cargando proyecto...');
        
        const response = await fetch(`/api/load-project/${projectId}`);
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }
        
        const result = await response.json();

        if (result.success) {
            const project = result.project;
            const projectData = JSON.parse(project.json_data);

            // IMPORTANTE: Resetear estado actual
            resetCurrentProject();

            // PASO 1: Resetear el estado del editor completamente
            editorState.animationManager.resetAnimations();
            editorState.grid.isActive = false;
            
            // PASO 2: Cargar la imagen primero y esperar a que se complete
            await loadImageFromUrlPromise(project.image_path);

            // PASO 3: Configurar y aplicar el grid después de que la imagen esté cargada
            if (projectData.frames && projectData.frames.width > 0) {
                const { width, height } = projectData.frames;
                
                // Actualizar los inputs en la UI
                document.getElementById('frame-width').value = width;
                document.getElementById('frame-height').value = height;
                
                // Aplicar el grid correctamente
                editorState.canvasManager.defineGrid(width, height);
            }

            // PASO 4: Cargar las animaciones después del grid
            if (projectData.animations) {
                editorState.animationManager.loadAnimations(projectData.animations);
            }

            // PASO 5: Establecer el contexto del proyecto actual
            currentProjectId = project.id;
            currentProjectName = project.project_name;
            
            // PASO 6: Actualizar UI para mostrar que estamos editando
            const projectNameInput = document.getElementById('project-name');
            if (projectNameInput) {
                projectNameInput.value = project.project_name;
            }
            
            editorState.uiManager.updateSaveButtonState(true, project.project_name);

            // PASO 7: Forzar un redibujado completo
            editorState.canvasManager.redrawCanvasAndHighlights();

            editorState.uiManager.showMessage('success', `Proyecto "${project.project_name}" cargado y listo para editar.`);

        } else {
            editorState.uiManager.showMessage('error', result.message || 'No se pudo cargar el proyecto.');
        }
    } catch (error) {
        console.error('Error al cargar proyecto:', error);
        editorState.uiManager.showMessage('error', 'Error de conexión al cargar el proyecto.');
    }
}

export async function deleteProject(projectId, projectName) {
    if (!confirm(`¿Estás seguro de que quieres eliminar el proyecto "${projectName}"? Esta acción no se puede deshacer.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/delete-project/${projectId}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        
        if (result.success) {
            // Si eliminamos el proyecto que estamos editando actualmente, resetear estado
            if (currentProjectId === projectId) {
                resetCurrentProject();
                editorState.uiManager.updateSaveButtonState(false);
            }
            
            editorState.uiManager.showMessage('success', result.message);
            loadUserProjects();
        } else {
            editorState.uiManager.showMessage('error', result.message || 'No se pudo eliminar el proyecto.');
        }
    } catch (error) {
        console.error('Error al eliminar proyecto:', error);
        editorState.uiManager.showMessage('error', 'Error de conexión al eliminar el proyecto.');
    }
}

// Función para crear un nuevo proyecto (resetear el estado actual)
export function startNewProject() {
    resetCurrentProject();
    editorState.uiManager.updateSaveButtonState(false);
    editorState.uiManager.showMessage('info', 'Listo para crear un nuevo proyecto.');
}

// Función interna para resetear el proyecto actual
function resetCurrentProject() {
    currentProjectId = null;
    currentProjectName = null;
    
    // Limpiar el input del nombre del proyecto
    const projectNameInput = document.getElementById('project-name');
    if (projectNameInput) {
        projectNameInput.value = '';
    }
}

// Función para convertir loadImageFromUrl en una promesa
function loadImageFromUrlPromise(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        
        img.onload = () => {
            editorState.spriteImage = img;
            editorState.isImageLoaded = true;
            editorState.canvasManager.drawImageOnCanvas(img);
            
            // Ocultar el texto de la drop-zone al cargar un proyecto
            const dropZoneContent = document.querySelector('#drop-zone > div');
            if(dropZoneContent) dropZoneContent.classList.add('hidden');
            
            resolve();
        };
        
        img.onerror = () => {
            editorState.uiManager.showMessage('error', 'No se pudo cargar la imagen del proyecto.');
            reject(new Error('Failed to load image'));
        };
        
        img.src = url;
    });
}

async function loadUserProjects() {
    try {
        const response = await fetch('/api/get-projects');
        const result = await response.json();
        if (result.success) {
            editorState.uiManager.renderProjectsList(result.projects);
        }
    } catch (error) {
        console.error('Error al obtener la lista de proyectos:', error);
    }
}

// Getters públicos para el estado actual
export function getCurrentProjectId() {
    return currentProjectId;
}

export function getCurrentProjectName() {
    return currentProjectName;
}

// Función para verificar si estamos editando un proyecto
export function isEditingProject() {
    return currentProjectId !== null;
}