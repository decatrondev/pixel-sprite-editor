# 02 - Análisis del Frontend

**Fecha de auditoría:** 2026-04-07
**Alcance:** 17 módulos JavaScript, 2 editores independientes
**Total LOC frontend:** ~4,506 líneas

---

## Resumen

El frontend consiste en dos editores independientes construidos con JavaScript vanilla y Canvas API. Cada editor tiene su propio orquestador y set de módulos. El patrón arquitectónico es un estado global mutable compartido entre módulos mediante inyección por referencia.

| Editor | Módulos | LOC | Herramientas | Complejidad |
|--------|---------|-----|-------------|-------------|
| Sprites | 8 | ~1,604 | Grid, animaciones, JSON export, preview | Media |
| Pixel Art | 9 | ~3,140 | 7 tools, frames, undo/redo, export, paletas | Alta |

---

## Editor de Sprites

### Arquitectura

```
editor.js (orquestador)
  ├── fileHandler.js      → Carga de imágenes
  ├── canvasManager.js     → Canvas principal + grilla
  ├── animationManager.js  → Gestión de animaciones
  ├── jsonGenerator.js     → Generación de JSON
  ├── uiManager.js         → UI + renderizado de listas
  ├── apiManager.js        → Comunicación con backend
  └── previewManager.js    → Preview de animación
```

### Estado Global (`editorState`)

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| spriteImage | Image | Imagen cargada |
| grid | Object | { width, height, cols, rows, isGridDefined } |
| animations | Object | { nombre: { frames: [], speed: 8 } } |
| activeAnimation | String | Nombre de la animación activa |
| [módulos] | Object | Referencias a cada módulo |

### Flujo principal

1. Usuario carga imagen (drag & drop o file input)
2. `fileHandler` valida tipo y carga con FileReader
3. `canvasManager` dibuja imagen en canvas y habilita grilla
4. Usuario define grilla (width/height del frame)
5. Canvas muestra grilla y numeración de frames
6. Usuario crea animaciones seleccionando frames con click
7. `previewManager` muestra preview con requestAnimationFrame
8. `jsonGenerator` genera JSON de configuración descargable
9. `apiManager` persiste proyecto en backend

### Análisis por módulo

**fileHandler.js** (136 LOC)
- Drag & drop zone con feedback visual
- Validación de tipo MIME (solo imágenes)
- Carga via FileReader como Data URL
- Problemas: sin validación de tamaño, sin validación de dimensiones, sin timeout en carga

**canvasManager.js** (258 LOC)
- Dibuja imagen, grilla, números de frame
- Click izquierdo agrega frame a animación
- Click derecho remueve frame
- Mousemove muestra highlight y tooltip
- Problemas: coordenadas no contemplan scroll ni CSS transforms, fuente de texto hardcodeada (10px Arial)

**animationManager.js** (314 LOC)
- CRUD completo de animaciones
- Duplicar, renombrar, reordenar frames
- Velocidad configurable (1-60 FPS)
- Problemas: sin límite de cantidad de animaciones, getAnimationsData retorna referencia mutable

**jsonGenerator.js** (65 LOC)
- Genera JSON con metadata del sprite (nombre, dimensiones, frames, animaciones)
- Download via Blob + link temporal
- Problemas: sin versionado de schema, filename no personalizable

**apiManager.js** (283 LOC)
- Save/load/delete proyectos via fetch
- FormData para upload multipart
- Tracking de proyecto actual (id, nombre)
- Problemas: race condition en loadProject (aplica grilla antes de que cargue imagen), sin timeout en requests, confirm() bloquea UI

**uiManager.js** (314 LOC)
- Renderiza listas de animaciones y proyectos
- Sistema de mensajes temporales con colores
- Actualiza estado de botones según contexto
- Problemas: innerHTML sin sanitización (XSS), event listeners en elementos dinámicos no se limpian, mensajes con timeout inconsistente

**previewManager.js** (166 LOC)
- Preview canvas de 128x128px fijo
- requestAnimationFrame loop continuo
- Controles play/pause y velocidad
- Problemas: loop corre siempre aunque no haya animación, sin cleanup al desmontar, frame info text se superpone en frames pequeños

---

## Editor de Pixel Art

### Arquitectura

```
pixelartEditor.js (orquestador)
  ├── pixelArtCanvas.js    → Canvas + dibujo + coordenadas
  ├── pixelArtTools.js     → 7 herramientas de dibujo
  ├── pixelArtFrames.js    → Gestión de frames
  ├── pixelArtHistory.js   → Undo/redo (50 pasos)
  ├── pixelArtPalette.js   → Paletas de colores
  ├── pixelArtExport.js    → Exportación múltiple
  ├── pixelArtProject.js   → Persistencia con API
  └── pixelArtGrid.js      → Overlay de grilla
```

### Estado Global (`pixelArtState`)

| Propiedad | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| canvas | HTMLCanvasElement | — | Canvas principal |
| ctx | CanvasRenderingContext2D | — | Contexto de dibujo |
| gridCanvas | HTMLCanvasElement | — | Canvas de grilla overlay |
| gridCtx | CanvasRenderingContext2D | — | Contexto de grilla |
| previewCanvas | HTMLCanvasElement | — | Canvas de preview |
| previewCtx | CanvasRenderingContext2D | — | Contexto de preview |
| canvasWidth | Number | 64 | Ancho en píxeles |
| canvasHeight | Number | 64 | Alto en píxeles |
| pixelSize | Number | 10 | Zoom (4-24) |
| selectedTool | String | 'brush' | Herramienta activa |
| brushSize | Number | 1 | Tamaño del pincel |
| colorPalette | Array | 24 colores | Paleta activa |
| showGrid | Boolean | true | Mostrar grilla |
| isDrawing | Boolean | false | Estado de dibujo |
| currentProjectId | Number | null | Proyecto activo |
| currentProjectName | String | '' | Nombre del proyecto |

### Herramientas disponibles

| Herramienta | Shortcut | Descripción |
|-------------|----------|-------------|
| Brush | B | Dibujo libre con tamaño variable |
| Eraser | E | Borrado a transparente |
| Bucket (Flood Fill) | G | Relleno por inundación |
| Eyedropper | I | Selector de color del canvas |
| Line | L | Línea punto a punto |
| Rectangle | R | Rectángulo (shift = relleno) |

### Análisis por módulo

**pixelArtCanvas.js** (416 LOC)
- Canvas con sistema de coordenadas por píxel
- Soporte mouse y touch
- Zoom (4x-24x) con actualización de tamaño CSS
- Flood fill stack-based, Bresenham line, rectangle
- Problemas:
  - fillArea usa Set con keys string `${x},${y}` — ineficiente para canvas grandes
  - Touch events convertidos a MouseEvent — pierde precisión
  - hexToRgb no maneja hex corto (#RGB)
  - Sin validación de bounds en resize
  - Listeners duplicados si init se llama dos veces

**pixelArtTools.js** (454 LOC)
- Despacho de herramientas via executeToolAction
- Preview en tiempo real para line y rectangle
- Gestión de cursor según herramienta
- Problemas:
  - **Duplicación masiva** de fillArea, drawLine, drawRectangle, getPixel, setPixel con pixelArtCanvas.js
  - Rectangle filled se detecta via window.event.shiftKey — unreliable
  - Sin validación de color antes de setPixel
  - Cursor genérico 'crosshair' para todas las herramientas

**pixelArtFrames.js** (322 LOC)
- Array de ImageData objects (un frame = un ImageData completo)
- Navegación, duplicar, eliminar frames
- Color de fondo de exportación configurable
- Problemas:
  - Almacena ImageData completo por frame (64x64x4 = 16KB por frame)
  - Sin límite de frames — puede agotar memoria
  - loadFramesFromData no garantiza orden de carga (img.onload async)
  - Sin compresión ni optimización de almacenamiento
  - Sin undo para operaciones de frames

**pixelArtHistory.js** (124 LOC)
- Stack de 50 estados con pointer (currentStep)
- Guarda ImageData + dimensiones por estado
- Botones undo/redo con estado deshabilitado
- Problemas:
  - 50 copias completas del canvas en memoria (50 × 16KB mínimo = 800KB para 64x64)
  - Sin delta compression — cada paso es una copia completa
  - Para canvas 256x256: 50 × 256KB = 12.5MB solo en historial
  - No hay cleanup explícito de ImageData

**pixelArtPalette.js** (355 LOC)
- 4 presets: Default (24), GameBoy (4), NES (64), C64 (16)
- Color picker + input hex + click en swatch
- Right-click para editar/eliminar color
- Import/export paleta como JSON
- Extracción de colores desde canvas
- Problemas:
  - Límite hardcodeado de 32 colores por paleta
  - Swatches se recrean completamente en cada render — DOM thrashing
  - Event listeners en swatches no se limpian
  - extractColorsFromCanvas llama método que no existe (`state.canvas.getCanvasImageData()`)

**pixelArtExport.js** (506 LOC)
- Export frame actual como PNG escalado
- Export todos los frames como ZIP (via JSZip)
- Export como spritesheet (configurable rows × cols)
- Diálogos inline con CSS hardcodeado
- Problemas:
  - JSZip cargado dinámicamente desde CDN sin version pinning
  - Race condition en spritesheet: frames cargan async sin control
  - Sin indicador de progreso para exports largos
  - Blob URLs creados con revoke a 100ms — podría fallar en conexiones lentas
  - Diálogos no accesibles (sin escape key, sin focus trap)

**pixelArtProject.js** (492 LOC)
- Save/load/delete via API
- Serialización de frames como DataURLs para envío
- Renderizado de lista de proyectos
- Función escapeHtml para sanitización
- Problemas:
  - Llama método inexistente: `state.frames.setTransparentBackground()`
  - Frame DataURLs pueden ser muy grandes (múltiples MB por proyecto)
  - Lista de proyectos se re-renderiza completamente sin diff
  - Clases CSS de botones manipuladas con string replace — frágil

**pixelArtGrid.js** (50 LOC)
- Dibuja líneas de grilla en canvas overlay separado
- Toggle show/hide
- Problemas:
  - Para canvas 256x256 dibuja 512 líneas — impacto en performance
  - Color hardcodeado rgba(0,0,0,0.1) — casi invisible
  - Line width 0.5px no escala con zoom
  - Se redibuja en cada cambio aunque no haya cambios

---

## Problemas Transversales

### Memoria

| Problema | Módulo | Impacto estimado |
|----------|--------|-----------------|
| Frames sin compresión | pixelArtFrames | 16KB-256KB por frame |
| Historial sin delta | pixelArtHistory | 800KB-12.5MB total |
| Event listeners sin cleanup | uiManager, pixelArtPalette | Memory leak gradual |
| requestAnimationFrame sin stop | previewManager | CPU innecesario |
| DOM thrashing en render | pixelArtPalette, pixelArtProject | Reflow constante |

**Peor caso estimado (256x256, 20 frames, 50 history):**
- Frames: 20 × 256KB = 5.1MB
- History: 50 × 256KB = 12.8MB
- Canvas + contextos: ~1MB
- **Total: ~19MB** solo en estado del editor

### Acoplamiento

Todos los módulos acceden al estado global por referencia directa. Ningún módulo puede funcionar aislado ni ser testeado independientemente. El orden de inicialización importa y no está documentado.

Dependencias circulares detectadas:
- pixelArtCanvas ↔ pixelArtTools (funciones duplicadas)
- pixelArtProject → pixelArtFrames → pixelArtCanvas → pixelArtTools

### Duplicación de código

| Función | pixelArtCanvas.js | pixelArtTools.js |
|---------|-------------------|------------------|
| fillArea | Línea ~180 | Línea ~280 |
| drawLine | Línea ~220 | Línea ~320 |
| drawRectangle | Línea ~250 | Línea ~350 |
| getPixel | Línea ~170 | Línea ~260 |
| setPixel | Línea ~160 | Línea ~250 |
| hexToRgb | Línea ~400 | Línea ~440 |

**~200 líneas duplicadas** entre estos dos módulos.

### Bugs conocidos

| Bug | Módulo | Severidad |
|-----|--------|-----------|
| Llama método inexistente `setTransparentBackground()` | pixelArtProject | Error runtime |
| Llama método inexistente `state.canvas.getCanvasImageData()` | pixelArtPalette | Error runtime |
| Race condition en loadProject | apiManager | Data corruption |
| Race condition en spritesheet export | pixelArtExport | Export incorrecto |
| Frame order no garantizado en load | pixelArtFrames | Data corruption |
| hexToRgb no soporta hex corto | pixelArtCanvas | Color incorrecto |

---

## Keyboard Shortcuts (Pixel Art)

| Shortcut | Acción |
|----------|--------|
| B | Seleccionar brush |
| E | Seleccionar eraser |
| G | Seleccionar bucket fill |
| I | Seleccionar eyedropper |
| L | Seleccionar line |
| R | Seleccionar rectangle |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |

---

## Paletas Predefinidas

| Nombre | Colores | Descripción |
|--------|---------|-------------|
| Default | 24 | Paleta general con colores básicos y tonos |
| GameBoy | 4 | 4 tonos de verde del GameBoy original |
| NES | 64 | Paleta completa del Nintendo Entertainment System |
| Commodore 64 | 16 | 16 colores del C64 |
