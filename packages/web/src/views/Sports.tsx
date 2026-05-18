import {
  Box,
  Button,
  Center,
  Flex,
  Heading,
  HStack,
  IconButton,
  Input,
  Spinner,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { LuPlus, LuPencil, LuRefreshCw, LuTrash2 } from "react-icons/lu";
import type { CreateSportRequest, SportDTO, UpdateSportRequest } from "@alentapp/shared";
import { sportsService } from "../services/sports";
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogActionTrigger,
  DialogCloseTrigger,
} from "../components/ui/dialog";
import { Field } from "../components/ui/field";

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSportId, setEditingSportId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateSportRequest>(initialFormData);

  const fetchSports = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await sportsService.getAll();
      setSports(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar los deportes");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchSports();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchSports]);

  const openCreateModal = () => {
    setEditingSportId(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const openEditModal = (sport: SportDTO) => {
    setEditingSportId(sport.id);
    setFormData({
      name: sport.name,
      description: sport.description,
      max_capacity: sport.max_capacity,
      additional_price: sport.additional_price,
      requires_medical_certificate: sport.requires_medical_certificate,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingSportId) {
        const updateData: UpdateSportRequest = {
          description: formData.description,
          max_capacity: formData.max_capacity,
        };
        await sportsService.update(editingSportId, updateData);
      } else {
        await sportsService.create(formData);
      }

      setIsDialogOpen(false);
      await fetchSports();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al guardar el deporte");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSport = async (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el deporte "${name}"? Esta acción no se puede deshacer.`)) {
      try {
        await sportsService.delete(id);
        await fetchSports();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Error al eliminar el deporte");
      }
    }
  };

  return (
    <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
      <Stack gap="8">
        <Flex justify="space-between" align="center">
          <Stack gap="1">
            <Heading size="2xl" fontWeight="bold">Administración de Deportes</Heading>
            <Text color="fg.muted" fontSize="md">
              Crea deportes y consulta la oferta cargada del club.
            </Text>
          </Stack>
          <HStack gap="3">
            <Button variant="outline" onClick={fetchSports} disabled={isLoading}>
              <LuRefreshCw /> Actualizar
            </Button>
            <Button colorPalette="blue" size="md" onClick={openCreateModal}>
              <LuPlus /> Nuevo Deporte
            </Button>
          </HStack>
        </Flex>

        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingSportId ? "Editar Deporte" : "Crear Nuevo Deporte"}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
                <Field
                  label="Nombre"
                  required={!editingSportId}
                  helperText={editingSportId ? "El nombre no se puede modificar." : undefined}
                >
                  <Input
                    placeholder="Ej. Natación"
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    disabled={!!editingSportId}
                    required={!editingSportId}
                  />
                </Field>

                <Field label="Descripción" required>
                  <Input
                    placeholder="Ej. Clases de natación para adultos"
                    value={formData.description}
                    onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                    required
                  />
                </Field>

                <Field label="Capacidad máxima" required>
                  <Input
                    type="number"
                    min="1"
                    value={formData.max_capacity}
                    onChange={(event) => setFormData({ ...formData, max_capacity: Number(event.target.value) })}
                    required
                  />
                </Field>

                <Field
                  label="Precio adicional"
                  required={!editingSportId}
                  helperText={editingSportId ? "El precio adicional no se puede modificar." : undefined}
                >
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.additional_price}
                    onChange={(event) => setFormData({ ...formData, additional_price: Number(event.target.value) })}
                    disabled={!!editingSportId}
                    required={!editingSportId}
                  />
                </Field>

                <HStack gap="3">
                  <input
                    id="requires-medical-certificate"
                    type="checkbox"
                    checked={formData.requires_medical_certificate}
                    onChange={(event) => setFormData({
                      ...formData,
                      requires_medical_certificate: event.target.checked,
                    })}
                    disabled={!!editingSportId}
                  />
                  <label htmlFor="requires-medical-certificate">
                    <Text as="span" fontWeight="medium">Requiere certificado médico</Text>
                  </label>
                </HStack>
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                {editingSportId ? "Guardar Cambios" : "Crear Deporte"}
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

        <Box
          bg="bg.panel"
          borderRadius="xl"
          boxShadow="sm"
          borderWidth="1px"
          overflow="hidden"
          minH="300px"
          position="relative"
        >
          {isLoading ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Spinner size="xl" color="blue.500" />
                <Text color="fg.muted">Cargando deportes...</Text>
              </Stack>
            </Center>
          ) : sports.length === 0 ? (
            <Center h="300px">
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
                  <Table.ColumnHeader py="4" textAlign="end">Acciones</Table.ColumnHeader>
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
                    <Table.Cell textAlign="end">
                      <HStack gap="2" justify="flex-end">
                        <IconButton
                          variant="ghost"
                          size="sm"
                          aria-label="Editar deporte"
                          onClick={() => openEditModal(sport)}
                        >
                          <LuPencil />
                        </IconButton>
                        <IconButton
                          variant="ghost"
                          size="sm"
                          colorPalette="red"
                          aria-label="Eliminar deporte"
                          onClick={() => handleDeleteSport(sport.id, sport.name)}
                        >
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
