import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '../../common/exceptions/business.exception';

type AuthUserRecord = {
  id: string;
  email: string;
};

@Injectable()
export class AuthApiService {
  constructor(private readonly configService: ConfigService) {}

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const authUrl = this.configService.getOrThrow<string>('AUTH_URL');
    const secret = this.configService.getOrThrow<string>('AUTH_INTERNAL_SECRET');

    const response = await fetch(
      `${authUrl}/users?email=${encodeURIComponent(email)}`,
      {
        headers: {
          'X-Internal-Secret': secret,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(3000),
      },
    );

    if (response.status === HttpStatus.NOT_FOUND) {
      return null;
    }

    if (response.status === HttpStatus.FORBIDDEN) {
      throw new BusinessException(
        'AUTH_FORBIDDEN',
        'Usuario nao tem acesso ao ERP no Auth.',
        { email },
        HttpStatus.FORBIDDEN,
      );
    }

    if (!response.ok) {
      throw new BusinessException(
        'AUTH_API_ERROR',
        'Falha ao consultar usuario no Auth.',
        { status: response.status, email },
        HttpStatus.BAD_GATEWAY,
      );
    }

    const body = (await response.json()) as unknown;
    const user = this.extractUser(body);

    if (!user) {
      return null;
    }

    return user;
  }

  private extractUser(payload: unknown): AuthUserRecord | null {
    if (Array.isArray(payload)) {
      return this.normalizeUser(payload[0]);
    }

    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.data)) {
      return this.normalizeUser(record.data[0]);
    }

    if (record.data && typeof record.data === 'object') {
      return this.normalizeUser(record.data as Record<string, unknown>);
    }

    return this.normalizeUser(record);
  }

  private normalizeUser(value: unknown): AuthUserRecord | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const row = value as Record<string, unknown>;
    const idRaw = row.id ?? row.userId ?? row.sub;
    const emailRaw = row.email;

    if (!idRaw || !emailRaw) {
      return null;
    }

    return {
      id: String(idRaw),
      email: String(emailRaw),
    };
  }
}
