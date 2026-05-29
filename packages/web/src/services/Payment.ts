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

export const updatePaymentStatus = async (id: string, status: 'Pending' | 'Paid' | 'Canceled'): Promise<any> => {
  if (!id) throw new Error('El ID del pago es requerido');

  const response = await fetch(`http://localhost:3000/api/v1/payments/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'No se pudo actualizar el estado del pago.');
  }

  return await response.json();
};

