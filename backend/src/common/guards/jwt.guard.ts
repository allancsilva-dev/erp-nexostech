import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { AuthUser } from '../types/auth-user.type';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      cookies?: Record<string, string | undefined>;
      user?: AuthUser;
    }>();

    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException({
        error: { code: 'UNAUTHORIZED', message: 'JWT ausente ou inválido' },
      });
    }

    const jwksUrl = this.configService.getOrThrow<string>('AUTH_JWKS_URL');
    const audience =
      this.configService.get<string>('AUTH_JWT_AUDIENCE') ??
      this.configService.getOrThrow<string>('AUTH_AUDIENCE');
    const issuer =
      this.configService.get<string>('AUTH_JWT_ISSUER') ??
      this.configService.getOrThrow<string>('AUTH_ISSUER');

    const jwks = createRemoteJWKSet(new URL(jwksUrl), {
      cacheMaxAge: 300_000,
      cooldownDuration: 30_000,
    });

    try {
      const { payload } = await jwtVerify(token, jwks, {
        audience,
        issuer,
        algorithms: ['RS256'],
      });

      request.user = this.mapPayload(payload);
      return true;
    } catch {
      throw new UnauthorizedException({
        error: { code: 'UNAUTHORIZED', message: 'Token inválido ou expirado' },
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

    return request.cookies?.access_token;
  }

  private mapPayload(payload: JWTPayload): AuthUser {
    return {
      sub: String(payload.sub ?? ''),
      tenantId: String(payload.tenantId ?? ''),
      roles: Array.isArray(payload.roles)
        ? payload.roles.map((role) => String(role))
        : [],
      plan: String(payload.plan ?? 'STARTER'),
      aud: Array.isArray(payload.aud)
        ? payload.aud[0]
        : String(payload.aud ?? ''),
      email: payload.email ? String(payload.email) : undefined,
    };
  }
}
