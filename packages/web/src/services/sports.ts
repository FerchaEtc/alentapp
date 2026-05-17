import { SPORT_ENDPOINTS, type CreateSportRequest, type SportDTO, type UpdateSportRequest } from '@alentapp/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const sportsService = {
  async getAll(): Promise<SportDTO[]> {
    const response = await fetch(`${API_URL}${SPORT_ENDPOINTS.base}`);

    if (!response.ok) {
      throw new Error('Error al obtener los deportes');
    }

    const result = await response.json();
    return result.data;
  },

  async create(data: CreateSportRequest): Promise<SportDTO> {
    const response = await fetch(`${API_URL}${SPORT_ENDPOINTS.base}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al crear el deporte');
    }

    const result = await response.json();
    return result.data;
  },

  async update(id: string, data: UpdateSportRequest): Promise<SportDTO> {
    const response = await fetch(`${API_URL}${SPORT_ENDPOINTS.byId(id)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al actualizar el deporte');
    }

    const result = await response.json();
    return result.data;
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_URL}${SPORT_ENDPOINTS.byId(id)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al eliminar el deporte');
    }
  },
};
