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
      throw new Error("NOT_FOUND"); 
    }

    if (existingPayment.status === 'Canceled') {
      throw new Error("IS_CANCELED"); 
    }

    if (existingPayment.status === 'Paid') {
      if (input.status !== 'Canceled') {
        throw new Error("ALREADY_PAID"); 
      }
    }

    const updatedData: any = {
      amount: input.amount ?? existingPayment.amount,
      status: input.status ?? existingPayment.status,
      dueDate: input.dueDate ?? existingPayment.dueDate,
    };

    if (input.status === 'Paid') {
      updatedData.paymentDate = new Date(); 
    } 
    else if (input.status === 'Canceled') {
      updatedData.paymentDate = null; 
    }

    return await this.paymentRepository.update(input.id, updatedData);
  }
}