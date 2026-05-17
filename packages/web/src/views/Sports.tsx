import {
  Box,
  Button,
  Center,
  Flex,
  Heading,
  HStack,
  Input,
  Spinner,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { LuRefreshCw } from "react-icons/lu";
import type { CreateSportRequest, SportDTO } from "@alentapp/shared";
import { sportsService } from "../services/sports";

const initialFormData: CreateSportRequest = {
  name: "",
  description: "",
  max_capacity: 1,
  additional_price: 0,
  requires_medical_certificate: false,
};

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

export function SportsView() {
  const [sports, setSports] = useState<SportDTO[]>([]);
  const [formData, setFormData] = useState<CreateSportRequest>(initialFormData);
  const [isLoadingSports, setIsLoadingSports] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSport, setCreatedSport] = useState<SportDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSports = useCallback(async () => {
    setIsLoadingSports(true);
    setError(null);

    try {
      const data = await sportsService.getAll();
      setSports(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar los deportes");
    } finally {
      setIsLoadingSports(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchSports();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchSports]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setCreatedSport(null);
    setError(null);

    try {
      const sport = await sportsService.create(formData);
      setCreatedSport(sport);
      setFormData(initialFormData);
      await fetchSports();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear el deporte");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Stack gap="8">
      <Flex justify="space-between" align="center">
        <Stack gap="1">
          <Heading size="2xl" fontWeight="bold">Administración de Deportes</Heading>
          <Text color="fg.muted" fontSize="md">
            Crea deportes y consulta la oferta cargada del club.
          </Text>
        </Stack>
        <Button variant="outline" onClick={fetchSports} disabled={isLoadingSports}>
          <LuRefreshCw /> Actualizar
        </Button>
      </Flex>

      {error && (
        <Box p="4" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200">
          <Text fontWeight="bold">Error:</Text>
          <Text>{error}</Text>
        </Box>
      )}

      {createdSport && (
        <Box p="4" bg="green.50" color="green.700" borderRadius="md" border="1px solid" borderColor="green.200">
          <Text fontWeight="bold">Deporte creado correctamente</Text>
          <Text>ID: {createdSport.id}</Text>
        </Box>
      )}

      <Box p="6" bg="bg.panel" borderRadius="2xl" borderWidth="1px" borderColor="border.muted" boxShadow="sm">
        <form onSubmit={handleSubmit}>
          <Stack gap="5">
            <Stack gap="2">
              <Text fontWeight="medium">Nombre</Text>
              <Input
                placeholder="Ej. Natación"
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                required
              />
            </Stack>

            <Stack gap="2">
              <Text fontWeight="medium">Descripción</Text>
              <Input
                placeholder="Ej. Clases de natación para adultos"
                value={formData.description}
                onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                required
              />
            </Stack>

            <Stack gap="2">
              <Text fontWeight="medium">Capacidad máxima</Text>
              <Input
                type="number"
                min="1"
                value={formData.max_capacity}
                onChange={(event) => setFormData({ ...formData, max_capacity: Number(event.target.value) })}
                required
              />
            </Stack>

            <Stack gap="2">
              <Text fontWeight="medium">Precio adicional</Text>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.additional_price}
                onChange={(event) => setFormData({ ...formData, additional_price: Number(event.target.value) })}
                required
              />
            </Stack>

            <HStack gap="3">
              <input
                id="requires-medical-certificate"
                type="checkbox"
                checked={formData.requires_medical_certificate}
                onChange={(event) => setFormData({
                  ...formData,
                  requires_medical_certificate: event.target.checked,
                })}
              />
              <label htmlFor="requires-medical-certificate">
                <Text as="span" fontWeight="medium">Requiere certificado médico</Text>
              </label>
            </HStack>

            <Button type="submit" colorPalette="blue" loading={isSubmitting} alignSelf="flex-start">
              Crear Deporte
            </Button>
          </Stack>
        </form>
      </Box>

      <Box
        bg="bg.panel"
        borderRadius="xl"
        boxShadow="sm"
        borderWidth="1px"
        overflow="hidden"
        minH="260px"
        position="relative"
      >
        {isLoadingSports ? (
          <Center h="260px">
            <Stack align="center" gap="4">
              <Spinner size="xl" color="blue.500" />
              <Text color="fg.muted">Cargando deportes...</Text>
            </Stack>
          </Center>
        ) : sports.length === 0 ? (
          <Center h="260px">
            <Stack align="center" gap="4">
              <Text color="fg.muted">No se encontraron deportes.</Text>
              <Button variant="ghost" onClick={fetchSports}>Reintentar</Button>
            </Stack>
          </Center>
        ) : (
          <Table.Root size="md" variant="line" interactive>
            <Table.Header>
              <Table.Row bg="bg.muted/50">
                <Table.ColumnHeader py="4">Nombre</Table.ColumnHeader>
                <Table.ColumnHeader py="4">Descripción</Table.ColumnHeader>
                <Table.ColumnHeader py="4">Capacidad</Table.ColumnHeader>
                <Table.ColumnHeader py="4">Precio adicional</Table.ColumnHeader>
                <Table.ColumnHeader py="4">Certificado médico</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {sports.map((sport) => (
                <Table.Row key={sport.id} _hover={{ bg: "bg.muted/30" }}>
                  <Table.Cell fontWeight="semibold" color="fg.emphasized">
                    {sport.name}
                  </Table.Cell>
                  <Table.Cell color="fg.muted">{sport.description}</Table.Cell>
                  <Table.Cell color="fg.muted">{sport.max_capacity}</Table.Cell>
                  <Table.Cell color="fg.muted">
                    {currencyFormatter.format(sport.additional_price)}
                  </Table.Cell>
                  <Table.Cell>
                    <Box
                      display="inline-block"
                      px="2"
                      py="0.5"
                      borderRadius="md"
                      bg={sport.requires_medical_certificate ? "orange.50" : "green.50"}
                      color={sport.requires_medical_certificate ? "orange.700" : "green.700"}
                      fontSize="xs"
                      fontWeight="bold"
                    >
                      {sport.requires_medical_certificate ? "Requerido" : "No requerido"}
                    </Box>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Box>
    </Stack>
  );
}
