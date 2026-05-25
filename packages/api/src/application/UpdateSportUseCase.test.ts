import { describe, it, expect, vi, beforeEach, expectTypeOf } from "vitest";
import { UpdateSportUseCase } from "./UpdateSportUseCase.js";
import { SportRepository } from "../domain/SportRepository.js";
import { SportValidator } from "../domain/services/SportValidator.js";
import { UpdateSportRequest } from "@alentapp/shared";

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

    beforeEach(() => {
        vi.resetAllMocks();
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
    
    it('debe lanzar error si el deporte no existe', async () => {
        const sportId = '550e8400-e29b-41d4-a716-446655440000';
        const updateData: UpdateSportRequest = {
            description: 'test',
            max_capacity: 100,
        };
        
        vi.mocked(mockSportRepo.findById).mockResolvedValueOnce(null);
        await expect(useCase.execute(sportId, updateData)).rejects.toThrow('El deporte no existe');
        expect(mockSportRepo.findById).toHaveBeenCalledWith(sportId);
        expect(mockSportValidator.validateNameCannotBeModified).not.toHaveBeenCalled();
        expect(mockSportValidator.validateMaxCapacity).not.toHaveBeenCalled();
        expect(mockSportRepo.update).not.toHaveBeenCalled();
    });

    it('debe lanzar error si se intenta modificar name', async () => {
        const sportId = '550e8400-e29b-41d4-a716-446655440000';
        const updateData = {name: 'Tenis'} as unknown as UpdateSportRequest;

        vi.mocked(mockSportValidator.validateNameCannotBeModified).mockImplementationOnce(() => {
            throw new Error ('El nombre del deporte no puede modificarse');
        });

        await expect(useCase.execute(sportId, updateData)).rejects.toThrow('El nombre del deporte no puede modificarse');
        expect(mockSportRepo.findById).toHaveBeenCalledWith(sportId);
        expect(mockSportValidator.validateNameCannotBeModified).toHaveBeenCalledWith(updateData);
        expect(mockSportValidator.validateMaxCapacity).not.toHaveBeenCalled();
        expect(mockSportRepo.update).not.toHaveBeenCalled();
    });
})