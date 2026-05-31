import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateEquipmentLoanUseCase } from './CreateEquipmentLoanUseCase.js';
import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { EquipmentLoanValidator } from '../domain/services/EquipmentLoanValidator.js';

describe('CreateEquipmentLoanUseCase', () => {
    // Mocks de las dependencias
    const mockEquipmentRepo = {
        create: vi.fn(),
    } as unknown as EquipmentLoanRepository;

    const mockMemberRepo = {
        findById: vi.fn(),
    } as unknown as MemberRepository;

    const mockValidator = {
        validateDueDate: vi.fn(),
        validateMemberCategory: vi.fn(),
    } as unknown as EquipmentLoanValidator;

    // Instancia del Caso de Uso inyectando los mocks
    const useCase = new CreateEquipmentLoanUseCase(
        mockEquipmentRepo,
        mockMemberRepo,
        mockValidator
    );

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe crear el préstamo exitosamente y retornar los datos', async () => {
        // Datos de entrada
        const requestData = { item_name: 'Pelota', due_date: '2026-12-01', member_id: '123' };
        
        // Lo que esperamos que devuelva la base de datos simulada
        const mockCreatedLoan = { id: 'loan-1', ...requestData, status: 'Loaned' };
        
        // Configuramos los mocks para que no tiren error y devuelvan éxito
        vi.mocked(mockValidator.validateDueDate).mockImplementationOnce(() => {});
        vi.mocked(mockValidator.validateMemberCategory).mockResolvedValueOnce(undefined);
        vi.mocked(mockEquipmentRepo.create).mockResolvedValueOnce(mockCreatedLoan as any);

        const result = await useCase.execute(requestData as any);

        // Verificaciones
        expect(result).toEqual(mockCreatedLoan);
        expect(mockValidator.validateDueDate).toHaveBeenCalledWith('2026-12-01');
        expect(mockValidator.validateMemberCategory).toHaveBeenCalledWith('123');
        expect(mockEquipmentRepo.create).toHaveBeenCalledOnce();
    });

    it('debe frenar la ejecución si la validación de fecha falla', async () => {
        const requestData = { item_name: 'Pelota', due_date: '2020-01-01', member_id: '123' };
        
        // Forzamos al validador a fallar
        vi.mocked(mockValidator.validateDueDate).mockImplementationOnce(() => {
            throw new Error('La fecha de devolución no puede ser anterior a la fecha de hoy');
        });

        // Verificamos que el caso de uso rechace la promesa
        await expect(useCase.execute(requestData as any)).rejects.toThrow('anterior a la fecha de hoy');
        
        // Verificamos que nunca haya llamado al repositorio a guardar nada
        expect(mockEquipmentRepo.create).not.toHaveBeenCalled();
    });

    it('debe frenar la ejecución si la validación de categoría falla', async () => {
        const requestData = { item_name: 'Pelota', due_date: '2026-12-01', member_id: '456' };
        
        vi.mocked(mockValidator.validateDueDate).mockImplementationOnce(() => {});
        
        // Forzamos al validador de socio a fallar (ej: es Cadete)
        vi.mocked(mockValidator.validateMemberCategory).mockRejectedValueOnce(
            new Error('Los socios Cadet tiene prohibido solicitar material')
        );

        await expect(useCase.execute(requestData as any)).rejects.toThrow('prohibido solicitar material');
        expect(mockEquipmentRepo.create).not.toHaveBeenCalled();
    });
});