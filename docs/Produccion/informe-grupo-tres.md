## 4.1. Verificación técnica

Métricas obtenidas con las imágenes etiquetadas como `api`, `web`, `api:prod` y `web:prod`. Los tiempos se tomaron desde stack detenido; desarrollo se midió en un proyecto Compose aislado para no reutilizar el volumen productivo de PostgreSQL.

| Métrica | Antes (desarrollo) | Después (producción) | Mejora |
| --- | --- | --- | --- |
| Tamaño imagen API | `docker images api`: `api:latest` 1.37GB | `docker images api`: `api:prod` 497MB | -873MB (-63.7%) |
| Tamaño imagen Web | `docker images web`: `web:latest` 822MB | `docker images web`: `web:prod` 94.9MB | -727.1MB (-88.5%) |
| Tiempo de startup API | `/usr/bin/time -p docker compose -p alentapp-dev up -d api`: real 7.38s | `/usr/bin/time -p docker compose -f docker-compose.prod.yml up -d api`: real 10.87s | Sin mejora: +3.49s. Producción espera el healthcheck de DB con intervalo de 10s. |
| Memoria API (idle) | `docker stats --no-stream alentapp-api`: 179MiB | `docker stats --no-stream alentapp-api-1`: 37.88MiB idle; 55.86MiB post-tráfico | -141.12MiB idle (-78.8%) |
| Endpoints accesibles | `curl localhost:3000/`, `/api/v1/socios`, `/api/v1/sports`: HTTP 200 | `curl localhost:3000/`, `/api/v1/socios`, `/api/v1/sports`: HTTP 200 | Se mantiene 3/3 accesibles |
| Frontend vía nginx | No aplica en desarrollo | `curl localhost/`: HTTP 200, 379 bytes | Disponible en producción |

## 4.2. Verificación de seguridad

| Medida | Evidencia | Resultado |
| --- | --- | --- |
| La API corre con usuario no-root | `docker compose -f docker-compose.prod.yml exec -T api id`: `uid=1000(node) gid=1000(node)` | OK |
| No hay npm/tsc/python en la imagen final | `command -v npm`, `npx`, `tsc`, `python` y `python3` no devuelven binarios en la API productiva | OK |
| Read-only filesystem activo | `touch /test`: `Read-only file system` | OK |
| Capabilities mínimas | `ping -c 1 127.0.0.1`: `permission denied`; `mount -t tmpfs tmpfs /mnt`: `permission denied` | OK |
| Variables sensibles via `.env`, no hardcodeadas | `docker-compose.prod.yml` usa `env_file: .env` y variables `${DATABASE_URL}`, `${POSTGRES_PASSWORD}`, `${GRAFANA_ADMIN_PASSWORD}` | OK |
| Healthchecks funcionando | `docker compose -f docker-compose.prod.yml ps` muestra `healthy` en `db`, `api`, `prometheus`, `grafana` y `web` | OK |

## 4.3. Verificación de observabilidad

| Verificación | Evidencia | Resultado |
| --- | --- | --- |
| OpenTelemetry exporta métricas en `:9464/metrics` | Desde la red interna: `http://api:9464/metrics` expone `target_info`, `http_requests_total` y `http_requests_errors_total` | OK |
| Prometheus scrapea correctamente el endpoint OTLP | Target activo: `up alentapp-api-otel no-error` para `http://api:9464/metrics` | OK |
| Grafana tiene datasource Prometheus configurado | Datasource `Prometheus`, URL `http://prometheus:9090`, default `true`, read-only `true` | OK |
| Dashboard RED con 6 paneles funcionales | Dashboard `red-alentapp-api` con 6 paneles: Requests por segundo, Tasa de error, Latencia p95/p99, Requests por status code, Memoria del proceso, Endpoints más lentos | OK |
| Los gráficos responden al tráfico generado | Se generaron 20 requests por endpoint/caso; Prometheus devolvió datos para requests, latencia y memoria | OK |
| Las métricas de error reflejan 4xx/5xx | `sum by (status) (http_requests_errors_total)`: `400=20`, `500=20` | OK |

Nota: el endpoint de métricas `:9464` no se publica al host; se verifica dentro de la red Docker como `api:9464/metrics`, que es el target configurado en Prometheus.

## 4.4. Documentación de decisiones

### 1. Arquitectura final del sistema

![alt text](<imagen arquitectura.png>)

### 2. Decisiones técnicas y justificación

Las decisiones tomadas fueron impulsadas por criterios de rendimiento y mantenimiento:

* Multi-stage builds (Docker): Fundamental para la reducción del tamaño de imagen. 
Separar la fase de build (que contiene herramientas de compilación, `node_modules` de desarrollo y fuentes de TS) de la fase de run fue crucial para optimizar los tiempos de despliegue en el servidor.
* NodeNext como estándar: Se forzó el uso de `NodeNext` en el `tsconfig` para asegurar una compatibilidad nativa con el sistema de módulos de Node.js, facilitando la importación de librerías modernas de telemetría.
* Instrumentación Automática (Auto-instrumentations): Decidimos usar `@opentelemetry/auto-instrumentations-node` para capturar automáticamente el contexto de Fastify y HTTP. Esto evita la "contaminación" del código de negocio con lógica de monitoreo, centralizando todo en el archivo `telemetry.ts`.

### 3. Problemas encontrados y resolución técnica

La integración de observabilidad presentó desafíos técnicos significativos:


1. Tiempo de respuesta en Fastify: El método `getResponseTime()` no estaba disponible en las definiciones actuales del objeto `reply`.
* Resolución: Se migró la métrica hacia `reply.elapsedTime`, que es el estándar nativo de la API de Fastify para la medición de latencia en hooks, eliminando el error de compilación.


2. Orden de ejecución: La telemetría no registraba métricas porque Fastify iniciaba antes que el SDK.
* Resolución: Se forzó el `import './infrastructure/telemetry.js';` como primera línea en el entrypoint (`app.ts`), garantizando que el SDK se registre en el ciclo de vida de la aplicación antes de cualquier otra lógica.


### 4.Dashboard RED (Evidencia de funcionamiento)
![alt text](<imagen 1 grafana.png>)
![alt text](<imagen 2 grafana.png>)