import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

@Injectable()
export class StorageService {
  private readonly bucket: string;
  private readonly publicBaseUrl: string;
  private readonly client: S3Client;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('R2_BUCKET_NAME', 'nexos-financeiro');
    this.publicBaseUrl = this.configService.get<string>('R2_PUBLIC_BASE_URL', 'https://r2.local');

    this.client = new S3Client({
      region: 'auto',
      endpoint: this.configService.get<string>('R2_ENDPOINT'),
      credentials: {
        accessKeyId: this.configService.get<string>('R2_ACCESS_KEY_ID', 'local-key'),
        secretAccessKey: this.configService.get<string>('R2_SECRET_ACCESS_KEY', 'local-secret'),
      },
      forcePathStyle: true,
    });
  }

  async uploadBuffer(params: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<{ key: string; url: string }> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
      }),
    );

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
