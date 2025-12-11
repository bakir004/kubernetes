# Tempo Query Guide

## How to Query Traces in Grafana

### Basic Queries

**1. Search by Service Name:**

```
{service.name="backend"}
```

**2. Search by Operation Name:**

```
{name="GET /todos"}
```

**3. Search by HTTP Method:**

```
{http.method="GET"}
```

**4. Search by Status Code:**

```
{http.status_code="200"}
```

**5. Search by Trace ID (from logs):**

```
{__tags.trace_id="371783310976e8878ae2a36923f5e540"}
```

### Common Queries

**All traces from backend:**

```
{service.name="backend"}
```

**All GET requests:**

```
{service.name="backend", http.method="GET"}
```

**All errors (status >= 400):**

```
{service.name="backend", http.status_code>=400}
```

**Specific endpoint:**

```
{service.name="backend", http.target="/todos"}
```

### Tips

1. **Start with service name**: `{service.name="backend"}`
2. **Use tags**: Click on a trace to see all available tags
3. **Time range**: Make sure your time range includes when requests were made
4. **No results?**:
   - Check if traces are being sent (look for trace IDs in backend logs)
   - Verify Tempo is receiving traces (check distributor metrics)
   - Make sure you made requests recently (within the time range)

### Finding Trace IDs in Logs

Your Winston logs include trace IDs. Look for:

```json
{ "trace_id": "371783310976e8878ae2a36923f5e540" }
```

Then search in Tempo:

```
{__tags.trace_id="371783310976e8878ae2a36923f5e540"}
```
