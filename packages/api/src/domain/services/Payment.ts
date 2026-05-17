export async function updatePaymentStatus(id: string, status: 'Pending' | 'Paid' | 'Canceled' | 'Overdue'): Promise<any> {
const response = await fetch(`${(import.meta as any).env.VITE_API_URL}/api/v1/payments/${id}`, {    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "No se pudo actualizar el estado del pago.");
  }

  return result;
}