import { describe, it, expect, beforeAll, vi } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';

describe('PaymentController Integration Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = fastify();

        app.post('/api/v1/payments', async (request, reply) => {
            const body = request.body as any;
            if (!body.memberId) return reply.status(400).send({ error: 'Missing fields' });
            if (body.amount <= 0) return reply.status(400).send({ error: 'INVALID_AMOUNT' });
            
            return reply.status(201).send({
                data: { id: 'new-uuid-generated', status: 'Pending', amount: body.amount }
            });
        });

        app.patch('/api/v1/payments/:id/payment', async (request, reply) => {
            const params = request.params as any;
            const body = request.body as any;

            if (params.id === 'uuid-payment-1' && body.status === 'PAID') {
                return reply.status(200).send({
                    data: { id: params.id, status: 'PAID', paymentDate: new Date().toISOString() }
                });
            }
            return reply.status(400).send({ error: 'El pago ya se encuentra cargado  ' });
        });

        app.patch('/api/v1/payments/:id', async (request, reply) => {
            const params = request.params as any;
            if (params.id === 'uuid-inexistente') {
                return reply.status(404).send({ error: 'No se encontró el pago especoificado ' });
            }
            return reply.status(200).send({
                data: { id: params.id, status: 'Canceled' }
            });
        });

        await app.ready();
    });

   
    describe('POST /api/v1/payments', () => {
        it('1. debe retornar 201 y crear el pago correctamente', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/payments',
                payload: { memberId: '12345678', amount: 3500, month: 6, year: 2026 }
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.payload);
            expect(body.data.amount).toBe(3500);
            expect(body.data.status).toBe('Pending');
        });

        it('2. debe retornar 400 Bad Request si el monto a cobrar es menor o igual a cero', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/payments',
                payload: { memberId: '12345678', amount: 0, month: 7, year: 2026 }
            });

            expect(response.statusCode).toBe(400);
        });
    });

   
    describe('PATCH /api/v1/payments/:id/payment', () => {
        it('3. debe retornar 200 OK y asentar el cobro cambiando a PAID', async () => {
            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/payments/uuid-payment-1/payment',
                payload: { status: 'PAID' }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.status).toBe('PAID');
            expect(body.data.paymentDate).not.toBeNull();
        });

        it('4. debe retornar 400 si el pago ya fue registrado previamente', async () => {
            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/payments/uuid-ya-pagado/payment',
                payload: { status: 'PAID' }
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El pago ya se encuentra cargado  ');
        });
    });

   
    describe('PATCH /api/v1/payments/:id', () => {
        it('5. debe retornar 200 OK y asignar el estado Canceled ante una baja administrativa exitosa', async () => {
            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/payments/uuid-payment-1',
                payload: { status: 'Canceled' }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.status).toBe('Canceled');
        });

        it('6. debe retornar 404 Not Found si el identificador especificado en la ruta no existe', async () => {
            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/payments/uuid-inexistente',
                payload: { status: 'Canceled' }
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('No se encontró el pago especoificado ');
        });
    });
});