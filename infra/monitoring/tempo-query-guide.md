# Tempo Query Guide

## How to Query Traces in Grafana

### Option 1: Use Search Tab (Easiest)

1. In Grafana Explore, select **Tempo** data source
2. Click the **"Search"** tab (not TraceQL)
3. **Leave the query field empty** or use simple filters
4. Set your time range
5. Click "Run query"

This will show all traces, then you can filter by clicking on tags.

### Option 2: TraceQL Queries (Correct Syntax)

**1. Search by Service Name:**

```
{ resource.service.name = "backend" }
```

**2. Search by Operation Name:**

```
{ .name = "GET /todos" }
```

**3. Search by HTTP Method:**

```
{ .http.method = "GET" }
```

**4. Search by Status Code:**

```
{ .http.status_code = 200 }
```

**5. Search by Trace ID:**

```
{ .trace_id = "371783310976e8878ae2a36923f5e540" }
```

### Common TraceQL Queries

**All traces from backend:**

```
{ resource.service.name = "backend" }
```

**All GET requests:**

```
{ resource.service.name = "backend" && .http.method = "GET" }
```

**All errors (status >= 400):**

```
{ resource.service.name = "backend" && .http.status_code >= 400 }
```

**Specific endpoint:**

```
{ resource.service.name = "backend" && .http.target = "/todos" }
```

### Important Notes

1. **TraceQL uses dots (.) for attributes**: `.http.method` not `http.method`
2. **Resource attributes use `resource.` prefix**: `resource.service.name`
3. **Use `&&` for AND, `||` for OR**
4. **Numbers don't need quotes**: `.http.status_code = 200` not `"200"`

### If You Get Syntax Errors

1. **Try the Search tab instead** - It's more forgiving
2. **Leave query empty** - Shows all traces, then filter in UI
3. **Check attribute names** - Click on a trace to see actual attribute names
4. **Use simple queries first** - Start with just service name

### Tips

1. **Start with Search tab**: Easiest way to see traces
2. **Check time range**: Make sure it includes when requests were made
3. **Make some requests**: Generate traces by using your frontend/backend
4. **No results?**:
   - Check backend logs for trace IDs
   - Verify Tempo is receiving traces
   - Make sure requests were made recently

### Finding Trace IDs in Logs

Your Winston logs include trace IDs. Look for:

```json
{ "trace_id": "371783310976e8878ae2a36923f5e540" }
```

Then search in Tempo using Search tab, or TraceQL:

```
{ .trace_id = "371783310976e8878ae2a36923f5e540" }
```
