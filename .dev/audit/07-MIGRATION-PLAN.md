# 07 - Plan de Migración

**Fecha de auditoría:** 2026-04-07
**Estado actual:** Node.js + Express + EJS + Vanilla JS + PostgreSQL
**Estado objetivo:** Por definir (React+TS+Tailwind o mejora incremental)

---

## Resumen

Este documento presenta dos caminos posibles para la evolución del proyecto, con fases detalladas para cada uno. La decisión entre ambos depende de los objetivos a largo plazo.

---

## Opción A: Mejora Incremental (sobre stack actual)

Mantener Express + EJS + Vanilla JS, corregir problemas críticos y agregar features.

**Ventajas:**
- Menor tiempo de implementación
- Sin riesgo de regresiones por reescritura
- El editor funciona — solo necesita hardening

**Desventajas:**
- Deuda técnica permanente (estado global mutable, sin tipos, CSS monolítico)
- Difícil de escalar con nuevas features
- Testing manual únicamente
- Código duplicado entre módulos seguirá creciendo

**Tiempo estimado:** 4-6 fases incrementales

### Fase A1: Seguridad Crítica

**Objetivo:** Cerrar las vulnerabilidades CRÍTICAS y ALTAS.

- [ ] Instalar helmet, configurar headers de seguridad
- [ ] Instalar express-rate-limit, configurar por endpoint
- [ ] Implementar protección CSRF (csrf-csrf)
- [ ] Configurar sesiones seguras (cookie secure, httpOnly, sameSite)
- [ ] Instalar connect-pg-simple para session store en PostgreSQL
- [ ] Sanitizar todos los innerHTML con escapeHtml
- [ ] Unificar mensajes de error en login (genérico)
- [ ] Regenerar session ID post-login
- [ ] Generar session secret robusto
- [ ] Validar magic bytes en uploads

**Dependencias:** helmet, express-rate-limit, csrf-csrf, connect-pg-simple
**Archivos afectados:** server.js, authRoutes.js, uiManager.js, pixelArtProject.js

### Fase A2: Base de Datos y Super Admin

**Objetivo:** Agregar sistema de roles y panel de administración.

- [ ] Agregar columna `role` a tabla users
- [ ] Agregar columnas metadata: `last_login`, `is_active`
- [ ] Crear índices compuestos únicos (user_id, project_name)
- [ ] Agregar CHECK constraints (canvas dimensions)
- [ ] Crear middleware `isAdmin`
- [ ] Crear ruta `/admin` con vista de panel
- [ ] Dashboard: usuarios registrados, proyectos totales, storage usado
- [ ] Gestión de usuarios: listar, activar/desactivar, ver proyectos
- [ ] Estadísticas: proyectos por día, usuarios activos, tamaño promedio
- [ ] Marcar usuario existente como admin

**Archivos nuevos:** routes/adminRoutes.js, views/admin.ejs
**Archivos modificados:** config/database.js, server.js

### Fase A3: Performance

**Objetivo:** Optimizar memoria, rendering y carga.

- [ ] Instalar compression middleware
- [ ] Configurar cache headers en Express.static
- [ ] Agregar gzip en Nginx config
- [ ] Implementar delta compression en history
- [ ] Optimizar frame storage (PNG comprimido vs raw ImageData)
- [ ] Agregar frame limit (configurable, default 30)
- [ ] Cachear grid en offscreen canvas
- [ ] Controlar requestAnimationFrame (solo cuando hay animación)
- [ ] Cleanup event listeners en renders dinámicos
- [ ] Batch canvas operations en brush tool

**Archivos afectados:** server.js, pixelArtHistory.js, pixelArtFrames.js, pixelArtGrid.js, previewManager.js

### Fase A4: Bug Fixes y Refactoring

**Objetivo:** Corregir bugs conocidos y reducir duplicación.

- [ ] Fix: método inexistente `setTransparentBackground()` en pixelArtProject.js
- [ ] Fix: método inexistente `state.canvas.getCanvasImageData()` en pixelArtPalette.js
- [ ] Fix: race condition en apiManager.loadProject (esperar imagen antes de grilla)
- [ ] Fix: race condition en spritesheet export (frame load order)
- [ ] Fix: hexToRgb para hex corto (#RGB)
- [ ] Eliminar duplicación entre pixelArtCanvas.js y pixelArtTools.js (~200 LOC)
- [ ] Extraer funciones compartidas a módulo utility
- [ ] Instalar JSZip como dependencia local (quitar CDN)
- [ ] Agregar password strength validation (8+ chars, complejidad)

**Archivos afectados:** pixelArtProject.js, pixelArtPalette.js, apiManager.js, pixelArtExport.js, pixelArtCanvas.js, pixelArtTools.js, authRoutes.js

### Fase A5: UI/UX Improvements

**Objetivo:** Mejorar la experiencia de usuario y accesibilidad.

- [ ] Agregar menú hamburguesa para mobile
- [ ] Agregar skip-to-main-content link
- [ ] ARIA labels en canvas y controles custom
- [ ] Reemplazar emojis con SVG icons consistentes
- [ ] Agregar indicador de página activa en nav
- [ ] Footer real con copyright y links
- [ ] Actualizar landing: quitar "PRÓXIMAMENTE" del pixel art, corregir claims
- [ ] Indicador de fortaleza de contraseña en registro
- [ ] Feedback visual de validación en formularios
- [ ] Focus trap en diálogos de export
- [ ] Mover inline styles a clases CSS

### Fase A6: Calidad

**Objetivo:** Establecer fundación para mantenimiento a largo plazo.

- [ ] Agregar .editorconfig y ESLint
- [ ] Implementar sistema de migraciones (node-pg-migrate)
- [ ] Agregar logging estructurado (pino o winston)
- [ ] Tests unitarios para funciones de utilidad
- [ ] Tests de integración para API endpoints
- [ ] Documentar API endpoints
- [ ] Configurar error handler global en Express

---

## Opción B: Reescritura a React + TypeScript + Tailwind

Reescribir el frontend completo manteniendo el backend Express.

**Ventajas:**
- Type safety con TypeScript
- Component-based architecture
- State management robusto (useReducer, Zustand, etc.)
- Hot module replacement en desarrollo
- Ecosistema de testing (Vitest, Testing Library)
- Tailwind build con purge (CSS óptimo)
- Consistente con el stack del proyecto Decatron

**Desventajas:**
- Reescritura completa del frontend (~4,500 LOC)
- Riesgo de regresiones funcionales
- Tiempo significativo antes de alcanzar paridad de features
- Canvas API funciona igual en React — la lógica de dibujo no cambia mucho

**Tiempo estimado:** 6-8 fases

### Fase B1: Setup y Arquitectura

**Objetivo:** Configurar el proyecto React + TypeScript + Tailwind.

- [ ] Inicializar proyecto con Vite + React + TypeScript
- [ ] Configurar Tailwind CSS con build system
- [ ] Configurar ESLint + Prettier
- [ ] Definir estructura de carpetas
- [ ] Configurar Vitest
- [ ] Configurar proxy de desarrollo hacia Express backend

**Estructura propuesta:**

```
frontend/
├── src/
│   ├── components/
│   │   ├── layout/          # Header, Footer, Nav
│   │   ├── auth/            # Login, Register
│   │   ├── editor/          # Editor de sprites
│   │   │   ├── Canvas.tsx
│   │   │   ├── GridControls.tsx
│   │   │   ├── AnimationPanel.tsx
│   │   │   ├── PreviewPanel.tsx
│   │   │   └── ProjectPanel.tsx
│   │   ├── pixelart/        # Editor de pixel art
│   │   │   ├── PixelCanvas.tsx
│   │   │   ├── ToolPanel.tsx
│   │   │   ├── PalettePanel.tsx
│   │   │   ├── FramePanel.tsx
│   │   │   ├── HistoryPanel.tsx
│   │   │   ├── ExportDialog.tsx
│   │   │   └── ProjectPanel.tsx
│   │   ├── admin/           # Super Admin
│   │   └── common/          # Shared components
│   ├── hooks/
│   │   ├── useCanvas.ts     # Canvas operations
│   │   ├── useHistory.ts    # Undo/redo
│   │   ├── useAuth.ts       # Authentication
│   │   └── useApi.ts        # API communication
│   ├── stores/              # State management
│   │   ├── editorStore.ts
│   │   ├── pixelArtStore.ts
│   │   └── authStore.ts
│   ├── utils/
│   │   ├── canvas.ts        # Canvas utilities
│   │   ├── color.ts         # Color conversion
│   │   ├── export.ts        # Export utilities
│   │   └── validation.ts    # Input validation
│   ├── types/
│   │   ├── editor.ts        # Editor types
│   │   ├── pixelart.ts      # Pixel art types
│   │   └── api.ts           # API response types
│   ├── services/
│   │   └── api.ts           # API client
│   ├── App.tsx
│   └── main.tsx
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── package.json
```

### Fase B2: Seguridad Backend (misma que A1)

Idéntica a la Fase A1. Las correcciones de seguridad del backend son necesarias independientemente del frontend.

### Fase B3: Auth + Layout + Landing

**Objetivo:** Implementar la estructura base de la aplicación.

- [ ] React Router con rutas protegidas
- [ ] Layout component (Header, Footer, Nav responsive)
- [ ] Página de Login
- [ ] Página de Register
- [ ] Landing page
- [ ] Auth context/store
- [ ] API client con interceptors
- [ ] Error boundaries

### Fase B4: Editor de Sprites

**Objetivo:** Portar el editor de sprites a React.

- [ ] Canvas component con ref
- [ ] File upload (drag & drop)
- [ ] Grid definition y overlay
- [ ] Animation manager con state
- [ ] Preview panel con requestAnimationFrame
- [ ] JSON generator
- [ ] Project save/load
- [ ] Tests para funciones de utilidad

### Fase B5: Editor de Pixel Art

**Objetivo:** Portar el editor de pixel art a React.

- [ ] PixelCanvas component con hook useCanvas
- [ ] Tool system con useReducer
- [ ] Palette component con presets
- [ ] Frame management con useFrames hook
- [ ] History con delta compression (useHistory)
- [ ] Grid overlay optimizado
- [ ] Keyboard shortcuts
- [ ] Touch support
- [ ] Tests

### Fase B6: Export y Features Avanzadas

**Objetivo:** Implementar sistema de exportación y features extras.

- [ ] Export dialog component
- [ ] PNG export con scale
- [ ] ZIP export (JSZip como dependencia)
- [ ] Spritesheet generation
- [ ] Project metadata export/import
- [ ] Palette import/export

### Fase B7: Super Admin

**Objetivo:** Panel de administración.

- [ ] Admin route con guard
- [ ] Dashboard con estadísticas
- [ ] User management
- [ ] Project browser
- [ ] System health indicators

### Fase B8: Deploy y Migración

**Objetivo:** Desplegar la nueva versión.

- [ ] Build production de frontend
- [ ] Configurar Nginx para servir build estático + API proxy
- [ ] Agregar al web-services.sh (si se usa Vite dev en producción) o servir dist
- [ ] Migrar datos existentes
- [ ] Testing en staging
- [ ] Cutover a producción

---

## Comparación de Opciones

| Criterio | Opción A (Incremental) | Opción B (React+TS) |
|----------|----------------------|---------------------|
| Tiempo total | Menor | Mayor |
| Riesgo | Bajo | Medio (regresiones) |
| Calidad final | Media-Alta | Alta |
| Mantenibilidad | Media | Alta |
| Testabilidad | Baja | Alta |
| Consistencia con Decatron | No | Sí |
| Type safety | No | Sí |
| Performance build | No (sin bundler) | Sí (Vite) |
| Learning curve | Ninguna | Baja (ya lo usas) |

---

## Recomendación

**Fase 1 siempre es seguridad** — independiente de la opción elegida. Los 4 hallazgos CRÍTICOS deben resolverse antes de cualquier otra cosa.

**Si el proyecto es para uso personal/showcase:** Opción A es suficiente. Corregir seguridad, agregar super admin, y mejorar incrementalmente.

**Si planeas hacerlo público o mantenerlo a largo plazo:** Opción B es la inversión correcta. Ya tienes experiencia con React+TS+Tailwind en Decatron, y la migración te da la oportunidad de implementar las correcciones de la auditoría desde cero en vez de parcheando.

**Enfoque híbrido recomendado:**
1. Ejecutar Fase A1 (seguridad) y Fase A2 (super admin + DB) inmediatamente sobre el código actual
2. Decidir entre A o B para el resto basándose en cómo se siente el proyecto después de las correcciones
3. Si se elige B, las fases A1 y A2 del backend se reutilizan al 100%
