---
id: 0007
estado: Propuesto
autor: Nahuel Iróz
fecha: 2026-04-20
titulo: Registro de Nuevos Pagos
---

# TDD-0007: Registro de Nuevos Pagos

## Contexto de Negocio (PRD)

### Objetivo

Permitir la generación de una nueva obligación financiera (cuota) asociada a un socio del club para iniciar su ciclo financiero, llevar el control de deudas y servir de base para posteriores acciones (pago, vencimiento o cancelación), garantizando la integridad de los datos y evitando duplicaciones.

### User Persona

- Nombre: Alberto (Tesorero/Administrativo).
- Necesidad: Generar cuotas mensuales de forma masiva o individual asegurando que no se dupliquen los periodos de pago y manteniendo la confiabilidad en los datos financieros.

### Criterios de Aceptación

- El sistema debe validar que no exista una cuota registrada para el mismo socio, mes y año.
- El sistema debe validar que el monto sea mayor a cero y que el mes se encuentre en el rango válido (1-12).
- Al finalizar, el sistema debe crear la cuota con estado PENDING por defecto, registrando la fecha de creación y dejando la fecha de pago vacía.

## Diseño Técnico (RFC)

### Modelo de Datos

Se definirá la entidad `Payment` con las siguientes propiedades y restricciones:
- id: Identificador único universal (UUID).
- memberId: Cadena de texto (ID del socio asociado).
- amount: Valor numérico (Monto de la cuota, mayor a 0).
- month: Valor entero (Mes del período, de 1 a 12).
- year: Valor entero (Año del período).
- dueDate: Fecha de vencimiento.
- status: Enumeración (PENDING, PAID, OVERDUE, CANCELED) con valor por defecto PENDING.
- paymentDate: Fecha de pago (Opcional).
- createdAt: Fecha de creación autogenerada.

### Contrato de API (@alentapp/shared)

Definiremos los tipos en el paquete compartido para asegurar sincronización:

- Endpoint: POST /api/v1/payments
- Request Body (CreatePaymentRequest)

```ts
{
    memberId: string;
    amount: number;
    month: number;
    year: number;
    dueDate: string; // Formato ISO Date YYYY-MM-DD
}
```

```ts
{
    id: string;
    status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELED';
}
```


### Componentes de Arquitectura Hexagonal

1. Puerto: PaymentRepository (Interface en el Dominio con métodos create y findByMemberAndPeriod).
2. Caso de Uso: CreatePayment (Lógica que valida la estructura, reglas de negocio de montos/fechas y verifica duplicados antes de persistir).
3. Adaptador de Salida: Prisma persistence adapter (Implementación real en BD mediante esquema relacional).
4. Adaptador de Entrada: PaymentController (Ruta HTTP).

## Casos de Borde y Errores

| Escenario                  | Resultado Esperado                                                        | Código HTTP            |
| -------------------------- | ---------------------------------------------| -------------------------- | ---------------------- | 
| Cuota ya registrada        | Mensaje: "Ya existe una cuota para este socio en el período indicado"     | 400 Conflict           |
| Datos faltantes o inválidos| Mensaje: "Campos requeridos ausentes o con formato incorrecto             | 400 Bad Request        |
| Monto inválido ó ≤ 0       | Mensaje: "El monto de la cuota debe ser mayor a cero"                     | 400 Bad Request        |
| Error de conexión a DB     | Mensaje: "Error interno, reintente más tarde"                             | 500 Internal Server    |

## Plan de Implementación

1. Definir esquema de persistencia en Prisma, configurar restricción única compuesta y correr migración.
2. Crear tipos de Request/Response en shared y puerto en el Dominio.
3. Implementar el repositorio y las validaciones en el caso de uso.
4. Crear la interfaz de control/generación en el frontend y conectar con el endpoint del backend.




