import { SportRepository } from '../domain/SportRepository.js';

export class DeleteSportUseCase {
    constructor(private readonly sportRepository: SportRepository) {}

    async execute(id: string): Promise<void> {
        const existingSport = await this.sportRepository.findById(id);
        if (!existingSport) {
            throw new Error('El deporte no existe');
        }

        await this.sportRepository.delete(id);
    }
}
