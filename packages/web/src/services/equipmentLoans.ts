import type { 
    EquipmentLoanDTO, 
    CreateEquipmentLoanRequest, 
    UpdateEquipmentLoanRequest 
  } from '@alentapp/shared';
  
  const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/v1';
  
  export const equipmentLoansService = {
    /**
     * Obtiene todos los préstamos de equipamiento (Read)
     */
    async getAll(): Promise<EquipmentLoanDTO[]> {
      const response = await fetch(`${API_URL}/equipment-loans`);
      if (!response.ok) {
        throw new Error('Error al obtener los préstamos de equipamiento');
      }
      const result = await response.json();
      return result.data;
    },
  
    /**
     * Crea un nuevo registro de préstamo (Create)
     */
    async create(data: CreateEquipmentLoanRequest): Promise<EquipmentLoanDTO> {
      const response = await fetch(`${API_URL}/equipment-loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        // Captura el mensaje de error del backend (ej: categoría no permitida)
        throw new Error(errorData.error || 'Error al crear el préstamo');
      }
      const result = await response.json();
      return result.data;
    },
  
    /**
     * Actualiza parcialmente un préstamo (Update)
     */
    async update(id: string, data: UpdateEquipmentLoanRequest): Promise<EquipmentLoanDTO> {
      const response = await fetch(`${API_URL}/equipment-loans/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar el préstamo');
      }
      const result = await response.json();
      return result.data;
    },
  
    /**
     * Elimina permanentemente un registro (Delete)
     */
    async delete(id: string): Promise<void> {
      const response = await fetch(`${API_URL}/equipment-loans/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar el préstamo');
      }
    },
  };