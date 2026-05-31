import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EquipmentLoanValidator } from './EquipmentLoanValidator.js';
import { MemberRepository } from '../MemberRepository.js';

describe('EquipmentLoanValidator', () => {
    // Mock del repositorio de socios
    const mockMemberRepo = {
        findById: vi.fn(),
    } as unknown as MemberRepository;

    const validator = new EquipmentLoanValidator(mockMemberRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    })

    describe('validateDueDate', () => {
        it('debe pasar correctamente si la fecha es igual o posterior a hoy', () => {
            const today = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(today.getDate() + 1);

            // Probamos hoy
            expect(() => validator.validateDueDate(today.toISOString())).not.toThrow();
            // Probamos mañana
            expect(() => validator.validateDueDate(tomorrow.toISOString())).not.toThrow();
        });

        it('debe lanzar un error si la fecha de devolución es anterior a hoy', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            expect(() => validator.validateDueDate(yesterday.toISOString()))
                .toThrow('La fecha de devolución no puede ser anterior a la fecha de hoy');
        });
    });

    describe('validateMemberCategory', () => {
        it('debe pasar si el socio existe y es categoría Pleno u Honorario', async () => {
            // Simulamos que la base de datos devuelve un socio válido
            vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce({ 
                id: '123', 
                category: 'Pleno' 
            } as any);

            await expect(validator.validateMemberCategory('123')).resolves.not.toThrow();
            expect(mockMemberRepo.findById).toHaveBeenCalledWith('123');
        });

        it('debe lanzar error (400) si el socio referenciado no existe', async () => {
            // Simulamos que la base de datos no encuentra al socio
            vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(null);

            await expect(validator.validateMemberCategory('999'))
                .rejects.toThrow('El socio referenciado no existe');
        });

        it('debe lanzar error (403) si el socio es categoría Cadete', async () => {
            // Simulamos un socio que no tiene permisos
            vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce({ 
                id: '456', 
                category: 'Cadete' 
            } as any);

            await expect(validator.validateMemberCategory('456'))
                .rejects.toThrow('Los socios Cadete tienen prohibido solicitar material');
        });
    });
});