import { Module } from '@nestjs/common';
import { BoletosGatewayClient } from './boletos.gateway-client';
import { BoletosRepository } from './boletos.repository';
import { BoletosService } from './boletos.service';

@Module({
  providers: [BoletosGatewayClient, BoletosRepository, BoletosService],
  exports: [BoletosService],
})
export class BoletosModule {}
