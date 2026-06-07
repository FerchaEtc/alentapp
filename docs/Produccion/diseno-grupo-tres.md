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

## c) `docker-compose.prod.yml`

### Propósito

Definir la orquestación productiva de AlentApp usando servicios separados para base de datos, API y frontend. Este archivo es necesario para ejecutar los contenedores con límites de recursos, healthchecks, políticas de seguridad, logging con rotación, red personalizada y variables sensibles provenientes de `.env`.

El compose productivo no debe reutilizar montajes ni comandos de desarrollo. No debe montar el código fuente completo, no debe ejecutar watchers y no debe hardcodear credenciales.

### Estructura

Servicios propuestos:

| Servicio | Imagen/build | Responsabilidad | Exposición |
| --- | --- | --- | --- |
| `db` | `postgres:16-alpine` | Persistencia PostgreSQL. | Solo red interna. |
| `api` | Build con `packages/api/Dockerfile.prod` | API Fastify en puerto `3000`. | Red interna; opcionalmente publicar si se necesita acceso directo. |
| `web` | Build con `packages/web/Dockerfile.prod` | Servir frontend con nginx en puerto `80`. | Publicado al host o balanceador. |

Capas de configuración:

- Recursos: CPU y memoria definidos por servicio.
- Salud: healthchecks para `db`, `api` y `web`.
- Seguridad: filesystem de solo lectura cuando sea posible, capacidades Linux mínimas, `no-new-privileges` y usuario no-root en imágenes propias.
- Logging: driver `json-file` con rotación.
- Red: red bridge personalizada, no la default bridge.
- Secretos/configuración: variables desde `.env`, nunca valores sensibles hardcodeados.
- Persistencia: volumen nombrado para datos de PostgreSQL.

### Diseño de servicios

#### `db`

- Usa `postgres:16-alpine`.
- Lee `POSTGRES_USER`, `POSTGRES_PASSWORD` y `POSTGRES_DB` desde `.env`.
- Persiste datos en volumen nombrado `pgdata:/var/lib/postgresql/data`.
- Healthcheck con `pg_isready -U $POSTGRES_USER -d $POSTGRES_DB`.
- No publica `5432` al host en producción salvo necesidad operativa explícita.
- Con `read_only: true`, debe declarar `tmpfs` para rutas temporales como `/tmp` y `/var/run/postgresql`, manteniendo writable solo el volumen de datos.

#### `api`

- Construye desde `packages/api/Dockerfile.prod`.
- Recibe `DATABASE_URL`, `PORT=3000` y demás variables desde `.env`.
- Depende de `db` con `condition: service_healthy`.
- Healthcheck HTTP contra `localhost:3000`.
- No monta el código fuente local.
- Usa `read_only: true` y `tmpfs: /tmp` si la aplicación o Node necesitan temporales.
- Aplica `cap_drop: [ALL]` y `security_opt: [no-new-privileges:true]`.

#### `web`

- Construye desde `packages/web/Dockerfile.prod`.
- Sirve puerto interno `80` con nginx.
- Publica `80:80` o se conecta a un reverse proxy externo, según el entorno.
- Depende de `api` con `condition: service_healthy` si nginx se configura para proxy o si el despliegue requiere API disponible antes del frontend.
- Healthcheck HTTP contra `localhost:80`.
- Usa `read_only: true` con `tmpfs` para `/var/cache/nginx`, `/var/run` y `/tmp`.
- Aplica `cap_drop: [ALL]`, `cap_add: [NET_BIND_SERVICE]` si nginx escucha en puerto `80`, y `security_opt: [no-new-privileges:true]`.

### Fragmento de configuración esperado

```yaml
services:
  db:
    image: postgres:16-alpine
    env_file: .env
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - alentapp_prod
    read_only: true
    tmpfs:
      - /tmp
      - /var/run/postgresql
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    cpus: "1.0"
    mem_limit: 512m
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 10s
      timeout: 5s
      retries: 5
    logging: &default-logging
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  api:
    build:
      context: .
      dockerfile: packages/api/Dockerfile.prod
    env_file: .env
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: ${DATABASE_URL}
    depends_on:
      db:
        condition: service_healthy
    networks:
      - alentapp_prod
    read_only: true
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    cpus: "0.75"
    mem_limit: 512m
    healthcheck:
      test: ["CMD-SHELL", "wget --spider -q http://localhost:3000/"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    logging: *default-logging

  web:
    build:
      context: .
      dockerfile: packages/web/Dockerfile.prod
    depends_on:
      api:
        condition: service_healthy
    ports:
      - "80:80"
    networks:
      - alentapp_prod
    read_only: true
    tmpfs:
      - /var/cache/nginx
      - /var/run
      - /tmp
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    security_opt:
      - no-new-privileges:true
    cpus: "0.25"
    mem_limit: 128m
    healthcheck:
      test: ["CMD-SHELL", "wget --spider -q http://localhost:80/"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 5s
    logging: *default-logging

volumes:
  pgdata:

networks:
  alentapp_prod:
    name: alentapp-prod-net
    driver: bridge
```

### Variables esperadas en `.env`

```dotenv
POSTGRES_USER=...
POSTGRES_PASSWORD=...
POSTGRES_DB=...
DATABASE_URL=postgres://USER:PASSWORD@db:5432/DB_NAME
```

Las variables `VITE_*` del frontend solo deben contener configuración pública, porque quedan embebidas en el bundle generado por Vite.

### Requisitos no funcionales

- Límites de recursos definidos por servicio: `db` hasta 1 CPU/512 MB, `api` hasta 0.75 CPU/512 MB, `web` hasta 0.25 CPU/128 MB.
- Healthchecks obligatorios: `db` con `pg_isready`, `api` contra `localhost:3000` y `web` contra `localhost:80`.
- Seguridad: `read_only: true`, `cap_drop: ALL`, `security_opt: no-new-privileges:true`; `cap_add: NET_BIND_SERVICE` solo en servicios que necesiten bindear puertos privilegiados, como nginx en `80`.
- Logging: `json-file` con `max-size: 10m` y `max-file: 3` para evitar crecimiento ilimitado de logs.
- Red: todos los servicios conectados a `alentapp-prod-net`, una red bridge personalizada en lugar de la default bridge.
- Secretos: valores sensibles desde `.env`; el archivo `.env` no debe versionarse ni copiarse a imágenes.
- Persistencia: los datos de PostgreSQL viven en volumen nombrado, no en filesystem efímero del contenedor.
- Arranque: `api` espera a `db` saludable; `web` puede esperar a `api` saludable si depende de proxy o chequeo integral.
- Inmutabilidad: no se montan fuentes locales ni se ejecutan comandos de desarrollo en producción.


# 2.2. Diseño de la observabilidad

Este documento especifica cómo integrar OpenTelemetry en la API de AlentApp para capturar métricas de producción. La API actual está implementada con Node.js y Fastify, por lo que la instrumentación se propone en el proceso de la API y se expone mediante un `PrometheusExporter` para que Prometheus pueda recolectarla.

## Objetivo

La observabilidad debe permitir responder tres preguntas operativas sobre la API:

- ¿Cuánto tráfico recibe el servicio?
- ¿Cuántas requests fallan?
- ¿Cuánto tardan en responder los endpoints?

Para eso se usa el método RED: Rate, Errors y Duration. Además, se agregan métricas de memoria del proceso y cantidad de requests concurrentes para detectar saturación del runtime.

## Integración de OpenTelemetry en la API

La integración propuesta es:

1. Agregar dependencias OpenTelemetry a `packages/api`.
2. Crear un módulo `packages/api/src/telemetry.ts` que inicialice el SDK, el `Meter` y el `PrometheusExporter`.
3. Cargar `telemetry.ts` antes de crear el servidor Fastify, para que las métricas queden disponibles desde el arranque.
4. Registrar hooks de Fastify para medir cada request.
5. Exponer las métricas con `PrometheusExporter` en el puerto `9464`.
6. Hacer que Prometheus lea el endpoint `/metrics` y que Grafana use Prometheus como datasource para dashboards y alertas.

Dependencias recomendadas:

```bash
npm install -w packages/api @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/sdk-metrics @opentelemetry/exporter-prometheus @opentelemetry/auto-instrumentations-node @opentelemetry/resources @opentelemetry/semantic-conventions
```

Variables de entorno esperadas en producción:

| Variable | Valor recomendado | Propósito |
| --- | --- | --- |
| `OTEL_SERVICE_NAME` | `alentapp-api` | Nombre del servicio en dashboards y métricas. |
| `OTEL_EXPORTER_PROMETHEUS_HOST` | `0.0.0.0` | Interfaz donde se expone el endpoint de métricas. |
| `OTEL_EXPORTER_PROMETHEUS_PORT` | `9464` | Puerto donde Prometheus scrapea las métricas. |
| `OTEL_RESOURCE_ATTRIBUTES` | `deployment.environment=production` | Atributos comunes para filtrar por ambiente. |

## a) Métricas RED a capturar

| Métrica | Tipo OpenTelemetry | Descripción | Labels |
| --- | --- | --- | --- |
| Rate (`http.requests.total`) | `Counter` | Cantidad total de requests HTTP recibidas. Las requests por segundo se calculan en Prometheus con `rate(http_requests_total[5m])`. | `method`, `route`, `status` |
| Errors (`http.requests.errors`) | `Counter` | Cantidad de requests que terminan con status `4xx` o `5xx`. La tasa de error se calcula dividiendo los errores por el total de requests. | `method`, `route`, `status` |
| Duration (`http.request.duration`) | `Histogram` | Latencia de cada request en milisegundos. Permite calcular percentiles como p50, p95 y p99 por endpoint. | `method`, `route` |

### Labels

Los labels deben mantenerse con baja cardinalidad:

- `method`: verbo HTTP normalizado, por ejemplo `GET`, `POST`, `PUT`, `PATCH` o `DELETE`.
- `route`: ruta normalizada de Fastify, por ejemplo `/api/v1/socios/:id`; no se debe usar la URL real con IDs.
- `status`: código HTTP de respuesta, por ejemplo `200`, `201`, `400`, `404` o `500`.

No se deben usar labels con datos variables como IDs de socios, IDs de pagos, tokens, emails, nombres de usuario o query strings.

## Métricas adicionales

| Métrica | Tipo OpenTelemetry | Descripción | Labels |
| --- | --- | --- | --- |
| `process.memory.usage` | `ObservableGauge` | Memoria usada por el proceso Node.js. Se obtiene con `process.memoryUsage()` y se reporta en bytes. | `state` (`rss`, `heapTotal`, `heapUsed`, `external`, `arrayBuffers`) |
| `http.requests.active` | `ObservableGauge` | Cantidad de requests HTTP concurrentes que están siendo procesadas por la API. | Sin labels obligatorios para mantener baja cardinalidad. |

## Diseño de instrumentación

El módulo `telemetry.ts` debe crear los instrumentos de métricas:

```ts
const httpRequestsTotal = meter.createCounter('http.requests.total', {
  description: 'Total de requests HTTP recibidas',
  unit: '1',
});

const httpRequestsErrors = meter.createCounter('http.requests.errors', {
  description: 'Total de requests HTTP con status 4xx o 5xx',
  unit: '1',
});

const httpRequestDuration = meter.createHistogram('http.request.duration', {
  description: 'Duración de requests HTTP',
  unit: 'ms',
});

let activeRequests = 0;

const activeRequestsGauge = meter.createObservableGauge('http.requests.active', {
  description: 'Requests HTTP concurrentes',
  unit: '1',
});

activeRequestsGauge.addCallback((observer) => {
  observer.observe(activeRequests);
});

const memoryGauge = meter.createObservableGauge('process.memory.usage', {
  description: 'Memoria usada por el proceso Node.js',
  unit: 'By',
});

memoryGauge.addCallback((observer) => {
  const memory = process.memoryUsage();

  observer.observe(memory.rss, { state: 'rss' });
  observer.observe(memory.heapTotal, { state: 'heapTotal' });
  observer.observe(memory.heapUsed, { state: 'heapUsed' });
  observer.observe(memory.external, { state: 'external' });
  observer.observe(memory.arrayBuffers, { state: 'arrayBuffers' });
});
```

En `buildApp()` se deben registrar hooks de Fastify para medir cada request:

```ts
const requestStartTimes = new WeakMap<object, number>();

server.addHook('onRequest', async (request) => {
  activeRequests += 1;
  requestStartTimes.set(request.raw, performance.now());
});

server.addHook('onResponse', async (request, reply) => {
  const startedAt = requestStartTimes.get(request.raw) ?? performance.now();
  const durationMs = performance.now() - startedAt;
  const route = request.routeOptions?.url ?? 'unmatched';
  const status = String(reply.statusCode);

  const commonLabels = {
    method: request.method,
    route,
    status,
  };

  httpRequestsTotal.add(1, commonLabels);

  if (reply.statusCode >= 400) {
    httpRequestsErrors.add(1, commonLabels);
  }

  httpRequestDuration.record(durationMs, {
    method: request.method,
    route,
  });

  activeRequests = Math.max(0, activeRequests - 1);
});
```

La métrica `Rate` no se registra como un valor calculado por la API. La API solo incrementa el contador `http.requests.total`; luego Prometheus calcula las requests por segundo con una consulta `rate()`.

## b) OpenTelemetry SDK

La configuración del SDK debe inicializarse antes de levantar Fastify. El archivo recomendado es `packages/api/src/telemetry.ts` y luego debe importarse al inicio de `packages/api/src/app.ts` o del entrypoint productivo.

Estructura conceptual de la configuración:

```ts
import { metrics } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const prometheusExporter = new PrometheusExporter({
  host: process.env.OTEL_EXPORTER_PROMETHEUS_HOST ?? '0.0.0.0',
  port: Number(process.env.OTEL_EXPORTER_PROMETHEUS_PORT ?? 9464),
  endpoint: '/metrics',
});

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'alentapp-api',
    'deployment.environment': process.env.NODE_ENV ?? 'production',
  }),
  metricReader: prometheusExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-fastify': { enabled: true },
    }),
  ],
});

sdk.start();

export const meter = metrics.getMeter('alentapp-api');
```

Configuración a implementar:

| Elemento | Diseño |
| --- | --- |
| Exportador | `PrometheusExporter` en `0.0.0.0:9464/metrics`. |
| Auto-instrumentación HTTP | Habilitada para capturar requests entrantes, salientes y atributos HTTP estándar. |
| Auto-instrumentación Fastify | Habilitada para capturar rutas normalizadas y contexto del framework. |
| Métricas personalizadas | Las métricas RED definidas arriba se crean con el `meter` exportado por `telemetry.ts`. |
| Inicio del SDK | Debe ocurrir antes de registrar rutas o iniciar `server.listen()`. |
| Apagado ordenado | En `SIGINT` y `SIGTERM` se debe ejecutar `sdk.shutdown()` junto con `server.close()`. |

En el entrypoint de la API se debe importar la telemetría antes de construir el servidor:

```ts
import './telemetry.js';
import { buildApp } from './app.js';
```

Los hooks de Fastify definidos en la sección anterior usan el `meter` de este SDK para registrar `http.requests.total`, `http.requests.errors`, `http.request.duration`, `http.requests.active` y `process.memory.usage`.

## Exposición para Prometheus

La API debe exponer métricas con el `PrometheusExporter`. Prometheus no recibe datos por push; scrapea periódicamente el endpoint `/metrics` de la API.

Flujo propuesto:

```text
AlentApp API -> PrometheusExporter :9464/metrics -> Prometheus -> Grafana
```

Configuración conceptual de Prometheus:

```yaml
scrape_configs:
  - job_name: alentapp-api
    scrape_interval: 15s
    static_configs:
      - targets: ['api:9464']
```

Grafana se conecta a Prometheus como datasource. El dashboard RED consulta las series recolectadas desde ese job.

## c) Dashboard RED en Grafana

El dashboard debe tener al menos 6 paneles para cubrir tráfico, errores, latencia, distribución de respuestas, recursos y cuellos de botella.

| Panel | Métrica | Tipo de gráfico | Propósito |
| --- | --- | --- | --- |
| 1. Requests por segundo | `sum by (method, route) (rate(http_requests_total[1m]))` | Time series | Ver el tráfico actual de la API por endpoint. |
| 2. Tasa de error | `(sum(rate(http_requests_errors_total[1m])) / sum(rate(http_requests_total[1m]))) * 100` | Time series | Medir el porcentaje de requests fallidas. |
| 3. Latencia p95/p99 | `histogram_quantile(0.95, sum by (le, route) (rate(http_request_duration_bucket[5m])))` y `histogram_quantile(0.99, sum by (le, route) (rate(http_request_duration_bucket[5m])))` | Time series | Observar la performance percibida y detectar degradación. |
| 4. Por status code | `sum by (status) (rate(http_requests_total[1m]))` | Stacked area | Ver la distribución de respuestas `2xx`, `3xx`, `4xx` y `5xx`. |
| 5. Memoria del proceso | `process_memory_usage` | Time series | Controlar consumo de recursos del proceso Node.js. |
| 6. Endpoints más lentos | `topk(5, histogram_quantile(0.95, sum by (le, route) (rate(http_request_duration_bucket[5m]))))` | Bar chart horizontal | Identificar cuellos de botella por endpoint. |

## Criterios de aceptación

- La API expone métricas con `PrometheusExporter` en `0.0.0.0:9464/metrics`.
- El SDK se inicializa antes de crear el servidor Fastify.
- Están habilitadas las auto-instrumentaciones de HTTP y Fastify.
- Las tres métricas RED existen y usan los tipos solicitados: `Counter`, `Counter` e `Histogram`.
- `Rate` se calcula desde `http.requests.total` usando `rate()` en Prometheus.
- `Errors` cuenta respuestas `4xx` y `5xx`.
- `Duration` registra latencia en milisegundos y permite calcular percentiles.
- `process.memory.usage` reporta memoria del proceso como `ObservableGauge`.
- `http.requests.active` reporta requests concurrentes como `ObservableGauge`.
- Los labels usan rutas normalizadas y no incluyen datos sensibles ni IDs.
- El dashboard de Grafana tiene al menos 6 paneles: requests por segundo, tasa de error, latencia p95/p99, status code, memoria y endpoints más lentos.