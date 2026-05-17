import { EquipmentLoanRepository, EquipmentLoanEntity } from '../domain/EquipmentLoanRepository.js';
import { EquipmentLoanValidator } from '../domain/services/EquipmentLoanValidator.js';
import { UpdateEquipmentLoanRequest } from '@alentapp/shared';

export class UpdateEquipmentLoanUseCase {
    constructor(
        private readonly loanRepository: EquipmentLoanRepository,
        private readonly loanValidator: EquipmentLoanValidator
    ) {}

    async execute(id: string, data: UpdateEquipmentLoanRequest): Promise<EquipmentLoanEntity> {
        // Validar que el préstamo existe
        const existingLoan = await this.loanRepository.findById(id);
        if (!existingLoan) {
            throw new Error('El préstamo referenciado no existe'); // Error 404
        }

        // Si hay reasignación de socio, validar categoría
        if (data.member_id) {
            await this.loanValidator.validateMemberCategory(data.member_id);
        }

        // Ejecutar la actualización en el repositorio
        return await this.loanRepository.update(id, data);
    }
}