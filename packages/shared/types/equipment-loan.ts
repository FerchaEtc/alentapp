// ==========================================
// EquipmentLoan
// ==========================================
export type EquipmentLoanStatus = 'Loaned' | 'Returned' | 'Damaged'; 

export interface CreateEquipmentLoanRequest {
  item_name: string;   
  due_date: string;   
  member_id: string;   
}

export interface UpdateEquipmentLoanRequest {
  item_name?: string;               // Opcional
  status?: EquipmentLoanStatus;     // Opcional, pero restringido al enum
  due_date?: string;                // Opcional
  member_id?: string;               // Opcional
}

export interface EquipmentLoanDTO {
  id: string;               
  item_name: string;
  status: EquipmentLoanStatus;
  loan_date: string;        
  due_date: string;         
  member_id: string;        
}