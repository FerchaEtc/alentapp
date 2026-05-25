import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetSportsUseCase } from './GetSportsUseCase.js';
import { SportRepository } from '../domain/SportRepository.js';
import { SportDTO } from '@alentapp/shared';

describe('GetSportsUseCase', () => {
    const mockSportRepo = {
        findAll: vi.fn(),
    } as unknown as SportRepository;

    const useCase = new GetSportsUseCase(mockSportRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe retornar la lista de deportes', async () => {
        const mockSports: SportDTO[] = [
            {
                id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Tenis',
                description: 'Polvo de ladrillo',
                max_capacity: 100,
                additional_price: 0,
                requires_medical_certificate: false,
            },
            {
                id: '550e8400-e29b-41d4-a716-446655440001',
                name: 'Fútbol',
                description: 'Cancha de fútbol 5',
                max_capacity: 10,
                additional_price: 500,
                requires_medical_certificate: true,
            },
        ];
        vi.mocked(mockSportRepo.findAll).mockResolvedValueOnce(mockSports);

        const result = await useCase.execute();
        expect(result).toEqual(mockSports);
        expect(mockSportRepo.findAll).toHaveBeenCalledOnce();
    });
});
