# 05 - UI/UX

**Fecha de auditoría:** 2026-04-07
**Alcance:** 7 vistas EJS, 2 archivos CSS, accesibilidad, responsive design
**Total LOC vistas:** ~835 líneas
**Total LOC CSS:** ~1,481 líneas

---

## Resumen

La interfaz combina Tailwind CSS (via CDN) con CSS custom en dos archivos separados. La landing page y formularios usan Tailwind exclusivamente, mientras que el editor de pixel art usa un sistema CSS propio de 1,078 líneas. Esta dualidad crea inconsistencias visuales y de mantenimiento.

---

## Vistas

### Landing Page (`index.ejs` — 216 LOC)

| Sección | Líneas | Contenido |
|---------|--------|-----------|
| Hero | 8-33 | Título, descripción, CTAs |
| Features | 36-130 | 6 tarjetas en grid 3 columnas |
| Workflow | 133-172 | 3 pasos del flujo de trabajo |
| CTA Final | 175-198 | Call to action con botones condicionales |
| Footer Info | 201-213 | Compatibilidad y beneficios |

**Problemas:**
- Feature 6 ("Pixel Art Editor") tiene badge "PRÓXIMAMENTE" pero la feature ya existe y funciona
- Claim "Sin límites de tamaño" contradice el límite de 5MB en upload
- Múltiples CTAs redundantes ("Comenzar Ahora" aparece 3+ veces)
- Inline style en línea 63: `style="background-color: #000000;"` debería ser clase CSS

### Editor de Sprites (`editor.ejs` — 192 LOC)

| Sección | Columnas | Contenido |
|---------|----------|-----------|
| Izquierda | lg:col-span-1 | Controles: grid, animaciones, export |
| Centro | lg:col-span-2 | Canvas + drop zone |
| Derecha | lg:col-span-1 | Preview + controles de reproducción |
| Inferior | xl:col-span-4 | Proyectos guardados (solo auth) |

**Problemas:**
- Inconsistencia de breakpoints: layout principal usa `lg:` pero proyectos usa `xl:`
- Preview canvas hardcodeado 128x128 con inline style `image-rendering: pixelated`
- Mezcla de emojis (🎬) y SVG para iconografía
- Sección de proyectos usa color scheme diferente (orange vs indigo)

### Editor Pixel Art (`pixelart.ejs` — 280 LOC)

| Panel | Ancho | Contenido |
|-------|-------|-----------|
| Izquierdo | 280px | Herramientas, colores, paleta |
| Centro | 1fr | Canvas + controles zoom/dimensiones |
| Derecho | 320px | Frames, animación, proyecto, export |

**Problemas:**
- 6 inline styles para control de visibilidad — deberían ser clases CSS
- Custom radio buttons sin ARIA labels adecuados
- Emojis como iconos de botones (📄, 📦, 🗑️, 💾) sin alt text
- Tailwind cargado condicionalmente con `process.env.NODE_ENV` — no funciona en el navegador
- Dos sistemas CSS coexistiendo: Tailwind en header, CSS custom en body

### Login (`login.ejs` — 47 LOC)

- Diseño centrado, limpio, Tailwind puro
- Labels con `sr-only` (buena práctica de accesibilidad)
- Autocomplete attributes presentes
- Input styling con rounded-t/b crea dependencia del orden de inputs
- Sin feedback visual de validación en tiempo real

### Register (`register.ejs` — 54 LOC)

- Mismo patrón que login con 4 inputs
- Falta `autocomplete="username"` en campo username
- Falta `autocomplete="new-password"` en campos de password
- Sin indicador de fortaleza de contraseña
- Sin requisitos visibles de contraseña

### Header (`header.ejs` — 40 LOC)

- Navbar con logo, links de navegación, auth condicional
- Sin menú hamburguesa para móvil — links se colapsan
- Sin skip-to-main-content link
- Sin indicador de página activa en navegación
- Logo no tiene aria-label

### Footer (`footer.ejs` — 6 LOC)

- Solo cierra tags HTML (</main>, </body>, </html>)
- Sin contenido de footer real (copyright, links, etc.)

---

## Análisis CSS

### main.css (403 LOC)

| Sección | Líneas | Propósito |
|---------|--------|-----------|
| Variables CSS | 4-20 | Colores, sombras, transiciones |
| Canvas styling | 32-119 | Editor canvas, tooltips, drop zone |
| Form inputs | 241-256 | Estilos de formularios |
| Message box | 259-290 | Notificaciones con colores por tipo |
| Nav styling | 293-330 | Animación de underline en links |
| Scrollbar | 333-351 | Custom scrollbar webkit |
| Responsive | 354-367 | Media query 768px |
| Animations | 370-388 | slideDown, pulse |

**Problemas:**
- Tooltip CSS (líneas 49-69) usa `content` en pseudo-element que no funciona correctamente
- `*:focus { outline: none; }` elimina focus ring — corregido parcialmente con `*:focus-visible`
- Selectores duplicados para canvas y preview
- Mezcla de variables CSS con valores hardcodeados

### pixelart.css (1,078 LOC)

| Sección | Líneas | Propósito |
|---------|--------|-----------|
| Variables | 1-38 | Sistema de colores completo |
| Layout | 41-61 | Grid 3 columnas |
| Panels | 64-96 | Tarjetas con estilo glassmorphism |
| Tools | 99-167 | Grid de herramientas y tamaños |
| Colors | 169-286 | Selector de color, paleta, swatches |
| Canvas | 288-411 | Container, controles, rendering |
| Frames | 414-474 | Panel de frames y navegación |
| Sidebar | 477-505 | Panel derecho |
| Animation | 508-675 | Panel de animación completo |
| Forms | 678-772 | Inputs, buttons con variantes |
| Custom controls | 775-867 | Checkboxes, radios personalizados |
| Projects | 812-867 | Lista de proyectos |
| Notifications | 870-916 | Sistema de mensajes |
| Scrollbar | 919-948 | Scrollbar personalizado |
| Loading | 951-974 | Animación de carga |
| Responsive | 977-1078 | 3 breakpoints |

**Problemas:**
- 1,078 líneas en un solo archivo — difícil de mantener
- Patrón de transparencia (checkered) duplicado en múltiples selectores
- Slider styling (webkit/moz) duplicado
- Botones tienen 6 variantes con estilos repetitivos
- Custom checkbox/radio reemplaza defaults del navegador — problemas de accesibilidad
- Scrollbar styling solo webkit — sin fallback Firefox

---

## Sistema de Colores

### Variables CSS (pixelart.css)

```css
--primary-color: #4f46e5    /* Indigo */
--primary-hover: #4338ca
--secondary-color: #6b7280  /* Gray */
--success-color: #10b981    /* Green */
--danger-color: #ef4444     /* Red */
--warning-color: #f59e0b    /* Amber */
--info-color: #3b82f6       /* Blue */
```

### Paleta de grises

```css
--gray-50:  #f9fafb    --gray-400: #9ca3af
--gray-100: #f3f4f6    --gray-500: #6b7280
--gray-200: #e5e7eb    --gray-600: #4b5563
--gray-300: #d1d5db    --gray-700: #374151
                        --gray-800: #1f2937
                        --gray-900: #111827
```

**Problema:** Tailwind tiene su propio sistema de colores que no coincide exactamente con estas variables. Dos fuentes de verdad para colores.

---

## Responsive Design

### Breakpoints

| Breakpoint | pixelart.css | main.css | Tailwind |
|------------|-------------|----------|----------|
| 480px | Sí (mobile) | No | sm: 640px |
| 768px | Sí (tablet) | Sí | md: 768px |
| 1200px | Sí (desktop) | No | lg: 1024px |

**Problema:** 3 sistemas de breakpoints diferentes. pixelart.css usa 480/768/1200, main.css usa 768, Tailwind usa 640/768/1024/1280.

### Adaptaciones por breakpoint

**1200px:**
- Grid columns: 280px 1fr 320px → 240px 1fr 280px
- Canvas max-height: 65vh → 55vh

**768px:**
- Layout: 3 columnas → 1 columna
- Tools grid: 6 columnas → 4 columnas
- Canvas max-height: 55vh → 50vh
- Panels full width

**480px:**
- Tool buttons: 3rem → 2rem
- Tools grid: 4 columnas → 3 columnas
- Font sizes reducidos
- Canvas max-height: 40vh

### Problemas de responsive

- Header navbar no tiene menú hamburguesa — links se colapsan en mobile
- Preview canvas 128x128 fijo — no se adapta
- Editor de sprites grid 4 columnas no tiene breakpoint intermedio
- Drop zone no se adapta bien en mobile (min-height fijo)

---

## Accesibilidad

### Hallazgos

| Problema | Severidad | Ubicación |
|----------|-----------|-----------|
| Canvas sin descripciones ARIA | Alta | editor.ejs, pixelart.ejs |
| Sin skip-to-main-content | Media | header.ejs |
| Custom form controls sin ARIA | Alta | pixelart.ejs (radios, checkboxes) |
| Emojis como iconos sin alt text | Media | pixelart.ejs (📄, 📦, 🗑️, 💾) |
| Focus outline removido | Alta | main.css línea 397 |
| Sin indicador de página activa | Baja | header.ejs |
| Color-only differentiation en tools | Media | pixelart.css |
| Sin menú mobile accesible | Media | header.ejs |
| Diálogos de export sin focus trap | Alta | pixelArtExport.js |
| confirm() nativo para acciones destructivas | Baja | Múltiples archivos |

### Buenas prácticas encontradas

- Labels con `sr-only` en formularios de login/register
- `role="alert"` en mensajes de error
- `aria-hidden="true"` en SVGs decorativos
- Uso de elementos semánticos (`<main>`, `<nav>`, `<section>`)
- Inputs con `autocomplete` attributes (parcial)

---

## Inconsistencias de UI

| Elemento | Landing/Auth | Editor Sprites | Editor Pixel Art |
|----------|-------------|---------------|-----------------|
| CSS Framework | Tailwind puro | Tailwind + main.css | CSS custom (pixelart.css) |
| Botones | Tailwind utility classes | Tailwind classes | .btn-primary, .btn-danger |
| Colores primarios | indigo-600 | indigo-600/700 | --primary-color (#4f46e5) |
| Iconos | SVG | SVG + emojis | Emojis |
| Mensajes | role="alert" div | #message-box | .message-container |
| Tipografía | Tailwind defaults | Tailwind defaults | System font stack |
| Bordes | rounded-xl, rounded-md | rounded-lg, rounded-md | var(--border-radius) 8px |

---

## Contenido hardcodeado

Todo el texto está en español y hardcodeado directamente en las vistas:
- Títulos y descripciones
- Labels de formularios
- Mensajes de error y éxito
- Tooltips y placeholders
- Nombres de features
- Textos de botones

Sin sistema de i18n. Si se necesita soporte multiidioma en el futuro, requiere refactorización completa de todas las vistas.
