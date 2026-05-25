import { describe, it, expect, vi, beforeEach } from "vitest";
import { UpdateSportUseCase } from "./UpdateSportUseCase.js";
import { SportRepository } from "../domain/SportRepository.js";
import { SportValidator } from "../domain/services/SportValidator.js";
import { UpdateSportRequest, SportDTO } from "@alentapp/shared";

describe('UpdateSportUseCase', () => {
    const mockSportRepo = {
        findById: vi.fn(),
        update: vi.fn(),
    } as unknown as SportRepository;

    const mockSportValidator = {
        validateMaxCapacity: vi.fn(),
        validateNameCannotBeModified: vi.fn(),
        validateNameIsUnique: vi.fn(),
    } as unknown as SportValidator;

    const useCase = new UpdateSportUseCase(mockSportRepo, mockSportValidator);

    const mockExistingSport: SportDTO = {
        id: 'uuid-1',
        name: 'Tenis',
        description: 'Polvo de ladrillo',
        max_capacity: 10,
        additional_price: 100,
        requires_medical_certificate: true,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(mockSportRepo.findById).mockResolvedValueOnce(mockExistingSport);
    });
    
    it('debe actualizar description y max_capacity correctamente', async () => {
        const sportId = '550e8400-e29b-41d4-a716-446655440000';
        const existingSport = {
            id: sportId,
            name: 'Tenis',
            description: 'Descripción',
            max_capacity: 50,
            additional_price: 0,
            requires_medical_certificate: false,
        };
        const updateData: UpdateSportRequest = {
            description: 'test',
            max_capacity: 100,
        };
        const updatedSport = {
            ...existingSport,
            ...updateData,
        };
        
        vi.mocked(mockSportRepo.findById).mockResolvedValueOnce(existingSport);
        vi.mocked(mockSportRepo.update).mockResolvedValueOnce(updatedSport);
        const result = await useCase.execute(sportId, updateData);
        expect(result).toEqual(updatedSport);
        expect(mockSportRepo.findById).toHaveBeenCalledWith(sportId);
        expect(mockSportValidator.validateNameCannotBeModified).toHaveBeenCalledWith(updateData);
        expect(mockSportValidator.validateMaxCapacity).toHaveBeenCalledWith(100);
        expect(mockSportRepo.update).toHaveBeenCalledWith(sportId, updateData);
    });
})