
## 1.1. Análisis de la Infraestructura Docker Actual

A continuación se detallan 5 problemas técnicos identificados en la configuración de desarrollo actual que representan un riesgo alto o medio para el entorno de producción, enfocados en el impacto que tendrían sobre la consistencia del módulo de cobros y anulaciones lógicas:


#PROBLEMA 1: Contenedor corriendo como ROOT (Vulnerabilidad de privilegios)
#¿DONDE OCURRE?: `packages/api/Dockerfile`
#IMPACTO: Alto 
#SOLUCION: Configurar un usuario no-root (`appuser` o `node`) en el `Dockerfile.prod` utilizando la instrucción `USER node` antes de ejecutar la app. Esto evita que, si vulneran la API de pagos, escalen privilegios al host de producción.

#PROBLEMA 2: Filesystem en modo Lectura/Escritura (Read-Write)    
#¿DONDE OCURRE?:`docker-compose.yml` (Servicio API) 
#IMPACTO: Alto
#SOLUCION: Configurar la propiedad `read_only: true` en el compose productivo. Si un atacante logra inyectar código en la API, no podrá alterar los archivos ejecutables ni los UseCases del backend. Los únicos directorios de escritura deben ser volúmenes temporales controlados (`/tmp`).

 
#PROBLEMA3:Imagen base de desarrollo pesada y con herramientas de build
#¿DONDE OCURRE?:`packages/api/Dockerfile` #IMPACTO: Medio
#SOLUCION: Implementar un **Multi-stage build** usando `node:22-alpine`. En la etapa final (`runtime`), se debe excluir por completo el compilador de TypeScript (`tsc`) y el gestor `npm`. Solo debe quedar `node` ejecutando JS compilado , disminuyendo la superficie de ataque y el tamaño de la imagen.


#PROBLEMA 4: Falta de límites de recursos de hardware (CPU/Memoria)
¿DONDE OCURRE?: `docker-compose.yml` (Servicio API) #IMPACTO: Medio
#SOLUCION: Definir de manera estricta los **resource limits** (ej. `deploy.resources.limits`) en `docker-compose.prod.yml`. Si un proceso colapsa por una consulta pesada al historial de cuotas, evitará un ataque de denegación de servicio (DoS) por consumo total de la memoria del servidor.

 
#PROBLEMA 5: Variables de entorno y secretos expuestos/hardcodeados 
#¿DONDE OCURRE?`docker-compose.yml` / Archivos de entorno 
#IMPACTO: Alto 
#SOLUCION: Extraer todas las credenciales sensibles (como la clave del validador de cobros y el `DATABASE_URL` real de Postgres) hacia un archivo `.env` externo protegido , cargándolas mediante la directiva `env_file` o secretos de Docker. Nunca deben quedar registradas en el historial de Git.


## 1.2. Investigación de OpenTelemetry y Observabilidad

### 1. ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?

 
#OpenTelemetry (OTel):
 Es un framework de observabilidad estándar de la industria y un conjunto de herramientas/SDKs diseñados para **generar, capturar y exportar** datos de telemetría (métricas, logs y trazas) de forma unificada desde la aplicación. No almacena datos.

#Prometheus: Es una base de datos de series temporales y un motor de monitoreo  que funciona mediante un modelo pull (scrapea endpoints de métricas).


#Diferencia clave : OpenTelemetry se encarga de la instrumentación del código (recolectar los datos RED en la API) , mientras que Prometheus se encarga de almacenar y procesar esas métricas recolectadas.



### 2. ¿Cuáles son los "3 pilares" de la observabilidad? ¿Cuál aborda OpenTelemetry?

Los tres pilares fundamentales son:


#Métricas: Indicadores numéricos agregados en el tiempo (ej. cantidad de pagos procesados por segundo).


#Trazas (Traces): El recorrido de una petición a través de los distintos componentes del sistema (ej. desde el controlador Fastify hasta la base de datos de Prisma).
#Logs: Registros de texto con fecha y hora sobre eventos específicos.

#Abordaje de OpenTelemetry OpenTelemetry aborda y unifica los tres pilares bajo un único estándar tecnológico, permitiendo correlacionar una métrica de error con su traza y su log correspondiente.

### 3. Expliquen el concepto de métricas RED (Rate, Errors, Duration). ¿Para qué sirve cada una?

El método RED está diseñado específicamente para monitorear servicios web y microservicios:


#Rate (Tasa de solicitudes): Mide la cantidad de peticiones que recibe la API por segundo.
Sirve para: Monitorear el volumen de tráfico real que está experimentando el sistema (ej. cuántos tesoreros están consultando cuotas simultáneamente).



#Errors (Tasa de errores): Mide la cantidad de solicitudes que fallan (devuelven códigos HTTP `4xx` o `5xx`).
Sirve para: Detectar fallos inmediatos en la producción, como que el validador de tarjetas devuelva `500 Error Interno` al registrar un cobro.



#Duration (Duración / Latencia): Mide el tiempo que tardan las solicitudes en completarse.
Sirve para:Analizar la performance percibida por el usuario e identificar cuellos de botella (ej. si el endpoint para anular pagos tarda más de lo debido por falta de índices en Postgres).



### 4. ¿Qué es el OTLP (OpenTelemetry Protocol)? ¿Qué ventaja tiene frente a exportar directamente a Prometheus?

OTLP: Es el protocolo de red nativo de OpenTelemetry diseñado para la transmisión de datos de observabilidad de manera agnóstica y de alta performance.


Ventajas frente a exportar directo a Prometheus: 1Evita el acoplamiento: Si el día de mañana la cátedra decide cambiar Prometheus por otra herramienta (como Datadog o New Relic), el código de la API no se toca; solo se cambia el destino en el colector de OpenTelemetry.
2.Carga reducida: Transmite métricas de manera eficiente (por ejemplo, mediante gRPC con payloads binarios), reduciendo el consumo de CPU y red de la API en comparación con la exposición de texto plano de Prometheus.

### 5. ¿Cómo se relaciona OpenTelemetry con Grafana?

La relación forma un pipeline de observabilidad estándar en producción:

1. 
OpenTelemetry está metido dentro del código de nuestra API para medir las variables de rendimiento y los estados de los pagos.

2. 
Prometheus pasa periódicamente a recolectar esas métricas exponiéndolas en su base de datos temporal.


3. 
Grafana se conecta a Prometheus como su Data Source (fuente de datos) y nos permite dibujar el Dashboard RED interactivo , mostrando los gráficos en tiempo real para que los administradores del club visualicen el estado de salud de la plataforma de cobros.



