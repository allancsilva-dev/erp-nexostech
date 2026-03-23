import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../infrastructure/database/database.module';
import { StorageModule } from '../../../infrastructure/storage/storage.module';
import { AttachmentsService } from './attachments.service';

@Module({
  imports: [DatabaseModule, StorageModule],
  providers: [AttachmentsService],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
