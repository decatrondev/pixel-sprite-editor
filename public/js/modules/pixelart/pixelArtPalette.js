// --- Módulo: Gestión de Paleta de Colores (pixelArtPalette.js) ---
// Propósito: Manejar la paleta de colores, presets y selección de colores.

let state = null;

// Paletas predefinidas
const colorPresets = {
    default: [
        '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
        '#800000', '#008000', '#000080', '#808000', '#800080', '#008080', '#808080', '#C0C0C0',
        '#FF8080', '#80FF80', '#8080FF', '#FFFF80', '#FF80FF', '#80FFFF', '#FF8000', '#8000FF'
    ],
    gameboy: [
        '#9BBD0F', '#8BAC0F', '#306230', '#0F380F'
    ],
    nes: [
        '#7C7C7C', '#0000FC', '#0000BC', '#4428BC', '#940084', '#A80020', '#A81000', '#881400',
        '#503000', '#007800', '#006800', '#005800', '#004058', '#000000', '#000000', '#000000',
        '#BCBCBC', '#0078F8', '#0058F8', '#6844FC', '#D800CC', '#E40058', '#F83800', '#E45C10',
        '#AC7C00', '#00B800', '#00A800', '#00A844', '#008888', '#000000', '#000000', '#000000',
        '#F8F8F8', '#3CBCFC', '#6888FC', '#9878F8', '#F878F8', '#F85898', '#F87858', '#FCA044',
        '#F8B800', '#B8F818', '#58D854', '#58F898', '#00E8D8', '#787878', '#000000', '#000000',
        '#FCFCFC', '#A4E4FC', '#B8B8F8', '#D8B8F8', '#F8B8F8', '#F8A4C0', '#F0D0B0', '#FCE0A8',
        '#F8D878', '#D8F878', '#B8F8B8', '#B8F8D8', '#00FCFC', '#F8D8F8', '#000000', '#000000'
    ],
    c64: [
        '#000000', '#FFFFFF', '#68372B', '#70A4B2', '#6F3D86', '#588D43', '#352879', '#B8C76F',
        '#6F4F25', '#433900', '#9A6759', '#444444', '#6C6C6C', '#9AD284', '#6C5EB5', '#959595'
    ]
};

export function init(pixelArtState) {
    state = pixelArtState;
    setupPaletteEvents();
    loadPreset('default');
}

function setupPaletteEvents() {
    // Color picker principal
    const colorPicker = document.getElementById('color-picker');
    const colorInput = document.getElementById('color-input');
    const currentColorDisplay = document.getElementById('current-color');
    const palettePreset = document.getElementById('palette-preset');
    
    if (colorPicker) {
        colorPicker.addEventListener('change', (e) => {
            setSelectedColor(e.target.value);
        });
    }
    
    if (colorInput) {
        colorInput.addEventListener('change', (e) => {
            const color = validateHexColor(e.target.value);
            if (color) {
                setSelectedColor(color);
            } else {
                state.ui.showMessage('error', 'Color hexadecimal inválido');
                e.target.value = state.selectedColor;
            }
        });
    }
    
    if (currentColorDisplay) {
        currentColorDisplay.addEventListener('click', () => {
            colorPicker.click();
        });
    }
    
    if (palettePreset) {
        palettePreset.addEventListener('change', (e) => {
            loadPreset(e.target.value);
        });
    }
}

export function loadPreset(presetName) {
    if (!colorPresets[presetName]) {
        console.error(`Preset de colores '${presetName}' no encontrado`);
        return;
    }
    
    state.colorPalette = [...colorPresets[presetName]];
    state.currentPalettePreset = presetName;
    
    renderPalette();
    state.ui.showMessage('success', `Paleta '${presetName}' cargada`);
}

function renderPalette() {
    const paletteContainer = document.getElementById('color-palette');
    if (!paletteContainer) return;
    
    paletteContainer.innerHTML = '';
    
    state.colorPalette.forEach((color, index) => {
        const colorSwatch = document.createElement('div');
        colorSwatch.className = 'w-6 h-6 border border-gray-300 cursor-pointer rounded-sm hover:border-gray-600 transition-all color-swatch';
        colorSwatch.style.backgroundColor = color;
        colorSwatch.title = color;
        
        colorSwatch.addEventListener('click', () => {
            setSelectedColor(color);
        });
        
        colorSwatch.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            editPaletteColor(index);
        });
        
        paletteContainer.appendChild(colorSwatch);
    });
    
    // Agregar botón para añadir color (solo si hay espacio)
    if (state.colorPalette.length < 32) {
        const addButton = document.createElement('div');
        addButton.className = 'w-6 h-6 border-2 border-dashed border-gray-400 cursor-pointer rounded-sm hover:border-gray-600 flex items-center justify-center text-gray-500 hover:text-gray-700';
        addButton.innerHTML = '+';
        addButton.title = 'Añadir color';
        
        addButton.addEventListener('click', () => {
            addColorToPalette(state.selectedColor);
        });
        
        paletteContainer.appendChild(addButton);
    }
}

export function setSelectedColor(color) {
    const validColor = validateHexColor(color);
    if (!validColor) return;
    
    state.selectedColor = validColor;
    
    // Actualizar UI
    const colorPicker = document.getElementById('color-picker');
    const colorInput = document.getElementById('color-input');
    const currentColorDisplay = document.getElementById('current-color');
    
    if (colorPicker) colorPicker.value = validColor;
    if (colorInput) colorInput.value = validColor;
    if (currentColorDisplay) currentColorDisplay.style.backgroundColor = validColor;
    
    // Actualizar herramientas si es necesario
    if (state.tools && state.tools.setColor) {
        state.tools.setColor(validColor);
    }
}

function addColorToPalette(color) {
    const validColor = validateHexColor(color);
    if (!validColor) return;
    
    // Verificar si el color ya existe
    if (state.colorPalette.includes(validColor)) {
        state.ui.showMessage('warning', 'Este color ya está en la paleta');
        return;
    }
    
    state.colorPalette.push(validColor);
    renderPalette();
    state.ui.showMessage('success', `Color ${validColor} añadido a la paleta`);
}

function editPaletteColor(index) {
    const currentColor = state.colorPalette[index];
    const newColor = prompt(`Editar color (formato #RRGGBB):`, currentColor);
    
    if (newColor && newColor !== currentColor) {
        const validColor = validateHexColor(newColor);
        if (validColor) {
            state.colorPalette[index] = validColor;
            renderPalette();
            state.ui.showMessage('success', `Color actualizado a ${validColor}`);
        } else {
            state.ui.showMessage('error', 'Color hexadecimal inválido');
        }
    }
}

function validateHexColor(color) {
    if (!color) return null;
    
    // Limpiar el color
    let cleanColor = color.toString().trim();
    
    // Añadir # si no lo tiene
    if (!cleanColor.startsWith('#')) {
        cleanColor = '#' + cleanColor;
    }
    
    // Validar formato
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexRegex.test(cleanColor)) {
        return null;
    }
    
    // Convertir formato corto a largo
    if (cleanColor.length === 4) {
        cleanColor = '#' + cleanColor[1] + cleanColor[1] + 
                    cleanColor[2] + cleanColor[2] + 
                    cleanColor[3] + cleanColor[3];
    }
    
    return cleanColor.toUpperCase();
}

export function removePaletteColor(index) {
    if (index >= 0 && index < state.colorPalette.length) {
        const removedColor = state.colorPalette.splice(index, 1)[0];
        renderPalette();
        state.ui.showMessage('info', `Color ${removedColor} eliminado de la paleta`);
    }
}

export function getPalette() {
    return [...state.colorPalette];
}

export function setPalette(colors) {
    if (!Array.isArray(colors)) return;
    
    state.colorPalette = colors.filter(color => validateHexColor(color));
    renderPalette();
}

export function exportPalette() {
    const paletteData = {
        name: `palette_${Date.now()}`,
        colors: state.colorPalette,
        created: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(paletteData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${paletteData.name}.json`;
    link.click();
}

export function importPalette(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const paletteData = JSON.parse(e.target.result);
            if (paletteData.colors && Array.isArray(paletteData.colors)) {
                setPalette(paletteData.colors);
                state.ui.showMessage('success', `Paleta "${paletteData.name || 'importada'}" cargada`);
            } else {
                state.ui.showMessage('error', 'Archivo de paleta inválido');
            }
        } catch (error) {
            state.ui.showMessage('error', 'Error al leer el archivo de paleta');
        }
    };
    reader.readAsText(file);
}

// Funciones para analizar colores en el canvas
export function extractColorsFromCanvas() {
    const imageData = state.canvas.getCanvasImageData();
    const data = imageData.data;
    const uniqueColors = new Set();
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i].toString(16).padStart(2, '0');
        const g = data[i + 1].toString(16).padStart(2, '0');
        const b = data[i + 2].toString(16).padStart(2, '0');
        const alpha = data[i + 3];
        
        // Solo considerar píxeles no transparentes
        if (alpha > 0) {
            uniqueColors.add(`#${r}${g}${b}`.toUpperCase());
        }
    }
    
    return Array.from(uniqueColors);
}

export function generatePaletteFromCanvas() {
    const extractedColors = extractColorsFromCanvas();
    
    if (extractedColors.length === 0) {
        state.ui.showMessage('warning', 'No se encontraron colores en el canvas');
        return;
    }
    
    if (extractedColors.length > 32) {
        state.ui.showMessage('warning', `Se encontraron ${extractedColors.length} colores. Solo se tomarán los primeros 32.`);
        extractedColors.length = 32;
    }
    
    state.colorPalette = extractedColors;
    renderPalette();
    state.ui.showMessage('success', `Paleta generada con ${extractedColors.length} colores del canvas`);
}

// Funciones auxiliares para trabajar con colores
export function getColorInfo(color) {
    const validColor = validateHexColor(color);
    if (!validColor) return null;
    
    const r = parseInt(validColor.substr(1, 2), 16);
    const g = parseInt(validColor.substr(3, 2), 16);
    const b = parseInt(validColor.substr(5, 2), 16);
    
    // Calcular luminancia
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Convertir a HSL
    const hsl = rgbToHsl(r, g, b);
    
    return {
        hex: validColor,
        rgb: { r, g, b },
        hsl: hsl,
        luminance: luminance,
        isDark: luminance < 0.5
    };
}

function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    
    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}

// Función para obtener el color actual seleccionado
export function getSelectedColor() {
    return state.selectedColor;
}