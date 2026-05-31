import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';

// Mockea el repositorio de PRESTAMOS
vi.mock('../infrastructure/PostgresEquipmentLoanRepository.js', () => {
    return {
        PostgresEquipmentLoanRepository: class {
            async findAll() { return [{ id: 'loan-1', item_name: 'Pelota de Básquet' }]; }
            async findById(id: string) { return id === 'loan-1' ? { id: 'loan-1', item_name: 'Pelota de Básquet' } : null; }
            async create(data: any) { return { id: 'loan-new', ...data, status: 'Loaned' }; }
            async update(id: string, data: any) { return { id, ...data }; }
            async delete(id: string) { return; }
        }
    };
});

// Mockea el repositorio de SOCIOS para verificar las categorias
vi.mock('../infrastructure/PostgresMemberRepository.js', () => {
    return {
        PostgresMemberRepository: class {
            async findById(id: string) { 
                if (id === 'socio-pleno') return { id: 'socio-pleno', category: 'Pleno' };
                if (id === 'socio-cadete') return { id: 'socio-cadete', category: 'Cadete' };
                return null;
            }
        }
    };
});

// Mockea el repositorio de pagos para evitar el crash por falta de DATABASE_URL en app.ts
vi.mock('../infrastructure/PostgresPaymentRepository.js', () => {
    return {
        PostgresPaymentRepository: class {
            // devuelve clase vacia para evitar que se ejecute el "throw new Error"
        }
    };
});

// Mockea el repositorio de deportes para evitar el crash por falta de DATABASE_URL en app.ts
vi.mock('../infrastructure/PostgresSportRepository.js', () => {
    return {
        PostgresSportRepository: class {
            // devuelve clase vacia para evitar que se ejecute el "throw new Error"
        }
    };
});

describe('EquipmentLoan API Integration Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready(); // Espera a que Fastify levante todo
    });

    afterAll(async () => {
        await app.close();
    });

    describe('GET /api/v1/equipment-loans', () => {
        it('Test 1: debe retornar 200 y el listado de préstamos', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/equipment-loans'
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data[0].id).toBe('loan-1');
            expect(body.data[0].item_name).toBe('Pelota de Básquet');
        });
    });

    describe('POST /api/v1/equipment-loans', () => {
        it('Test 2: debe retornar 201 y crear el préstamo si los datos son correctos', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            const payload = {
                item_name: 'Raqueta',
                due_date: tomorrow.toISOString(),
                member_id: 'socio-pleno' // Este socio devuelve "Pleno" en nuestro mock
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/equipment-loans',
                payload
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.payload);
            expect(body.data.id).toBe('loan-new');
            expect(body.data.status).toBe('Loaned');
        });

        it('Test 3: debe retornar 400 si la fecha de devolución está en el pasado', async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const payload = {
                item_name: 'Raqueta',
                due_date: yesterday.toISOString(),
                member_id: 'socio-pleno'
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/equipment-loans',
                payload
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain('La fecha de devolución no puede ser anterior');
        });

        it('Test 4: debe retornar 403 si el socio es categoría Cadete', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            const payload = {
                item_name: 'Raqueta',
                due_date: tomorrow.toISOString(),
                member_id: 'socio-cadete' // Este socio devuelve "Cadete" en nuestro mock
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/equipment-loans',
                payload
            });

            expect(response.statusCode).toBe(403);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain('prohibido solicitar material');
        });
    });

    describe('DELETE /api/v1/equipment-loans/:id', () => {
        it('Test 5: debe retornar 204 si el préstamo se elimina exitosamente', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/equipment-loans/loan-1' // Este ID existe en el mock
            });

            expect(response.statusCode).toBe(204);
            expect(response.payload).toBe('');
        });

        it('Test 6: debe retornar 404 si el préstamo a eliminar no existe', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/equipment-loans/loan-999' // Este ID NO existe en el mock
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El préstamo referenciado no existe');
        });
    });
});