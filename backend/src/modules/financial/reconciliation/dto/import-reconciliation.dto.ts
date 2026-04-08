import {
  IsDateString,
  IsUUID,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isAfterStartDate' })
class IsAfterStartDate implements ValidatorConstraintInterface {
  validate(endDate: string, args: ValidationArguments) {
    const obj = args.object as ImportReconciliationDto;
    return endDate >= obj.startDate;
  }

  defaultMessage() {
    return 'endDate deve ser maior ou igual a startDate';
  }
}

export class ImportReconciliationDto {
  @IsUUID()
  bankAccountId!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  @Validate(IsAfterStartDate)
  endDate!: string;
}
