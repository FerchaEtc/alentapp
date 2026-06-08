// @ts-nocheck
import { metrics } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const prometheusExporter = new PrometheusExporter({
  host: process.env.OTEL_EXPORTER_PROMETHEUS_HOST ?? '0.0.0.0',
  port: Number(process.env.OTEL_EXPORTER_PROMETHEUS_PORT ?? 9464),
  endpoint: '/metrics',
});

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'alentapp-api',
    'deployment.environment': process.env.NODE_ENV ?? 'production',
  }),
  metricReader: prometheusExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-fastify': { enabled: true },
    }),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('Telemetría apagada.'))
      .catch((err) => console.error('Error al apagar:', err))
      .finally(() => process.exit(0));
});

export const meter = metrics.getMeter('alentapp-api');

export function createREDMetrics(meterInstance: Meter) {
  const requestCounter = meterInstance.createCounter('http.requests.total', {
    description: 'Total de requests HTTP',
  });
  
  const errorCounter = meterInstance.createCounter('http.requests.errors', {
    description: 'Total de errores HTTP',
  });
  
  const requestDuration = meterInstance.createHistogram('http.request.duration', {
    description: 'Duración de requests',
    unit: 'ms',
  });

  return { requestCounter, errorCounter, requestDuration };
}