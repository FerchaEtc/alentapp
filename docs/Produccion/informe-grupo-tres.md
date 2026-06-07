
## 4.4. Documentación de decisiones

### 1. Arquitectura final del sistema
![alt text](image-1.png)

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

La arquitectura de observabilidad permitió construir un Dashboard en Grafana que refleja en tiempo real el estado de salud de la API:

* R (Rate): El contador `http_requests_total` permite identificar picos de carga.
* E (Errors): La métrica `http_requests_errors` filtra automáticamente los códigos 4xx y 5xx, permitiendo una detección temprana de fallos en el frontend o fallas de validación.
* D (Duration): El histograma `http_request_duration_ms` es vital para identificar cuellos de botella en la respuesta de los endpoints, permitiendo medir la latencia p95 y p99 de los servicios.



| Métrica			 	| Antes (desarrollo)            | Después (producción)                                     | Mejora |
| --------------------- | ----------------------------- | -------------------------------------------------------- | ------ |
| Tamaño imagen API 	| docker images api             | docker images api:prod                                   |        |
| Tamaño imagen Web 	| docker images web             | docker images web:prod                                   |        |
| Tiempo de startup API | time docker compose up -d api | time docker compose -f docker-compose.prod.yml up -d api |        |
| Memoria API (idle) 	| docker stats --no-stream api  | docker stats --no-stream alentapp-api                    |        |
| Endpoints accesibles 	| curl :3000/...                | curl :3000/...                                           |        |
| Frontend vía nginx 	| —                             | curl localhost/                                          |        |