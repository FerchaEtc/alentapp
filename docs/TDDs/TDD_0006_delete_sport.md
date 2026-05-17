---
autor: Fermin Etchanchú Paoltroni
fecha: 2026-05-03
titulo: Eliminación de Deportes
---

# TDD-0006: Eliminación de Deportes

## Contexto de Negocio (PRD)

### Objetivo

Permitir al área administrativa eliminar un deporte del sistema cuando ya no se ofrece, preservando la integridad de los datos vinculados a inscripciones y la consistencia del maestro de servicios.

### User Persona

*   **Nombre**: Administrativo.
*   **Necesidad**: Dar de baja un deporte que quedó obsoleto o fue creado por error, desde la tabla de administración, con una acción segura y controlada.

### Criterios de Aceptación

*   El sistema debe validar que el deporte exista antes de eliminarlo.
*   El sistema debe eliminar el deporte de forma física si no tiene dependencias.
*   El sistema debe responder sin contenido cuando la eliminación sea exitosa.

## Diseño Técnico (RFC)

### Modelo de Datos

- `id`: Identificador único universal (UUID).
- `name`: Cadena de texto, único e inmutable despues de la creación.
- `description`: Cadena de texto.
- `max_capacity`: Entero positivo mayor a cero.
- `additional_price`: Número decimal.
- `requires_medical_certificate`: Booleano.

### Contrato de API (@alentapp/shared)

En `@alentapp/shared` se definirá el contrato mínimo necesario para que backend y frontend compartan la misma convención de rutas.

- Endpoint: `DELETE /api/v1/sports/:id`
- Request Body: `None`
- Response: `204 No Content` en caso de éxito.

### Componentes de Arquitectura Hexagonal

*   **Domain**: `SportRepository` con `delete(id)`, `findById(id)` y consulta de relaciones asociadas.
*   **Application**: `DeleteSportUseCase` para validar existencia y dependencias antes de eliminar.
*   **Infrastructure**: `PostgresSportRepository` como adaptador de salida.

## Casos de Borde y Errores

| Escenario                           | Resultado Esperado                                                     | Código HTTP               |
| ------------------------------------| -----------------------------------------------------------------------| ------------------------- |
| Deporte inexistente                 | Mensaje: "El deporte no existe"                                        | 404 Not Found             |
| Error de conexion a DB              | Mensaje: "Error interno, reintente más tarde"                          | 500 Internal Server Error |
| Eliminación exitosa                 | Respuesta vacía                                                        | 204 No Content            |

## Plan de Implementación

1. Ampliar `SportRepository` y `PostgresSportRepository` con `delete`.
2. Crear la lógica de negocio en `DeleteSportUseCase` dentro de `src/application`.
3. Crear el endpoint `DELETE /api/v1/sports/:id` en `SportController` dentro de `src/delivery`.
4. Conectar la acción desde `@alentapp/web` en el servicio `sports.ts`.
