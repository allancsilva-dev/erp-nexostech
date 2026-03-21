import { IsArray, IsUUID } from 'class-validator';

export class UpdateUserBranchesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  branchIds!: string[];
}
