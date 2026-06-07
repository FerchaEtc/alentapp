// PRIMERO: inicializar OpenTelemetry (antes de cualquier otro import)
import './infrastructure/telemetry.js';

// Luego el resto de imports...
import Fastify from 'fastify';

import 'dotenv/config';
import cors from '@fastify/cors';
import { SPORT_ENDPOINTS } from '@alentapp/shared';
import { PostgresMemberRepository } from './infrastructure/PostgresMemberRepository.js';
import { MemberValidator } from './domain/services/MemberValidator.js';
import { CreateMemberUseCase } from './application/NewMemberUseCase.js';
import { GetMembersUseCase } from './application/GetMembersUseCase.js';
import { UpdateMemberUseCase } from './application/UpdateMemberUseCase.js'; 
import { MemberController } from './delivery/MemberController.js';
import { DeleteMemberUseCase } from './application/DeleteMemberUseCase.js';
import { NodeSDK } from '@opentelemetry/sdk-node';

// --- IMPORTS DE PAGOS (PAYMENTS) ---
import { PostgresPaymentRepository } from './infrastructure/PostgresPaymentRepository.js'; 
import { NewPaymentUseCase } from './application/NewPaymentUseCase.js';
import { GetPaymentUseCase } from './application/GetPaymentUseCase.js';
import { PaymentController } from './delivery/PaymentController.js'; 
import { UpdatePaymentUseCase } from './application/UpdatePaymentUseCase.js';


// --- IMPORTS DE DEPORTES (SPORTS) ---
import { PostgresSportRepository } from './infrastructure/PostgresSportRepository.js';
import { SportValidator } from './domain/services/SportValidator.js';
import { CreateSportUseCase } from './application/NewSportUseCase.js';
import { GetSportsUseCase } from './application/GetSportsUseCase.js';
import { UpdateSportUseCase } from './application/UpdateSportUseCase.js';
import { DeleteSportUseCase } from './application/DeleteSportUseCase.js';
import { SportController } from './delivery/SportController.js';

// --- Equipment Loan ---
import { PostgresEquipmentLoanRepository } from './infrastructure/PostgresEquipmentLoanRepository.js';
import { EquipmentLoanValidator } from './domain/services/EquipmentLoanValidator.js';
import { CreateEquipmentLoanUseCase } from './application/CreateEquipmentLoanUseCase.js';
import { UpdateEquipmentLoanUseCase } from './application/UpdateEquipmentLoanUseCase.js';
import { DeleteEquipmentLoanUseCase } from './application/DeleteEquipmentLoanUseCase.js';
import { GetEquipmentLoansUseCase } from './application/GetEquipmentLoanUseCase.js';
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
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
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
    const getSportsUseCase = new GetSportsUseCase(sportRepo);
    const updateSportUseCase = new UpdateSportUseCase(sportRepo, sportValidator);
    const deleteSportUseCase = new DeleteSportUseCase(sportRepo);
    const sportController = new SportController(
        createSportUseCase,
        updateSportUseCase,
        deleteSportUseCase,
        getSportsUseCase,
    );

    // --- INSTANCIACIÓN DE PAGOS ---
    const paymentRepo = new PostgresPaymentRepository();
    const newPaymentUseCase = new NewPaymentUseCase(paymentRepo);
    const getPaymentUseCase = new GetPaymentUseCase(paymentRepo); 
    const updatePaymentUseCase = new UpdatePaymentUseCase(paymentRepo);
    const paymentController = new PaymentController(newPaymentUseCase,getPaymentUseCase,updatePaymentUseCase );

    // --- INSTANCIACIÓN DE EQUIPMENT LOANS ---
    const equipmentLoanRepo = new PostgresEquipmentLoanRepository();
    const equipmentLoanValidator = new EquipmentLoanValidator(memberRepo)
    const createEquipmentLoanUseCase = new CreateEquipmentLoanUseCase(equipmentLoanRepo, memberRepo, equipmentLoanValidator);
    const updateEquipmentLoanUseCase = new UpdateEquipmentLoanUseCase(equipmentLoanRepo, equipmentLoanValidator);
    const deleteEquipmentLoanUseCase = new DeleteEquipmentLoanUseCase(equipmentLoanRepo);
    const getEquipmentLoanUseCase = new GetEquipmentLoansUseCase(equipmentLoanRepo)

    const equipmentLoanController = new EquipmentLoanController(
        createEquipmentLoanUseCase, 
        updateEquipmentLoanUseCase, 
        deleteEquipmentLoanUseCase,
        getEquipmentLoanUseCase
    );

    // --- ENDPOINTS DE MIEMBROS ---
    server.get('/api/v1/socios', memberController.getAll.bind(memberController));
    server.post('/api/v1/socios', memberController.create.bind(memberController));
    server.put('/api/v1/socios/:id', memberController.update.bind(memberController));
    server.delete('/api/v1/socios/:id', memberController.delete.bind(memberController));


    // --- ENDPOINTS DE PAGOS ---    
    server.post('/api/v1/payments', paymentController.create.bind(paymentController));
    server.get('/api/v1/payments/member/:memberId', paymentController.getByMember.bind(paymentController));
    server.patch('/api/v1/payments/:id', paymentController.update.bind(paymentController));

    // --- Equipment Loan Route ---
    server.post('/api/v1/equipment-loans', equipmentLoanController.create.bind(equipmentLoanController));
    server.put('/api/v1/equipment-loans/:id', equipmentLoanController.update.bind(equipmentLoanController))
    server.delete('/api/v1/equipment-loans/:id', equipmentLoanController.delete.bind(equipmentLoanController));
    server.get('/api/v1/equipment-loans', equipmentLoanController.get.bind(equipmentLoanController));

    // --- Sports Route ---
    server.get(SPORT_ENDPOINTS.base, sportController.getAll.bind(sportController));
    server.post(SPORT_ENDPOINTS.base, sportController.create.bind(sportController));
    server.put(SPORT_ENDPOINTS.byId(':id'), sportController.update.bind(sportController));
    server.delete(SPORT_ENDPOINTS.byId(':id'), sportController.delete.bind(sportController));

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