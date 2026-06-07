## b) `packages/web/Dockerfile.prod`

### Propósito

Construir una imagen productiva para el frontend React/Vite ubicado en `packages/web`. El archivo es necesario para compilar los assets estáticos en una etapa Node.js y servirlos en producción con nginx, evitando ejecutar Vite o Node.js como servidor productivo.

La imagen final debe contener solo HTML, CSS, JS e imágenes generadas por `vite build`, más una configuración nginx orientada a SPA, compresión, cache y headers de seguridad.

### Estructura

El diseño usa `build.context: .` desde la raíz del monorepo para resolver el workspace `@alentapp/shared`.

| Etapa | Nombre | Base | Propósito |
| --- | --- | --- | --- |
| Stage 1 | `deps` | `node:22-alpine` | Instalar dependencias necesarias para construir el frontend. |
| Stage 2 | `build` | `node:22-alpine` | Ejecutar `vite build` mediante `npm run build -w packages/web`. |
| Stage 3 | `runtime` | `nginx:stable-alpine` | Servir los archivos estáticos generados usando nginx. |

#### Stage 1: `deps`

- Define `WORKDIR /app`.
- Copia `package.json`, `package-lock.json`, `packages/web/package.json` y `packages/shared/package.json`.
- Ejecuta `npm ci` para instalar dependencias reproducibles del workspace.
- Mantiene esta etapa separada para aprovechar cache cuando no cambian los manifests.

#### Stage 2: `build`

- Copia `node_modules` desde `deps`.
- Copia `packages/web`, `packages/shared` y archivos de configuración necesarios para Vite/TypeScript.
- Ejecuta `npm run build -w packages/web`, que actualmente corre `tsc -b && vite build`.
- Genera salida estática en `packages/web/dist`.
- No expone puertos ni ejecuta servidor.

#### Stage 3: `runtime`

- Usa `nginx:stable-alpine`; no usa Node.js en producción.
- Copia `packages/web/dist` a `/usr/share/nginx/html`.
- Reemplaza la configuración default de nginx por una configuración productiva.
- Expone `8080`.
- Incluye healthcheck contra `localhost:8080`, por ejemplo `wget --spider -q http://localhost:8080`.

### Configuración nginx esperada

La configuración nginx debe contemplar:

- Soporte SPA: `try_files $uri $uri/ /index.html` para rutas manejadas por React Router.
- Compresión gzip habilitada para `text/plain`, `text/css`, `application/javascript`, `application/json`, `image/svg+xml` y fuentes.
- Cache largo para assets versionados: `Cache-Control: public, max-age=31536000, immutable` en `/assets/`.
- Cache conservador para `index.html`: `Cache-Control: no-cache` para permitir publicar nuevas versiones sin quedar atrapados en cache del navegador.
- Security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictivo y `Content-Security-Policy` basada en `default-src 'self'`.

### Requisitos no funcionales

- Imagen final máxima recomendada: 80 MB comprimida.
- Tiempo de startup de nginx: menor a 5 segundos.
- Servidor productivo: nginx; no se debe ejecutar `vite preview`, `npm run dev` ni Node.js en runtime.
- Assets estáticos: servidos con gzip cuando el cliente lo soporte.
- Cache: assets con hash cacheados por 1 año; HTML sin cache fuerte.
- Seguridad: headers HTTP aplicados en todas las respuestas estáticas.
- Healthcheck: intervalo 30 segundos, timeout 5 segundos, 3 reintentos, `start_period` 5 segundos.
- Configuración de API pública: debe inyectarse en build con variables `VITE_*` no sensibles. Ningún secreto debe quedar embebido en el bundle frontend.