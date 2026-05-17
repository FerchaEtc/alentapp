import { 
    CreateEquipmentLoanRequest, 
    UpdateEquipmentLoanRequest,
    EquipmentLoanStatus 
} from '@alentapp/shared';

// El objeto que se debe cumplir con el puerto de salida del dominio
export interface EquipmentLoanEntity {
    id: string;
    item_name: string;
    status: EquipmentLoanStatus;
    loan_date: string; // ISO string
    due_date: string;  // ISO string
    member_id: string;
}

export interface EquipmentLoanRepository {
    create(loan: CreateEquipmentLoanRequest & { status: EquipmentLoanStatus }): Promise<EquipmentLoanEntity>;
    update(id: string, data: UpdateEquipmentLoanRequest): Promise<EquipmentLoanEntity>;
    findById(id: string): Promise<EquipmentLoanEntity | null>;
    findAll(): Promise<EquipmentLoanEntity[]>;
    delete(id: string): Promise<void>;
}

