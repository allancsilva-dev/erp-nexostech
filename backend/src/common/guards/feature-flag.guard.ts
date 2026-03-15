import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_FEATURE_KEY } from '../decorators/require-feature.decorator';
import type { AuthUser } from '../types/auth-user.type';

const PLAN_FEATURES: Record<string, string[]> = {
  STARTER: [],
  PRO: [
    'boletos_enabled',
    'approval_flow_enabled',
    'branches_enabled',
    'collection_rules_enabled',
  ],
  ENTERPRISE: [
    'boletos_enabled',
    'approval_flow_enabled',
    'branches_enabled',
    'collection_rules_enabled',
    'api_access_enabled',
  ],
};

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredFeature = this.reflector.getAllAndOverride<string>(
      REQUIRED_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeature) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const plan = request.user?.plan ?? 'STARTER';
    const enabled = PLAN_FEATURES[plan]?.includes(requiredFeature) ?? false;

    if (!enabled) {
      throw new ForbiddenException({
        error: {
          code: 'FORBIDDEN',
          message: `Feature indisponivel no plano atual: ${requiredFeature}`,
        },
      });
    }

    return true;
  }
}
