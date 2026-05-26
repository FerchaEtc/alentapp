import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { CreateSportRequest, SportDTO } from '@alentapp/shared';

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
            async findByName(name: string) { return name === existingSport.name ? existingSport : null; }
            async create(data: CreateSportRequest) { return { id: '2', ...data }; }
        }
    };
});

vi.hoisted(() => {
    process.env.DATABASE_URL ??= 'postgresql://admin:password123@localhost:5432/alentapp_test_db';
    process.env.NODE_ENV = 'test';
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

    describe('POST /api/v1/sports', () => {
        it('debe retornar 201 y crear el deporte', async () => {
            const payload: CreateSportRequest = {
                name: 'Natación',
                description: 'Pileta climatizada',
                max_capacity: 25,
                additional_price: 300,
                requires_medical_certificate: true,
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/sports',
                payload
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.payload);
            expect(body.data.name).toBe('Natación');
            expect(body.data.id).toBeDefined();
        });

        it('debe retornar 409 si ya existe un deporte con ese nombre', async () => {
            const payload: CreateSportRequest = {
                name: 'Tenis',
                description: 'Cancha de polvo de ladrillo',
                max_capacity: 20,
                additional_price: 0,
                requires_medical_certificate: false,
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/sports',
                payload
            });

            expect(response.statusCode).toBe(409);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Ya existe un deporte con ese nombre');
        });
    });
});
