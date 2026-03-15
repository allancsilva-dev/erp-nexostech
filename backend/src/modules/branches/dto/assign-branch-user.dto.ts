import { IsUUID } from 'class-validator';

export class AssignBranchUserDto {
  @IsUUID()
  userId!: string;
}
