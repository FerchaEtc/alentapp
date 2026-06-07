import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateSportRequest, UpdateSportRequest } from '@alentapp/shared';
import { CreateSportUseCase } from '../application/NewSportUseCase.js';
import { GetSportsUseCase } from '../application/GetSportsUseCase.js';
import { UpdateSportUseCase } from '../application/UpdateSportUseCase.js';
import { DeleteSportUseCase } from '../application/DeleteSportUseCase.js';
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('alentapp-api');
const requestCounter = meter.createCounter('http.requests.total');
const errorCounter = meter.createCounter('http.requests.errors');
const requestDuration = meter.createHistogram('http.request.duration', { unit: 'ms' });

export class SportController {
    constructor(
        private readonly createSportUseCase: CreateSportUseCase,
        private readonly updateSportUseCase?: UpdateSportUseCase,
        private readonly deleteSportUseCase?: DeleteSportUseCase,
        private readonly getSportsUseCase?: GetSportsUseCase,
    ) {}

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        const start = Date.now();
        const method = _request.method;
        const route = _request.url.split('?')[0];
        try {
            if (!this.getSportsUseCase) {
                throw new Error('GetSportsUseCase no configurado');
            }

            const sports = await this.getSportsUseCase.execute();
            requestCounter.add(1, { method, route, status: '200' });
            return reply.status(200).send({ data: sports });
        } catch {
            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }

    async create(
        request: FastifyRequest<{ Body: CreateSportRequest }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        const method = request.method;
        const route = request.url.split('?')[0];
        try {
            const sport = await this.createSportUseCase.execute(request.body);
            requestCounter.add(1, { method, route, status: '201' });
            return reply.status(201).send({ data: sport });
        } catch (error: any) {
            if (error.message.includes('Ya existe un deporte con ese nombre')) {
                errorCounter.add(1, { method, route, status: '409' });
                return reply.status(409).send({ error: error.message });
            }
            if (error.message.includes('La capacidad debe ser mayor a cero')) {
                errorCounter.add(1, { method, route, status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdateSportRequest }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        const method = request.method;
        const route = request.url.split('?')[0];
        try {
            const { id } = request.params;
            if (!this.updateSportUseCase) {
                throw new Error('UpdateSportUseCase no configurado');
            }
            const sport = await this.updateSportUseCase.execute(id, request.body);
            requestCounter.add(1, { method, route, status: '200' });
            return reply.status(200).send({ data: sport });
        } catch (error: any) {
            if (error.message.includes('El deporte no existe')) {
                errorCounter.add(1, { method, route, status: '404' });
                return reply.status(404).send({ error: error.message });
            }
            if (
                error.message.includes('La capacidad debe ser mayor a cero') ||
                error.message.includes('El nombre del deporte no puede modificarse')
            ) {
                errorCounter.add(1, { method, route, status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
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
            if (!this.deleteSportUseCase) {
                throw new Error('DeleteSportUseCase no configurado');
            }
            await this.deleteSportUseCase.execute(id);
            requestCounter.add(1, { method, route, status: '204' });
            return reply.status(204).send();
        } catch (error: any) {
            if (error.message.includes('El deporte no existe')) {
                errorCounter.add(1, { method, route, status: '404' });
                return reply.status(404).send({ error: error.message });
            }
            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }
}
