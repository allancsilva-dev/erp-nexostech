import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import CircuitBreaker from 'opossum';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket: string;
  private readonly publicBaseUrl: string;
  private readonly client: S3Client;
  private uploadBreaker: CircuitBreaker;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>(
      'R2_BUCKET_NAME',
      'nexos-financeiro',
    );
    this.publicBaseUrl = this.configService.get<string>(
      'R2_PUBLIC_BASE_URL',
      'https://r2.local',
    );

    this.client = new S3Client({
      region: 'auto',
      endpoint: this.configService.get<string>('R2_ENDPOINT'),
      credentials: {
        accessKeyId: this.configService.get<string>(
          'R2_ACCESS_KEY_ID',
          'local-key',
        ),
        secretAccessKey: this.configService.get<string>(
          'R2_SECRET_ACCESS_KEY',
          'local-secret',
        ),
      },
      forcePathStyle: true,
    });
  }

  onModuleInit(): void {
    this.uploadBreaker = new CircuitBreaker(
      (params: { key: string; body: Buffer; contentType: string }) =>
        this.client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: params.key,
            Body: params.body,
            ContentType: params.contentType,
          }),
        ),
      {
        timeout: 10_000, // 10s por upload
        errorThresholdPercentage: 50,
        resetTimeout: 30_000, // tenta reabrir após 30s
        volumeThreshold: 5, // mínimo de requests antes de abrir
      },
    );

    this.uploadBreaker.on('open', () =>
      this.logger.warn(
        'StorageService: circuit breaker ABERTO — R2 indisponível',
      ),
    );
    this.uploadBreaker.on('halfOpen', () =>
      this.logger.log(
        'StorageService: circuit breaker SEMI-ABERTO — testando R2',
      ),
    );
    this.uploadBreaker.on('close', () =>
      this.logger.log(
        'StorageService: circuit breaker FECHADO — R2 recuperado',
      ),
    );
  }

  async uploadBuffer(params: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<{ key: string; url: string }> {
    await this.uploadBreaker.fire(params);

    return {
      key: params.key,
      url: this.getPublicUrl(params.key),
    };
  }

  getPublicUrl(key: string): string {
    const normalizedBase = this.publicBaseUrl.replace(/\/$/, '');
    const normalizedKey = key.replace(/^\/+/, '');
    return `${normalizedBase}/${normalizedKey}`;
  }
}
