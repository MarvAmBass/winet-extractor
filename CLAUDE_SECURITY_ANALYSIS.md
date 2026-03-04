# Security Analysis

## Crash / Reliability Issues

### 1. `JSON.parse` without try/catch — `winetHandler.ts:187`
Malformed WebSocket data will throw an uncaught exception and crash the process. There's no error handling around `JSON.parse(data.toString())`.

### 2. `throw` inside async MQTT callbacks — `homeassistant.ts:41, 73, 107, 198`
Throwing inside a callback (e.g., MQTT publish callback) causes an unhandled exception rather than propagating the error to a catch handler. This will crash the process.

### 3. `throw` inside WebSocket event handler — `winetHandler.ts:270–272`
```typescript
throw new Error('Failed to authenticate');
```
Same issue — throwing inside a WebSocket `message` handler is an unhandled exception. A reconnect attempt would be safer.

### 4. Array access without bounds check — `winetHandler.ts:489`
```typescript
this.currentDevice = this.devices[0].dev_id;
```
If `this.devices` is empty (e.g., all devices were filtered/skipped), this throws a `TypeError`. No guard exists.

### 5. Unchecked `DeviceTypeStages` lookup — `winetHandler.ts:293`
```typescript
if (DeviceTypeStages[device.dev_type].length === 0)
```
If `device.dev_type` is a value not in the lookup table, this throws `TypeError: Cannot read properties of undefined`. Unknown device types from the server would crash the handler.

---

## Minor Issues

### 6. `response.on('error')` retry logic — `getProperties.ts:30–38`
The `res.on('error', ...)` handler retries with SSL, but `res` is the HTTP response object — its `error` event is rarely fired; the meaningful one is on the request object (`.on('error')`). This retry path is likely unreachable in practice.

---

## Accepted Trade-offs for Local Proprietary Device Communication

These items are acknowledged limitations imposed by communicating with a closed-source inverter over a local network, where the device's firmware behavior cannot be changed.

### TLS certificate validation disabled — `winetHandler.ts:124`, `getProperties.ts:21`
The inverter ships with a self-signed certificate that cannot be replaced. Disabling `rejectUnauthorized` is required to establish any SSL connection to it at all.

### Hardcoded default credentials — `winetHandler.ts:63–69`
The inverter's factory defaults (`admin`/`pw8888`) are used as fallbacks when no credentials are configured. This mirrors the device's own out-of-the-box state. Users who have changed their inverter password can and should supply their own via config.
