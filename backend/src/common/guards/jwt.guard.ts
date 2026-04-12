import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthUser } from '../types/auth-user.type';

function toText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value;
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value instanceof Date
  ) {
    return String(value);
  }

  return fallback;
}

@Injectable()
export class JwtGuard implements CanActivate {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly audience: string;
  private readonly issuer: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {
    const jwksUrl = this.configService.getOrThrow<string>('AUTH_JWKS_URL');
    this.audience = this.configService.getOrThrow<string>('AUTH_JWT_AUDIENCE');
    this.issuer = this.configService.getOrThrow<string>('AUTH_JWT_ISSUER');
    this.jwks = createRemoteJWKSet(new URL(jwksUrl), {
      cacheMaxAge: 300_000,
      cooldownDuration: 30_000,
      timeoutDuration: 5_000,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{
      url?: string;
      headers: Record<string, string | undefined>;
      cookies?: Record<string, string | undefined>;
      user?: AuthUser;
    }>();

    console.log('[JWT DEBUG] path:', request.url);
    console.log(
      '[JWT DEBUG] authorization:',
      request.headers.authorization
        ? `Bearer ${request.headers.authorization.substring(7, 20)}...`
        : 'ABSENT',
    );
    console.log(
      '[JWT DEBUG] cookie erp_access_token:',
      request.cookies?.erp_access_token
        ? `${request.cookies.erp_access_token.substring(0, 20)}...`
        : 'ABSENT',
    );

    const token = this.extractToken(request);
    console.log(
      '[JWT DEBUG] extracted token:',
      token ? `${token.substring(0, 20)}... (len=${token.length})` : 'NULL',
    );
    if (!token) {
      throw new UnauthorizedException({
        error: {
          code: 'AUTH_UNAUTHORIZED',
          message: 'JWT ausente ou inválido',
        },
      });
    }

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        audience: this.audience,
        issuer: this.issuer,
        algorithms: ['RS256'],
      });

      request.user = this.mapPayload(payload);
      return true;
    } catch (error) {
      console.log('[JWT DEBUG] jwtVerify FAILED:', (error as Error).message);
      throw new UnauthorizedException({
        error: {
          code: 'AUTH_UNAUTHORIZED',
          message: 'Token inválido ou expirado',
        },
      });
    }
  }

  private extractToken(request: {
    headers: Record<string, string | undefined>;
    cookies?: Record<string, string | undefined>;
  }): string | undefined {
    const bearer = request.headers.authorization;
    if (bearer?.startsWith('Bearer ')) {
      return bearer.replace('Bearer ', '');
    }

    return request.cookies?.erp_access_token;
  }

  private mapPayload(payload: JWTPayload): AuthUser {
    const roles = Array.isArray(payload.roles)
      ? payload.roles
          .map((role) => toText(role))
          .filter((role) => role.length > 0)
      : [];

    const aud = Array.isArray(payload.aud)
      ? toText(payload.aud[0])
      : toText(payload.aud);

    const email = toText(payload.email);

    return {
      sub: toText(payload.sub),
      tenantId: toText(payload.tenantId),
      roles,
      plan: toText(payload.plan, 'STARTER'),
      aud,
      email: email.length > 0 ? email : undefined,
    };
  }
}
