import { useState } from "react";
import { 
  Box, 
  Heading, 
  Text, 
  VStack, 
  Input, 
  Button, 
  Field, 
  SimpleGrid,
  Alert,
  Table,
  Separator,
  Badge,
  HStack
} from "@chakra-ui/react";
import { LuCheck, LuX, LuReceipt, LuSearch } from "react-icons/lu";
import { membersService } from "../services/members";
import { type Payment } from "@alentapp/shared";
import { getPaymentsByMember, updatePaymentStatus } from "../services/Payment";

export function PaymentsView() {
  const [searchDni, setSearchDni] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [history, setHistory] = useState<Payment[]>([]);
  const [selectedMemberName, setSelectedMemberName] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [memberDni, setMemberDni] = useState("");
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearchPayments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchDni.trim()) return;

    setSearchLoading(true);
    setSearchError(null);
    setHasSearched(true);

    try {
      const socios = await membersService.getAll();
      const socioEncontrado = socios.find((s: any) => String(s.dni).trim() === searchDni.trim());

      if (!socioEncontrado) {
        setHistory([]);
        setSelectedMemberName(null);
        setSearchError(`No se encontró ningún socio con el DNI: ${searchDni}`);
        return;
      }

      setSelectedMemberName(socioEncontrado.name);
      const pagos = await getPaymentsByMember(socioEncontrado.id);
      setHistory(pagos);
    } catch (err: any) {
      setSearchError(err.message || "Error al conectar con el servidor.");
    } finally {
      setSearchLoading(false);
    }
  };

  const refreshHistory = async (memberId: string) => {
    try {
      const pagos = await getPaymentsByMember(memberId);
      setHistory(pagos);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberDni.trim()) return;

    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const socios = await membersService.getAll();
      const socioEncontrado = socios.find((s: any) => String(s.dni).trim() === memberDni.trim());

      if (!socioEncontrado) {
        throw new Error(`No se encontró ningún miembro con el DNI: ${memberDni}`);
      }

      const paymentData: any = {
        memberId: socioEncontrado.id,
        amount: Number(amount),
        month: Number(month),
        year: Number(year),
        dueDate: dueDate
      };

      const paymentResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      });

      const paymentResult = await paymentResponse.json();

      if (!paymentResponse.ok) {
        throw new Error(paymentResult.error || "Error al procesar el pago en el servidor.");
      }

      setSuccessMessage(`¡Pago creado con éxito para el socio ${socioEncontrado.name}!`);
      
      if (searchDni.trim() === memberDni.trim()) {
        await refreshHistory(socioEncontrado.id);
      }

      setMemberDni("");
      setAmount("");
      setDueDate("");
      setMonth(new Date().getMonth() + 1); 
      setYear(new Date().getFullYear());

    } catch (error: any) {
      setErrorMessage(error.message || "No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (paymentId: string, currentStatus: string) => {
    try {
      let nextStatus: 'Pending' | 'Paid' | 'Canceled' = 'Pending';

      // Definimos la rotación: Pendiente -> Pagado -> Cancelado -> Pendiente
      if (currentStatus === "Pending") {
        nextStatus = "Paid";
      } else if (currentStatus === "Paid") {
        nextStatus = "Canceled";
      } else if (currentStatus === "Canceled") {
        nextStatus = "Pending";
      }
      
      await updatePaymentStatus(paymentId, nextStatus);
      
      const socios = await membersService.getAll();
      const socioEncontrado = socios.find((s: any) => String(s.dni).trim() === searchDni.trim());
      if (socioEncontrado) {
        await refreshHistory(socioEncontrado.id);
      }
    } catch (err: any) {
      alert(err.message || "No se pudo actualizar el estado del cobro.");
    }
  };

  return (
    <Box p="8" maxW="3xl" mx="auto" bg="bg.panel" borderRadius="3xl" borderWidth="1px" borderColor="border.subtle" mt="6">
      
      <VStack gap="2" align="flex-start" mb="8">
        <Heading size="3xl" fontWeight="extrabold" color="blue.600">
          Gestión de Pagos
        </Heading>
        <Text fontSize="md" color="fg.muted">
          Buscá el historial de deudas de un socio o registrá un nuevo comprobante de pago.
        </Text>
      </VStack>

      <Box p="5" bg="gray.50" borderRadius="2xl" borderWidth="1px" borderColor="gray.100" mb="8">
        <form onSubmit={handleSearchPayments}>
          <VStack align="stretch" gap="3">
            <Field.Root required>
              <Field.Label fontWeight="bold" color="gray.700">Consultar Historial por DNI</Field.Label>
              <HStack width="100%">
                <Input 
                  placeholder="Ingresá DNI para buscar pagos..." 
                  value={searchDni}
                  maxLength={8}
                  onChange={(e) => {
                    const soloNumeros = e.target.value.replace(/[^0-9]/g, '');
                    setSearchDni(soloNumeros);
                  }}
                  bg="white"
                  borderRadius="xl"
                  size="lg"
                />
                <Button 
                  type="submit" 
                  colorScheme="blue" 
                  size="lg" 
                  borderRadius="xl"
                  fontWeight="bold"
                  loading={searchLoading}
                >
                  <LuSearch /> Buscar Pago
                </Button>
              </HStack>
            </Field.Root>
          </VStack>
        </form>

        {searchError && (
          <Text color="red.600" fontSize="sm" mt="3" fontWeight="medium" display="flex" alignItems="center" gap="1">
            <LuX /> {searchError}
          </Text>
        )}
      </Box>

      {hasSearched && selectedMemberName && (
        <Box mb="8" p="4" borderWidth="1px" borderColor="blue.100" bg="blue.50/20" borderRadius="2xl">
          <VStack align="flex-start" mb="4" gap="1">
            <Heading size="md" color="gray.700" display="flex" alignItems="center" gap="2">
              <LuReceipt /> Historial de Cuotas: {selectedMemberName}
            </Heading>
          </VStack>

          {history.length === 0 ? (
            <Text p="4" bg="white" borderRadius="xl" fontSize="sm" color="gray.500" fontStyle="italic" borderWidth="1px" borderColor="gray.100">
              Este socio no registra ningún pago previo en el sistema.
            </Text>
          ) : (
            <Box borderWidth="1px" borderColor="border.subtle" borderRadius="xl" overflow="hidden" bg="white">
              <Table.Root variant="line" size="sm">
                <Table.Header bg="gray.50">
                  <Table.Row>
                    <Table.ColumnHeader fontWeight="bold">Período</Table.ColumnHeader>
                    <Table.ColumnHeader fontWeight="bold">Monto</Table.ColumnHeader>
                    <Table.ColumnHeader fontWeight="bold">Vencimiento</Table.ColumnHeader>
                    <Table.ColumnHeader fontWeight="bold" textAlign="right">Estado</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {history.map((p: any) => (
                    <Table.Row key={p.id}>
                      <Table.Cell fontWeight="medium">
                        {String(p.month).padStart(2, "0")}/{p.year}
                      </Table.Cell>
                      <Table.Cell>${p.amount}</Table.Cell>
                      <Table.Cell>
                        {p.dueDate ? new Date(p.dueDate).toLocaleDateString("es-AR", { timeZone: "UTC" }) : "-"}
                      </Table.Cell>
                      <Table.Cell textAlign="right">
                        
                        <Badge 
                          as="button"
                          onClick={() => handleToggleStatus(p.id, p.status)}
                          colorScheme={p.status === "Paid" ? "green" : "orange"} 
                          variant="solid"
                          borderRadius="md"
                          px="3"
                          py="1"
                          cursor="pointer"
                          fontWeight="bold"
                          _hover={{
                            transform: "scale(1.05)",
                            opacity: 0.9
                          }}
                          _active={{
                            transform: "scale(0.95)"
                          }}
                        >
                          {p.status === "Paid" ? "Pagado" : "Pendiente"}
                        </Badge>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          )}
        </Box>
      )}

      <Separator mb="8" />

      <Heading size="md" mb="4" color="gray.700">Registrar Nuevo Cobro</Heading>

      <VStack gap="4" width="100%" mb="6" align="stretch">
        {successMessage && (
          <Alert.Root status="success" borderRadius="xl" p="4">
            <Alert.Indicator color="green.600"><LuCheck size="20" /></Alert.Indicator>
            <Alert.Content>
              <Alert.Title fontWeight="bold" color="green.800">Operación Exitosa</Alert.Title>
              <Alert.Description color="green.700">{successMessage}</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        {errorMessage && (
          <Alert.Root status="error" borderRadius="xl" p="4">
            <Alert.Indicator color="red.600"><LuX size="20" /></Alert.Indicator>
            <Alert.Content>
              <Alert.Title fontWeight="bold" color="red.800">Error en la Operación</Alert.Title>
              <Alert.Description color="red.700">{errorMessage}</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}
      </VStack>

      <form onSubmit={handleSubmit}>
        <VStack gap="6" align="stretch">
          
          <Field.Root required>
            <Field.Label fontWeight="semibold">DNI del Socio para el Pago</Field.Label>
            <Input 
              placeholder="Ej: 37824282" 
              value={memberDni}
              maxLength={8}
              onChange={(e) => {
                const soloNumeros = e.target.value.replace(/[^0-9]/g, '');
                setMemberDni(soloNumeros);
              }}
              size="lg"
              borderRadius="xl"
            />
          </Field.Root>

          <Field.Root required>
            <Field.Label fontWeight="semibold">Monto a Cobrar ($)</Field.Label>
            <Input 
              type="number"
              placeholder="Ej: 2500" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              size="lg"
              borderRadius="xl"
            />
          </Field.Root>

          <SimpleGrid columns={2} gap="4">
            <Field.Root required>
              <Field.Label fontWeight="semibold">Mes Correspondiente</Field.Label>
              <Input 
                type="number"
                min={1}
                max={12}
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                size="lg"
                borderRadius="xl"
              />
            </Field.Root>

            <Field.Root required>
              <Field.Label fontWeight="semibold">Año</Field.Label>
              <Input 
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                size="lg"
                borderRadius="xl"
              />
            </Field.Root>
          </SimpleGrid>

          <Field.Root required>
            <Field.Label fontWeight="semibold">Fecha de Vencimiento</Field.Label>
            <Input 
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              size="lg"
              borderRadius="xl"
            />
          </Field.Root>

          <Button 
            type="submit" 
            colorScheme="blue" 
            size="lg" 
            loading={loading}
            borderRadius="xl"
            mt="4"
            fontWeight="bold"
          >
            Crear Pago
          </Button>
        </VStack>
      </form>
    </Box>
  );
}