# 03 - Base de Datos

**Fecha de auditoría:** 2026-04-07
**Motor:** PostgreSQL 5432
**Base de datos:** pixel_sprites
**Usuario:** decatron_user
**Tablas:** 3
**Migraciones:** No hay sistema de migraciones

---

## Resumen

La base de datos consta de 3 tablas con relaciones simples (1:N). El schema se crea al arrancar la aplicación via `CREATE TABLE IF NOT EXISTS` en `config/database.js`. No existe sistema de migraciones, seeds, ni versionado de schema.

---

## Schema Actual

### Tabla: `users`

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | ID autoincremental |
| username | VARCHAR(50) | NOT NULL, UNIQUE | Nombre de usuario |
| email | VARCHAR(100) | NOT NULL, UNIQUE | Correo electrónico |
| password | VARCHAR(255) | NOT NULL | Hash bcrypt del password |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Fecha de registro |

**Índices:** PK en `id`, UNIQUE en `username`, UNIQUE en `email`
**Notas:** Sin columna de rol. Sin campos de metadata (last_login, avatar, etc.).

### Tabla: `projects`

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | ID autoincremental |
| user_id | INT | NOT NULL, FK → users(id) ON DELETE CASCADE | Propietario |
| project_name | VARCHAR(100) | NOT NULL | Nombre del proyecto |
| image_path | VARCHAR(255) | NOT NULL | Ruta relativa a la imagen (/uploads/username/file.png) |
| json_data | TEXT | — | Configuración JSON del sprite |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Fecha de creación |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Última modificación |

**Índices:** PK en `id`
**Triggers:** `update_projects_updated_at` (BEFORE UPDATE → actualiza `updated_at`)
**Notas:** `image_path` almacena ruta del filesystem. `json_data` almacena JSON como texto plano sin validación.

### Tabla: `pixelart_projects`

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | ID autoincremental |
| user_id | INT | NOT NULL, FK → users(id) ON DELETE CASCADE | Propietario |
| project_name | VARCHAR(100) | NOT NULL | Nombre del proyecto |
| canvas_width | INT | NOT NULL | Ancho del canvas en píxeles |
| canvas_height | INT | NOT NULL | Alto del canvas en píxeles |
| image_data | TEXT | NOT NULL | Imagen base64 del frame actual |
| frames_data | TEXT | — | JSON string con todos los frames como DataURLs |
| palette | JSONB | — | Paleta de colores activa |
| settings | JSONB | — | Configuración del editor |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Fecha de creación |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Última modificación |

**Índices:** PK en `id`, `idx_pixelart_user_projects` en `(user_id, updated_at)`
**Triggers:** `update_pixelart_projects_updated_at` (BEFORE UPDATE → actualiza `updated_at`)

---

## Relaciones

```
users (1) ──────── (N) projects
  │
  └──── (1) ──── (N) pixelart_projects
```

Ambas relaciones tienen `ON DELETE CASCADE`: eliminar un usuario elimina todos sus proyectos.

---

## Función y Triggers

### Función: `update_updated_at_column()`

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql'
```

### Triggers

| Trigger | Tabla | Evento | Acción |
|---------|-------|--------|--------|
| update_projects_updated_at | projects | BEFORE UPDATE | Actualiza updated_at |
| update_pixelart_projects_updated_at | pixelart_projects | BEFORE UPDATE | Actualiza updated_at |

---

## Problemas de Schema

### 1. Almacenamiento de imágenes como TEXT

`pixelart_projects.image_data` almacena imágenes base64 como TEXT. Un canvas de 256x256 genera un string base64 de ~350KB. Con frames_data conteniendo múltiples frames, un solo proyecto puede ocupar varios MB.

| Canvas | Base64 por frame | 10 frames | 20 frames |
|--------|-----------------|-----------|-----------|
| 64x64 | ~22KB | ~220KB | ~440KB |
| 128x128 | ~87KB | ~870KB | ~1.7MB |
| 256x256 | ~350KB | ~3.5MB | ~7MB |

**Recomendación:** Almacenar imágenes en filesystem o storage externo (S3/local), guardar solo referencia en DB. Alternativamente, usar BYTEA en vez de TEXT para datos binarios.

### 2. frames_data como JSON string en TEXT

Los frames se serializan como un JSON string con DataURLs dentro. Esto es:
- Ineficiente (base64 de base64 en algunos casos)
- No queryable (no se puede buscar por contenido)
- Sin validación de estructura

**Recomendación:** Si los frames necesitan ser individuales, crear tabla `pixelart_frames` separada.

### 3. Sin sistema de roles

La tabla `users` no tiene columna de rol. Para implementar super admin se necesita agregar una columna `role`.

**Schema propuesto:**

```sql
ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user' NOT NULL;
```

| Rol | Permisos |
|-----|----------|
| user | CRUD propios proyectos |
| admin | Todo + gestión de usuarios + estadísticas |

### 4. Sin índice en project_name por usuario

Las queries de duplicados hacen `WHERE user_id = $1 AND project_name = $2` sin índice compuesto.

**Recomendación:**

```sql
CREATE UNIQUE INDEX idx_projects_user_name ON projects (user_id, project_name);
CREATE UNIQUE INDEX idx_pixelart_user_name ON pixelart_projects (user_id, project_name);
```

Esto también refuerza la unicidad a nivel de DB, no solo a nivel de aplicación.

### 5. image_path almacena ruta del filesystem

`projects.image_path` contiene rutas como `/uploads/anthonydeca/orco_ataques.png`. Si el username contiene caracteres especiales o se renombra, las rutas se rompen.

**Recomendación:** Usar UUIDs como nombres de archivo y almacenar solo el UUID en la DB.

### 6. Sin validación a nivel de DB

No hay CHECK constraints para:
- `canvas_width` y `canvas_height` (podrían ser 0 o negativos)
- `project_name` (podría estar vacío aunque sea NOT NULL)

**Recomendación:**

```sql
ALTER TABLE pixelart_projects ADD CONSTRAINT chk_canvas_width CHECK (canvas_width BETWEEN 8 AND 2048);
ALTER TABLE pixelart_projects ADD CONSTRAINT chk_canvas_height CHECK (canvas_height BETWEEN 8 AND 2048);
```

---

## Queries del Sistema

### Por archivo de rutas

**authRoutes.js** (3 queries):

| Query | Tipo | Tabla | Propósito |
|-------|------|-------|-----------|
| `SELECT * FROM users WHERE username = $1 OR email = $2` | SELECT | users | Verificar duplicados en registro |
| `INSERT INTO users (username, email, password) VALUES ($1, $2, $3)` | INSERT | users | Crear usuario |
| `SELECT * FROM users WHERE email = $1` | SELECT | users | Login |

**apiRoutes.js** (6 queries):

| Query | Tipo | Tabla | Propósito |
|-------|------|-------|-----------|
| `SELECT id, image_path FROM projects WHERE id = $1 AND user_id = $2` | SELECT | projects | Verificar propiedad |
| `UPDATE projects SET json_data = $1 WHERE id = $2 AND user_id = $3` | UPDATE | projects | Actualizar JSON |
| `SELECT id FROM projects WHERE user_id = $1 AND project_name = $2` | SELECT | projects | Verificar duplicado |
| `INSERT INTO projects (...) VALUES (...) RETURNING id` | INSERT | projects | Crear proyecto |
| `SELECT id, project_name, created_at, updated_at FROM projects WHERE user_id = $1 ORDER BY updated_at DESC` | SELECT | projects | Listar proyectos |
| `SELECT * FROM projects WHERE id = $1 AND user_id = $2` | SELECT | projects | Cargar proyecto |
| `DELETE FROM projects WHERE id = $1 AND user_id = $2` | DELETE | projects | Eliminar proyecto |

**pixelArtRoutes.js** (8 queries):

| Query | Tipo | Tabla | Propósito |
|-------|------|-------|-----------|
| `SELECT id FROM pixelart_projects WHERE id = $1 AND user_id = $2` | SELECT | pixelart_projects | Verificar propiedad |
| `UPDATE pixelart_projects SET ... WHERE id = $1 AND user_id = $2` | UPDATE | pixelart_projects | Actualizar proyecto |
| `SELECT id FROM pixelart_projects WHERE user_id = $1 AND project_name = $2` | SELECT | pixelart_projects | Verificar duplicado |
| `INSERT INTO pixelart_projects (...) VALUES (...) RETURNING id` | INSERT | pixelart_projects | Crear proyecto |
| `SELECT id, project_name, ... FROM pixelart_projects WHERE user_id = $1 ORDER BY updated_at DESC` | SELECT | pixelart_projects | Listar proyectos |
| `SELECT * FROM pixelart_projects WHERE id = $1 AND user_id = $2` | SELECT | pixelart_projects | Cargar proyecto |
| `SELECT project_name FROM pixelart_projects WHERE id = $1 AND user_id = $2` | SELECT | pixelart_projects | Obtener nombre antes de delete |
| `DELETE FROM pixelart_projects WHERE id = $1 AND user_id = $2` | DELETE | pixelart_projects | Eliminar proyecto |

**Total: 17 queries parametrizadas.** Todas usan placeholders `$N` — no hay riesgo de SQL injection.

---

## Índices Recomendados

| Índice | Tabla | Columnas | Justificación |
|--------|-------|----------|---------------|
| idx_projects_user_name | projects | (user_id, project_name) | UNIQUE — duplicados |
| idx_pixelart_user_name | pixelart_projects | (user_id, project_name) | UNIQUE — duplicados |
| idx_users_email | users | (email) | Ya existe via UNIQUE |
| idx_projects_user_updated | projects | (user_id, updated_at) | Listado ordenado |

---

## Estrategia de Migración Recomendada

### Fase 1: Agregar columnas faltantes

```sql
-- Rol de usuario
ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user' NOT NULL;

-- Metadata de usuario
ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Constraints
ALTER TABLE pixelart_projects ADD CONSTRAINT chk_canvas_width CHECK (canvas_width BETWEEN 8 AND 2048);
ALTER TABLE pixelart_projects ADD CONSTRAINT chk_canvas_height CHECK (canvas_height BETWEEN 8 AND 2048);

-- Índices únicos compuestos
CREATE UNIQUE INDEX idx_projects_user_name ON projects (user_id, project_name);
CREATE UNIQUE INDEX idx_pixelart_user_name ON pixelart_projects (user_id, project_name);
```

### Fase 2: Implementar sistema de migraciones

Adoptar una herramienta de migraciones (node-pg-migrate, knex, o Prisma) y eliminar `createTables()` del arranque de la aplicación.

### Fase 3: Optimizar almacenamiento de imágenes

Mover image_data y frames_data a almacenamiento externo (filesystem organizado o S3), manteniendo solo referencias en la DB.
