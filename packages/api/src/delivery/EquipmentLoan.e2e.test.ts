import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js'; 

describe('EquipmentLoan API End-to-End Tests', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let createdLoanId: string;
    let testMemberId: string; // guarda el ID del socio temporal
    
    beforeAll(async () => {
        // Levanta la app
        app = buildApp();
        await app.ready();
        
        // Instancia Prisma para comprobar la BD
        prisma = new PrismaClient({
            adapter: new PrismaPg(process.env.DATABASE_URL as any),
        });
        await prisma.$connect();

        // Crea un socio Pleno en la DB para poder asignarle el preestamo
        const NumeroAleatorio = Math.floor(Math.random() * 100000).toString();
        const member = await prisma.member.create({
            data: {
                name: 'Socio E2E Préstamo',
                dni: `E2E${NumeroAleatorio}`,
                email: `loan${NumeroAleatorio}@test.com`,
                birthdate: new Date('1990-01-01T00:00:00Z'),
                category: 'Pleno'
            }
        });
        testMemberId = member.id;
    });

    afterAll(async () => {
        // Limpia la base de datos eliminando el prestamo y el socio
        if (createdLoanId) {
            await prisma.equipmentLoan.deleteMany({
                where: { id: createdLoanId }
            });
        }
        if (testMemberId) {
            await prisma.member.deleteMany({
                where: { id: testMemberId }
            });
        }
        await prisma.$disconnect();
        await app.close();
    });

    it('1. POST: Debe crear un préstamo en la base de datos', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const payload = {
            item_name: 'Pelota de Básquet E2E',
            due_date: tomorrow.toISOString(),
            member_id: testMemberId // Usa el ID del socio que se inserto en el beforeAll
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/equipment-loans',
            payload
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);
        
        expect(body.data.id).toBeDefined();
        expect(body.data.item_name).toBe('Pelota de Básquet E2E');
        
        // Guarda el ID para limpiar la DB luego
        createdLoanId = body.data.id;
        
        // Verifica si se guardo en la tabla de PostgreSQL
        const dbLoan = await prisma.equipmentLoan.findUnique({ where: { id: createdLoanId } });
        expect(dbLoan).not.toBeNull();
        expect(dbLoan?.item_name).toBe('Pelota de Básquet E2E');
    });

    it('2. PUT: Debe actualizar el estado del préstamo a "Returned" en la DB', async () => {
        const updatePayload = {
            status: 'Returned'
        };

        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/equipment-loans/${createdLoanId}`,
            payload: updatePayload
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.data.status).toBe('Returned');

        // Verifica directamente en PostgreSQL que el estado se modificó de verdad
        const dbLoan = await prisma.equipmentLoan.findUnique({ where: { id: createdLoanId } });
        expect(dbLoan?.status).toBe('Returned');
    });

    it('3. DELETE: Debe eliminar físicamente el préstamo de la base de datos', async () => {
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/equipment-loans/${createdLoanId}`
        });

        expect(response.statusCode).toBe(204);

        // Verifica que Prisma ya no lo encuentra en la DB
        const dbLoan = await prisma.equipmentLoan.findUnique({ where: { id: createdLoanId } });
        expect(dbLoan).toBeNull();
        
        // Anula variable para que el afterAll no intente borrarlo nuevamente y tire error
        createdLoanId = '';
    });
});