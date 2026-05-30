import { 
    Table, 
    Button, 
    Heading, 
    HStack, 
    IconButton, 
    Stack, 
    Text, 
    Box,
    Flex,
    Spinner,
    Center,
    Input
  } from "@chakra-ui/react";
  import { LuPlus, LuPencil, LuTrash2, LuRefreshCw } from "react-icons/lu";
  import { useEffect, useState } from "react";
  import { equipmentLoansService } from "../services/equipmentLoans";
  import { membersService } from "../services/members"; // Importado para el selector
  import type { 
    EquipmentLoanDTO, 
    CreateEquipmentLoanRequest, 
    UpdateEquipmentLoanRequest, 
    EquipmentLoanStatus,
    MemberDTO
  } from "@alentapp/shared";
  import { 
    DialogRoot, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogBody, 
    DialogFooter, 
    DialogActionTrigger,
    DialogCloseTrigger
  } from "../components/ui/dialog";
  import { Field } from "../components/ui/field";
  import { 
    SelectRoot, 
    SelectTrigger, 
    SelectValueText, 
    SelectContent, 
    SelectItem, 
    createListCollection 
  } from "../components/ui/select";
  
  const statusCollection = createListCollection({
    items: [
      { label: "Prestado", value: "Loaned" },
      { label: "Devuelto", value: "Returned" },
      { label: "Dañado", value: "Damaged" },
    ],
  });
  
  export function EquipmentLoansView() {
    const [loans, setLoans] = useState<EquipmentLoanDTO[]>([]);
    const [members, setMembers] = useState<MemberDTO[]>([]); // Estado para los socios
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
  
    const [formData, setFormData] = useState<CreateEquipmentLoanRequest & { status?: EquipmentLoanStatus }>({
      item_name: "",
      due_date: "",
      member_id: "",
      status: "Loaned",
    });
  
    // Colección dinámica de socios para el Select
    const membersCollection = createListCollection({
      items: members.map(m => ({
        label: `${m.name} (${m.dni})`,
        value: m.id
      })),
    });
  
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Cargamos préstamos y socios en paralelo
        const [loansData, membersData] = await Promise.all([
          equipmentLoansService.getAll(),
          membersService.getAll()
        ]);
        setLoans(loansData);
        setMembers(membersData);
      } catch (err: any) {
        setError(err.message || "Error al cargar los datos");
      } finally {
        setIsLoading(false);
      }
    };
  
    useEffect(() => {
      fetchData();
    }, []);
  
    const openCreateModal = () => {
      setEditingLoanId(null);
      setFormData({ item_name: "", due_date: "", member_id: "", status: "Loaned" });
      setIsDialogOpen(true);
    };
  
    const openEditModal = (loan: EquipmentLoanDTO) => {
      setEditingLoanId(loan.id);
      setFormData({
        item_name: loan.item_name,
        due_date: loan.due_date,
        member_id: loan.member_id,
        status: loan.status,
      });
      setIsDialogOpen(true);
    };
  
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.member_id) {
          alert("Por favor seleccione un socio");
          return;
      }
      setIsSubmitting(true);
      try {
        if (editingLoanId) {
          await equipmentLoansService.update(editingLoanId, formData as UpdateEquipmentLoanRequest);
        } else {
          await equipmentLoansService.create(formData as CreateEquipmentLoanRequest);
        }
        setIsDialogOpen(false);
        fetchData(); 
      } catch (err: any) {
        alert(err.message || "Error al guardar el préstamo");
      } finally {
        setIsSubmitting(false);
      }
    };
  
    const handleDeleteLoan = async (id: string, itemName: string) => {
      if (window.confirm(`¿Estás seguro de que deseas eliminar el préstamo de "${itemName}"? Esta acción no se puede deshacer.`)) {
        try {
          await equipmentLoansService.delete(id);
          fetchData(); 
        } catch (err: any) {
          alert(err.message || "Error al eliminar el préstamo");
        }
      }
    };
  
    // Función auxiliar para obtener el nombre del socio en la tabla
    const getMemberName = (id: string) => {
      const member = members.find(m => m.id === id);
      return member ? member.name : "Socio no encontrado";
    };
  
    return (
      <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
        <Stack gap="8">
          <Flex justify="space-between" align="center">
            <Stack gap="1">
              <Heading size="2xl" fontWeight="bold">Gestión de Préstamos</Heading>
              <Text color="fg.muted" fontSize="md">
                Control de inventario y asignación de materiales a socios.
              </Text>
            </Stack>
            <HStack gap="3">
              <Button variant="outline" onClick={fetchData} disabled={isLoading}>
                <LuRefreshCw /> Actualizar
              </Button>
              <Button colorPalette="blue" size="md" onClick={openCreateModal}>
                <LuPlus /> Nuevo Préstamo
              </Button>
            </HStack>
          </Flex>
  
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingLoanId ? "Editar Préstamo" : "Registrar Nuevo Préstamo"}</DialogTitle>
              </DialogHeader>
              <DialogBody>
                <Stack gap="4">
                  <Field label="Nombre del Ítem" required>
                    <Input 
                      placeholder="Ej. Pelota de Rugby" 
                      value={formData.item_name}
                      onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                      required
                    />
                  </Field>
  
                  <Field label="Socio Responsable" required>
                    <SelectRoot 
                      collection={membersCollection} 
                      value={[formData.member_id]}
                      onValueChange={(e) => setFormData({ ...formData, member_id: e.value[0] })}
                    >
                      <SelectTrigger>
                        <SelectValueText placeholder="Seleccione un socio" />
                      </SelectTrigger>
                      <SelectContent>
                        {membersCollection.items.map((m) => (
                          <SelectItem item={m} key={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </SelectRoot>
                  </Field>
  
                  <Field label="Fecha de Devolución" required>
                    <Input 
                      type="date" 
                      value={formData.due_date}
                      min={new Date().toISOString().split('T')[0]} // Esto deshabilita visualmente los días pasados
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      required
                    />
                  </Field>
                  
                  {editingLoanId && (
                    <Field label="Estado" required>
                      <SelectRoot 
                        collection={statusCollection} 
                        value={[formData.status!]}
                        onValueChange={(e) => setFormData({ ...formData, status: e.value[0] as EquipmentLoanStatus })}
                      >
                        <SelectTrigger>
                          <SelectValueText placeholder="Seleccione un estado" />
                        </SelectTrigger>
                        <SelectContent>
                          {statusCollection.items.map((item) => (
                            <SelectItem item={item} key={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </SelectRoot>
                    </Field>
                  )}
                </Stack>
              </DialogBody>
              <DialogFooter>
                <DialogActionTrigger asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogActionTrigger>
                <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                  {editingLoanId ? "Guardar Cambios" : "Crear Préstamo"}
                </Button>
              </DialogFooter>
              <DialogCloseTrigger />
            </form>
          </DialogContent>
  
          {error && (
            <Box p="4" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200">
              <Text fontWeight="bold">Error:</Text>
              <Text>{error}</Text>
            </Box>
          )}
  
          <Box bg="bg.panel" borderRadius="xl" boxShadow="sm" borderWidth="1px" overflow="hidden" minH="300px">
            {isLoading ? (
              <Center h="300px">
                <Stack align="center" gap="4">
                  <Spinner size="xl" color="blue.500" />
                  <Text color="fg.muted">Cargando...</Text>
                </Stack>
              </Center>
            ) : loans.length === 0 ? (
              <Center h="300px">
                <Stack align="center" gap="4">
                  <Text color="fg.muted">No hay registros.</Text>
                  <Button variant="ghost" onClick={fetchData}>Reintentar</Button>
                </Stack>
              </Center>
            ) : (
              <Table.Root size="md" variant="line" interactive>
                <Table.Header>
                  <Table.Row bg="bg.muted/50">
                    <Table.ColumnHeader py="4">Ítem</Table.ColumnHeader>
                    <Table.ColumnHeader py="4">Socio</Table.ColumnHeader>
                    <Table.ColumnHeader py="4">Fecha Préstamo</Table.ColumnHeader>
                    <Table.ColumnHeader py="4">Devolución</Table.ColumnHeader>
                    <Table.ColumnHeader py="4">Estado</Table.ColumnHeader>
                    <Table.ColumnHeader py="4" textAlign="end">Acciones</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {loans.map((loan) => (
                    <Table.Row key={loan.id} _hover={{ bg: "bg.muted/30" }}>
                      <Table.Cell fontWeight="semibold" color="fg.emphasized">{loan.item_name}</Table.Cell>
                      <Table.Cell color="fg.muted">
                        {getMemberName(loan.member_id)}
                      </Table.Cell>
                      <Table.Cell color="fg.muted">{new Date(loan.loan_date).toLocaleDateString()}</Table.Cell>
                      <Table.Cell color="fg.emphasized">{loan.due_date}</Table.Cell>
                      <Table.Cell>
                        <Box 
                          display="inline-block" px="2" py="0.5" borderRadius="md" fontSize="xs" fontWeight="bold"
                          bg={loan.status === 'Returned' ? 'green.50' : loan.status === 'Damaged' ? 'red.50' : 'blue.50'} 
                          color={loan.status === 'Returned' ? 'green.700' : loan.status === 'Damaged' ? 'red.700' : 'blue.700'}
                        >
                          {loan.status === 'Loaned' ? 'Prestado' : loan.status === 'Returned' ? 'Devuelto' : 'Dañado'}
                        </Box>
                      </Table.Cell>
                      <Table.Cell textAlign="end">
                        <HStack gap="2" justify="flex-end">
                          <IconButton variant="ghost" size="sm" onClick={() => openEditModal(loan)}>
                            <LuPencil />
                          </IconButton>
                          <IconButton variant="ghost" size="sm" colorPalette="red" onClick={() => handleDeleteLoan(loan.id, loan.item_name)}>
                            <LuTrash2 />
                          </IconButton>
                        </HStack>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            )}
          </Box>
        </Stack>
      </DialogRoot>
    );
  }