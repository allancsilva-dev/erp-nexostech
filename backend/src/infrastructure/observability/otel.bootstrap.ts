import { NodeSDK } from '@opentelemetry/sdk-node';

let sdk: NodeSDK | undefined;

export async function startOpenTelemetry(): Promise<void> {
  if (process.env.OTEL_ENABLED === 'false') {
    return;
  }

  if (sdk) {
    return;
  }

  sdk = new NodeSDK();
  await sdk.start();
}

export async function shutdownOpenTelemetry(): Promise<void> {
  if (!sdk) {
    return;
  }

  await sdk.shutdown();
  sdk = undefined;
}
