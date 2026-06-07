| Métrica			 	| Antes (desarrollo)            | Después (producción)                                     | Mejora |
| --------------------- | ----------------------------- | -------------------------------------------------------- | ------ |
| Tamaño imagen API 	| docker images api             | docker images api:prod                                   |        |
| Tamaño imagen Web 	| docker images web             | docker images web:prod                                   |        |
| Tiempo de startup API | time docker compose up -d api | time docker compose -f docker-compose.prod.yml up -d api |        |
| Memoria API (idle) 	| docker stats --no-stream api  | docker stats --no-stream alentapp-api                    |        |
| Endpoints accesibles 	| curl :3000/...                | curl :3000/...                                           |        |
| Frontend vía nginx 	| —                             | curl localhost/                                          |        |