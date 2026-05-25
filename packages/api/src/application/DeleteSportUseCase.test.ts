import { describe, it, expect, vi, beforeEach} from 'vitest';
import { DeleteSportUseCase } from './DeleteSportUseCase.js';
import { SportRepository } from '../domain/SportRepository.js';

describe('DeleteSportUseCase', () => {
    const mockSportRepo = {
        findById: vi.fn(),
        delete: vi.fn(),
    } as unknown as SportRepository;

    const useCase = new DeleteSportUseCase(mockSportRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe lanzar error si el deporte no existe', async () => {
        vi.mocked(mockSportRepo.findById).mockResolvedValueOnce(null);
        await expect(useCase.execute('uuid-999')).rejects.toThrow('El deporte no existe');
        expect(mockSportRepo.delete).not.toHaveBeenCalled();
        expect(mockSportRepo.findById).toHaveBeenCalledWith('uuid-999');
    });
    
})