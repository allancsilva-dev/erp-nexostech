import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Observable } from 'rxjs';
import { AuthUser } from '../types/auth-user.type';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly clsService: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const tenantId = request.user?.tenantId;

    if (tenantId) {
      this.clsService.set('tenantId', tenantId);
    }

    return next.handle();
  }
}
