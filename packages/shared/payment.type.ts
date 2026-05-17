export type PaymentStatus = 'Pending' | 'Paid' | 'Canceled' | 'Overdue';



export interface CreatePaymentDTO {
  member_id: string;
  amount: number;
  month: number;
  year: number;
  due_date: string;
}


export interface Payment {
  id: string;
  amount: number;
  month: number;
  year: number;
  status: PaymentStatus;
  dueDate: Date;
  memberId: string;
  createdAt: Date; 
}