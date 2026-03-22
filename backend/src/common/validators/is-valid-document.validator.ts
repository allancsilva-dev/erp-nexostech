import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isValidCnpj, isValidCpf } from '../utils/document-validator';

@ValidatorConstraint({ name: 'isValidDocument', async: false })
export class IsValidDocumentConstraint implements ValidatorConstraintInterface {
  validate(value?: string): boolean {
    if (!value) return true;
    const digits = value.replace(/\D/g, '');
    if (digits.length === 11) return isValidCpf(value);
    if (digits.length === 14) return isValidCnpj(value);
    return false;
  }

  defaultMessage(): string {
    return 'CPF ou CNPJ invalido (digito verificador incorreto)';
  }
}

export function IsValidDocument(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidDocumentConstraint,
    });
  };
}
