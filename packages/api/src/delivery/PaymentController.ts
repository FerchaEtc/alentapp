import { FastifyRequest, FastifyReply } from 'fastify';
import { NewPaymentUseCase } from '../application/NewPaymentUseCase.js';
import { GetPaymentUseCase } from '../application/GetPaymentUseCase.js';
import { UpdatePaymentUseCase } from '../application/UpdatePaymentUseCase.js';

import { PrismaClient } from '../generated/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('alentapp-api');
const requestCounter = meter.createCounter('http.requests.total');
const errorCounter = meter.createCounter('http.requests.errors');
const requestDuration = meter.createHistogram('http.request.duration', { unit: 'ms' });

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL!),
    
});

export class PaymentController {
  constructor(
    private readonly newPaymentUseCase: NewPaymentUseCase,
    private readonly getPaymentUseCase: GetPaymentUseCase,
    private readonly updatePaymentUseCase: UpdatePaymentUseCase
  ) {}

  async create(request: FastifyRequest, reply: FastifyReply) {
    const start = Date.now();
    const method = request.method;
    const route = request.url.split('?')[0];
    try {
      const body = request.body as any;
      const inputMemberId = String(body.memberId).trim();

      let member = null;

      if (!isNaN(Number(inputMemberId)) || inputMemberId.length < 15) {
        member = await prisma.member.findUnique({
          where: { dni: inputMemberId }
        });
      } else {
        member = await prisma.member.findUnique({
          where: { id: inputMemberId }
        });
      }

      if (!member) {
        errorCounter.add(1, { method, route, status: '400' });
        return reply.status(400).send({ error: "Socio no encontrado." });
      }

      const inputAmount= Number(body.amount);
      if (isNaN(inputAmount) || inputAmount <= 0) {
        errorCounter.add(1, { method, route, status: '400' });
        return reply.status(400).send({
          error: "El monto a cobrar debe ser un número positivo mayor a cero."
        });
      }

      let parsedDueDate: Date;
      if (body.dueDate && typeof body.dueDate === 'string') {
        const parts = body.dueDate.includes('/') ? body.dueDate.split('/') : body.dueDate.split('-');
        if (parts.length === 3 && parts[0].length === 2) {
          parsedDueDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        } else {
          parsedDueDate = new Date(body.dueDate);
        }
      } else {
        parsedDueDate = new Date(Math.floor(Number(body.year)), Math.floor(Number(body.month)) - 1, 10);
      }

      if (isNaN(parsedDueDate.getTime())) {
        parsedDueDate = new Date();
      }

      const cleanPaymentData = {
        amount: Number(body.amount),
        month: Math.floor(Number(body.month)),
        year: Math.floor(Number(body.year)),
        status: 'Pending',
        dueDate: parsedDueDate,
        memberId: member.id
      };

      const newPayment = await prisma.payment.create({
        data: cleanPaymentData as any
      });

      requestCounter.add(1, { method, route, status: '201' });
      return reply.status(201).send({
        id: newPayment.id,
        status: newPayment.status
      });

    } catch (error: any) {
      console.error("ERROR CRÍTICO EN PAYMENT CONTROLLER:", error);

      if (error.message?.includes('Unique constraint') || error.code === 'P2002') {
        errorCounter.add(1, { method, route, status: '409' });
        return reply.status(409).send({
          error: "Ya existe un pago registrado para este socio en el mes y año seleccionados."
        });
      }

      if (error.name === 'ValidationError' || error.message?.includes('invalid')) {
        errorCounter.add(1, { method, route, status: '400' });
        return reply.status(400).send({ error: error.message });
      }

      errorCounter.add(1, { method, route, status: '500' });
      return reply.status(500).send({
        error: "Ocurrió un error interno en el servidor al procesar el cobro."
      });
    } finally {
      requestDuration.record(Date.now() - start, { method, route });
    }
  }

  async getByMember(request: FastifyRequest, reply: FastifyReply) {
    const start = Date.now();
    const method = request.method;
    const route = request.url.split('?')[0];
    try {
      const { memberId } = request.params as { memberId: string };
      const targetId = String(memberId).trim();
      let finalId = targetId;

      if (!isNaN(Number(targetId)) || targetId.length < 15) {
        const member = await prisma.member.findUnique({
          where: { dni: targetId }
        });

        if (!member) {
          requestCounter.add(1, { method, route, status: '200' });
          return reply.status(200).send([]);
        }

        finalId = member.id;
      }

      const payments = await this.getPaymentUseCase.execute(finalId);
      requestCounter.add(1, { method, route, status: '200' });
      return reply.status(200).send(payments);

    } catch (error: any) {
      errorCounter.add(1, { method, route, status: '500' });
      return reply.status(500).send({ error: "Error al obtener los pagos del socio." });
    } finally {
      requestDuration.record(Date.now() - start, { method, route });
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const start = Date.now();
    const method = request.method;
    const route = request.url.split('?')[0];
    try {
      const { id } = request.params as { id: string };
      const body = request.body as any;

      const updatedPayment = await this.updatePaymentUseCase.execute({
        id,
        status: body.status,
        amount: body.amount ? Number(body.amount) : undefined,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined
      });

      requestCounter.add(1, { method, route, status: '200' });
      return reply.status(200).send(updatedPayment);

    } catch (error: any) {
      console.error(" ERROR EN UPDATE PAYMENT CONTROLLER:", error);

      if (error.message === "NOT_FOUND") {
        errorCounter.add(1, { method, route, status: '404' });
        return reply.status(404).send({ error: "Payment inexistente." });
      }
      if (error.message === "ALREADY_PAID") {
        errorCounter.add(1, { method, route, status: '400' });
        return reply.status(400).send({ error: "La cuota ya se encuentra pagada." });
      }
      if (error.message === "IS_CANCELED") {
        errorCounter.add(1, { method, route, status: '400' });
        return reply.status(400).send({ error: "No se puede pagar una cuota que ya fue cancelada." });
      }

      errorCounter.add(1, { method, route, status: '500' });
      return reply.status(500).send({
        error: "Ocurrió un error interno en el servidor al actualizar el cobro."
      });
    } finally {
      requestDuration.record(Date.now() - start, { method, route });
    }
  }
}
