// OpenTelemetry instrumentation
const { NodeSDK } = require("@opentelemetry/sdk-node");
const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-otlp-http");
const { Resource } = require("@opentelemetry/resources");
const {
  SemanticResourceAttributes,
} = require("@opentelemetry/semantic-conventions");

// Get Tempo endpoint from environment or use correct default
// OTLP HTTP endpoint is port 4318 with /v1/traces path
const tempoEndpoint =
  process.env.TEMPO_ENDPOINT ||
  "http://tempo-distributor.monitoring.svc.cluster.local:4318/v1/traces";

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: "backend",
    [SemanticResourceAttributes.SERVICE_VERSION]:
      process.env.APP_VERSION || "1.0.0",
  }),
  traceExporter: new OTLPTraceExporter({
    url: tempoEndpoint,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Automatically instrument Express, HTTP, etc.
      "@opentelemetry/instrumentation-http": {
        enabled: true,
      },
      "@opentelemetry/instrumentation-express": {
        enabled: true,
      },
    }),
  ],
});

// Initialize the SDK and start tracing
sdk.start();

console.log("OpenTelemetry instrumentation started");
console.log(`Tempo endpoint: ${tempoEndpoint}`);

// Gracefully shut down the SDK on process termination
process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .then(() => console.log("OpenTelemetry terminated"))
    .catch((error) => console.log("Error terminating OpenTelemetry", error))
    .finally(() => process.exit(0));
});

module.exports = sdk;
