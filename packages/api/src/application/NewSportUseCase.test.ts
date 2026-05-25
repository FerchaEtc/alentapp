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

    it('debe lanzar error si ya existe un deporte con ese nombre', async () => {
        const sportRequest: CreateSportRequest = {
            name: 'Tenis',
            description: 'Polvo de ladrillo',
            max_capacity: 100,
            additional_price: 0,
            requires_medical_certificate: false,
        };

        vi.mocked(mockSportValidator.validateNameIsUnique).mockRejectedValueOnce(
            new Error('Ya existe un deporte con ese nombre'),
        );

        await expect(useCase.execute(sportRequest)).rejects.toThrow(
            'Ya existe un deporte con ese nombre',
        );

        expect(mockSportValidator.validateMaxCapacity).toHaveBeenCalledWith(100);
        expect(mockSportValidator.validateNameIsUnique).toHaveBeenCalledWith('Tenis');
        expect(mockSportRepo.create).not.toHaveBeenCalled();
    });

    it('debe lanzar error si la capacidad máxima es menor o igual a cero', async () => {
        const sportRequest: CreateSportRequest = {
            name: 'Tenis',
            description: 'Polvo de ladrillo',
            max_capacity: 0,
            additional_price: 0,
            requires_medical_certificate: false,
        };

        vi.mocked(mockSportValidator.validateMaxCapacity).mockImplementationOnce(() => {
            throw new Error('La capacidad debe ser mayor a cero');
        });

        await expect(useCase.execute(sportRequest)).rejects.toThrow(
            'La capacidad debe ser mayor a cero',
        );

        expect(mockSportValidator.validateMaxCapacity).toHaveBeenCalledWith(0);
        expect(mockSportValidator.validateNameIsUnique).not.toHaveBeenCalled();
        expect(mockSportRepo.create).not.toHaveBeenCalled();
    });
});