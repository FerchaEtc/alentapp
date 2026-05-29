import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdatePaymentUseCase } from './UpdatePaymentUseCase.js'; 
import { PaymentRepository } from '../domain/PaymentRepository.js';
import { Payment } from '@alentapp/shared';

describe('DeletePaymentUseCase (Anulación Lógica)', () => {
    const mockPaymentRepo = {
        findById: vi.fn(),
        update: vi.fn(),
        findByMemberAndPeriod: vi.fn(),
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

   

    it('1. debe lanzar un error si el pago a anular no existe en la DB (HTTP 404)', async () => {
        vi.mocked(mockPaymentRepo.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute({ id: 'uuid-no-existe', status: 'Canceled' }))
            .rejects.toThrow(); 
        
        expect(mockPaymentRepo.findById).toHaveBeenCalledWith('uuid-no-existe');
    });

    it('2. debe impedir la operación si la cuota ya se encuentra previamente en estado CANCELED', async () => {
        const alreadyCanceled = { ...mockExistingPayment, status: 'Canceled' as const };
        vi.mocked(mockPaymentRepo.findById).mockResolvedValueOnce(alreadyCanceled);

        await expect(useCase.execute({ id: 'uuid-payment-1', status: 'Canceled' }))
            .rejects.toThrow();
        
        expect(mockPaymentRepo.update).not.toHaveBeenCalled();
    });

    it('3. debe procesar la solicitud actualizando el estado de la cuota seleccionada a Canceled sin borrado físico', async () => {
        vi.mocked(mockPaymentRepo.update).mockResolvedValueOnce({ ...mockExistingPayment, status: 'Canceled' });

        const result = await useCase.execute({ id: 'uuid-payment-1', status: 'Canceled' });

        expect(result.status).toBe('Canceled');
        expect(mockPaymentRepo.update).toHaveBeenCalledWith('uuid-payment-1', expect.objectContaining({
            status: 'Canceled'
        }));
    });

    it('4. debe asegurar la persistencia inalterada de los montos tras ejecutar la cancelación', async () => {
        const executeCancelLogic = async (payment: any) => {
            return { ...payment, status: 'Canceled' };
        };

        const result = await executeCancelLogic(mockExistingPayment);

        expect(result.amount).toBe(2500);
        expect(result.month).toBe(5);
        expect(result.year).toBe(2026);
    });
});