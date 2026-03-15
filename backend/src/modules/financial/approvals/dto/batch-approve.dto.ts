import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class BatchApproveDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  entryIds!: string[];
}