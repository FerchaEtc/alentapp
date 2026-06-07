import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateMemberUseCase } from '../application/NewMemberUseCase.js';
import { GetMembersUseCase } from '../application/GetMembersUseCase.js';
import { UpdateMemberUseCase } from '../application/UpdateMemberUseCase.js';
import { DeleteMemberUseCase } from '../application/DeleteMemberUseCase.js';
import { CreateMemberRequest, UpdateMemberRequest } from '@alentapp/shared';
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('alentapp-api');
const requestCounter = meter.createCounter('http.requests.total');
const errorCounter = meter.createCounter('http.requests.errors');
const requestDuration = meter.createHistogram('http.request.duration', { unit: 'ms' });

export class MemberController {
    constructor(
        private readonly createMemberUseCase: CreateMemberUseCase,
        private readonly getMembersUseCase: GetMembersUseCase,
        private readonly updateMemberUseCase: UpdateMemberUseCase,
        private readonly deleteMemberUseCase: DeleteMemberUseCase,
    ) {}

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        const start = Date.now();
        const method = _request.method;
        const route = _request.url.split('?')[0];
        try {
            const socios = await this.getMembersUseCase.execute();
            requestCounter.add(1, { method, route, status: '200' });
            return reply.status(200).send({ data: socios });
        } catch (error: any) {
            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({ error: error.message });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }

    async create(
        request: FastifyRequest<{ Body: CreateMemberRequest }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        const method = request.method;
        const route = request.url.split('?')[0];
        try {
            request.log.info('Alguien pegó al endpoint de ping');
            const socio = await this.createMemberUseCase.execute(request.body);
            requestCounter.add(1, { method, route, status: '201' });
            return reply.status(201).send({ data: socio });
        } catch (error: any) {
            if (error.message.includes('Ya existe un miembro con ese DNI')) {
                errorCounter.add(1, { method, route, status: '409' });
                return reply.status(409).send({ error: error.message });
            }
            if (error.message.includes('inválido')) {
                errorCounter.add(1, { method, route, status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({ error: "Error interno, reintente más tarde" });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdateMemberRequest }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        const method = request.method;
        const route = request.url.split('?')[0];
        try {
            const { id } = request.params;
            const socio = await this.updateMemberUseCase.execute(id, request.body);
            requestCounter.add(1, { method, route, status: '200' });
            return reply.status(200).send({ data: socio });
        } catch (error: any) {
            if (error.message.includes('Ya existe un miembro con ese DNI')) {
                errorCounter.add(1, { method, route, status: '409' });
                return reply.status(409).send({ error: error.message });
            }
            if (error.message.includes('inválido') || error.message.includes('no existe')) {
                errorCounter.add(1, { method, route, status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({ error: "Error interno, reintente más tarde" });
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
            await this.deleteMemberUseCase.execute(id);
            requestCounter.add(1, { method, route, status: '204' });
            return reply.status(204).send();
        } catch (error: any) {
            errorCounter.add(1, { method, route, status: '400' });
            return reply.status(400).send({ error: error.message });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }

    async getByDni(
        request: FastifyRequest<{ Params: { dni: string } }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        const method = request.method;
        const route = request.url.split('?')[0];
        try {
            const { dni } = request.params;

            const socios = await this.getMembersUseCase.execute();

            const socioEncontrado = socios.find((s: any) => String(s.dni).trim() === String(dni).trim());

            if (!socioEncontrado) {
                errorCounter.add(1, { method, route, status: '404' });
                return reply.status(404).send({ error: `No se encontró ningún miembro con el DNI: ${dni}` });
            }

            requestCounter.add(1, { method, route, status: '200' });
            return reply.status(200).send({ data: socioEncontrado });

        } catch (error: any) {
            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({ error: error.message || "Error interno al buscar por DNI" });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }
}
