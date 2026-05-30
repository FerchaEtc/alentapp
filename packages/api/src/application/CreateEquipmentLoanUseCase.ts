import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { EquipmentLoanValidator } from '../domain/services/EquipmentLoanValidator.js';
import { CreateEquipmentLoanRequest } from '@alentapp/shared';

export class CreateEquipmentLoanUseCase {
    constructor(
        private readonly equipmentLoanRepository: EquipmentLoanRepository,
        private readonly memberRepository: MemberRepository, // Inyectamos esto para buscar al socio
        private readonly validator: EquipmentLoanValidator
    ) {}

    async execute(data: CreateEquipmentLoanRequest) {
        // Busca al socio usando el repositorio
        const member = await this.memberRepository.findById(data.member_id);

        // Valida la fecha de devolución
        this.validator.validateDueDate(data.due_date);

        // Delega las reglas al validador que ya tiene el memberRepository adentro
        await this.validator.validateMemberCategory(data.member_id);

        // Persistencia a través del repositorio
        const nuevoPrestamo = await this.equipmentLoanRepository.create({
            ...data,
            status: 'Loaned', // Estado por defecto
        });

        return nuevoPrestamo;
    }
}