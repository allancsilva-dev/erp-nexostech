import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../infrastructure/database/database.module';
import { StorageModule } from '../../../infrastructure/storage/storage.module';
import { BoletosGatewayClient } from './boletos.gateway-client';
import { BoletosRepository } from './boletos.repository';
import { BoletosService } from './boletos.service';

@Module({
  imports: [DatabaseModule, StorageModule],
  providers: [BoletosGatewayClient, BoletosRepository, BoletosService],
  exports: [BoletosService],
})
export class BoletosModule {}
