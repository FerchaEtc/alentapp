import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';

export class DeleteEquipmentLoanUseCase {
    constructor(
        private readonly equipmentLoanRepository: EquipmentLoanRepository
    ) {}

    async execute(id: string): Promise<void> {
        // Validar existencia previa
        const existingLoan = await this.equipmentLoanRepository.findById(id);
        
        if (!existingLoan) {
            throw new Error('El préstamo referenciado no existe');
        }

        // Borrar fisicamente
        await this.equipmentLoanRepository.delete(id);
    }
}