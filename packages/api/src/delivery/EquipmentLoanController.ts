import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateEquipmentLoanUseCase } from '../application/CreateEquipmentLoanUseCase.js';
import { UpdateEquipmentLoanUseCase } from '../application/UpdateEquipmentLoanUseCase.js';
import { DeleteEquipmentLoanUseCase } from '../application/DeleteEquipmentLoanUseCase.js';
import { GetEquipmentLoansUseCase } from '../application/GetEquipmentLoanUseCase.js';
import { CreateEquipmentLoanRequest, UpdateEquipmentLoanRequest } from '@alentapp/shared';
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('alentapp-api');
const requestCounter = meter.createCounter('http.requests.total');
const errorCounter = meter.createCounter('http.requests.errors');
const requestDuration = meter.createHistogram('http.request.duration', { unit: 'ms' });

export class EquipmentLoanController {
    constructor(
        private readonly createEquipmentLoanUseCase: CreateEquipmentLoanUseCase,
        private readonly updateEquipmentLoanUseCase: UpdateEquipmentLoanUseCase,
        private readonly deleteEquipmentLoanUseCase: DeleteEquipmentLoanUseCase,
        private readonly getEquipmentLoanUseCase: GetEquipmentLoansUseCase
    ) {}

    async create(
        request: FastifyRequest<{ Body: CreateEquipmentLoanRequest }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        const method = request.method;
        const route = request.url.split('?')[0];
        try {
            const { item_name, due_date, member_id } = request.body;
            if (!item_name || !due_date || !member_id) {
                errorCounter.add(1, { method, route, status: '400' });
                return reply.status(400).send({ error: 'El nombre del ítem, la fecha de devolución y el member_id son requeridos' });
            }

            const loan = await this.createEquipmentLoanUseCase.execute(request.body);
            requestCounter.add(1, { method, route, status: '201' });
            return reply.status(201).send({ data: loan });
        } catch (error: any) {
            errorCounter.add(1, { method, route, status: '500' });
            return this.handleError(reply, error);
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }

    async update(
        request: FastifyRequest<{
            Params: { id: string },
            Body: UpdateEquipmentLoanRequest
        }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        const method = request.method;
        const route = request.url.split('?')[0];
        try {
            const { id } = request.params;

            const loan = await this.updateEquipmentLoanUseCase.execute(id, request.body);

            requestCounter.add(1, { method, route, status: '200' });
            return reply.status(200).send({ data: loan });
        } catch (error: any) {
            errorCounter.add(1, { method, route, status: '500' });
            return this.handleError(reply, error);
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }

    async get(_request: FastifyRequest, reply: FastifyReply) {
        const start = Date.now();
        const method = _request.method;
        const route = _request.url.split('?')[0];
        try {
            const loans = await this.getEquipmentLoanUseCase.execute();
            requestCounter.add(1, { method, route, status: '200' });
            return reply.status(200).send({ data: loans });
        } catch (error: any) {
            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({ error: 'No se pudo obtener el listado' });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }

    async delete(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        const method = request.method;
        const route = request.url.split('?')[0];
        try {
            const { id } = request.params;

            await this.deleteEquipmentLoanUseCase.execute(id);

            requestCounter.add(1, { method, route, status: '204' });
            return reply.status(204).send();
        } catch (error: any) {
            errorCounter.add(1, { method, route, status: '500' });
            return this.handleError(reply, error);
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }

    private handleError(reply: FastifyReply, error: any) {
        if (error.message.includes('préstamo referenciado no existe')) {
            return reply.status(404).send({ error: error.message });
        }

        if (error.message.includes('socio referenciado no existe') ||
            error.message.includes('estado ingresado no es válido')) {
                return reply.status(400).send({ error: error.message });
        }

        if (error.message.includes('prohibido')) {
            return reply.status(403).send({ error: error.message });
        }

        if (error.message.includes('estado ingresado no es válido')) {
            return reply.status(400).send({ error: error.message });
        }

        if (error.message.includes('anterior a la fecha de hoy')) {
            return reply.status(400).send({ error: error.message });
        }

        return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
    }
}
