import { PaymentRepository } from '../domain/PaymentRepository.js';

export interface UpdatePaymentInput {
  id: string;
  amount?: number;
  status?: 'Pending' | 'Paid' | 'Canceled' | 'Ovedue';
  dueDate?: Date;
}

export class UpdatePaymentUseCase {
  constructor(
    private readonly paymentRepository: PaymentRepository
  ) {}

  async execute(input: UpdatePaymentInput) {
    const existingPayment = await this.paymentRepository.findById(input.id);
    if (!existingPayment) {
      throw new Error("El registro de pago no existe.");
    }

    return await this.paymentRepository.update(input.id, {
      amount: input.amount ?? existingPayment.amount,
      status: input.status ?? existingPayment.status,
      dueDate: input.dueDate ?? existingPayment.dueDate,
    });
  }
}