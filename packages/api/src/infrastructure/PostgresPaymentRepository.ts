import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { PaymentRepository } from '../application/NewPaymentUseCase.js';
import { Payment } from '@alentapp/shared';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

export class PostgresPaymentRepository implements PaymentRepository {
  
  public async memberExists(memberId: string): Promise<boolean> {
    const member = await prisma.member.findUnique({
      where: { id: memberId }
    });
    return member !== null;
  }

  public async findByMemberAndPeriod(memberId: string, month: number, year: number): Promise<Payment | null> {
    const payment = await prisma.payment.findFirst({
      where: {
        memberId: memberId,
        month: month,
        year: year
      } as any
    });
    
    return payment as any;
  }

  public async create(payment: Payment): Promise<Payment> {
    const p = payment as any;

    const createdPayment = await prisma.payment.create({
      data: {
        id: p.id,
        amount: p.amount,
        month: p.month,
        year: p.year,
        status: (p.status || 'Pending') as any,
        dueDate: p.dueDate,
        memberId: p.memberId
      } as any,
    });

    return createdPayment as any;
  }

  public async getPaymentsByMember(memberId: string): Promise<Payment[]> {
    const payments = await prisma.payment.findMany({
      where: {
        memberId: memberId
      } as any, 
      orderBy: {
        year: 'desc'
      }
    });

    return payments.map((p: any) => ({
      id: p.id,
      memberId: p.memberId,
      amount: p.amount,
      month: p.month,
      year: p.year,
      status: p.status,
      
      dueDate: p.dueDate,
      due_date: p.dueDate || p.due_date,
      
      createdAt: p.createdAt || p.created_at,
      created_at: p.createdAt || p.created_at
    })) as any;
  }
} 