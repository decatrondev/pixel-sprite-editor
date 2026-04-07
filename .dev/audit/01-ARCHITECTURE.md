# 01 - Arquitectura del Sistema

**Fecha de auditoría:** 2026-04-07
**Proyecto:** Pixel Sprite Editor
**Versión:** 1.0.0
**Stack:** Node.js + Express + EJS + PostgreSQL + Vanilla JS

---

## Resumen

Pixel Sprite Editor es una aplicación web full-stack para crear y gestionar hojas de sprites con generación de configuración JSON, y un editor de pixel art con soporte de animación por frames. La aplicación sigue una arquitectura MVC parcial donde las rutas actúan como controladores, sin capa de modelos ni servicios separados.

**Estadísticas del proyecto:**

| Métrica | Valor |
|---------|-------|
| Total de archivos JS (backend) | 6 |
| Total de archivos JS (frontend) | 17 |
| Total de vistas EJS | 7 (5 + 2 partials) |
| Total de archivos CSS | 2 |
| Líneas de código (backend) | ~570 |
| Líneas de código (frontend JS) | ~4,506 |
| Líneas de código (CSS) | ~1,481 |
| Líneas de código (vistas) | ~835 |
| **Total estimado** | **~7,392** |
| Tablas en DB | 3 |
| Endpoints API | 13 |
| Dependencias producción | 8 |
| Dependencias desarrollo | 1 |

---

## Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Runtime | Node.js | — |
| Framework | Express | ^4.19.2 |
| Template Engine | EJS | ^3.1.10 |
| Base de datos | PostgreSQL | 5432 |
| Driver DB | pg | ^8.20.0 |
| Autenticación | bcryptjs | ^2.4.3 |
| Sesiones | express-session | ^1.18.0 |
| Upload de archivos | multer | ^1.4.5-lts.1 |
| File system | fs-extra | ^11.2.0 |
| Variables de entorno | dotenv | ^16.4.5 |
| Dev reload | nodemon | ^3.1.0 |
| CSS Framework | Tailwind CSS | CDN (sin build) |

---

## Punto de Entrada

**Archivo:** `server.js` (57 LOC)

| Responsabilidad | Implementación |
|----------------|---------------|
| Inicialización DB | `createTables()` al arrancar |
| Static files | `express.static('public')` |
| Body parsing | `urlencoded` + `json` |
| Sesiones | `express-session` con cookie |
| Vista engine | EJS |
| Rutas | 4 grupos montados |

**Flujo de arranque:**
1. Carga variables de entorno (dotenv)
2. Ejecuta `createTables()` — crea schema si no existe
3. Configura middlewares (static, body parser, session)
4. Inyecta `user` en `res.locals` globalmente
5. Monta rutas en 4 prefijos
6. Escucha en puerto 3011

---

## Estructura de Archivos

```
pixel-sprite-editor/
├── server.js                          # Punto de entrada
├── package.json                       # Dependencias y scripts
├── nodemon.json                       # Config de desarrollo
├── .env                               # Variables de entorno
├── .gitignore                         # Exclusiones de git
├── config/
│   └── database.js                    # Pool PostgreSQL + createTables
├── routes/
│   ├── mainRoutes.js                  # Vistas principales (/, /editor, /pixelart)
│   ├── authRoutes.js                  # Registro, login, logout
│   ├── apiRoutes.js                   # CRUD proyectos de sprites
│   └── pixelArtRoutes.js             # CRUD proyectos de pixel art
├── views/
│   ├── index.ejs                      # Landing page
│   ├── editor.ejs                     # Editor de sprites
│   ├── pixelart.ejs                   # Editor de pixel art
│   ├── login.ejs                      # Formulario de login
│   ├── register.ejs                   # Formulario de registro
│   └── partials/
│       ├── header.ejs                 # Navegación + head HTML
│       └── footer.ejs                 # Cierre HTML
├── public/
│   ├── css/
│   │   ├── main.css                   # Estilos globales (403 LOC)
│   │   └── pixelart.css               # Estilos editor pixel art (1078 LOC)
│   ├── js/
│   │   ├── editor.js                  # Orquestador editor de sprites
│   │   ├── pixelartEditor.js          # Orquestador editor pixel art
│   │   └── modules/
│   │       ├── fileHandler.js         # Drag & drop + upload
│   │       ├── canvasManager.js       # Canvas principal sprites
│   │       ├── animationManager.js    # Gestión de animaciones
│   │       ├── jsonGenerator.js       # Generador de JSON config
│   │       ├── apiManager.js          # Comunicación con API sprites
│   │       ├── uiManager.js           # DOM y mensajes
│   │       ├── previewManager.js      # Preview de animaciones
│   │       └── pixelart/
│   │           ├── pixelArtCanvas.js  # Canvas + dibujo
│   │           ├── pixelArtTools.js   # Herramientas (brush, fill, etc.)
│   │           ├── pixelArtFrames.js  # Gestión de frames
│   │           ├── pixelArtHistory.js # Undo/redo
│   │           ├── pixelArtPalette.js # Paletas de colores
│   │           ├── pixelArtExport.js  # Exportación PNG/ZIP/Spritesheet
│   │           ├── pixelArtProject.js # Persistencia de proyectos
│   │           └── pixelArtGrid.js    # Overlay de grilla
│   └── uploads/                       # Imágenes subidas por usuarios
└── .dev/
    └── audit/                         # Documentación de auditoría
```

---

## Capas de la Aplicación

### 1. Capa de Presentación (Frontend)

La aplicación tiene dos editores independientes, cada uno con su propio ecosistema de módulos:

**Editor de Sprites** — 7 módulos, orquestados por `editor.js`:

| Módulo | LOC | Responsabilidad |
|--------|-----|----------------|
| editor.js | 68 | Orquestador, estado global |
| fileHandler.js | 136 | Carga de imágenes (drag & drop, file input) |
| canvasManager.js | 258 | Canvas principal, grilla, selección de frames |
| animationManager.js | 314 | CRUD de animaciones, gestión de frames |
| jsonGenerator.js | 65 | Genera JSON de configuración de sprites |
| apiManager.js | 283 | Comunicación con API REST |
| uiManager.js | 314 | Renderizado de UI, mensajes, listas |
| previewManager.js | 166 | Preview de animación con requestAnimationFrame |

**Editor de Pixel Art** — 9 módulos, orquestados por `pixelartEditor.js`:

| Módulo | LOC | Responsabilidad |
|--------|-----|----------------|
| pixelartEditor.js | 421 | Orquestador, estado global, shortcuts |
| pixelArtCanvas.js | 416 | Canvas, dibujo, coordenadas, zoom |
| pixelArtTools.js | 454 | Herramientas de dibujo (7 herramientas) |
| pixelArtFrames.js | 322 | Gestión de frames de animación |
| pixelArtHistory.js | 124 | Undo/redo (50 pasos) |
| pixelArtPalette.js | 355 | Paletas de colores (4 presets) |
| pixelArtExport.js | 506 | Exportación (PNG, ZIP, spritesheet) |
| pixelArtProject.js | 492 | Persistencia con API |
| pixelArtGrid.js | 50 | Overlay de grilla |

### 2. Capa de Rutas (Backend)

No existe separación controller/service/model. Las rutas contienen toda la lógica de negocio directamente.

| Archivo | LOC | Prefijo | Endpoints |
|---------|-----|---------|-----------|
| mainRoutes.js | 25 | `/` | 3 (GET /, /editor, /pixelart) |
| authRoutes.js | 96 | `/auth` | 5 (GET/POST login, GET/POST register, GET logout) |
| apiRoutes.js | 222 | `/api` | 4 (POST save, GET projects, GET load, DELETE) |
| pixelArtRoutes.js | 317 | `/api/pixelart` | 6 (POST save, GET projects, GET load, DELETE, GET export, GET export-frames) |

### 3. Capa de Datos

Un solo archivo (`config/database.js`, 114 LOC) maneja:
- Pool de conexiones PostgreSQL
- Creación de schema (3 tablas)
- Triggers para `updated_at`
- Índices

No hay ORM, migrations, seeds, ni modelos.

---

## Mapa de Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/` | No | Landing page |
| GET | `/editor` | No | Editor de sprites |
| GET | `/pixelart` | No | Editor de pixel art |
| GET | `/auth/login` | No | Form de login |
| POST | `/auth/login` | No | Procesar login |
| GET | `/auth/register` | No | Form de registro |
| POST | `/auth/register` | No | Procesar registro |
| GET | `/auth/logout` | Sí | Cerrar sesión |
| POST | `/api/save-project` | Sí | Guardar proyecto sprite |
| GET | `/api/get-projects` | Sí | Listar proyectos sprite |
| GET | `/api/load-project/:id` | Sí | Cargar proyecto sprite |
| DELETE | `/api/delete-project/:id` | Sí | Eliminar proyecto sprite |
| POST | `/api/pixelart/save-project` | Sí | Guardar proyecto pixel art |
| GET | `/api/pixelart/get-projects` | Sí | Listar proyectos pixel art |
| GET | `/api/pixelart/load-project/:id` | Sí | Cargar proyecto pixel art |
| DELETE | `/api/pixelart/delete-project/:id` | Sí | Eliminar proyecto pixel art |
| GET | `/api/pixelart/export/:id` | Sí | Exportar PNG |
| GET | `/api/pixelart/export-frames/:id` | Sí | Exportar frames como JSON |

---

## Flujo de Datos

### Flujo de autenticación

```
Browser → POST /auth/login → authRoutes.js
  → pool.query('SELECT * FROM users WHERE email = $1')
  → bcrypt.compare(password, hash)
  → req.session.user = { id, username, email }
  → redirect /editor
```

### Flujo de guardado (pixel art)

```
Browser → POST /api/pixelart/save-project
  Body: { name, width, height, imageData (base64), frames_data (JSON string), palette, settings }
  → isAuthenticated middleware (verifica session)
  → validateProjectData()
  → pool.query('INSERT INTO pixelart_projects ... RETURNING id')
  → Response: { success: true, projectId }
```

### Flujo de guardado (sprites)

```
Browser → POST /api/save-project (multipart/form-data)
  Body: { projectName, jsonData, spriteImage (file) }
  → isAuthenticated middleware
  → multer procesa imagen → /public/uploads/{username}/{filename}
  → pool.query('INSERT INTO projects ...')
  → Response: { success: true, projectId }
```

---

## Patrón de Estado Frontend

Ambos editores usan un objeto de estado global que se pasa por referencia a todos los módulos:

**Editor de sprites** — `editorState`:
- `spriteImage`: imagen cargada
- `grid`: configuración de grilla (width, height, cols, rows)
- `animations`: objeto con todas las animaciones
- `activeAnimation`: animación seleccionada
- Referencias a todos los módulos

**Editor de pixel art** — `pixelArtState`:
- `canvas`, `ctx`: referencias al canvas
- `canvasWidth`, `canvasHeight`: dimensiones (default 64x64)
- `pixelSize`: zoom (default 10)
- `selectedTool`: herramienta activa
- `brushSize`: tamaño del pincel
- `colorPalette`: array de colores
- `showGrid`: toggle de grilla
- `currentProjectId`, `currentProjectName`: proyecto activo
- Referencias a todos los módulos

---

## Configuración del Servidor

| Variable | Valor | Archivo |
|----------|-------|---------|
| PORT | 3011 | .env |
| SESSION_SECRET | un_secreto_muy_dificil_de_adivinar | .env |
| DB_HOST | localhost | .env |
| DB_USER | decatron_user | .env |
| DB_NAME | pixel_sprites | .env |
| DB_PORT | 5432 | .env |

**Nginx:** `sprites.decatron.net` → proxy a `localhost:3011`
**SSL:** Wildcard cert `*.decatron.net` (expira 2026-05-28)
**Screen:** `SpriteEditor`

---

## Dependencias Faltantes

| Dependencia | Propósito | Impacto |
|-------------|----------|---------|
| helmet | Headers de seguridad HTTP | CRÍTICO |
| csurf / csrf-csrf | Protección CSRF | CRÍTICO |
| express-rate-limit | Rate limiting | CRÍTICO |
| compression | Compresión gzip | ALTO |
| connect-pg-simple | Sesiones en PostgreSQL | ALTO |
| joi / zod | Validación de schemas | ALTO |
| winston / pino | Logging estructurado | MEDIO |
| JSZip | Exportación ZIP (usado en frontend sin instalar) | MEDIO |

---

## Problemas Arquitectónicos

### 1. Sin separación de capas
Las rutas contienen lógica de negocio, queries SQL y manejo de respuestas directamente. No hay capa de servicios ni modelos.

### 2. Estado global compartido
Todos los módulos del frontend comparten un objeto de estado mutable por referencia, creando acoplamiento fuerte y dificultando el testing.

### 3. Sin sistema de migraciones
El schema se crea al arrancar la aplicación con `CREATE TABLE IF NOT EXISTS`. No hay forma de versionar cambios de schema ni hacer rollback.

### 4. Sesiones en memoria
Las sesiones se almacenan en la memoria del proceso Node.js. Se pierden al reiniciar y no escalan.

### 5. Archivos estáticos sin versionado
CSS y JS se sirven sin hash de contenido ni cache-busting. Los cambios pueden no reflejarse por cache del navegador.

### 6. Sin sistema de roles
Todos los usuarios son iguales. No existe concepto de admin, moderador, ni niveles de acceso.

### 7. Duplicación de código entre módulos
`pixelArtTools.js` duplica funciones de `pixelArtCanvas.js`: fillArea, drawLine, drawRectangle, getPixel, setPixel.

### 8. Sin tests
No hay ningún tipo de test: unitario, integración, ni e2e.
