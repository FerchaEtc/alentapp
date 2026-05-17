import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateSportRequest, UpdateSportRequest } from '@alentapp/shared';
import { CreateSportUseCase } from '../application/NewSportUseCase.js';
import { UpdateSportUseCase } from '../application/UpdateSportUseCase.js';

export class SportController {
    constructor(
        private readonly createSportUseCase: CreateSportUseCase,
        private readonly updateSportUseCase?: UpdateSportUseCase,
    ) {}

    async create(
        request: FastifyRequest<{ Body: CreateSportRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const sport = await this.createSportUseCase.execute(request.body);
            return reply.status(201).send({ data: sport });
        } catch (error: any) {
            if (error.message.includes('Ya existe un deporte con ese nombre')) {
                return reply.status(409).send({ error: error.message });
            }
            if (error.message.includes('La capacidad debe ser mayor a cero')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }


    async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      return reply.status(200).send({ msg: "Edición de deporte no implementada aún" });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  }

    
}
