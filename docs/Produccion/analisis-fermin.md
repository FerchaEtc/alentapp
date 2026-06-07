# Análisis de infraestructura Docker y OpenTelemetry

## 1.1. Análisis de la infraestructura Docker actual

| Problema | ¿Dónde ocurre? | Impacto | Solución propuesta |
| --- | --- | --- | --- |
| La base de datos publica su puerto en el host. `5432:5432` deja PostgreSQL accesible desde fuera de la red interna de Compose si el host no tiene firewall estricto. En producción, la base debería ser consumida por la API, no quedar expuesta directamente. | `docker-compose.yml:9-10` | Alto | Eliminar el mapeo `ports` de `db` y dejar que la API acceda por la red interna de Docker. Si se necesita administración remota, usar VPN, bastion host o reglas de firewall específicas. |
| El arranque de la API ejecuta migraciones de desarrollo. `prisma migrate dev --name init` está pensado para desarrollo local, puede crear o modificar migraciones y acopla el despliegue de la app con cambios de esquema. Un reinicio del contenedor no debería decidir cambios de base de datos. | `docker-compose.yml:35-38` | Alto | Reemplazar `migrate dev` por `prisma migrate deploy` en un paso controlado de release o job separado. El comando principal del contenedor debería limitarse a iniciar la API ya compilada. |
| El frontend depende de que la API haya arrancado, pero no de que esté lista. `depends_on: - api` solo ordena el inicio del contenedor; no valida que la API responda correctamente. Si la API tarda en levantar o queda bloqueada, el frontend puede iniciar contra un servicio no disponible. | `docker-compose.yml:39-41`, `docker-compose.yml:59-60` | Medio | Agregar un endpoint de salud en la API y configurar `healthcheck` para ese servicio. Luego cambiar la dependencia del frontend a `condition: service_healthy` o resolver la espera desde el orquestador. |
| Los servicios usan `container_name` fijo. Esto facilita pruebas locales, pero en producción impide levantar varias copias del mismo stack en el mismo host y dificulta escalar servicios, porque los nombres globales de contenedor colisionan. | `docker-compose.yml:4`, `docker-compose.yml:23`, `docker-compose.yml:47` | Bajo | Quitar `container_name` y dejar que Compose genere nombres por proyecto. Para identificar servicios, usar labels, nombres de servicio y el nombre del proyecto de Compose. |
| Las imágenes base están referenciadas con tags mutables. `postgres:16-alpine` y `node:20-alpine` pueden resolver a builds distintos con el tiempo, haciendo que dos builds de producción no sean exactamente reproducibles. También complica auditar qué digest exacto se desplegó. | `docker-compose.yml:3`, `packages/api/Dockerfile:1`, `packages/web/Dockerfile:1` | Medio | Fijar imágenes por digest o usar una política explícita de actualización controlada. Registrar el digest desplegado y actualizarlo mediante CI con escaneo de vulnerabilidades. |

## 1.2. Investigación sobre OpenTelemetry

### ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?

OpenTelemetry es una especificación abierta para que una aplicación produzca datos de observabilidad de forma consistente. Define cómo instrumentar código, qué estructura tienen los datos y cómo enviarlos a un colector o backend. Su objetivo principal es que la telemetría no dependa de un proveedor específico.

Prometheus cumple otro rol: es un backend de métricas de series temporales. Expone consultas con PromQL, almacena valores numéricos en el tiempo y permite alertar sobre ellos. La diferencia central es que OpenTelemetry instrumenta y transporta telemetría, mientras que Prometheus almacena y consulta métricas.

### ¿Cuáles son los 3 pilares de la observabilidad? ¿Cuál aborda OpenTelemetry?

Los tres pilares clásicos son métricas, logs y trazas.

Las métricas resumen el estado del sistema con números agregados, como latencia o cantidad de requests. Los logs registran eventos puntuales con contexto. Las trazas muestran el recorrido completo de una operación entre componentes.

OpenTelemetry aborda los tres pilares porque puede generar y exportar métricas, logs y trazas. Aun así, no es la herramienta que normalmente se usa para visualizar o almacenar a largo plazo; para eso se conecta con otros sistemas.

### Métricas RED: Rate, Errors, Duration

RED es un criterio práctico para observar servicios que reciben solicitudes, como APIs HTTP.

| Métrica | Qué mide | Para qué sirve |
| --- | --- | --- |
| Rate | Volumen de solicitudes recibidas en un intervalo. | Saber si el servicio está bajo carga normal, baja o anormalmente alta. |
| Errors | Proporción o cantidad de respuestas fallidas. | Detectar degradación funcional, regresiones o incidentes visibles para usuarios. |
| Duration | Tiempo de respuesta de las solicitudes. | Evaluar experiencia de usuario y encontrar cuellos de botella usando percentiles como p95 o p99. |

Con esas tres señales se puede distinguir si un incidente se debe a exceso de tráfico, aumento de errores o lentitud.

### ¿Qué es OTLP? ¿Qué ventaja tiene frente a exportar directamente a Prometheus?

OTLP significa OpenTelemetry Protocol. Es el formato y protocolo estándar que usan los SDKs y el Collector de OpenTelemetry para intercambiar telemetría. Puede funcionar sobre HTTP o gRPC y transportar distintas señales con el mismo modelo.

La ventaja frente a exportar directamente a Prometheus es que la aplicación queda desacoplada del destino final. En lugar de adaptar el código a cada backend, la app envía OTLP al Collector. Desde ahí se pueden aplicar filtros, enriquecer atributos, hacer batching, reintentar envíos y reenviar la misma telemetría a uno o varios sistemas.

### ¿Cómo se relaciona OpenTelemetry con Grafana?

Grafana se relaciona con OpenTelemetry como capa de visualización y exploración. OpenTelemetry produce y transporta los datos; Grafana los consulta desde backends compatibles.

Una arquitectura habitual sería: la aplicación envía telemetría al OpenTelemetry Collector; el Collector exporta métricas a Prometheus o Grafana Mimir, trazas a Grafana Tempo y logs a Grafana Loki; luego Grafana permite armar dashboards y correlacionar esas señales al analizar un incidente.
