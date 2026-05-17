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

    if (existingPayment.status === 'Paid') {
      throw new Error("ALREADY_PAID"); 
    }
    if (existingPayment.status === 'Canceled') {
      throw new Error("IS_CANCELED"); 
    }

    const updatedData: any = {
      amount: input.amount ?? existingPayment.amount,
      status: input.status ?? existingPayment.status,
      dueDate: input.dueDate ?? existingPayment.dueDate,
    };

    if (input.status === 'Paid') {
      updatedData.paymentDate = new Date(); 
    }

    return await this.paymentRepository.update(input.id, updatedData);
  }
}