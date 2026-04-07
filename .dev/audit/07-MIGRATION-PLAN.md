# 07 - Plan de Migración

**Fecha:** 2026-04-07
**Actualizado:** 2026-04-07
**Decisión:** Reescritura completa a React + TypeScript + Tailwind
**Estado actual:** Node.js + Express + EJS + Vanilla JS + PostgreSQL
**Estado objetivo:** Express API + React + TypeScript + Tailwind (Vite)
**Contexto:** Proyecto de uso interno — no hay usuarios externos, se puede romper sin impacto

---

## Resumen

Migración completa del frontend de EJS + Vanilla JS a React + TypeScript + Tailwind CSS. El backend Express se transforma en API pura. El super admin se implementa temprano (Fase 3) para tener visibilidad desde el inicio. El sitio actual en `sprites.decatron.net` se reemplaza directamente — no se necesita staging ni mantener EJS en paralelo.

---

## Estructura Final del Proyecto

```
pixel-sprite-editor/
├── backend/
│   ├── config/
│   │   └── database.js              # Pool PostgreSQL + migraciones
│   ├── middleware/
│   │   ├── auth.js                  # isAuthenticated
│   │   ├── admin.js                 # isAdmin
│   │   ├── rateLimiter.js           # Rate limiting por endpoint
│   │   └── validation.js            # Schemas de validación (zod)
│   ├── routes/
│   │   ├── authRoutes.js            # POST login, register, logout, GET me
│   │   ├── projectRoutes.js         # CRUD proyectos de sprites
│   │   ├── pixelArtRoutes.js        # CRUD proyectos de pixel art
│   │   └── adminRoutes.js           # Endpoints de super admin
│   ├── server.js                    # Express entry point (API only)
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx       # Nav responsive con menú mobile
│   │   │   │   ├── Footer.tsx       # Footer con copyright y links
│   │   │   │   └── Layout.tsx       # Layout wrapper
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── RegisterForm.tsx
│   │   │   │   └── ProtectedRoute.tsx
│   │   │   ├── editor/
│   │   │   │   ├── SpriteEditor.tsx       # Página principal del editor
│   │   │   │   ├── SpriteCanvas.tsx       # Canvas + grilla + selección
│   │   │   │   ├── FileUpload.tsx         # Drag & drop zone
│   │   │   │   ├── GridControls.tsx       # Configuración de grilla
│   │   │   │   ├── AnimationPanel.tsx     # CRUD animaciones
│   │   │   │   ├── AnimationPreview.tsx   # Preview con playback
│   │   │   │   ├── JsonExport.tsx         # Generación de JSON
│   │   │   │   └── ProjectPanel.tsx       # Save/load/delete
│   │   │   ├── pixelart/
│   │   │   │   ├── PixelArtEditor.tsx     # Página principal
│   │   │   │   ├── PixelCanvas.tsx        # Canvas con zoom y dibujo
│   │   │   │   ├── ToolBar.tsx            # Herramientas de dibujo
│   │   │   │   ├── PalettePanel.tsx       # Selector + presets
│   │   │   │   ├── FramePanel.tsx         # Gestión de frames
│   │   │   │   ├── AnimationPanel.tsx     # Preview de animación
│   │   │   │   ├── ExportDialog.tsx       # Diálogo de exportación
│   │   │   │   ├── ProjectPanel.tsx       # Save/load/delete
│   │   │   │   └── CanvasControls.tsx     # Zoom, resize, grid toggle
│   │   │   ├── admin/
│   │   │   │   ├── AdminLayout.tsx        # Layout del admin
│   │   │   │   ├── Dashboard.tsx          # Stats y overview
│   │   │   │   ├── UserManager.tsx        # CRUD usuarios
│   │   │   │   ├── ProjectBrowser.tsx     # Ver todos los proyectos
│   │   │   │   └── SystemHealth.tsx       # DB, disk, sesiones
│   │   │   └── common/
│   │   │       ├── Button.tsx
│   │   │       ├── Input.tsx
│   │   │       ├── Modal.tsx
│   │   │       ├── Toast.tsx              # Sistema de notificaciones
│   │   │       └── ConfirmDialog.tsx      # Reemplazo de confirm()
│   │   ├── hooks/
│   │   │   ├── useCanvas.ts           # Operaciones de canvas
│   │   │   ├── usePixelCanvas.ts      # Canvas pixel art específico
│   │   │   ├── useHistory.ts          # Undo/redo con delta compression
│   │   │   ├── useFrames.ts           # Gestión de frames
│   │   │   ├── useTools.ts            # Sistema de herramientas
│   │   │   ├── usePalette.ts          # Paleta de colores
│   │   │   ├── useAuth.ts             # Autenticación
│   │   │   ├── useApi.ts              # Fetch wrapper tipado
│   │   │   ├── useKeyboardShortcuts.ts # Atajos de teclado
│   │   │   └── useExport.ts           # Exportación PNG/ZIP/spritesheet
│   │   ├── stores/
│   │   │   ├── authStore.ts           # Estado de autenticación (Zustand)
│   │   │   ├── editorStore.ts         # Estado del editor de sprites
│   │   │   └── pixelArtStore.ts       # Estado del editor de pixel art
│   │   ├── utils/
│   │   │   ├── canvas.ts              # fillArea, drawLine, drawRect, etc.
│   │   │   ├── color.ts               # hexToRgb, rgbToHsl, validate
│   │   │   ├── export.ts              # PNG, ZIP, spritesheet
│   │   │   ├── validation.ts          # Validación de inputs
│   │   │   └── sanitize.ts            # Escape HTML, sanitización
│   │   ├── types/
│   │   │   ├── editor.ts              # SpriteProject, Animation, Frame
│   │   │   ├── pixelart.ts            # PixelArtProject, Tool, Palette
│   │   │   ├── auth.ts                # User, LoginRequest, etc.
│   │   │   └── api.ts                 # ApiResponse, PaginatedResponse
│   │   ├── services/
│   │   │   └── api.ts                 # Cliente API con interceptors
│   │   ├── pages/
│   │   │   ├── Landing.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── SpriteEditorPage.tsx
│   │   │   ├── PixelArtPage.tsx
│   │   │   └── AdminPage.tsx
│   │   ├── App.tsx                    # Router + providers
│   │   └── main.tsx                   # Entry point
│   ├── public/
│   │   └── favicon.ico
│   ├── index.html
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── package.json
│
├── .dev/
│   └── audit/                         # Documentación de auditoría
├── .gitignore
└── README.md
```

---

## Fase 0: Reorganización del Proyecto

**Objetivo:** Separar backend y frontend en carpetas sin romper nada todavía.

### Tareas

- [ ] Crear carpeta `backend/`
- [ ] Mover `server.js`, `config/`, `routes/`, `package.json`, `.env`, `nodemon.json` a `backend/`
- [ ] Mover `public/uploads/` a `backend/uploads/` (fuera de static público)
- [ ] Actualizar rutas internas en server.js y routes
- [ ] Actualizar path de uploads en multer config
- [ ] Reinstalar node_modules en `backend/`
- [ ] Verificar que el backend arranca correctamente desde `backend/`
- [ ] Actualizar screen command para nuevo path
- [ ] Eliminar `views/`, `public/js/`, `public/css/` (se reemplazarán por React)

### Archivos afectados

```
MOVER:
  server.js           → backend/server.js
  config/             → backend/config/
  routes/             → backend/routes/
  package.json        → backend/package.json
  package-lock.json   → backend/package-lock.json
  .env                → backend/.env
  nodemon.json        → backend/nodemon.json
  public/uploads/     → backend/uploads/

ELIMINAR (después de Fase 4-5, cuando React los reemplace):
  views/              # Vistas EJS
  public/js/          # JavaScript vanilla
  public/css/         # CSS custom
```

### Criterio de éxito
- `cd backend && npm start` arranca el servidor en puerto 3011
- Todos los endpoints API responden correctamente
- Uploads siguen funcionando

---

## Fase 1: Seguridad del Backend

**Objetivo:** Cerrar las 4 vulnerabilidades CRÍTICAS y 6 ALTAS identificadas en 04-SECURITY.md.

### Tareas

- [ ] Instalar dependencias de seguridad:
  ```
  npm install helmet express-rate-limit connect-pg-simple cors
  ```
- [ ] Configurar helmet con headers de seguridad
  ```javascript
  app.use(helmet({
      contentSecurityPolicy: false, // configurar después
      crossOriginEmbedderPolicy: false
  }));
  ```
- [ ] Configurar rate limiting por tipo de endpoint:

  | Endpoint | Límite |
  |----------|--------|
  | POST /api/auth/login | 5 / 15 min por IP |
  | POST /api/auth/register | 3 / hora por IP |
  | POST /api/* (save) | 30 / hora por usuario |
  | GET /api/* | 100 / min por IP |

- [ ] Configurar sesiones en PostgreSQL:
  ```javascript
  const PgSession = require('connect-pg-simple')(session);
  app.use(session({
      store: new PgSession({ pool }),
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: { secure: true, httpOnly: true, sameSite: 'lax', maxAge: 86400000 }
  }));
  ```
- [ ] Generar session secret robusto: `openssl rand -hex 32`
- [ ] Regenerar session ID post-login (`req.session.regenerate`)
- [ ] Unificar mensajes de error en login → "Credenciales incorrectas"
- [ ] Configurar CORS para permitir solo `sprites.decatron.net`
- [ ] Validar magic bytes en uploads (file-type package)
- [ ] Crear middleware de validación con zod para inputs
- [ ] Agregar password validation: 8+ chars, mayúscula, minúscula, número

### Archivos afectados

```
MODIFICAR:
  backend/server.js           # helmet, rate limit, cors, session store
  backend/routes/authRoutes.js # session regenerate, error messages, password rules
  backend/.env                 # nuevo SESSION_SECRET

CREAR:
  backend/middleware/rateLimiter.js
  backend/middleware/validation.js
```

### Criterio de éxito
- Headers de seguridad presentes en responses (verificar con curl -I)
- Login bloqueado después de 5 intentos fallidos
- Sesiones persisten tras restart del server
- Mensajes de error genéricos en login

---

## Fase 2: Backend como API Pura

**Objetivo:** Transformar el backend para que sirva JSON exclusivamente. Agregar endpoints de auth y admin.

### Tareas

#### Auth API (reemplaza redirects por JSON)

- [ ] `POST /api/auth/register` → `{ success, user }` o `{ success: false, errors }`
- [ ] `POST /api/auth/login` → `{ success, user }` o `{ success: false, message }`
- [ ] `POST /api/auth/logout` → `{ success }`
- [ ] `GET /api/auth/me` → `{ user }` o `401` (nuevo — para verificar sesión)

#### Database: agregar sistema de roles

- [ ] Agregar columna `role` a users: `VARCHAR(20) DEFAULT 'user' NOT NULL`
- [ ] Agregar columna `last_login` a users: `TIMESTAMP`
- [ ] Agregar columna `is_active` a users: `BOOLEAN DEFAULT true`
- [ ] Crear índice único `(user_id, project_name)` en projects
- [ ] Crear índice único `(user_id, project_name)` en pixelart_projects
- [ ] Agregar CHECK constraints para canvas_width/height (8-2048)
- [ ] Marcar usuario existente como admin:
  ```sql
  UPDATE users SET role = 'admin' WHERE username = 'anthonydeca';
  ```

#### Admin API (nuevo)

- [ ] `GET /api/admin/stats` → Estadísticas generales
  ```json
  {
    "users": { "total": 5, "active": 3, "admins": 1 },
    "projects": { "sprites": 12, "pixelart": 8, "totalSize": "45MB" },
    "system": { "dbSize": "52MB", "uploadsSize": "15MB", "uptime": "3d 5h" }
  }
  ```
- [ ] `GET /api/admin/users` → Lista de usuarios con metadata
- [ ] `GET /api/admin/users/:id` → Detalle de usuario con sus proyectos
- [ ] `PATCH /api/admin/users/:id` → Activar/desactivar usuario, cambiar rol
- [ ] `GET /api/admin/projects` → Todos los proyectos (con filtros)
- [ ] `DELETE /api/admin/projects/:type/:id` → Eliminar cualquier proyecto
- [ ] `GET /api/admin/activity` → Actividad reciente (últimos logins, saves)

#### Middleware

- [ ] Crear `middleware/auth.js` → isAuthenticated (extraído de las rutas)
- [ ] Crear `middleware/admin.js` → isAdmin (verifica role === 'admin')

### Archivos afectados

```
MODIFICAR:
  backend/routes/authRoutes.js     # JSON responses en vez de redirects
  backend/config/database.js       # Nuevas columnas y constraints

CREAR:
  backend/routes/adminRoutes.js    # Endpoints de admin
  backend/middleware/auth.js       # isAuthenticated middleware
  backend/middleware/admin.js      # isAdmin middleware
```

### Mapa completo de endpoints (post-fase 2)

| Método | Ruta | Auth | Admin | Descripción |
|--------|------|------|-------|-------------|
| POST | /api/auth/register | No | No | Registrar usuario |
| POST | /api/auth/login | No | No | Iniciar sesión |
| POST | /api/auth/logout | Sí | No | Cerrar sesión |
| GET | /api/auth/me | Sí | No | Obtener usuario actual |
| POST | /api/save-project | Sí | No | Guardar proyecto sprite |
| GET | /api/get-projects | Sí | No | Listar proyectos sprite |
| GET | /api/load-project/:id | Sí | No | Cargar proyecto sprite |
| DELETE | /api/delete-project/:id | Sí | No | Eliminar proyecto sprite |
| POST | /api/pixelart/save-project | Sí | No | Guardar proyecto pixel art |
| GET | /api/pixelart/get-projects | Sí | No | Listar proyectos pixel art |
| GET | /api/pixelart/load-project/:id | Sí | No | Cargar proyecto pixel art |
| DELETE | /api/pixelart/delete-project/:id | Sí | No | Eliminar proyecto pixel art |
| GET | /api/pixelart/export/:id | Sí | No | Exportar PNG |
| GET | /api/pixelart/export-frames/:id | Sí | No | Exportar frames |
| GET | /api/admin/stats | Sí | Sí | Estadísticas |
| GET | /api/admin/users | Sí | Sí | Listar usuarios |
| GET | /api/admin/users/:id | Sí | Sí | Detalle usuario |
| PATCH | /api/admin/users/:id | Sí | Sí | Modificar usuario |
| GET | /api/admin/projects | Sí | Sí | Listar todos los proyectos |
| DELETE | /api/admin/projects/:type/:id | Sí | Sí | Eliminar proyecto (admin) |
| GET | /api/admin/activity | Sí | Sí | Actividad reciente |

### Criterio de éxito
- Todos los endpoints responden JSON (ningún HTML/redirect)
- `GET /api/auth/me` retorna usuario autenticado o 401
- `GET /api/admin/stats` retorna estadísticas reales
- Usuario admin puede ver/gestionar usuarios y proyectos
- Usuarios normales reciben 403 en rutas de admin

---

## Fase 3: Frontend React — Base + Auth + Super Admin

**Objetivo:** Setup del frontend React con autenticación funcional y panel de super admin. Al completar esta fase, `sprites.decatron.net` ya corre React.

### Tareas

#### Setup

- [ ] `npm create vite@latest frontend -- --template react-ts`
- [ ] Instalar dependencias:
  ```
  npm install react-router-dom zustand axios jszip
  npm install -D tailwindcss @tailwindcss/vite
  ```
- [ ] Configurar Tailwind
- [ ] Configurar Vite proxy → `localhost:3011/api`
- [ ] Configurar ESLint + Prettier
- [ ] Crear estructura de carpetas según spec

#### Componentes base

- [ ] `Layout.tsx` — Header responsive con menú hamburguesa, Footer, main content
- [ ] `Header.tsx` — Logo, nav links, auth status, menú mobile
- [ ] `Footer.tsx` — Copyright, links
- [ ] `Button.tsx` — Componente base con variantes (primary, secondary, danger, success)
- [ ] `Input.tsx` — Input con label, error, validación
- [ ] `Modal.tsx` — Modal accesible con focus trap y escape
- [ ] `Toast.tsx` — Sistema de notificaciones (reemplazo de showMessage)
- [ ] `ConfirmDialog.tsx` — Reemplazo de confirm() nativo

#### Auth

- [ ] `authStore.ts` — Zustand store: user, login, register, logout, checkAuth
- [ ] `api.ts` — Cliente API con axios, interceptors para 401
- [ ] `LoginForm.tsx` — Form con validación, feedback visual
- [ ] `RegisterForm.tsx` — Form con password strength indicator
- [ ] `ProtectedRoute.tsx` — Wrapper que redirige a login si no auth

#### Super Admin

- [ ] `AdminLayout.tsx` — Sidebar + content area
- [ ] `Dashboard.tsx` — Cards con stats: usuarios, proyectos, storage, uptime
- [ ] `UserManager.tsx` — Tabla de usuarios con acciones (activar/desactivar, ver proyectos)
- [ ] `ProjectBrowser.tsx` — Grid/lista de todos los proyectos con preview
- [ ] `SystemHealth.tsx` — Estado de DB, disco, sesiones activas

#### Landing

- [ ] `Landing.tsx` — Rediseño de la landing actual con Tailwind, sin claims falsos

#### Deploy

- [ ] `npm run build` → `frontend/dist/`
- [ ] Configurar Nginx:
  ```nginx
  # Estáticos del frontend
  location / {
      root /var/www/html/pixel-sprite-editor/frontend/dist;
      try_files $uri $uri/ /index.html;
  }

  # API proxy
  location /api {
      proxy_pass http://127.0.0.1:3011;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Uploads
  location /uploads {
      alias /var/www/html/pixel-sprite-editor/backend/uploads;
  }
  ```
- [ ] Switchear `sprites.decatron.net` a servir React

### Criterio de éxito
- `sprites.decatron.net` carga la app React
- Login y registro funcionan
- `/admin` muestra dashboard con datos reales
- Admin puede ver usuarios y proyectos
- Rutas protegidas redirigen a login
- Responsive: funciona en mobile y desktop
- No hay rastro de EJS

---

## Fase 4: Editor de Sprites

**Objetivo:** Portar el editor de sprites completo a React. El canvas usa la misma Canvas API pero envuelto en hooks tipados.

### Tareas

#### Utils (lógica pura, sin React)

- [ ] `utils/canvas.ts` — drawGrid, getFrameFromCoordinates, drawHighlights
- [ ] `utils/validation.ts` — validateProjectData, sanitizeProjectName

#### Hooks

- [ ] `useCanvas.ts` — ref al canvas, drawImage, drawGrid, coordenadas
- [ ] `useApi.ts` — saveProject, loadProject, deleteProject, getProjects (tipado)

#### Componentes

- [ ] `SpriteEditor.tsx` — Layout del editor (3 columnas responsive)
- [ ] `FileUpload.tsx` — Drag & drop con validación y preview
- [ ] `SpriteCanvas.tsx` — Canvas con click/right-click para frames, grid overlay
- [ ] `GridControls.tsx` — Inputs de width/height + botón aplicar
- [ ] `AnimationPanel.tsx` — Lista de animaciones, crear/eliminar/renombrar, frames
- [ ] `AnimationPreview.tsx` — Preview canvas con requestAnimationFrame controlado
- [ ] `JsonExport.tsx` — Generar y descargar JSON de configuración
- [ ] `ProjectPanel.tsx` — Save/load/delete con confirmación modal

#### Types

- [ ] `types/editor.ts`:
  ```typescript
  interface SpriteProject {
      id: number;
      projectName: string;
      imagePath: string;
      jsonData: string;
      createdAt: string;
      updatedAt: string;
  }

  interface Animation {
      name: string;
      frames: number[];
      speed: number;
  }

  interface GridConfig {
      width: number;
      height: number;
      cols: number;
      rows: number;
      isDefined: boolean;
  }
  ```

#### Fixes de la auditoría incluidos

- [ ] Fix race condition en loadProject (await imagen antes de grilla)
- [ ] requestAnimationFrame controlado (solo cuando hay animación activa)
- [ ] Validación de dimensiones de imagen antes de cargar
- [ ] File size validation en upload

### Criterio de éxito
- Cargar imagen via drag & drop o file input
- Definir grilla y ver numeración de frames
- Crear/editar/eliminar animaciones seleccionando frames
- Preview de animación con controles de velocidad
- Generar y descargar JSON de configuración
- Save/load/delete proyectos desde backend
- Keyboard no conflicta con inputs de texto

---

## Fase 5: Editor de Pixel Art

**Objetivo:** Portar el editor de pixel art a React. Incluir fixes de performance y bugs de la auditoría.

### Tareas

#### Utils (lógica pura)

- [ ] `utils/canvas.ts` (extender) — setPixel, getPixel, fillArea, drawLine, drawRectangle, hexToRgb (fix hex corto)
- [ ] `utils/color.ts` — hexToRgb, rgbToHsl, validateHexColor, color presets
- [ ] `utils/export.ts` — exportPNG, exportZIP (JSZip local), exportSpritesheet

#### Hooks

- [ ] `usePixelCanvas.ts` — Canvas con zoom (4-24x), coordenadas, mouse/touch events
- [ ] `useTools.ts` — Sistema de herramientas con dispatch (sin duplicación de código)
- [ ] `useFrames.ts` — Gestión de frames con límite configurable (default 30)
- [ ] `useHistory.ts` — Undo/redo con **delta compression** (solo guardar píxeles cambiados)
- [ ] `usePalette.ts` — Paleta con presets, import/export, extracción de canvas
- [ ] `useKeyboardShortcuts.ts` — Atajos que no conflictan con inputs
- [ ] `useExport.ts` — Exportación con progress indicator

#### Componentes

- [ ] `PixelArtEditor.tsx` — Layout 3 columnas responsive
- [ ] `PixelCanvas.tsx` — Canvas con ref, zoom, scroll container
- [ ] `ToolBar.tsx` — 6 herramientas + tamaños de brush + cursor contextual
- [ ] `PalettePanel.tsx` — Color picker, swatches, presets, import/export
- [ ] `FramePanel.tsx` — Navegación, add/duplicate/delete, counter
- [ ] `CanvasControls.tsx` — Zoom +/-, resize con confirmación, grid toggle
- [ ] `AnimationPanel.tsx` — Preview con requestAnimationFrame controlado
- [ ] `ExportDialog.tsx` — Modal accesible con opciones (PNG, ZIP, spritesheet, scale)
- [ ] `ProjectPanel.tsx` — Save/load/delete con estado de modificación

#### Types

- [ ] `types/pixelart.ts`:
  ```typescript
  type Tool = 'brush' | 'eraser' | 'bucket' | 'eyedropper' | 'line' | 'rectangle';

  interface PixelArtProject {
      id: number;
      projectName: string;
      canvasWidth: number;
      canvasHeight: number;
      imageData: string;
      framesData: string;
      palette: string[];
      settings: EditorSettings;
      createdAt: string;
      updatedAt: string;
  }

  interface EditorSettings {
      showGrid: boolean;
      brushSize: number;
      selectedTool: Tool;
  }

  interface HistoryEntry {
      changedPixels: Map<string, [number, number, number, number]>;
      canvasWidth: number;
      canvasHeight: number;
  }
  ```

#### Fixes y mejoras incluidos (de auditoría)

- [ ] **Sin duplicación:** canvas.ts tiene las funciones una sola vez, useTools las consume
- [ ] **Delta compression en history:** solo guarda píxeles cambiados (~90% menos memoria)
- [ ] **Frame limit:** máximo 30 frames por defecto, configurable
- [ ] **Grid optimizado:** cachear en offscreen canvas, solo redibujar si cambia
- [ ] **hexToRgb:** soporta hex corto (#RGB → #RRGGBB)
- [ ] **JSZip local:** instalado como dependencia, no CDN
- [ ] **Export dialog accesible:** focus trap, escape key, progress bar
- [ ] **requestAnimationFrame controlado:** solo corre cuando hay animación visible
- [ ] **Event cleanup:** useEffect cleanup en todos los listeners
- [ ] **Confirmaciones:** ConfirmDialog component en vez de confirm() nativo

### Criterio de éxito
- Todas las herramientas funcionan (brush, eraser, bucket, eyedropper, line, rectangle)
- Zoom fluido entre 4x y 24x
- Touch support funcional
- Undo/redo con 50 pasos y uso de memoria < 2MB para canvas 256x256
- Frames: crear, duplicar, eliminar, navegar
- 4 paletas preset + custom + import/export
- Export PNG (scaled), ZIP (todos los frames), spritesheet
- Save/load/delete proyectos
- Keyboard shortcuts (B, E, G, I, L, R, Ctrl+Z, Ctrl+Shift+Z)
- Grid overlay togglable
- Performance: sin frame drops visibles en canvas 256x256

---

## Fase 6: Polish y Deploy Final

**Objetivo:** Limpiar, optimizar, eliminar código legacy, deploy final.

### Tareas

- [ ] Eliminar carpetas legacy: `views/`, `public/js/`, `public/css/`
- [ ] Eliminar `show-structure.js`
- [ ] Build de producción optimizado: `npm run build`
- [ ] Configurar Nginx con gzip y cache headers:
  ```nginx
  gzip on;
  gzip_types text/plain text/css application/json application/javascript;
  gzip_min_length 1000;

  location /assets {
      root /var/www/html/pixel-sprite-editor/frontend/dist;
      expires 30d;
      add_header Cache-Control "public, immutable";
  }
  ```
- [ ] Verificar Lighthouse score (target: 90+ en todas las categorías)
- [ ] Verificar accesibilidad con axe-core
- [ ] Actualizar WEB_SERVICES_README.md con nueva estructura
- [ ] Actualizar web-services.sh si es necesario
- [ ] Limpiar dependencias no usadas en backend
- [ ] Commit final y push

### Criterio de éxito
- No queda código EJS ni Vanilla JS en el proyecto
- Build de producción < 500KB (sin imágenes)
- Lighthouse: Performance 90+, Accessibility 90+, Best Practices 90+
- Todas las features de la versión EJS funcionan en la versión React
- Super admin funcional con datos reales
- HTTPS funcionando con wildcard cert

---

## Resumen del Plan

| Fase | Nombre | Enfoque | Resultado |
|------|--------|---------|-----------|
| 0 | Reorganización | Estructura | Backend y frontend separados |
| 1 | Seguridad | Backend | 4 CRÍTICOS y 6 ALTOS cerrados |
| 2 | API Pura | Backend | 21 endpoints JSON + admin + roles |
| 3 | React Base | Frontend | Auth + admin + landing en React |
| 4 | Editor Sprites | Frontend | Editor de sprites completo en React |
| 5 | Editor Pixel Art | Frontend | Editor pixel art con fixes de auditoría |
| 6 | Polish | Full stack | Deploy final, cleanup, optimización |

---

## Notas

- **No se necesita staging:** el proyecto es de uso interno, podemos trabajar directo en producción
- **No se necesita mantener EJS:** podemos switchear a React tan pronto como la Fase 3 esté lista
- **Las Fases 4 y 5 no tienen orden de prioridad:** se pueden hacer en cualquier orden
- **La lógica de Canvas API se reutiliza:** se mueve a `utils/canvas.ts` tipado, los algoritmos no cambian
- **Zustand sobre Redux:** más simple, menos boilerplate, suficiente para este proyecto
- **JSZip como dependencia local:** eliminamos la carga dinámica desde CDN
