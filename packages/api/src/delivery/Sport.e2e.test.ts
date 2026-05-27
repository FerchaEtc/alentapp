import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';

describe('Sport API End-to-End Tests', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let createdSportId: string | undefined;

    const randomSuffix = Math.floor(Math.random() * 100000).toString();
    const testSportName = `Deporte E2E ${randomSuffix}`;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
        
        prisma = new PrismaClient({
            adapter: new PrismaPg(process.env.DATABASE_URL as any)
        });
        await prisma.$connect()
    });

    afterAll(async () => {
        if (createdSportId) {
            await prisma.sport.deleteMany({
                where: { id: createdSportId }
            });
        }
        await prisma.$disconnect();
        await app.close();
    });

    it('1. POST: Debe crear un deporte en la base de datos real', async () => {
        const payload ={
            name: testSportName,
            description: 'Descripción E2E',
            max_capacity: 10,
            additional_price: 0,
            requires_medical_certificate: true
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/sports',
            payload
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);
        expect(body.data.id).toBeDefined();
        expect(body.data.name).toBe(testSportName);
        createdSportId = body.data.id;
        const dbSport = await prisma.sport.findUnique({ where: { id: createdSportId}});
        expect(dbSport).not.toBeNull();
        expect(dbSport?.name).toBe(testSportName);
    });

    it('2. PUT: Debe actualizar el deporte modificando la base de datos', async () => {
        const updatePayload = {
            description: 'Descripción E2E',
            max_capacity: 20,
        };

        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/sports/${createdSportId}`,
            payload: updatePayload
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.data.max_capacity).toBe(20);
        const dbSport = await prisma.sport.findUnique({ where: { id: createdSportId } });
        expect(dbSport?.max_capacity).toBe(20);
    });
})
