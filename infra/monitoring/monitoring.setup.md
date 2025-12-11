# Create namespace

kubectl create namespace monitoring

# Install Loki stack with Grafana

helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

helm install loki-stack grafana/loki-stack \
 --namespace monitoring \
 --set grafana.enabled=true \
 --set promtail.enabled=true \
 --set loki.enabled=true

# Apply Grafana Ingress

kubectl apply -f infra/grafana-ingress.yaml

# Access Grafana

# Add to /etc/hosts: <INGRESS_IP> grafana.local

# Then open: http://grafana.local

# Default user: admin

# Password: (get from secret)

kubectl get secret loki-stack-grafana -n monitoring -o jsonpath="{.data.admin-password}" | base64 -d && echo

=======================================

helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
 --namespace monitoring \
 --set grafana.enabled=false \
 --set prometheus.enabled=true

# Add Prometheus as data source to Grafana

# Option 1: Via UI (recommended)

# 1. Go to http://grafana.local

# 2. Click Configuration (gear icon) → Data Sources

# 3. Click "Add data source"

# 4. Select "Prometheus"

# 5. Set URL: http://prometheus-kube-prometheus-prometheus.monitoring.svc.cluster.local:9090

# 6. Click "Save & Test"

# Option 2: Via ConfigMap (if Grafana supports auto-discovery)

# kubectl apply -f infra/monitoring/prometheus-datasource.yaml

=======================================

# Install Tempo for distributed tracing

helm install tempo grafana/tempo-distributed \
 --namespace monitoring \
 --set tempo.tempo.queryFrontend.resources.requests.memory=512Mi \
 --set tempo.tempo.queryFrontend.resources.requests.cpu=100m \
 --set tempo.tempo.distributor.resources.requests.memory=256Mi \
 --set tempo.tempo.distributor.resources.requests.cpu=100m \
 --set tempo.tempo.distributor.receivers.otlp.protocols.grpc.enabled=true \
 --set tempo.tempo.distributor.receivers.otlp.protocols.http.enabled=true

# Wait for Tempo to be ready

kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=tempo -n monitoring --timeout=300s

# Add Tempo as data source to Grafana

# Option 1: Via UI (recommended)

# 1. Go to http://grafana.local

# 2. Click Configuration (gear icon) → Data Sources

# 3. Click "Add data source"

# 4. Select "Tempo"

# 5. Set URL: http://tempo-query-frontend.monitoring.svc.cluster.local:3200

# 6. Enable "Node Graph" and "Service Map"

# 7. Click "Save & Test"

# Option 2: Via ConfigMap

# kubectl apply -f infra/monitoring/tempo-datasource.yaml

# Backend OpenTelemetry Configuration

# The backend is already instrumented with OpenTelemetry

# It will automatically send traces to Tempo at:

# http://tempo-distributor.monitoring.svc.cluster.local:3200/otlp/v1/traces

#

# To customize the endpoint, set TEMPO_ENDPOINT environment variable in your Deployment

=======================================

# UPDATED: Tempo Standalone (Simpler Setup)

# The distributed Tempo requires shared storage (S3, GCS, etc.)

# For local/simple setups, use Tempo standalone instead:

# Uninstall distributed Tempo (if installed)

helm uninstall tempo -n monitoring

# Install Tempo standalone

helm install tempo grafana/tempo \
 --namespace monitoring \
 --set tempo.receivers.otlp.protocols.http.endpoint="0.0.0.0:4318" \
 --set tempo.receivers.otlp.protocols.grpc.endpoint="0.0.0.0:4317"

# Verify Tempo is running

kubectl get pods -n monitoring | grep tempo

# Update Grafana Tempo data source URL to:

# http://tempo.monitoring.svc.cluster.local:3200

=======================================

# Backend OpenTelemetry Setup

# 1. Install OpenTelemetry packages in backend:

# package.json dependencies:

# "@opentelemetry/api": "^1.9.0"

# "@opentelemetry/auto-instrumentations-node": "^0.52.0"

# "@opentelemetry/exporter-trace-otlp-http": "^0.52.0" # NOTE: Use this package, NOT exporter-otlp-http

# "@opentelemetry/resources": "^1.25.0"

# "@opentelemetry/sdk-node": "^0.52.0"

# "@opentelemetry/semantic-conventions": "^1.25.0"

# 2. Create instrumentation.js (must be loaded FIRST, before other imports):

# const { NodeSDK } = require("@opentelemetry/sdk-node");

# const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");

# const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");

# const { Resource } = require("@opentelemetry/resources");

# const { SemanticResourceAttributes } = require("@opentelemetry/semantic-conventions");

#

# const tempoEndpoint = process.env.TEMPO_ENDPOINT || "http://tempo.monitoring.svc.cluster.local:4318/v1/traces";

#

# const sdk = new NodeSDK({

# resource: new Resource({

# [SemanticResourceAttributes.SERVICE_NAME]: "backend",

# }),

# traceExporter: new OTLPTraceExporter({ url: tempoEndpoint }),

# instrumentations: [getNodeAutoInstrumentations()],

# });

#

# sdk.start();

# 3. Load instrumentation at the top of server.js:

# require("./instrumentation");

# 4. Set TEMPO_ENDPOINT environment variable in Kubernetes deployment:

# env:

# - name: TEMPO_ENDPOINT

# value: "http://tempo.monitoring.svc.cluster.local:4318/v1/traces"

=======================================

# Monitoring Stack Summary

# LOGS (Loki):

# - Promtail collects logs from pods

# - Loki stores logs

# - Grafana queries Loki

# - Query in Grafana: {namespace="preprod", app="backend"} | json

# METRICS (Prometheus):

# - Prometheus scrapes metrics from pods/services

# - Stores time-series data

# - Grafana queries Prometheus

# - Example queries:

# - up

# - container_memory_usage_bytes{namespace="preprod"}

# - rate(container_cpu_usage_seconds_total[5m])

# TRACES (Tempo):

# - OpenTelemetry in app sends traces to Tempo

# - Tempo stores traces

# - Grafana queries Tempo

# - Data source URL: http://tempo.monitoring.svc.cluster.local:3200

# - Use Search tab in Grafana Explore for easy querying

=======================================

# Troubleshooting

# Check if Tempo is receiving traces:

kubectl exec -n monitoring tempo-0 -- wget -qO- http://localhost:3200/metrics | grep "tempo_distributor_spans"

# Check backend OpenTelemetry endpoint:

kubectl logs -n preprod -l app=backend | grep "Tempo endpoint"

# Verify backend environment variable:

kubectl exec -n preprod $(kubectl get pod -n preprod -l app=backend -o jsonpath='{.items[0].metadata.name}') -- printenv TEMPO_ENDPOINT

# Check for export errors in backend:

kubectl logs -n preprod -l app=backend | grep -i "error\|fail\|export"

# Test Tempo endpoint connectivity from backend pod:

kubectl exec -n preprod $(kubectl get pod -n preprod -l app=backend -o jsonpath='{.items[0].metadata.name}') -- wget -qO- http://tempo.monitoring.svc.cluster.local:4318/v1/traces --post-data='{}' 2>&1

=======================================

# Important Notes

# 1. Package name matters:

# - WRONG: @opentelemetry/exporter-otlp-http

# - RIGHT: @opentelemetry/exporter-trace-otlp-http

# 2. Tempo endpoints:

# - Standalone Tempo: http://tempo.monitoring.svc.cluster.local:4318/v1/traces

# - Distributed Tempo: http://tempo-distributor.monitoring.svc.cluster.local:4318/v1/traces

# 3. Grafana data source URLs:

# - Loki: http://loki-stack.monitoring.svc.cluster.local:3100

# - Prometheus: http://prometheus-kube-prometheus-prometheus.monitoring.svc.cluster.local:9090

# - Tempo (standalone): http://tempo.monitoring.svc.cluster.local:3200

# 4. If ArgoCD keeps reverting environment variables:

# - Update the base YAML files and commit

# - Or disable auto-sync: kubectl patch application <app-name> -n argocd --type=merge -p '{"spec":{"syncPolicy":{"automated":null}}}'
