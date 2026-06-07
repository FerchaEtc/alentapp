## 1.1 Análisis de la infraestructura Docker actual

### docker-compose.yml
| Problema                   | ¿Dónde ocurre?                                            | Impacto                   | Solución propuesta        |
| -------------------------- | --------------------------------------------------------- | ------------------------- | ------------------------- |
| Credenciales expuestas     | Variables POSTGRES_USER, POSTGRES_PASSWORD y DATABASE_URL | Cualquier persona con acceso al repositorio puede ver las contraseñas de la base de datos de produccion, generando una vulnerabilidad critica | Eliminar las variables hardcodeadas y utilizar un archivo .env que no se suba al repositorio |
| Monta volúmenes de código fuente | volumes: - .:/app en los servicio api y web | Rompe la inmutabilidad del contenedor. En produccion el código no debe cambiar dinámicamente | Eliminar los volúmenes por completo. El código base debe copiarse estáticamente dentro de la imagen usando COPY en el Dockerfile |
| Ejecución de comandos de desarrollo | Usa txs watch, prisma migrate dev y npm run dev | prisma migrate dev puede borrar o alterar tablas de produccion. tsx y Vite son muy pesados e inseguros para tráfico real | Cambiar los comandos para ejecutar código compilado. Las migraciones deben correrse con npx prisma migrate deploy |
| No hay límites de recursos | Faltan las directivas deploy con limits y reservations en todos los servicios | Un pico de tráfico en la API puede consumir toda la RAM y CPU del servidor  y provocar la caida del sistema | Añadir un bloque deploy limitando recursos |
| Expone el puerto de la base de datos | Bloque ports: - '5432:5432' en el servicio db | Abre el puerto de PostgreSQL a toda la red, esto puede permitir ataques directos contra la base de datos | Eliminar el mapeo de puertos de la base de datos. Los contenedores de Docker ya se comunican internamente, solo se debe exponer el puerto de Nginx/API |



### packages/api/Dockerfile
| Problema                   | ¿Dónde ocurre?                   | Impacto                   | Solución propuesta        |
| -------------------------- | -------------------------------- | ------------------------- | ------------------------- |
| Ausencia de Multi-stage | En todo el archivo | El codigo fuente, los compiladores y las herramientas de testing quedan dentro de la imagen final. Esto aumenta demasiado el peso de la imagen y la superficie de ataque (tendrian acceso a todo el código fuente) | Implementar un Multi-stage build con al menos la etapa builder para compilar TypeScript y runner para que solo tome el código compilado limpio |
| Instalación de dependencias de desarrollo en producción | Línea RUN npm install | Instala librerías pesadas para producción aumentando demasiado el peso | En la etapa final de producción, se utiliza npm ci --omit=dev para instalar las dependencias necesarias para que el código corra |
| Ejecución del servidor en modo Desarrollo | Línea CMD ["npm", "run", "dev", "-w", "packages/api"] | Ejecutar en modo dev (usando herramientas como tsx o nodemon) consume mucha RAM y puede exponer errores confidenciales en caso de fallas | Compilar el código en un paso previo y cambiar el comando final por CMD ["node", "packages/api/dist/app.js"] |
| Copiado sin filtros (COPY . .) | Línea COPY . . | Si no hay un archivo .dockerignore configurado correctamente, esto copia carpetas locales ocultas, tests E2E, y variables locales (.env.test). Cualquier cambio en un archivo irrelevante (como un README.md) invalida toda la caché de Docker | En la etapa de producción, copiar únicamente la carpeta compilada (dist/), los package.json y los node_modules de producción |
| Ejecución como usuario Root | Implícito al final del archivo (ausencia de USER) | Al usar node:20-alpine sin especificar un usuario, el proceso de Node.js corre como usuario administrador dentro del contenedor. Un atacante puede ser dueño del entorno | Añadir la directiva USER node antes de exponer el puerto y declarar el CMD |


### packages/web/Dockerfile
| Problema                   | ¿Dónde ocurre?                   | Impacto                   | Solución propuesta        |
| -------------------------- | -------------------------------- | ------------------------- | ------------------------- |
| Ejecución de Vite dev server en Producción | Línea CMD ["npm", "run", "dev", ...] y puerto 5173 | El servidor de desarrollo de Vite no maneja tráfico real. Expone codigo que revela toda la lógica del frontend | Compilar la aplicación (npm run build) para generar los archivos estáticos optimizados y servirlos usando Nginx |
| Ausencia de Multi-stage y uso de imagen base incorrecta | Línea FROM node:20-alpine como imagen final | Se envia a producción el entorno completo de Node.js, todos los node_modules y el código fuente sin compilar. Esto genera una imagen gigante cuando el frontend compilado real debe pesar pocos megabytes | Implementar un Multi-stage build con al menos una etapa 1 (Builder) usando node:20-alpine para compilar, y una etapa 2 (Producción) usando nginx:alpine para alojar y servir los archivos |
| Ineficiencia en la instalación de dependencias | Línea RUN npm install | Instala todo, incluyendo devDependencies. Retrasa mucho el tiempo de construcción de la imagen | En la etapa Builder, se utiliza npm ci para instalaciones limpias basadas en el package-lock.json |
| Invalidación constante de la caché de Docker | Línea COPY . . | Al copiar toda la carpeta de una vez, cualquier mínimo cambio en un archivo irrelevante (un .md, un test, o una imagen) obliga a Docker a volver a ejecutar todos los pasos siguientes | Copiar solo lo que se necesita. Aprovechar el .dockerignore y asegurar que la imagen final de Nginx solo reciba un COPY --from=builder /app/dist /usr/share/nginx/html |
| Riesgo de seguridad por ejecución de root | Implícito al usar node:20-alpine | El contenedor correria el proceso web como usuario root. Si el frontend tiene un proxy inverso mal configurado, el atacante podría tener privilegios de administrador | Al migrar a Nginx, usar la imagen nginxinc/nginx-unprivileged:alpine (que ya viene configurada sin permisos de root) o configurar un usuario en el nginx.conf |


## 1.2 Análisis de la infraestructura Docker actual

**¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?**
OpenTelemetry es un marco de trabajo y un conjunto de herramientas (APIs, SDKs) estandarizado y de código abierto diseñado para instrumentar, generar, recopilar y exportar datos de telemetría. Su principal característica es que es "agnóstico", es decir, no está atado a ninguna marca o proveedor comercial. 
La diferencia fundamental radica en sus roles: OpenTelemetry actúa exclusivamente como el **mensajero** (genera y transporta los datos), pero no los almacena ni los visualiza. Por otro lado, Prometheus es un backend de observabilidad; su trabajo es recibir esas métricas, almacenarlas en una base de datos de series temporales y permitir consultarlas.

**¿Cuáles son los "3 pilares" de la observabilidad? ¿Cuál aborda OpenTelemetry?**
Los tres pilares fundamentales de la observabilidad son:
1. **Métricas (Metrics):** Datos numéricos medidos a lo largo del tiempo (ej: uso de CPU, cantidad de peticiones).
2. **Trazas (Traces):** El recorrido detallado de una petición a medida que atraviesa múltiples microservicios (sirve para detectar cuellos de botella).
3. **Registros (Logs):** Mensajes de texto con marca de tiempo que emite la aplicación detallando eventos específicos.

OpenTelemetry aborda los tres pilares. Su objetivo principal es proporcionar un único estándar unificado para manejar métricas, trazas y logs bajo la misma herramienta y evitar el uso de múltiples librerías distintas.

**Expliquen el concepto de métricas RED (Rate, Errors, Duration). ¿Para qué sirve cada una?**
El Método RED es una filosofía de monitorización orientada a arquitecturas de microservicios. Sirve como un indicador directo de la satisfacción del usuario y la salud del sistema:
* **Rate (Tasa):** Mide la cantidad de peticiones por segundo que recibe el servicio. Sirve para entender el volumen de tráfico y la demanda actual del sistema.
* **Errors (Errores):** Mide la cantidad de esas peticiones que están fallando. Sirve para alertar sobre problemas críticos que afectan directamente la experiencia del usuario.
* **Duration (Duración / Latencia):** Mide el tiempo que tarda el servicio en resolver y responder a las peticiones. Sirve para evaluar el rendimiento general del sistema.

**¿Qué es el OTLP (OpenTelemetry Protocol)? ¿Qué ventaja tiene frente a exportar directamente a Prometheus?**
OTLP es el protocolo de comunicación estándar creado por OpenTelemetry para codificar y transportar datos de telemetría.
La principal ventaja de usar OTLP frente a exportar directamente a Prometheus es evitar el **Vendor Lock-in** (dependencia del proveedor). Al usar OTLP, el código envía los datos a un recolector intermediario (OpenTelemetry Collector). Este recolector puede traducir y distribuir los datos a Prometheus para métricas, a Jaeger para trazas, o a cualquier otra herramienta, sin necesidad de modificar el código fuente de la aplicación si el equipo decide cambiar de proveedor en el futuro.

**¿Cómo se relaciona OpenTelemetry con Grafana?**
Se relacionan como piezas complementarias en un flujo de observabilidad. Como OpenTelemetry no se encarga del almacenamiento ni de la visualización, recopila los datos y los envía a un backend (como Prometheus). Luego, **Grafana** se conecta a ese backend para consumir los datos y transformarlos en paneles de control visuales (Dashboards). OpenTelemetry provee la materia prima estandarizada y Grafana es la interfaz donde se pueden observar los gráficos (como los del método RED) y configurar alertas.