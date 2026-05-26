import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { SportDTO } from '@alentapp/shared';

// Mockeamos el repositorio para que la API entera funcione sin conectarse a la Base de Datos real
// Esto nos permite testear la integración del ciclo completo: Fastify -> Controller -> UseCase -> Validator
vi.mock('../infrastructure/PostgresSportRepository.js', () => {
    const existingSport: SportDTO = {
        id: '1',
        name: 'Tenis',
        description: 'Polvo de ladrillo',
        max_capacity: 20,
        additional_price: 0,
        requires_medical_certificate: false,
    };

    return {
        PostgresSportRepository: class {
            async findAll() { return [existingSport]; }
        }
    };
});

describe('Sport API Integration Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('GET /api/v1/sports', () => {
        it('debe retornar código 200 y el listado de deportes', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/sports'
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data).toBeInstanceOf(Array);
            expect(body.data[0].id).toBe('1');
            expect(body.data[0].name).toBe('Tenis');
        });
    });
});
