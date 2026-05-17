import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { EquipmentLoanRepository, EquipmentLoanEntity } from '../domain/EquipmentLoanRepository.js';
import { CreateEquipmentLoanRequest, UpdateEquipmentLoanRequest, EquipmentLoanStatus } from '@alentapp/shared';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

// El objeto que se debe cumplir con el puerto de entrada del dominio
type DBEquipmentLoan = {
    id: string;
    item_name: string;
    status: EquipmentLoanStatus;
    loan_date: Date;
    due_date: Date;
    member_id: string;
};

export class PostgresEquipmentLoanRepository implements EquipmentLoanRepository {
    
    async create(data: CreateEquipmentLoanRequest & { status: EquipmentLoanStatus }): Promise<EquipmentLoanEntity> {
        const loan = await prisma.equipmentLoan.create({
            data: {
                item_name: data.item_name,
                due_date: new Date(data.due_date),
                member_id: data.member_id,
                status: data.status,
                // loan_date se genera solo en prisma
            },
        });

        return this.mapToDTO(loan as DBEquipmentLoan);
    }

    async findById(id: string): Promise<EquipmentLoanEntity | null> {
        const loan = await prisma.equipmentLoan.findUnique({
            where: { id },
        });

        if (!loan) return null;
        return this.mapToDTO(loan as DBEquipmentLoan);
    }

    async update(id: string, data: UpdateEquipmentLoanRequest): Promise<EquipmentLoanEntity> {
        const updatedLoan = await prisma.equipmentLoan.update({
            where: { id },
            data: {
                // Solo mapeamos si el valor existe en el objeto data
                ...(data.item_name && { item_name: data.item_name }),
                ...(data.status && { status: data.status }),
                ...(data.due_date && { due_date: new Date(data.due_date) }),
                ...(data.member_id && { member_id: data.member_id }),
            },
        });

        return this.mapToDTO(updatedLoan as DBEquipmentLoan);
    }

    async delete(id: string): Promise<void> {
        await prisma.equipmentLoan.delete({
            where: { id },
        });
    }

    // Método privado para mapear el objeto de la base de datos al objeto del dominio
    private mapToDTO(loan: DBEquipmentLoan) {
        return {
            id: loan.id,
            item_name: loan.item_name,
            status: loan.status,
            loan_date: loan.loan_date.toISOString(),
            due_date: loan.due_date.toISOString().split('T')[0], // Formato YYYY-MM-DD
            member_id: loan.member_id,
        };
    }
}