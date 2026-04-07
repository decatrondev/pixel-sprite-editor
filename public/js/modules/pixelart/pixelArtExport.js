// --- Módulo: Exportación (pixelArtExport.js) ---
// Propósito: Manejar la exportación de imágenes y datos del pixel art.

let state = null;

export function init(pixelArtState) {
    state = pixelArtState;
    setupExportEvents();
}

function setupExportEvents() {
    // Eventos para exportación
    document.getElementById('export-png-btn')?.addEventListener('click', () => exportCurrentFrame());
    document.getElementById('export-all-frames-btn')?.addEventListener('click', () => showExportDialog());
    document.getElementById('export-spritesheet-btn')?.addEventListener('click', () => showSpritesheetDialog());
}

// Función que faltaba y causaba el error
export function exportAsPNG() {
    exportCurrentFrame();
}

function showExportDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;
    
    dialog.innerHTML = `
        <div style="background: white; border-radius: 8px; padding: 24px; max-width: 400px; width: 90%; margin: 16px;">
            <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 16px;">Exportar Frames</h3>
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <button id="export-individual-frames" style="width: 100%; background: #3b82f6; color: white; padding: 12px; border: none; border-radius: 4px; cursor: pointer;">
                    📦 Descargar ZIP con frames individuales
                </button>
                <button id="export-as-spritesheet" style="width: 100%; background: #10b981; color: white; padding: 12px; border: none; border-radius: 4px; cursor: pointer;">
                    🖼️ Exportar como Spritesheet
                </button>
                <button id="cancel-export" style="width: 100%; background: #6b7280; color: white; padding: 12px; border: none; border-radius: 4px; cursor: pointer;">
                    Cancelar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Event listeners
    dialog.querySelector('#export-individual-frames').addEventListener('click', () => {
        document.body.removeChild(dialog);
        exportAllFramesAsZip();
    });
    
    dialog.querySelector('#export-as-spritesheet').addEventListener('click', () => {
        document.body.removeChild(dialog);
        showSpritesheetDialog();
    });
    
    dialog.querySelector('#cancel-export').addEventListener('click', () => {
        document.body.removeChild(dialog);
    });
    
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            document.body.removeChild(dialog);
        }
    });
}

function showSpritesheetDialog() {
    const frameCount = state.frames ? state.frames.getFrameCount() : 1;
    const suggestedCols = Math.ceil(Math.sqrt(frameCount));
    const suggestedRows = Math.ceil(frameCount / suggestedCols);
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;
    
    dialog.innerHTML = `
        <div style="background: white; border-radius: 8px; padding: 24px; max-width: 400px; width: 90%; margin: 16px;">
            <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 16px;">Exportar como Spritesheet</h3>
            <div style="display: flex; flex-direction: column; gap: 16px;">
                <div>
                    <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px;">Columnas:</label>
                    <input type="number" id="spritesheet-cols" value="${suggestedCols}" min="1" max="${frameCount}" 
                           style="width: 100%; border: 1px solid #d1d5db; border-radius: 4px; padding: 8px 12px;">
                </div>
                <div>
                    <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px;">Filas:</label>
                    <input type="number" id="spritesheet-rows" value="${suggestedRows}" min="1" max="${frameCount}" 
                           style="width: 100%; border: 1px solid #d1d5db; border-radius: 4px; padding: 8px 12px;">
                </div>
                <div>
                    <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px;">Escala:</label>
                    <select id="spritesheet-scale" style="width: 100%; border: 1px solid #d1d5db; border-radius: 4px; padding: 8px 12px;">
                        <option value="1">1x (Original)</option>
                        <option value="2" selected>2x</option>
                        <option value="4">4x</option>
                        <option value="8">8x</option>
                    </select>
                </div>
                <div style="font-size: 14px; color: #6b7280;">
                    Total de frames: ${frameCount}<br>
                    Se organizarán en una grilla de <span id="grid-preview">${suggestedCols}x${suggestedRows}</span>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button id="export-spritesheet-confirm" style="flex: 1; background: #10b981; color: white; padding: 12px; border: none; border-radius: 4px; cursor: pointer;">
                        Exportar
                    </button>
                    <button id="cancel-spritesheet" style="flex: 1; background: #6b7280; color: white; padding: 12px; border: none; border-radius: 4px; cursor: pointer;">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Actualizar preview cuando cambien los valores
    const colsInput = dialog.querySelector('#spritesheet-cols');
    const rowsInput = dialog.querySelector('#spritesheet-rows');
    const gridPreview = dialog.querySelector('#grid-preview');
    
    function updatePreview() {
        const cols = parseInt(colsInput.value);
        const rows = parseInt(rowsInput.value);
        gridPreview.textContent = `${cols}x${rows}`;
    }
    
    colsInput.addEventListener('input', updatePreview);
    rowsInput.addEventListener('input', updatePreview);
    
    // Event listeners
    dialog.querySelector('#export-spritesheet-confirm').addEventListener('click', () => {
        const cols = parseInt(colsInput.value);
        const rows = parseInt(rowsInput.value);
        const scale = parseInt(dialog.querySelector('#spritesheet-scale').value);
        
        document.body.removeChild(dialog);
        exportAsSpritesheet(cols, rows, scale);
    });
    
    dialog.querySelector('#cancel-spritesheet').addEventListener('click', () => {
        document.body.removeChild(dialog);
    });
    
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            document.body.removeChild(dialog);
        }
    });
}

export function exportCurrentFrame() {
    const canvas = state.canvas;
    
    // Crear un nombre de archivo único
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const frameNumber = state.frames ? state.frames.getCurrentFrameIndex() + 1 : 1;
    const filename = `pixelart_frame_${frameNumber}_${timestamp}.png`;
    
    // Crear enlace de descarga
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        // Limpiar URL temporal
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        if (state.ui && state.ui.showMessage) {
            state.ui.showMessage('success', `Frame exportado como ${filename}`);
        }
    }, 'image/png');
}

// CORREGIDO: Función de exportación ZIP sin errores
export async function exportAllFramesAsZip() {
    if (!state.frames) {
        exportCurrentFrame();
        return;
    }
    
    try {
        if (state.ui && state.ui.showMessage) {
            state.ui.showMessage('info', 'Preparando ZIP con todos los frames...');
        }
        
        // CORREGIDO: Cargar JSZip correctamente y manejar errores
        let JSZip;
        try {
            // Intentar cargar JSZip desde CDN
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            document.head.appendChild(script);
            
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
            });
            
            JSZip = window.JSZip;
            if (!JSZip) {
                throw new Error('JSZip no se pudo cargar desde CDN');
            }
        } catch (error) {
            console.error('Error cargando JSZip:', error);
            if (state.ui && state.ui.showMessage) {
                state.ui.showMessage('error', 'No se pudo cargar la librería de compresión. Exportando frame actual.');
            }
            exportCurrentFrame();
            return;
        }
        
        const zip = new JSZip();
        
        const frames = state.frames.getAllFramesAsDataURLs();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        
        // Agregar cada frame al ZIP
        frames.forEach((frameData, index) => {
            const frameNumber = String(index + 1).padStart(3, '0');
            const filename = `frame_${frameNumber}.png`;
            
            // Convertir dataURL a blob
            const base64Data = frameData.dataURL.split(',')[1];
            zip.file(filename, base64Data, { base64: true });
        });
        
        // Agregar archivo de metadatos
        const metadata = {
            totalFrames: frames.length,
            dimensions: {
                width: state.canvasWidth,
                height: state.canvasHeight
            },
            exportDate: new Date().toISOString(),
            transparentBackground: state.frames.isTransparentBackground()
        };
        
        zip.file('metadata.json', JSON.stringify(metadata, null, 2));
        
        // Generar y descargar ZIP
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pixelart_frames_${timestamp}.zip`;
        link.click();
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        if (state.ui && state.ui.showMessage) {
            state.ui.showMessage('success', `${frames.length} frames exportados en ZIP`);
        }
        
    } catch (error) {
        console.error('Error al crear ZIP:', error);
        if (state.ui && state.ui.showMessage) {
            state.ui.showMessage('error', 'Error al crear el archivo ZIP. Exportando frame actual.');
        }
        // Fallback: exportar frame actual
        exportCurrentFrame();
    }
}

export function exportAsSpritesheet(cols, rows, scale = 1) {
    if (!state.frames) {
        exportCurrentFrame();
        return;
    }
    
    try {
        if (state.ui && state.ui.showMessage) {
            state.ui.showMessage('info', 'Generando spritesheet...');
        }
        
        const frames = state.frames.getAllFramesAsDataURLs();
        const frameWidth = state.canvasWidth * scale;
        const frameHeight = state.canvasHeight * scale;
        
        // Crear canvas para el spritesheet
        const spritesheetCanvas = document.createElement('canvas');
        spritesheetCanvas.width = cols * frameWidth;
        spritesheetCanvas.height = rows * frameHeight;
        const ctx = spritesheetCanvas.getContext('2d');
        
        // Configurar para píxeles nítidos
        ctx.imageSmoothingEnabled = false;
        ctx.webkitImageSmoothingEnabled = false;
        ctx.mozImageSmoothingEnabled = false;
        ctx.msImageSmoothingEnabled = false;
        
        // Si no es transparente, llenar con blanco
        if (!state.frames.isTransparentBackground()) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, spritesheetCanvas.width, spritesheetCanvas.height);
        }
        
        let processedFrames = 0;
        const totalFramesToProcess = Math.min(frames.length, cols * rows);
        
        // Dibujar cada frame en su posición correspondiente
        frames.forEach((frameData, index) => {
            if (index >= cols * rows) return; // No exceder el límite de la grilla
            
            const img = new Image();
            img.onload = () => {
                const col = index % cols;
                const row = Math.floor(index / cols);
                const x = col * frameWidth;
                const y = row * frameHeight;
                
                ctx.drawImage(img, x, y, frameWidth, frameHeight);
                processedFrames++;
                
                // Cuando se hayan procesado todos los frames, descargar
                if (processedFrames === totalFramesToProcess) {
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                    const filename = `spritesheet_${cols}x${rows}_${scale}x_${timestamp}.png`;
                    
                    spritesheetCanvas.toBlob((blob) => {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = filename;
                        link.click();
                        
                        setTimeout(() => URL.revokeObjectURL(url), 100);
                        
                        // Crear archivo JSON con metadatos
                        const metadata = {
                            spritesheet: {
                                filename: filename,
                                dimensions: {
                                    width: spritesheetCanvas.width,
                                    height: spritesheetCanvas.height
                                },
                                grid: {
                                    cols: cols,
                                    rows: rows
                                },
                                frame: {
                                    width: frameWidth,
                                    height: frameHeight
                                },
                                scale: scale,
                                totalFrames: totalFramesToProcess
                            },
                            original: {
                                dimensions: {
                                    width: state.canvasWidth,
                                    height: state.canvasHeight
                                },
                                transparentBackground: state.frames.isTransparentBackground()
                            },
                            exportDate: new Date().toISOString()
                        };
                        
                        const metadataFilename = filename.replace('.png', '_metadata.json');
                        const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
                        const metadataUrl = URL.createObjectURL(metadataBlob);
                        const metadataLink = document.createElement('a');
                        metadataLink.href = metadataUrl;
                        metadataLink.download = metadataFilename;
                        metadataLink.click();
                        
                        setTimeout(() => URL.revokeObjectURL(metadataUrl), 100);
                        
                        if (state.ui && state.ui.showMessage) {
                            state.ui.showMessage('success', `Spritesheet ${cols}x${rows} exportado con metadatos`);
                        }
                    }, 'image/png');
                }
            };
            
            img.onerror = () => {
                console.error(`Error cargando frame ${index}`);
                processedFrames++;
                if (processedFrames === totalFramesToProcess) {
                    if (state.ui && state.ui.showMessage) {
                        state.ui.showMessage('warning', 'Spritesheet generado con algunos errores');
                    }
                }
            };
            
            img.src = frameData.dataURL;
        });
        
    } catch (error) {
        console.error('Error al crear spritesheet:', error);
        if (state.ui && state.ui.showMessage) {
            state.ui.showMessage('error', 'Error al crear el spritesheet');
        }
    }
}

export function exportAsScaledPNG(scale = 1) {
    const originalCanvas = state.canvas;
    const scaledWidth = state.canvasWidth * scale;
    const scaledHeight = state.canvasHeight * scale;
    
    // Crear canvas temporal escalado
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = scaledWidth;
    tempCanvas.height = scaledHeight;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Configurar para píxeles nítidos
    tempCtx.imageSmoothingEnabled = false;
    tempCtx.webkitImageSmoothingEnabled = false;
    tempCtx.mozImageSmoothingEnabled = false;
    tempCtx.msImageSmoothingEnabled = false;
    
    // Dibujar imagen escalada
    tempCtx.drawImage(originalCanvas, 0, 0, scaledWidth, scaledHeight);
    
    // Crear nombre de archivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `pixelart_${scale}x_${timestamp}.png`;
    
    // Descargar
    tempCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
        if (state.ui && state.ui.showMessage) {
            state.ui.showMessage('success', `Imagen escalada ${scale}x exportada como ${filename}`);
        }
    }, 'image/png');
}

export function getImageDataURL() {
    return state.canvas.toDataURL('image/png');
}

export function exportProjectData() {
    const projectData = {
        meta: {
            app: "PixelSprite Pixel Art Editor",
            version: "1.0.0",
            created: new Date().toISOString(),
            dimensions: {
                width: state.canvasWidth,
                height: state.canvasHeight
            }
        },
        frames: state.frames ? state.frames.getAllFramesAsDataURLs() : [{ index: 0, dataURL: getImageDataURL() }],
        currentFrame: state.frames ? state.frames.getCurrentFrameIndex() : 0,
        transparentBackground: state.frames ? state.frames.isTransparentBackground() : false,
        palette: state.palette ? state.palette.getPalette() : [],
        settings: {
            currentTool: state.selectedTool,
            brushSize: state.brushSize,
            selectedColor: state.selectedColor,
            showGrid: state.showGrid
        }
    };
    
    return JSON.stringify(projectData, null, 2);
}

export function downloadProjectFile() {
    const projectData = exportProjectData();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `pixelart_project_${timestamp}.json`;
    
    const blob = new Blob([projectData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
    if (state.ui && state.ui.showMessage) {
        state.ui.showMessage('success', `Proyecto exportado como ${filename}`);
    }
}