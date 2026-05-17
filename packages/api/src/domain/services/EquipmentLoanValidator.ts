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
}