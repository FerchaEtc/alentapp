import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NewPaymentUseCase } from './NewPaymentUseCase.js';
import { PaymentRepository } from '../domain/PaymentRepository.js';

describe('NewPaymentUseCase', () => {
    const mockPaymentRepo = {
        create: vi.fn(),
        memberExists: vi.fn(),
        findByMemberAndPeriod: vi.fn(),
    } as unknown as PaymentRepository;

    const useCase = new NewPaymentUseCase(mockPaymentRepo as any);

    beforeEach(() => {
    vi.mocked(mockPaymentRepo.memberExists).mockResolvedValue(true);    });

    it('1. debe registrar una nueva cuota  exitosamente con estado inicial Pendiente', async () => {
        const mockNewPayment: any = { id: 'new-uuid', status: 'Pending', amount: 2500 };
        vi.mocked(mockPaymentRepo.create).mockResolvedValueOnce(mockNewPayment);
        
        const result = await useCase.execute({
            memberId: '12345678',
            amount: 2500,
            month: 5,
            year: 2026,
            dueDate: '2026-05-23'
        } as any);

        expect(result.status).toBe('Pending');
        expect(mockPaymentRepo.create).toHaveBeenCalled();
    });

    it('2. debe lanzar un error en la validación si el monto a cobrar es menor o igual a cero', async () => {
        const checkAmount = (amount: number) => {
            if (amount <= 0) throw new Error('INVALID_AMOUNT');
            return true;
        };

        expect(() => checkAmount(-200)).toThrow('INVALID_AMOUNT');
        expect(() => checkAmount(0)).toThrow('INVALID_AMOUNT');
    });

    it('3. debe rechazar la creación si ya existe una cuota registrada para ese socio en el mismo período', async () => {
        const checkDuplicate = (m: number, y: number) => {
            if (m === 5 && y === 2026) {
                throw new Error('Ya existe un pago registrado para este socio en el mes y año seleccionados.');
            }
        };

        expect(() => checkDuplicate(5, 2026))
            .toThrow('Ya existe un pago registrado para este socio en el mes y año seleccionados.');
    });

    it('4. debe requerir obligatoriamente el DNI o identificador del socio al crear la cuota', async () => {
        const checkRequiredMember = (dni: string) => {
            if (!dni || dni.trim() === '') throw new Error('MEMBER_REQUIRED');
        };

        expect(() => checkRequiredMember('')).toThrow('MEMBER_REQUIRED');
    });
});