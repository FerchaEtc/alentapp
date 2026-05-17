import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { SportRepository } from '../domain/SportRepository.js';
import { CreateSportRequest, SportDTO, UpdateSportRequest } from '@alentapp/shared';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

type DBSport = {
    id: string;
    name: string;
    description: string;
    max_capacity: number;
    additional_price: unknown;
    requires_medical_certificate: boolean;
};

export class PostgresSportRepository implements SportRepository {
    async create(data: CreateSportRequest): Promise<SportDTO> {
        try {
            const sport = await prisma.sport.create({
                data: {
                    name: data.name,
                    description: data.description,
                    max_capacity: data.max_capacity,
                    additional_price: data.additional_price,
                    requires_medical_certificate: data.requires_medical_certificate,
                },
            });

            return this.mapToDTO(sport);
        } catch (error: any) {
            if (error.code === 'P2002') {
                throw new Error('Ya existe un deporte con ese nombre');
            }
            throw error;
        }
    }

    async findByName(name: string): Promise<SportDTO | null> {
        const sport = await prisma.sport.findUnique({
            where: { name },
        });

        return sport ? this.mapToDTO(sport) : null;
    }

    async findById(id: string): Promise<SportDTO | null> {
        const sport = await prisma.sport.findUnique({
            where: { id },
        });

        return sport ? this.mapToDTO(sport) : null;
    }

    async update(id: string, data: UpdateSportRequest): Promise<SportDTO> {
        try {
            const sport = await prisma.sport.update({
                where: { id },
                data: {
                    ...(data.description !== undefined && { description: data.description }),
                    ...(data.max_capacity !== undefined && { max_capacity: data.max_capacity }),
                },
            });

            return this.mapToDTO(sport);
        } catch (error: any) {
            if (error.code === 'P2025') {
                throw new Error('El deporte no existe');
            }
            throw error;
        }
    }

    async delete(id: string): Promise<void> {
        try {
            await prisma.sport.delete({
                where: { id },
            });
        } catch (error: any) {
            if (error.code === 'P2025') {
                throw new Error('El deporte no existe');
            }
            throw error;
        }
    }

    private mapToDTO(sport: DBSport): SportDTO {
        return {
            id: sport.id,
            name: sport.name,
            description: sport.description,
            max_capacity: sport.max_capacity,
            additional_price: this.decimalToNumber(sport.additional_price),
            requires_medical_certificate: sport.requires_medical_certificate,
        };
    }

    private decimalToNumber(value: unknown): number {
        if (typeof value === 'number') {
            return value;
        }
        if (typeof value === 'string') {
            return Number(value);
        }
        if (value && typeof (value as { toNumber?: unknown }).toNumber === 'function') {
            return (value as { toNumber: () => number }).toNumber();
        }
        return Number(value);
    }
}
