import { EquipmentLoanRepository, EquipmentLoanEntity } from '../domain/EquipmentLoanRepository.js';

export class GetEquipmentLoansUseCase {
    constructor(private readonly repository: EquipmentLoanRepository) {}

    async execute(): Promise<EquipmentLoanEntity[]> {
        return await this.repository.findAll();
    }
}