// packages/api/src/application/GetPaymentUseCase.ts
import { Payment } from '@alentapp/shared';
import { PaymentRepository } from './NewPaymentUseCase.js';

export class GetPaymentUseCase {
  constructor(private paymentRepository: PaymentRepository) {}

  public async execute(memberId: string): Promise<Payment[]> {
    if (!memberId) {
      throw new Error("Member ID is required");
    }

    const exists = await this.paymentRepository.memberExists(memberId);
    if (!exists) {
      throw new Error(`Member with ID ${memberId} does not exist`);
    }

    return await this.paymentRepository.getPaymentsByMember(memberId);
  }
}