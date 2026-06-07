# Diseño de artefactos de producción

Este documento especifica el diseño propuesto para construir y ejecutar AlentApp en producción con imágenes separadas para API y frontend, más una configuración de `docker-compose.prod.yml` endurecida para despliegue.

## a) `packages/api/Dockerfile.prod`

### Propósito

Construir una imagen productiva para la API Node.js/Fastify ubicada en `packages/api`. El archivo es necesario para separar el entorno de compilación del entorno de ejecución, reducir el tamaño final de la imagen y evitar que dependencias de desarrollo, código fuente innecesario o credenciales queden dentro del contenedor final.

El Dockerfile debe producir una imagen que ejecute únicamente el JavaScript compilado, con dependencias de producción, puerto interno `3000`, usuario no-root y healthcheck local.

### Estructura

El diseño usa `build.context: .` desde la raíz del monorepo para poder resolver workspaces como `@alentapp/shared`.

| Etapa | Nombre | Base | Propósito |
| --- | --- | --- | --- |
| Stage 1 | `deps` | `node:22-alpine` | Instalar únicamente dependencias de producción con `npm ci --omit=dev`. |
| Stage 2 | `build` | `node:22-alpine` | Instalar dependencias necesarias para compilar, copiar código fuente y generar JS desde TypeScript. |
| Stage 3 | `runtime` | `node:22-alpine` | Ejecutar solo `dist`, `node_modules` productivos y archivos mínimos de configuración con usuario no-root. |

#### Stage 1: `deps`

- Define `WORKDIR /app`.
- Copia solo archivos de resolución de dependencias: `package.json`, `package-lock.json`, `packages/api/package.json` y `packages/shared/package.json`.
- Ejecuta `npm ci --omit=dev` para generar `node_modules` con dependencias productivas.
- No copia código fuente en esta etapa para maximizar cache de Docker.

#### Stage 2: `build`

- Define `WORKDIR /app`.
- Copia manifests y lockfiles.
- Instala dependencias completas con `npm ci`, porque la compilación requiere TypeScript y herramientas de build.
- Copia `packages/api`, `packages/shared` y archivos de configuración TypeScript necesarios.
- Ejecuta la compilación TypeScript, por ejemplo `npx tsc`, dejando salida en `dist`.
- Si Prisma requiere cliente generado, esta etapa debe ejecutar la generación antes de copiar al runtime.
- Las dependencias de desarrollo quedan descartadas al finalizar la etapa.

#### Stage 3: `runtime`

- Define `NODE_ENV=production`.
- Define `WORKDIR /app`.
- Copia desde `deps` los `node_modules` productivos.
- Copia desde `build` el JS compilado (`dist`) y únicamente los archivos de metadata necesarios (`package.json` de la app/workspace y configuración mínima requerida en runtime).
- Usa usuario no-root. El diseño preferido es reutilizar el usuario `node` provisto por `node:22-alpine`; alternativamente se puede crear `appuser`.
- Expone `3000`.
- Ejecuta el proceso con `CMD ["node", "packages/api/dist/app.js"]` o la ruta equivalente según la salida de compilación.
- Incluye healthcheck contra `localhost:3000`, por ejemplo `wget --spider -q http://localhost:3000/` o `http://localhost:3000/health` si se implementa ese endpoint.

### `.dockerignore`

Debe existir un `.dockerignore` en la raíz del contexto para evitar copiar archivos innecesarios o sensibles al build.

Contenido mínimo esperado:

```dockerignore
node_modules
dist
.git
.github
coverage
*.log
.env
.env.*
Dockerfile*
docker-compose*.yml
docs
```

La exclusión de `.env` evita que secretos se incorporen a la imagen. Las variables se inyectan en tiempo de ejecución mediante `docker-compose.prod.yml`.

### Requisitos no funcionales

- Imagen final máxima recomendada: 250 MB comprimida.
- Tiempo de startup de API: menor a 15 segundos una vez que la base de datos esté saludable.
- Usuario runtime: no-root (`node` o `appuser`).
- Dependencias en runtime: solo producción; no debe incluir `typescript`, `vitest`, `tsx` ni herramientas de test.
- Superficie de ataque: no copiar tests, coverage, `.git`, documentación ni archivos `.env`.
- Healthcheck: intervalo 30 segundos, timeout 5 segundos, 3 reintentos, `start_period` 10 segundos.
- Reproducibilidad: usar `npm ci` y lockfile, no `npm install`.
- Configuración: puerto, URL de base de datos y secretos se reciben por variables de entorno; no se hardcodean en la imagen.

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