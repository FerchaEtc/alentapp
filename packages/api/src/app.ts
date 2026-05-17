import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PostgresMemberRepository } from './infrastructure/PostgresMemberRepository.js';
import { MemberValidator } from './domain/services/MemberValidator.js';
import { CreateMemberUseCase } from './application/NewMemberUseCase.js';
import { GetMembersUseCase } from './application/GetMembersUseCase.js';
import { UpdateMemberUseCase } from './application/UpdateMemberUseCase.js'; 
import { MemberController } from './delivery/MemberController.js';
import { DeleteMemberUseCase } from './application/DeleteMemberUseCase.js';
// --- IMPORTS DE PAGOS (PAYMENTS) ---
import { PostgresPaymentRepository } from './infrastructure/PostgresPaymentRepository.js'; 
import { NewPaymentUseCase } from './application/NewPaymentUseCase.js';
import { GetPaymentUseCase } from './application/GetPaymentUseCase.js';
import { PaymentController } from './delivery/PaymentController.js'; 

// --- IMPORTS DE DEPORTES (SPORTS) ---
import { PostgresSportRepository } from './infrastructure/PostgresSportRepository.js';
import { SportValidator } from './domain/services/SportValidator.js';
import { CreateSportUseCase } from './application/NewSportUseCase.js';
import { UpdateSportUseCase } from './application/UpdateSportUseCase.js';
import { SportController } from './delivery/SportController.js';

// --- Equipment Loan ---
import { PostgresEquipmentLoanRepository } from './infrastructure/PostgresEquipmentLoanRepository.js';
import { CreateEquipmentLoanUseCase } from './application/CreateEquipmentLoanUseCase.js';
import { EquipmentLoanController } from './delivery/EquipmentLoanController.js';

export function buildApp() {
    const server = Fastify({
        logger: {
            level: 'info',
            transport: process.env.NODE_ENV === 'development' 
            ? {
                target: 'pino-pretty',
                options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
                } 
            : undefined,
        },
    });

    server.register(cors, {
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });

    // --- INSTANCIACIÓN DE MIEMBROS ---
    const memberRepo = new PostgresMemberRepository();
    const memberValidator = new MemberValidator(memberRepo);
    
    const createMemberUseCase = new CreateMemberUseCase(memberRepo, memberValidator);
    const getMembersUseCase = new GetMembersUseCase(memberRepo);
    const updateMemberUseCase = new UpdateMemberUseCase(memberRepo, memberValidator);
    const deleteMemberUseCase = new DeleteMemberUseCase(memberRepo);

    const memberController = new MemberController(
        createMemberUseCase, 
        getMembersUseCase,
        updateMemberUseCase,
        deleteMemberUseCase
    );

    // --- INSTANCIACIÓN DE DEPORTES ---
    const sportRepo = new PostgresSportRepository();
    const sportValidator = new SportValidator(sportRepo);
    const createSportUseCase = new CreateSportUseCase(sportRepo, sportValidator);
    const updateSportUseCase = new UpdateSportUseCase(sportRepo, sportValidator);
    const sportController = new SportController(createSportUseCase, updateSportUseCase);

    // --- INSTANCIACIÓN DE PAGOS ---
    const paymentRepo = new PostgresPaymentRepository();
    const newPaymentUseCase = new NewPaymentUseCase(paymentRepo);
    const getPaymentUseCase = new GetPaymentUseCase(paymentRepo); 
    const paymentController = new PaymentController(newPaymentUseCase, getPaymentUseCase);

    // --- ENDPOINTS DE MIEMBROS ---
    server.get('/api/v1/socios', memberController.getAll.bind(memberController));
    server.post('/api/v1/socios', memberController.create.bind(memberController));
    server.put('/api/v1/socios/:id', memberController.update.bind(memberController));
    server.delete('/api/v1/socios/:id', memberController.delete.bind(memberController));


    
    server.post('/api/v1/sports', sportController.create.bind(sportController)); 
    server.put('/api/v1/sports/:id', sportController.update.bind(sportController)) 

    server.post('/api/v1/payments', paymentController.create.bind(paymentController));
    server.get('/api/v1/payments/member/:memberId', paymentController.getByMember.bind(paymentController));

    // --- Equipment Loan ---
    const equipmentLoanRepo = new PostgresEquipmentLoanRepository();
    const createEquipmentLoanUseCase = new CreateEquipmentLoanUseCase(equipmentLoanRepo, memberRepo); 
    const equipmentLoanController = new EquipmentLoanController(createEquipmentLoanUseCase);

    // --- Equipment Loan Route ---
    server.post('/api/v1/equipment-loans', equipmentLoanController.create.bind(equipmentLoanController));

    // --- Sports Route ---
    server.post('/api/v1/sports', sportController.create.bind(sportController));
    server.put('/api/v1/sports/:id', sportController.update.bind(sportController));


    server.get('/', async (req, rep) => {
        rep.status(200).send({ msg: 'asd' })
    });

    return server;
}

if (process.argv[1] && process.argv[1].endsWith('app.ts')) {
    const server = buildApp();
    const port = parseInt(process.env.PORT || '3000', 10);

    server.listen({ port, host: '0.0.0.0' }, () =>
        server.log.info(`API server running on http://localhost:${port}`)
    );

    ['SIGINT', 'SIGTERM'].forEach((signal) => {
        process.on(signal, async () => {
            await server.close();
            process.exit(0);
        });
    });
}