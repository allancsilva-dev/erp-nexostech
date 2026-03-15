import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  it('builds normalized public URL', () => {
    const config = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'R2_PUBLIC_BASE_URL') return 'https://cdn.example.com/';
        return defaultValue;
      }),
    } as unknown as ConfigService;

    const service = new StorageService(config);
    const url = service.getPublicUrl('/boletos/file.pdf');

    expect(url).toBe('https://cdn.example.com/boletos/file.pdf');
  });

  it('uploads buffer and returns key/url', async () => {
    const config = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'R2_PUBLIC_BASE_URL') return 'https://cdn.example.com';
        if (key === 'R2_BUCKET_NAME') return 'bucket-test';
        if (key === 'R2_ENDPOINT') return 'https://r2.example.com';
        if (key === 'R2_ACCESS_KEY_ID') return 'k';
        if (key === 'R2_SECRET_ACCESS_KEY') return 's';
        return defaultValue;
      }),
    } as unknown as ConfigService;

    const service = new StorageService(config);
    const sendSpy = jest.spyOn((service as unknown as { client: { send: (cmd: unknown) => Promise<unknown> } }).client, 'send')
      .mockResolvedValue({});

    const result = await service.uploadBuffer({
      key: 'boletos/test.pdf',
      body: Buffer.from('pdf-content'),
      contentType: 'application/pdf',
    });

    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      key: 'boletos/test.pdf',
      url: 'https://cdn.example.com/boletos/test.pdf',
    });
  });
});
