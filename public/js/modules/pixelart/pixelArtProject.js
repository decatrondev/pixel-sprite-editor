// --- MÃ³dulo: GestiÃ³n de Proyectos de Pixel Art (pixelArtProject.js) ---
// PropÃ³sito: Manejar guardado, carga y gestiÃ³n de proyectos de pixel art.

let state = null;
let currentProjectId = null;
let currentProjectName = null;

export function init(pixelArtState) {
    state = pixelArtState;
    setupProjectEvents();
    
    // Solo cargar proyectos si hay elementos de proyecto en el DOM (usuario logueado)
    if (document.getElementById('projects-list')) {
        loadUserProjects();
    }
}

function setupProjectEvents() {
    const saveBtn = document.getElementById('save-project-btn');
    const projectNameInput = document.getElementById('project-name');
    
    if (saveBtn) {
        saveBtn.addEventListener('click', handleSaveProject);
    }
    
    if (projectNameInput) {
        projectNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSaveProject();
            }
        });
    }
}

async function handleSaveProject() {
    const projectNameInput = document.getElementById('project-name');
    const projectName = projectNameInput.value.trim();
    
    if (!projectName) {
        state.ui.showMessage('error', 'Por favor, introduce un nombre para el proyecto.');
        return;
    }
    
    // Validar nombre del proyecto
    if (projectName.length < 3) {
        state.ui.showMessage('error', 'El nombre del proyecto debe tener al menos 3 caracteres.');
        return;
    }
    
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(projectName)) {
        state.ui.showMessage('error', 'El nombre solo puede contener letras, nÃºmeros, espacios, guiones y guiones bajos.');
        return;
    }
    
    const saveBtn = document.getElementById('save-project-btn');
    const originalText = saveBtn.textContent;
    
    try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';
        
        await saveProject(projectName);
        
    } catch (error) {
        console.error('Error al guardar proyecto:', error);
        state.ui.showMessage('error', 'Error al guardar el proyecto.');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

async function saveProject(projectName) {
    // Determinar si es actualizaciÃ³n o nuevo proyecto
    const isUpdate = currentProjectId !== null && currentProjectName === projectName;
    
    // Guardar frame actual y obtener todos los frames como data URLs
    if (state.frames) {
        state.frames.saveCurrentFrame();
    }
    
    const framesData = state.frames ? state.frames.getAllFramesAsDataURLs() : [];
    const currentFrameData = framesData.length > 0 ? framesData[state.frames.getCurrentFrameIndex()] : null;

    const projectData = {
        name: projectName,
        width: state.canvasWidth,
        height: state.canvasHeight,
        // Enviar imageData como espera el backend
        imageData: currentFrameData ? currentFrameData.dataURL : state.canvasModule.getCanvasDataURL(),
        // Datos adicionales para frames
        frames_data: JSON.stringify({
            frames: framesData,
            currentFrame: state.frames ? state.frames.getCurrentFrameIndex() : 0,
            transparentBackground: state.frames ? state.frames.isTransparentBackground() : false
        }),
        palette: state.palette.getPalette(),
        settings: {
            selectedTool: state.selectedTool,
            brushSize: state.brushSize,
            selectedColor: state.selectedColor,
            showGrid: state.showGrid
        },
        isUpdate: isUpdate,
        projectId: currentProjectId
    };
    
    const response = await fetch('/api/pixelart/save-project', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData)
    });
    
    if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
        currentProjectId = result.projectId;
        currentProjectName = projectName;
        state.isProjectModified = false;
        
        // Actualizar UI
        updateSaveButtonState(true, projectName);
        state.ui.showMessage('success', result.message);
        loadUserProjects();
    } else {
        state.ui.showMessage('error', result.message || 'No se pudo guardar el proyecto.');
    }
}

export async function loadProject(projectId) {
    try {
        state.ui.showMessage('info', 'Cargando proyecto...');
        
        const response = await fetch(`/api/pixelart/load-project/${projectId}`);
        
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            const project = result.project;
            
            // Resetear proyecto actual
            resetCurrentProject();
            
            // Cargar dimensiones del canvas
            if (project.canvas_width && project.canvas_height) {
                state.canvasModule.createCanvas(project.canvas_width, project.canvas_height);
                
                // CORREGIDO: Actualizar estado interno
                state.canvasWidth = project.canvas_width;
                state.canvasHeight = project.canvas_height;
                
                // Actualizar inputs
                const widthInput = document.getElementById('canvas-width');
                const heightInput = document.getElementById('canvas-height');
                if (widthInput) widthInput.value = project.canvas_width;
                if (heightInput) heightInput.value = project.canvas_height;
            }
            
            // Cargar imagen principal
            if (project.image_data) {
                await loadImageFromDataURL(project.image_data);
            }
            
            // CORREGIDO: Cargar frames si existen - mejor manejo de errores
            if (project.frames_data) {
                try {
                    // CORREGIDO: Verificar si frames_data es string o ya es objeto
                    let framesData;
                    if (typeof project.frames_data === 'string') {
                        framesData = JSON.parse(project.frames_data);
                    } else if (typeof project.frames_data === 'object' && project.frames_data !== null) {
                        framesData = project.frames_data;
                    } else {
                        console.warn('frames_data no es válido:', project.frames_data);
                        framesData = null;
                    }
                    
                    if (state.frames && framesData && framesData.frames) {
                        state.frames.loadFramesFromData(framesData.frames);
                        
                        // Establecer frame actual
                        if (typeof framesData.currentFrame === 'number') {
                            state.frames.setCurrentFrame(framesData.currentFrame);
                        }
                        
                        // Configurar transparencia
                        if (typeof framesData.transparentBackground === 'boolean') {
                            state.frames.setTransparentBackground(framesData.transparentBackground);
                        }
                    }
                } catch (parseError) {
                    console.warn('Error al parsear datos de frames:', parseError, 'frames_data:', project.frames_data);
                    // Continuar sin frames, no es crítico
                }
            }
            
            // CORREGIDO: Cargar configuraciones - mejor manejo de errores
            if (project.settings) {
                try {
                    let settings;
                    if (typeof project.settings === 'string') {
                        settings = JSON.parse(project.settings);
                    } else if (typeof project.settings === 'object' && project.settings !== null) {
                        settings = project.settings;
                    }
                    
                    if (settings) {
                        applyProjectSettings(settings);
                    }
                } catch (parseError) {
                    console.warn('Error al parsear configuraciones:', parseError);
                    // Continuar con configuraciones por defecto
                }
            }
            
            // Establecer proyecto actual
            currentProjectId = project.id;
            currentProjectName = project.project_name;
            
            // Actualizar UI
            const projectNameInput = document.getElementById('project-name');
            if (projectNameInput) {
                projectNameInput.value = project.project_name;
            }
            updateSaveButtonState(true, project.project_name);
            
            // CORREGIDO: Redibujar elementos después de cargar
            state.grid.drawGrid();
            state.canvasModule.updatePreview();
            
            // Guardar estado inicial en historial
            state.history.clearHistory();
            state.history.saveState();
            
            state.ui.showMessage('success', `Proyecto "${project.project_name}" cargado correctamente.`);
            
        } else {
            state.ui.showMessage('error', result.message || 'No se pudo cargar el proyecto.');
        }
    } catch (error) {
        console.error('Error al cargar proyecto:', error);
        state.ui.showMessage('error', 'Error de conexiÃ³n al cargar el proyecto.');
    }
}

function loadImageFromDataURL(dataURL) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            // Limpiar canvas antes de dibujar
            state.canvasModule.clearCanvas();
            
            // Dibujar imagen en el canvas
            state.ctx.drawImage(img, 0, 0);
            state.canvasModule.updatePreview();
            resolve();
        };
        img.onerror = () => {
            reject(new Error('Error al cargar la imagen del proyecto'));
        };
        img.src = dataURL;
    });
}

function applyProjectSettings(settings) {
    // CORREGIDO: Aplicar configuraciones de forma más segura
    if (settings.selectedTool && state.tools && state.tools.selectTool) {
        state.tools.selectTool(settings.selectedTool);
    }
    
    if (settings.brushSize && state.tools && state.tools.setBrushSize) {
        state.tools.setBrushSize(settings.brushSize);
    }
    
    if (settings.selectedColor && state.palette && state.palette.setSelectedColor) {
        state.palette.setSelectedColor(settings.selectedColor);
        state.selectedColor = settings.selectedColor;
    }
    
    if (settings.palette && Array.isArray(settings.palette) && state.palette && state.palette.setPalette) {
        state.palette.setPalette(settings.palette);
    }
    
    if (typeof settings.showGrid === 'boolean') {
        const gridCheckbox = document.getElementById('show-grid');
        if (gridCheckbox) {
            gridCheckbox.checked = settings.showGrid;
        }
        state.showGrid = settings.showGrid;
        if (state.grid && state.grid.toggleGrid) {
            state.grid.toggleGrid(settings.showGrid);
        }
    }
}

export async function deleteProject(projectId, projectName) {
    if (!confirm(`Â¿EstÃ¡s seguro de que quieres eliminar el proyecto "${projectName}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/pixelart/delete-project/${projectId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Si eliminamos el proyecto actual, resetear estado
            if (currentProjectId === projectId) {
                resetCurrentProject();
                updateSaveButtonState(false);
            }
            
            state.ui.showMessage('success', result.message);
            loadUserProjects();
        } else {
            state.ui.showMessage('error', result.message || 'No se pudo eliminar el proyecto.');
        }
    } catch (error) {
        console.error('Error al eliminar proyecto:', error);
        state.ui.showMessage('error', 'Error de conexiÃ³n al eliminar el proyecto.');
    }
}

export function startNewProject() {
    if (state.isProjectModified) {
        if (!confirm('Â¿EstÃ¡s seguro? Se perderÃ¡n los cambios no guardados.')) {
            return;
        }
    }
    
    resetCurrentProject();
    
    // Limpiar canvas
    state.canvasModule.clearCanvas();
    
    // Resetear configuraciones
    state.tools.selectTool('brush');
    state.tools.setBrushSize(1);
    state.palette.setSelectedColor('#000000');
    
    // Limpiar historial
    state.history.clearHistory();
    state.history.saveState();
    
    updateSaveButtonState(false);
    state.ui.showMessage('info', 'Nuevo proyecto iniciado.');
}

function resetCurrentProject() {
    currentProjectId = null;
    currentProjectName = null;
    state.isProjectModified = false;
    
    // Limpiar input del nombre
    const projectNameInput = document.getElementById('project-name');
    if (projectNameInput) {
        projectNameInput.value = '';
    }
}

async function loadUserProjects() {
    try {
        const response = await fetch('/api/pixelart/get-projects');
        const result = await response.json();
        
        if (result.success) {
            renderProjectsList(result.projects);
        }
    } catch (error) {
        console.error('Error al cargar proyectos:', error);
        // No mostrar error de 401 si es porque no estÃ¡ logueado
        if (error.message && !error.message.includes('401')) {
            state.ui.showMessage('error', 'Error al cargar proyectos');
        }
    }
}

// CORREGIDO: renderProjectsList mejorada
function renderProjectsList(projects) {
    const projectsList = document.getElementById('projects-list');
    if (!projectsList) return;
    
    projectsList.innerHTML = '';
    
    if (!projects || projects.length === 0) {
        projectsList.innerHTML = `
            <div style="text-align: center; padding: 1rem; color: #6b7280; font-size: 0.875rem;">
                No tienes proyectos de pixel art guardados.
            </div>
        `;
        return;
    }
    
    projects.forEach(project => {
        const projectItem = document.createElement('div');
        projectItem.className = 'project-item';
        
        const isCurrentProject = currentProjectId === project.id;
        if (isCurrentProject) {
            projectItem.classList.add('current');
        }
        
        // CORREGIDO: Mejor formato de fecha
        const updatedDate = new Date(project.updated_at);
        const formattedDate = updatedDate.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        projectItem.innerHTML = `
            <div class="project-info">
                <div class="project-name ${isCurrentProject ? 'current-project' : ''}">${escapeHtml(project.project_name)}</div>
                <div class="project-meta">
                    ${isCurrentProject ? '<span style="color: #4f46e5; font-weight: 500;">● Editando</span><br>' : ''}
                    ${project.canvas_width}x${project.canvas_height} • ${formattedDate}
                </div>
            </div>
            <div class="project-actions">
                <button class="btn btn-primary load-btn">Cargar</button>
                <button class="btn btn-danger delete-btn">Eliminar</button>
            </div>
        `;
        
        // Event listeners
        projectItem.querySelector('.load-btn').addEventListener('click', () => {
            if (state.isProjectModified) {
                if (confirm('¿Quieres cargar este proyecto? Se perderán los cambios no guardados.')) {
                    loadProject(project.id);
                }
            } else {
                loadProject(project.id);
            }
        });
        
        projectItem.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteProject(project.id, project.project_name);
        });
        
        projectsList.appendChild(projectItem);
    });
}

// NUEVO: función para escapar HTML y prevenir XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateSaveButtonState(isEditing, projectName = '') {
    const saveBtn = document.getElementById('save-project-btn');
    if (!saveBtn) return;
    
    if (isEditing) {
        saveBtn.textContent = `Actualizar "${projectName}"`;
        saveBtn.className = saveBtn.className.replace('btn-primary', 'btn-warning');
    } else {
        saveBtn.textContent = 'Guardar Proyecto';
        saveBtn.className = saveBtn.className.replace('btn-warning', 'btn-primary');
    }
}

// Funciones pÃºblicas para acceso desde otros mÃ³dulos
export function getCurrentProjectId() {
    return currentProjectId;
}

export function getCurrentProjectName() {
    return currentProjectName;
}

export function isProjectModified() {
    return state.isProjectModified;
}

export function markAsModified() {
    state.isProjectModified = true;
}