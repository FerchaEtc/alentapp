import { CreateSportRequest, SportDTO, UpdateSportRequest } from '@alentapp/shared';

export interface SportRepository {
    create(sport: CreateSportRequest): Promise<SportDTO>;
    findByName(name: string): Promise<SportDTO | null>;
    findById(id: string): Promise<SportDTO | null>;
    findAll(): Promise<SportDTO[]>;
    update(id: string, data: UpdateSportRequest): Promise<SportDTO>;
    delete(id: string): Promise<void>;
}
