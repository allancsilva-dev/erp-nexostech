import { Module } from '@nestjs/common';
import { BoletosGatewayClient } from './boletos.gateway-client';
import { BoletosService } from './boletos.service';

@Module({
  providers: [BoletosGatewayClient, BoletosService],
  exports: [BoletosService],
})
export class BoletosModule {}
