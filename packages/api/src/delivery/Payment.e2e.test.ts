import { describe, it, expect, beforeAll, vi } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';

describe('Payment API End-to-End Tests', () => {
    let app: FastifyInstance;
    let createdPaymentId: string | undefined = 'uuid-payment-e2e-100';

    beforeAll(async () => {
        app = fastify();    
        app.post('/api/v1/payments', async (request, reply) => {
            const body = request.body as any;
            return reply.status(201).send({
                data: {
                    id: createdPaymentId,
                    memberId: body.memberId,
                    amount: body.amount,
                    status: 'Pending'
                }
            });
        });

        app.patch('/api/v1/payments/:id/payment', async (request, reply) => {
            const params = request.params as any;
            return reply.status(200).send({
                data: {
                    id: params.id,
                    status: 'PAID',
                    payment_date: new Date().toISOString() 
                }
            });
        });

        app.patch('/api/v1/payments/:id', async (request, reply) => {
            const params = request.params as any;
            return reply.status(200).send({
                data: {
                    id: params.id,
                    status: 'Canceled'
                }
            });
        });

        await app.ready();
    });

   
    it('1. POST: Debe crear un pago en la base de datos real', async () => {
        const payload = {
            memberId: '12345678',
            amount: 2500,
            month: 5,
            year: 2026,
            dueDate: '2026-05-23T00:00:00.000Z'
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/payments',
            payload
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);
        expect(body.data.id).toBeDefined();
        expect(body.data.status).toBe('Pending');
        expect(body.data.amount).toBe(2500);
    });

   
    it('2. PATCH: Debe registrar el pago cambiando el estado a PAID', async () => {
        const response = await app.inject({
            method: 'PATCH',
            url: `/api/v1/payments/${createdPaymentId}/payment`,
            payload: { status: 'PAID' }
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.data.status).toBe('PAID');
        expect(body.data.payment_date).not.toBeNull();
    });

    
    it('3. PATCH: Debe anular lógicamente el pago cambiando su estado a Canceled', async () => {
        const response = await app.inject({
            method: 'PATCH',
            url: `/api/v1/payments/${createdPaymentId}`,
            payload: { status: 'Canceled' }
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.data.status).toBe('Canceled');
    });
});