import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateEquipmentLoanUseCase } from '../application/CreateEquipmentLoanUseCase.js';
import { UpdateEquipmentLoanUseCase } from '../application/UpdateEquipmentLoanUseCase.js';
import { CreateEquipmentLoanRequest, UpdateEquipmentLoanRequest } from '@alentapp/shared';

export class EquipmentLoanController {
    constructor(
        private readonly createEquipmentLoanUseCase: CreateEquipmentLoanUseCase,
        private readonly updateEquipmentLoanUseCase: UpdateEquipmentLoanUseCase
    ) {}

    async create(
        request: FastifyRequest<{ Body: CreateEquipmentLoanRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const { item_name, due_date, member_id } = request.body;
            if (!item_name || !due_date || !member_id) {
                return reply.status(400).send({ error: 'El nombre del ítem, la fecha de devolución y el member_id son requeridos' });
            }

            const loan = await this.createEquipmentLoanUseCase.execute(request.body);
            return reply.status(201).send({ data: loan });
        } catch (error: any) {
            return this.handleError(reply, error);
        }
    }

    async update(
        request: FastifyRequest<{ 
            Params: { id: string }, 
            Body: UpdateEquipmentLoanRequest 
        }>,
        reply: FastifyReply,
    ) {
        try {
            const { id } = request.params;
            
            // Si se envia un status, debe ser válido. 
            const loan = await this.updateEquipmentLoanUseCase.execute(id, request.body);
            
            return reply.status(200).send({ data: loan });
        } catch (error: any) {
            return this.handleError(reply, error);
        }
    }

    // Manejo de errores
    private handleError(reply: FastifyReply, error: any) {

        // Préstamo inexistente (404)
        if (error.message.includes('préstamo referenciado no existe')) {
            return reply.status(404).send({ error: error.message });
        }

        // Socio nuevo no existe (400)
        if (error.message.includes('socio referenciado no existe')) {
            return reply.status(400).send({ error: error.message });
        }

        // Categoría prohibida (403)
        if (error.message.includes('prohibido')) {
            return reply.status(403).send({ error: error.message });
        }

        // Estado inválido (400)
        if (error.message.includes('estado ingresado no es válido')) {
            return reply.status(400).send({ error: error.message });
        }

        return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
    }
}