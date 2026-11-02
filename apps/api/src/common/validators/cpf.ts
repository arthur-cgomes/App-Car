import { isValidCpf, parseCpf } from '@monitoring-car/shared';
import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

export const toCpf = ({ value }: { value: unknown }) => (typeof value === 'string' ? (parseCpf(value) ?? value) : value);

export const toCpfOrNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? (value.trim() ? (parseCpf(value) ?? value) : null) : value;

@ValidatorConstraint({ name: 'cpf' })
export class CpfConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return typeof value === 'string' && /^\d{11}$/.test(value) && isValidCpf(value);
  }

  defaultMessage() {
    return 'CPF inválido.';
  }
}

@ValidatorConstraint({ name: 'cpfOrEmpty' })
export class CpfOrEmptyConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return value === null || new CpfConstraint().validate(value);
  }

  defaultMessage() {
    return 'CPF inválido.';
  }
}
