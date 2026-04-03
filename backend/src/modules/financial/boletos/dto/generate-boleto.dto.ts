import { IsString, IsUUID, Matches } from 'class-validator';

export class GenerateBoletoDto {
  @IsUUID('4', { message: 'Lancamento invalido' })
  entryId!: string;

  @Matches(/^\d+\.\d{2}$/, {
    message: 'Valor monetario invalido. Informe um numero positivo com 2 casas decimais',
  })
  amount!: string;

  @IsString({ message: 'Data de vencimento deve ser um texto valido' })
  dueDate!: string;
}
