import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SportValidator } from './SportValidator.js';
import { SportRepository } from '../SportRepository.js';

describe('SportValidator', () => {
    const mockSportRepo = {
        findByName: vi.fn(),
    } as unknown as SportRepository;

    const validator = new SportValidator(mockSportRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('validateMaxCapacity', () => {
        it('debe pasar correctamente si la capacidad máxima es mayor a cero', () => {
            expect(() => validator.validateMaxCapacity(1)).not.toThrow();
            expect(() => validator.validateMaxCapacity(10)).not.toThrow();
        });

        it('debe lanzar un error si la capacidad máxima es menor o igual a cero', () => {
            expect(() => validator.validateMaxCapacity(0)).toThrow('La capacidad debe ser mayor a cero');
            expect(() => validator.validateMaxCapacity(-1)).toThrow('La capacidad debe ser mayor a cero');
        });
    });

    describe('validateNameCannotBeModified', () => {
        it('debe pasar correctamente si no se intenta modificar el nombre', () => {
            expect(() => validator.validateNameCannotBeModified({description: 'nueva descripción', max_capacity: 20})).not.toThrow();
            expect(() => validator.validateNameCannotBeModified({})).not.toThrow();
        });

        it('debe lanzar error si se intenta modificar el nombre', () => {
            expect(() => validator.validateNameCannotBeModified({name: 'Tenis'})).toThrow('El nombre no puede ser modificado');
        });
    });
});


