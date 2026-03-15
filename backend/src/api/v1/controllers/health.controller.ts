import { Controller, Get } from '@nestjs/common';
import { ApiResponse } from '../../../common/dtos/api-response.dto';

@Controller('health')
export class HealthController {
  @Get()
  check(): ApiResponse<{ status: string }> {
    return ApiResponse.ok({ status: 'ok' });
  }
}
