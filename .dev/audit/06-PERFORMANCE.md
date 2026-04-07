# 06 - Performance

**Fecha de auditoría:** 2026-04-07
**Alcance:** Backend, frontend, base de datos, red

---

## Resumen

El proyecto tiene problemas de performance significativos en el frontend, particularmente en el editor de pixel art donde el uso de memoria puede escalar exponencialmente con el tamaño del canvas y cantidad de frames. El backend es simple y eficiente en queries, pero carece de caching y compresión.

---

## Frontend — Canvas y Memoria

### Consumo de memoria por componente

**Editor de Pixel Art — Peor caso (256x256, 20 frames, 50 history):**

| Componente | Cálculo | Memoria |
|------------|---------|---------|
| Canvas principal | 256 × 256 × 4 bytes | 256 KB |
| Grid overlay canvas | 256 × 256 × 4 bytes | 256 KB |
| Preview canvas | 128 × 128 × 4 bytes (fijo) | 64 KB |
| Frames (20) | 20 × 256 × 256 × 4 bytes | 5,120 KB |
| History (50) | 50 × 256 × 256 × 4 bytes | 12,800 KB |
| **Total estimado** | — | **~18.5 MB** |

**Editor de Pixel Art — Caso típico (64x64, 5 frames, 50 history):**

| Componente | Cálculo | Memoria |
|------------|---------|---------|
| Canvas principal | 64 × 64 × 4 bytes | 16 KB |
| Grid overlay canvas | 64 × 64 × 4 bytes | 16 KB |
| Preview canvas | 128 × 128 × 4 bytes | 64 KB |
| Frames (5) | 5 × 64 × 64 × 4 bytes | 80 KB |
| History (50) | 50 × 64 × 64 × 4 bytes | 800 KB |
| **Total estimado** | — | **~976 KB** |

### Problemas de memoria identificados

**1. History sin delta compression**

Cada paso del historial almacena una copia completa del canvas (ImageData). Para un canvas de 256x256 con 50 pasos, son 12.8MB solo en historial.

**Solución propuesta:** Implementar delta encoding — almacenar solo los píxeles que cambiaron entre estados.

| Enfoque | Memoria (256x256, 50 pasos) | Complejidad |
|---------|----------------------------|-------------|
| Actual (full copy) | 12,800 KB | Baja |
| Delta encoding | ~500-2,000 KB (estimado) | Media |
| Command pattern | ~50-200 KB | Alta |

**2. Frames sin compresión**

Cada frame almacena ImageData completo. No hay compresión ni lazy loading.

**Solución propuesta:** Almacenar frames como PNG comprimido (canvas.toDataURL) en vez de raw ImageData. Convertir a ImageData solo cuando se edita el frame activo.

**3. Event listeners sin cleanup**

Módulos como uiManager.js, pixelArtPalette.js y pixelArtProject.js crean event listeners en elementos dinámicos (renderAnimationsList, renderPalette, renderProjectsList) sin remover los anteriores. Cada re-render acumula listeners.

**4. requestAnimationFrame sin stop**

previewManager.js ejecuta un loop de animación continuo aunque no haya animación activa o el preview esté oculto. Consume CPU innecesariamente.

---

## Frontend — Rendering

### Grid rendering

**pixelArtGrid.js** dibuja una línea por cada fila y columna del canvas:

| Canvas | Líneas dibujadas | Impacto |
|--------|-----------------|---------|
| 32x32 | 64 | Bajo |
| 64x64 | 128 | Bajo |
| 128x128 | 256 | Medio |
| 256x256 | 512 | Alto |

El grid se redibuja en cada cambio aunque no haya cambiado. El color (rgba(0,0,0,0.1)) y grosor (0.5px) son fijos y no escalan con zoom.

**Solución propuesta:** 
- Solo redibujar si dimensiones o zoom cambian
- Para canvas grandes, dibujar grid cada N píxeles en vez de cada píxel
- Cachear el grid en un offscreen canvas

### DOM thrashing

pixelArtPalette.js recrea completamente la paleta en cada render:
1. Limpia innerHTML del contenedor
2. Crea N elementos div (swatches)
3. Agrega event listeners a cada swatch
4. Fuerza reflow del browser

**Solución propuesta:** Virtual DOM o diff-based update. Alternativamente, solo actualizar el swatch que cambió.

### Canvas operations

drawBrush() en pixelArtTools.js ejecuta operaciones de píxel individuales con getImageData/putImageData. Para brush size > 1, esto implica múltiples lecturas y escrituras al canvas.

**Solución propuesta:** Batch operations — leer ImageData una vez, modificar el buffer, escribir una vez.

---

## Frontend — Carga y Assets

### Archivos servidos

| Archivo | Tamaño estimado | Minificado | Gzip |
|---------|----------------|------------|------|
| main.css | ~12 KB | No | No |
| pixelart.css | ~30 KB | No | No |
| editor.js | ~2 KB | No | No |
| pixelartEditor.js | ~12 KB | No | No |
| 8 módulos sprites | ~45 KB | No | No |
| 8 módulos pixelart | ~90 KB | No | No |
| Tailwind CDN | ~300 KB | Sí | Sí |
| **Total (sin Tailwind)** | **~191 KB** | — | — |

### Problemas de carga

**1. Sin minificación ni bundling**

17 archivos JS se cargan individualmente. Cada uno es un request HTTP separado. Sin tree shaking ni dead code elimination.

**2. Sin compresión gzip/brotli**

Express no tiene middleware de compresión. Los archivos se envían sin comprimir.

**3. Sin cache-busting**

Los archivos estáticos se sirven sin hash de contenido. Cambios en CSS/JS pueden no reflejarse por cache del navegador.

**4. Tailwind desde CDN**

Se carga todo el framework Tailwind (~300KB) cuando solo se usa un subconjunto. En producción debería usarse PurgeCSS o Tailwind build con contenido purgado.

**5. JSZip desde CDN (carga dinámica)**

La librería JSZip se carga bajo demanda desde CDN solo cuando el usuario exporta. Buena estrategia de lazy loading, pero sin version pinning ni SRI.

---

## Backend — Queries

### Análisis de queries

Todas las queries son simples y directas. No hay N+1, joins complejos, ni subqueries.

| Operación | Query | Índice usado | Performance |
|-----------|-------|-------------|-------------|
| Login | SELECT * WHERE email = $1 | UNIQUE (email) | O(1) |
| Listar proyectos | SELECT ... WHERE user_id = $1 ORDER BY updated_at DESC | idx_pixelart_user_projects | O(log n) |
| Cargar proyecto | SELECT * WHERE id = $1 AND user_id = $2 | PK | O(1) |
| Verificar duplicado | SELECT id WHERE user_id = $1 AND project_name = $2 | Sin índice compuesto | O(n) scan |
| Guardar proyecto | INSERT ... RETURNING id | — | O(1) |

**Problema:** La query de verificación de duplicados no tiene índice compuesto (user_id, project_name). Con muchos proyectos por usuario, haría sequential scan.

### Tamaño de payload

El endpoint más pesado es `POST /api/pixelart/save-project` que envía:
- imageData: base64 del frame actual (22KB-350KB)
- frames_data: JSON con DataURLs de todos los frames (220KB-7MB)
- palette: array de colores (~1KB)
- settings: configuración del editor (~500B)

**Total por save: 250KB a 7.5MB** — sin compresión.

### Pool de conexiones

| Config | Valor | Adecuado |
|--------|-------|----------|
| max | 10 | Sí para uso actual |
| idleTimeout | default (10s) | Debería configurarse |
| connectionTimeout | default (0) | Debería configurarse |

---

## Backend — Server

### Problemas de servidor

**1. Sin compresión**

No hay middleware `compression`. Todos los responses se envían sin comprimir.

```javascript
// Faltante
const compression = require('compression');
app.use(compression());
```

Impacto estimado: las respuestas JSON y HTML se reducirían 60-80% con gzip.

**2. Sin cache headers para estáticos**

Express.static usa defaults sin cache policy. Los archivos estáticos (CSS, JS, imágenes) no tienen `Cache-Control` headers.

```javascript
// Actual
app.use(express.static('public'));

// Recomendado
app.use(express.static('public', {
    maxAge: '1d',
    etag: true
}));
```

**3. Sin clustering**

Node.js es single-threaded. Un proceso Node.js no aprovecha múltiples cores. Para este proyecto probablemente no es necesario, pero es una limitación.

**4. createTables() en cada arranque**

La función `createTables()` ejecuta múltiples queries al arrancar, incluyendo `CREATE TABLE IF NOT EXISTS` y checks de triggers. Esto agrega ~200ms al startup innecesariamente después del primer arranque.

---

## Red y Deploy

### Configuración actual

| Componente | Config | Estado |
|------------|--------|--------|
| Nginx | Proxy pass a :3011 | Funcional |
| SSL | Wildcard cert *.decatron.net | Válido hasta 2026-05-28 |
| client_max_body_size | 10M | Adecuado |
| HTTP/2 | Probable (via Nginx SSL) | Verificar |
| Gzip en Nginx | No verificado | Verificar |

### Recomendaciones de Nginx

```nginx
# Agregar a sprites.decatron.net config

# Compresión
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml;
gzip_min_length 1000;

# Cache de estáticos
location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
    expires 7d;
    add_header Cache-Control "public, immutable";
}
```

---

## Resumen de Prioridades

| Problema | Impacto | Esfuerzo | Prioridad |
|----------|---------|----------|-----------|
| Compresión gzip (Express o Nginx) | Alto | Bajo | 1 |
| Cache headers para estáticos | Alto | Bajo | 1 |
| History delta compression | Alto | Alto | 2 |
| Frame storage optimization | Alto | Medio | 2 |
| Grid render optimization | Medio | Bajo | 2 |
| Event listener cleanup | Medio | Medio | 3 |
| JS bundling y minificación | Medio | Medio | 3 |
| Tailwind build (purge) | Medio | Medio | 3 |
| requestAnimationFrame control | Bajo | Bajo | 3 |
| DOM thrashing en paleta | Bajo | Medio | 4 |
