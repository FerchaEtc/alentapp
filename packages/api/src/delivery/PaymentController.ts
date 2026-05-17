import { FastifyRequest, FastifyReply } from 'fastify';
import { NewPaymentUseCase } from '../application/NewPaymentUseCase.js';
import { GetPaymentUseCase } from '../application/GetPaymentUseCase.js'; 

import { PrismaClient } from '../generated/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL!),
});

export class PaymentController {
  constructor(
    private readonly newPaymentUseCase: NewPaymentUseCase,
    private readonly getPaymentUseCase: GetPaymentUseCase 
  ) {}

  async create(request: FastifyRequest, reply: FastifyReply) {
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
        return reply.status(400).send({ error: "Socio no encontrado." });
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
      
      return reply.status(201).send({
        id: newPayment.id,
        status: newPayment.status
      });

    } catch (error: any) {
      console.error("ERROR CRÍTICO EN PAYMENT CONTROLLER:", error);

    
      if (error.message?.includes('Unique constraint') || error.code === 'P2002') {
        return reply.status(409).send({ 
          error: "Ya existe un pago registrado para este socio en el mes y año seleccionados." 
        });
      }

      
      if (error.name === 'ValidationError' || error.message?.includes('invalid')) {
        return reply.status(400).send({ error: error.message });
      }

      
      return reply.status(500).send({ 
        error: "Ocurrió un error interno en el servidor al procesar el cobro." 
      });
    }
  }

  async getByMember(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { memberId } = request.params as { memberId: string };
      const targetId = String(memberId).trim();
      let finalId = targetId;

      if (!isNaN(Number(targetId)) || targetId.length < 15) {
        const member = await prisma.member.findUnique({
          where: { dni: targetId }
        });

        if (!member) {
          return reply.status(200).send([]);
        }

        finalId = member.id;
      }
      
      const payments = await this.getPaymentUseCase.execute(finalId);
      return reply.status(200).send(payments);

    } catch (error: any) {
      
      return reply.status(500).send({ error: "Error al obtener los pagos del socio." });
    }
  }
}