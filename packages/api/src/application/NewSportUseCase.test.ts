import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateSportUseCase } from './NewSportUseCase.js';
import { SportRepository } from '../domain/SportRepository.js';
import { SportValidator } from '../domain/services/SportValidator.js';
import { CreateSportRequest, SportDTO } from '@alentapp/shared';

describe('CreateSportUseCase', () => {
    const mockSportRepo = {
        create: vi.fn(),
    } as unknown as SportRepository;

    const mockSportValidator = {
        validateMaxCapacity: vi.fn(),
        validateNameCannotBeModified: vi.fn(),
        validateNameIsUnique: vi.fn(),
    } as unknown as SportValidator;

    const useCase = new CreateSportUseCase(mockSportRepo, mockSportValidator);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe crear un deporte correctamente', async () => {
        const sportRequest: CreateSportRequest = {
            name: 'Tenis',
            description: 'Polvo de ladrillo',
            max_capacity: 100,
            additional_price: 0,
            requires_medical_certificate: false,
        };

        const createdSport: SportDTO = {
            id: '550e8400-e29b-41d4-a716-446655440000',
            ...sportRequest,
        };

        vi.mocked(mockSportValidator.validateNameIsUnique).mockResolvedValueOnce(undefined);
        vi.mocked(mockSportRepo.create).mockResolvedValueOnce(createdSport);

        const result = await useCase.execute(sportRequest);

        expect(result).toEqual(createdSport);
        expect(mockSportValidator.validateMaxCapacity).toHaveBeenCalledWith(100);
        expect(mockSportValidator.validateNameIsUnique).toHaveBeenCalledWith('Tenis');
        expect(mockSportRepo.create).toHaveBeenCalledWith(sportRequest);
    });

});