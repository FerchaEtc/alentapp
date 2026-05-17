import { Payment } from '@alentapp/shared';

export interface PaymentRepository {
  memberExists(memberId: string): Promise<boolean>;
  findByMemberAndPeriod(memberId: string, month: number, year: number): Promise<Payment | null>;
  create(payment: Payment): Promise<Payment>;
  getPaymentsByMember(memberId: string): Promise<Payment[]>;
  findById(id: string): Promise<any | null>; 
  update(id: string, data: any): Promise<any>; 
}