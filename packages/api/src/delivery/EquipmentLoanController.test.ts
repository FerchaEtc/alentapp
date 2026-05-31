import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EquipmentLoanController } from './EquipmentLoanController.js';

describe('EquipmentLoanController', () => {
    // 1. Mocks de los Casos de Uso (Simulamos que son objetos con una función execute)
    const mockCreateUseCase = { execute: vi.fn() };
    const mockUpdateUseCase = { execute: vi.fn() };
    const mockDeleteUseCase = { execute: vi.fn() };
    const mockGetUseCase = { execute: vi.fn() };

    // Instanciamos el controlador inyectando los mocks
    const controller = new EquipmentLoanController(
        mockCreateUseCase as any,
        mockUpdateUseCase as any,
        mockDeleteUseCase as any,
        mockGetUseCase as any
    );

    // 2. Mocks de Fastify (Simulamos los métodos de respuesta HTTP)
    const mockReply = {
        status: vi.fn().mockReturnThis(), // Retorna 'this' para encadenar .status().send()
        send: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create', () => {
        it('debe devolver status 201 y los datos si la creación es exitosa', async () => {
            const mockRequest = { 
                body: { item_name: 'Raqueta', due_date: '2026-12-01', member_id: '123' } 
            };
            const mockLoan = { id: 'loan-1', ...mockRequest.body, status: 'Loaned' };
            
            // Simulamos que el caso de uso hace su trabajo perfectamente
            mockCreateUseCase.execute.mockResolvedValueOnce(mockLoan);

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(201);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockLoan });
        });

        it('debe frenar en la validación sintáctica y devolver 400 si faltan campos', async () => {
            // Simulamos un body incompleto (falta due_date y member_id)
            const mockRequest = { 
                body: { item_name: 'Raqueta' } 
            };

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ 
                error: 'El nombre del ítem, la fecha de devolución y el member_id son requeridos' 
            });
            // El controller NUNCA debe llamar al caso de uso si los datos vienen mal de entrada
            expect(mockCreateUseCase.execute).not.toHaveBeenCalled();
        });

        it('debe atrapar el error del dominio y devolver 403 si el socio tiene prohibido pedir material', async () => {
            const mockRequest = { 
                body: { item_name: 'Raqueta', due_date: '2026-12-01', member_id: '456' } 
            };
            
            // Simulamos que el caso de uso rechaza la operación por regla de negocio
            mockCreateUseCase.execute.mockRejectedValueOnce(
                new Error('Los socios Cadet tiene prohibido solicitar material')
            );

            await controller.create(mockRequest as any, mockReply as any);

            // El handleError de tu controller debe mapear la palabra "prohibido" a un 403
            expect(mockReply.status).toHaveBeenCalledWith(403);
        });
    });

    describe('delete', () => {
        it('debe atrapar el error del dominio y devolver 404 si el préstamo no existe', async () => {
            const mockRequest = { params: { id: '999' } };
            
            mockDeleteUseCase.execute.mockRejectedValueOnce(
                new Error('El préstamo referenciado no existe')
            );

            await controller.delete(mockRequest as any, mockReply as any);

            // El handleError de tu controller debe mapear este mensaje a un 404
            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El préstamo referenciado no existe' });
        });
    });
});