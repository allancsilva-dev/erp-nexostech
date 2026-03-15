import { IsArray, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name!: string;

  @IsString()
  @MaxLength(200)
  description!: string;

  @IsArray()
  permissionCodes!: string[];
}
