import { MemberRepository } from '../MemberRepository.js';

export class EquipmentLoanValidator {
    constructor(private readonly memberRepository: MemberRepository) {}

    async validateMemberCategory(memberId: string): Promise<void> {
        const member = await this.memberRepository.findById(memberId);

        if (!member) {
            throw new Error('El socio referenciado no existe'); // Error 400
        }

        if (member.category === 'Cadete') {
            throw new Error('Los socios Cadet tiene prohibido solicitar material'); // Error 403
        }

        // Solo se permite a Pleno o Lifetime
        const allowedCategories = ['Pleno', 'Honorario'];
        if (!allowedCategories.includes(member.category)) {
            throw new Error('Solo los socios de categoría Pleno o Honorario pueden acceder a este beneficio');
        }
    }

    // Validacion de fecha para prestamos
    validateDueDate(dueDateString: string): void {
        const dueDate = new Date(dueDateString);
        const today = new Date();

        // Reseteamos horas, minutos y segundos para comparar solo los días
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);

        if (dueDate < today) {
            throw new Error('La fecha de devolución no puede ser anterior a la fecha de hoy');
        }
    }
}