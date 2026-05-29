import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdatePaymentUseCase } from './UpdatePaymentUseCase.js';
import { PaymentRepository } from '../domain/PaymentRepository.js';
import { Payment } from '@alentapp/shared';

describe('UpdatePaymentUseCase', () => {
    const mockPaymentRepo = {
        findById: vi.fn(),
        update: vi.fn(),
    } as unknown as PaymentRepository;

    const useCase = new UpdatePaymentUseCase(mockPaymentRepo);

    const mockExistingPayment: Payment = {
        id: 'uuid-payment-1',
        memberId: 'uuid-member-1',
        amount: 2500,
        month: 5,
        year: 2026,
        status: 'Pending',
        dueDate: new Date('2026-05-23T00:00:00.000Z'),
        paymentDate: null,
        createdAt: new Date('2026-05-20T00:00:00.000Z')
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(mockPaymentRepo.findById).mockResolvedValue(mockExistingPayment);
    });

   

    it('1. debe lanzar un error NOT_FOUND si la cuota financiera a actualizar no existe en la DB', async () => {
        vi.mocked(mockPaymentRepo.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute({ id: 'uuid-invalido', status: 'Paid' }))
            .rejects.toThrow('NOT_FOUND');
        
        expect(mockPaymentRepo.findById).toHaveBeenCalledWith('uuid-invalido');
    });

    it('2. debe lanzar un error ALREADY_PAID si se intenta alterar una cuota que ya figura como cobrada', async () => {
        const paidPayment = { ...mockExistingPayment, status: 'Paid' as const };
        vi.mocked(mockPaymentRepo.findById).mockResolvedValueOnce(paidPayment);

        await expect(useCase.execute({ id: 'uuid-payment-1', status: 'Pending' }))
            .rejects.toThrow('ALREADY_PAID');
        
        expect(mockPaymentRepo.update).not.toHaveBeenCalled();
    });

    it('3. debe mutar y guardar exitosamente el estado de la cuota a Paid', async () => {
        vi.mocked(mockPaymentRepo.update).mockResolvedValueOnce({ ...mockExistingPayment, status: 'Paid' });

        const result = await useCase.execute({ id: 'uuid-payment-1', status: 'Paid' });

        expect(result.status).toBe('Paid');
        expect(mockPaymentRepo.update).toHaveBeenCalledWith('uuid-payment-1', expect.objectContaining({
            status: 'Paid'
        }));
    });

    it('4. debe inyectar de forma automatizada la estampa de tiempo (paymentDate = now) al efectuar el cobro', async () => {
        await useCase.execute({ id: 'uuid-payment-1', status: 'Paid' });

        const callArgs = vi.mocked(mockPaymentRepo.update).mock.calls[0][1];
        
        expect(callArgs.paymentDate).toBeInstanceOf(Date);
    });
});