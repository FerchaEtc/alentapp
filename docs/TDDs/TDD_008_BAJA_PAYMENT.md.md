---
autor: Nahuel Iróz
fecha: 2026-05-03
titulo: Eliminacion de pagos
---

# TDD-0008: Eliminación de pagos

## Contexto de Negocio (PRD)

### Objetivo

Permitir la anulación de una cuota financiera sin recurrir a un borrado físico en la base de datos, asegurando la trazabilidad de la información mediante un cambio de estado a cancelado para corregir errores administrativos..

### User Persona
- Nombre: Tesorero.
- Necesidad: Corregir errores administrativos o modificaciones de estado en las cuotas de forma rápida, con la seguridad de que el historial financiero permanece intacto y auditable.

### Criterios de Aceptación

- El sistema no debe permitir el borrado físico de ningún registro de cuota.
- Al procesar la solicitud, el estado de la cuota seleccionada debe actualizarse a CANCELED.
- El sistema debe impedir la cancelación de una cuota que ya se encuentre previamente en estado CANCELED.
## Diseño Técnico (RFC)

### Modelo de Datos

- `id`: Identificador único universal (UUID).
- `status`: Modificación de la enumeración a su valor CANCELED.


### Contrato de API (@alentapp/shared)

En `@alentapp/shared` se definirá el contrato mínimo necesario para que backend y frontend compartan la misma convención de rutas.

- Endpoint: `PATCH /api/v1/payments/:id`
- Request Body (UpdatePaymentStatusRequest):
- Response: `200 ok` en caso de éxito.
- Status: `Canceled`

### Componentes de Arquitectura Hexagonal

- Puerto: PaymentRepository (Interface en el Dominio con métodos findById y update).
- Caso de Uso: CancelPayment (Lógica que busca la cuota, valida su existencia, verifica que no esté cancelada previamente y ejecuta el cambio de estado).
- Adaptador de Salida: Prisma persistence adapter (Actualización del registro en la base de datos).
- Adaptador de Entrada: PaymentController (Ruta HTTP que captura el parámetro :id).

## Casos de Borde y Errores

| Escenario                           | Resultado Esperado                                                     | Código HTTP               |
| ------------------------------------| -----------------------------------------------------------------------| ------------------------- |
| Pago inexistente                    | Mensaje: "No se encontró el pago especoificado                         | 404 Not Found             |
| Error de conexion a DB              | Mensaje: "Error interno, reintente más tarde"                          | 500 Internal Server Error |
| Pago cancelado                      | Mensaje: "El pago se canceló exitosamente"                             | 204 No Content            |

## Plan de Implementación

1. Crear tipos de Request/Response para la actualización parcial en shared.
2. Extender el puerto en el Dominio con el método de búsqueda por ID si no existiera.
3. Implementar el caso de uso con las validaciones de estado y actualizar el adaptador de persistencia.
4. Agregar el botón de anulación en la interfaz de usuario y conectar con el método PATCH del controlador



