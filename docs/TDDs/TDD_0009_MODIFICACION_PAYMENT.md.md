---
id: 0009
estado: Prpuesti
autor: Nahuel Iróz
fecha: 2026-04-20
titulo: Modificacion de Pagos
---

# TDD-0002: Actualización de Socios Existentes

## Contexto de Negocio (PRD)

### Objetivo

Permitir registrar el cobro de una cuota financiera, marcándola como pagada y asentando la fecha exacta de la transacción para reflejar que la deuda fue saldada de forma correcta y evitar inconsistencias en el flujo de caja del club.

### User Persona

- Nombre: Alberto (Tesorero/Administrativo).
- Necesidad: Registrar los pagos recibidos de los socios de manera ágil y precisa, asegurando que el estado financiero de cada miembro impacte en el sistema sin margen de error.
### Criterios de Aceptación

- Al procesar el pago, el estado de la cuota seleccionada debe actualizarse a PAID.
- El sistema debe guardar automáticamente la fecha actual en la propiedad paymentDate.
- El sistema debe impedir la operación si la cuota ya fue pagada previamente o si se encuentra cancelada.
## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

Este caso de uso opera sobre la entidad Payment existente, modificando y completando las siguientes propiedades:

- Endpoint: `PATCH /api/v1/payments/:id/payment`
- Request Body (UpdateMemberRequest):

```ts
{
    status: 'PAID';
}
```

### Componentes de Arquitectura Hexagonal

1. Puerto: PaymentRepository (Interface en el Dominio que reutiliza los métodos findById y update).
2. Caso de Uso: RecordPayment (Lógica que busca la cuota, valida su existencia, verifica que el estado actual no sea PAID ni CANCELED, y asigna las propiedades de pago antes de persistir).
3. Adaptador de Salida: Prisma persistence adapter (Actualización del registro en la base de datos).
4. Adaptador de Entrada: PaymentController (Ruta HTTP que captura el parámetro :id).

## Casos de Borde y Errores

| Escenario                  | Resultado Esperado                            | Código HTTP actual        |
| -------------------------- | --------------------------------------------- | ------------------------- |
| Pago inexistente           | Mensaje: "El Pago no existe"                  | 400 not found             |
| Cuota pagada               | Mensaje: "La cuot ya se encuentra pagada  "   | 400 Bad request           |
| Error de conexión a DB     | Mensaje: "Error interno, reintente más tarde" | 500 Internal Server Error |

## Plan de Implementación

1. Asegurar la disponibilidad de los tipos de Request/Response de pago en shared.
Implementar la lógica de negocio en el caso de uso con las validaciones concurrentes de estado.
2. Actualizar el controlador backend para exponer el endpoint de confirmación de pago.
3. Diseñar la acción de cobro en la vista de cobros del frontend y conectarla con la API.


