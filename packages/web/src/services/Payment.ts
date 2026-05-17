import { type Payment } from '@alentapp/shared';

export const getPaymentsByMember = async (memberId: string): Promise<Payment[]> => {
  if (!memberId) return [];

  const response = await fetch(`http://localhost:3000/api/v1/payments/member/${memberId}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al cargar el historial de pagos');
  }

  return await response.json();
};