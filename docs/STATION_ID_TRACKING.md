# Station ID Tracking

## Overview

The application supports tracking which physical station a game session was played on during events. This helps with learning and optimization by allowing analysis of game performance across different stations.

## How It Works

### 1. Setting Station ID via URL Parameter

When a user navigates to the application with a `stationId` query parameter, the value is automatically extracted and stored:

```
https://your-app.com/?stationId=station-01
```

### 2. Cookie Storage

The station ID is persisted in a browser cookie named `stationId`:
- **Expiration**: 365 days (configurable)
- **Path**: `/` (site-wide)
- **SameSite**: `Strict` (security)

This ensures the station ID persists across sessions and page refreshes, even if the URL parameter is no longer present.

### 3. Telemetry Integration

Once set, the station ID is automatically included in the `context` field of **every** telemetry event sent to the backend:

```json
{
  "event": "game.start",
  "type": "game",
  "timestamp": "2025-11-12T07:46:20.924Z",
  "userId": "user-123",
  "properties": { ... },
  "context": {
    "url": "https://your-app.com/playing",
    "path": "/playing",
    "language": "en-US",
    "userAgent": "Mozilla/5.0...",
    "viewport": "1920x1080",
    "screen": "1920x1080",
    "sessionId": "session-456",
    "stationId": "station-01"  // ← Automatically included
  }
}
```

## Implementation Details

### Frontend Components

#### 1. Cookie Utilities (`frontend/src/lib/utils.ts`)

Two helper functions handle cookie operations:

```typescript
// Read a cookie value
export function getCookie(name: string): string | null

// Write a cookie value with optional expiration
export function setCookie(name: string, value: string, days: number = 365): void
```

#### 2. URL Parameter Extraction (`frontend/src/main.tsx`)

On application startup, the code checks for a `stationId` URL parameter:

```typescript
const urlParams = new URLSearchParams(window.location.search)
const stationIdParam = urlParams.get('stationId')

if (stationIdParam) {
  setCookie('stationId', stationIdParam)
}
```

#### 3. Analytics Context Enrichment (`frontend/src/services/analyticsService.ts`)

The analytics service automatically includes the station ID in every event's context:

```typescript
private enrichContext(context: AnalyticsEventContext): AnalyticsEventContext {
  const baseContext: AnalyticsEventContext = {
    url: window.location.href,
    path: window.location.pathname,
    // ... other context fields
  }

  // Include stationId from cookie if present
  const stationId = getCookie('stationId')
  if (stationId) {
    baseContext.stationId = stationId
  }

  return { ...baseContext, ...context }
}
```

### Backend Compatibility

The backend `TelemetryTrackRequest` model uses a flexible `Dictionary<string, JsonElement>` for the `Context` property, which means it can accept arbitrary key-value pairs without requiring schema changes:

```csharp
public class TelemetryTrackRequest
{
    // ... other properties

    /// <summary>
    /// Supplemental context about the environment or device
    /// </summary>
    public Dictionary<string, JsonElement>? Context { get; set; }
}
```

## Usage Examples

### Setting Station ID for the First Time

Navigate to the app with the station ID in the URL:
```
https://your-app.com/?stationId=booth-12
```

The station ID is stored in a cookie and will be included in all subsequent telemetry events, even if the user closes and reopens the browser (within 365 days).

### Changing Station ID

Simply navigate with a new station ID parameter:
```
https://your-app.com/?stationId=booth-42
```

The old station ID will be overwritten with the new value.

### Clearing Station ID

Delete the `stationId` cookie via browser developer tools, or implement a clear function:

```typescript
document.cookie = 'stationId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
```

## Analytics Queries

With station ID tracking, you can now analyze:
- Which stations have the most active gameplay
- Average scores by station
- Session duration by station
- User engagement patterns across different physical locations

Example query (pseudo-code):
```sql
SELECT 
  context.stationId,
  COUNT(*) as total_sessions,
  AVG(properties.score) as avg_score
FROM telemetry_events
WHERE event = 'game.ended'
  AND context.stationId IS NOT NULL
GROUP BY context.stationId
ORDER BY total_sessions DESC
```

## Testing

### Manual Testing

1. Open the application with a station ID:
   ```
   http://localhost:5173/?stationId=test-station-01
   ```

2. Open browser DevTools → Application → Cookies
3. Verify the `stationId` cookie is set with value `test-station-01`

4. Navigate to any page in the app

5. Open DevTools → Console and check telemetry logs (if `logToConsole` is enabled in config)
6. Verify that telemetry events include `stationId: "test-station-01"` in the context

7. Close and reopen the browser, navigate to the app without the URL parameter
8. Verify the station ID is still present in telemetry events (persisted via cookie)

### Automated Testing

While no automated tests are currently implemented, here are recommended test cases:

#### Cookie Utilities Tests
- `getCookie` returns null when cookie doesn't exist
- `getCookie` returns correct value when cookie exists
- `setCookie` creates a cookie with correct name and value
- `setCookie` sets proper expiration date
- `setCookie` URL-encodes special characters

#### Station ID Extraction Tests
- Station ID is extracted from URL parameter
- Station ID is stored in cookie when present in URL
- Existing cookie value is preserved when URL has no station ID parameter
- Station ID from URL overwrites existing cookie value

#### Analytics Context Tests
- `stationId` is included in context when cookie exists
- `stationId` is not included in context when cookie doesn't exist
- All telemetry events include station ID from cookie

## Security Considerations

- **No PII**: Station IDs should be alphanumeric identifiers (e.g., "booth-12", "station-A1"), not personal information
- **Cookie Security**: Cookies use `SameSite=Strict` to prevent CSRF attacks
- **Input Validation**: The frontend accepts any string value; backend should validate format if needed

## Future Enhancements

Potential improvements:
- Add station ID to leaderboard displays
- Create station-specific dashboards in Microsoft Fabric
- Support QR codes for easy station ID setup
- Add admin UI for managing station configurations
