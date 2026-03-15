import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../infrastructure/database/database.module';
import { AuditRepository } from './audit.repository';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [AuditController],
  providers: [AuditRepository, AuditService],
  exports: [AuditService],
})
export class AuditModule {}
