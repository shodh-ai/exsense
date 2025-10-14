# Frontend Migration Guide - WebRTC Service

## Overview

The WebRTC token service has been merged into `one-backend`. This guide explains how to update your frontend code to use the new endpoints.

## Environment Variable Changes

### Before
```bash
NEXT_PUBLIC_WEBRTC_TOKEN_URL=http://localhost:3002
```

### After
```bash
NEXT_PUBLIC_WEBRTC_TOKEN_URL=http://localhost:3001
```

**Note**: The port changed from `3002` to `3001` (one-backend's port).

## Endpoint Path Changes

All WebRTC endpoints now include the `/webrtc` prefix:

### Before
```
POST http://localhost:3002/api/generate-room
POST http://localhost:3002/api/token
GET  http://localhost:3002/api/token
POST http://localhost:3002/api/verify
```

### After
```
POST http://localhost:3001/api/webrtc/generate-room
POST http://localhost:3001/api/webrtc/token
GET  http://localhost:3001/api/webrtc/token
POST http://localhost:3001/api/webrtc/verify
```

## Code Changes Required

### Option 1: Update Environment Variable (Recommended)

Simply update your `.env.local` file:

```bash
# Change from:
NEXT_PUBLIC_WEBRTC_TOKEN_URL=http://localhost:3002

# To:
NEXT_PUBLIC_WEBRTC_TOKEN_URL=http://localhost:3001
```

Then update the fetch calls to include `/webrtc`:

**File**: `exsense/src/hooks/useLiveKitSession.ts` (line 279)

```typescript
// Before
const response = await fetch(`${tokenServiceUrl}/api/generate-room`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clerkToken}`,
    },
    body: JSON.stringify(requestBody),
});

// After
const response = await fetch(`${tokenServiceUrl}/api/webrtc/generate-room`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clerkToken}`,
    },
    body: JSON.stringify(requestBody),
});
```

### Option 2: Update All Fetch Calls

If you have multiple places calling the WebRTC service, search for:
- `/api/generate-room` → `/api/webrtc/generate-room`
- `/api/token` → `/api/webrtc/token`
- `/api/verify` → `/api/webrtc/verify`

## Quick Migration Script

You can use this bash script to update your frontend code:

```bash
#!/bin/bash
# File: migrate-webrtc-endpoints.sh

# Update environment variable
sed -i '' 's|NEXT_PUBLIC_WEBRTC_TOKEN_URL=http://localhost:3002|NEXT_PUBLIC_WEBRTC_TOKEN_URL=http://localhost:3001|g' .env.local

# Update API endpoints in TypeScript files
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's|/api/generate-room|/api/webrtc/generate-room|g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's|/api/token|/api/webrtc/token|g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's|/api/verify|/api/webrtc/verify|g' {} +

echo "Migration complete! Please review the changes."
```

## Testing

After making the changes:

1. **Restart your development server**:
   ```bash
   npm run dev
   ```

2. **Test the connection**:
   - Open your app in the browser
   - Try to start a session
   - Check the browser console for any errors
   - Verify that LiveKit connection is established

3. **Check the network tab**:
   - Look for requests to `http://localhost:3001/api/webrtc/generate-room`
   - Verify the response includes `success: true` and a valid token

## Response Format

The response format remains the same:

```json
{
  "success": true,
  "roomName": "session-user123-1697123456789",
  "studentToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "livekitUrl": "wss://your-livekit-server.com",
  "userId": "user_abc123",
  "participantIdentity": "user_abc123",
  "sessionJobId": "job-xyz789",
  "sessionStatusUrl": "http://localhost:8080/api/sessions/status/job-xyz789",
  "sessionId": "sess-abc123"
}
```

## Troubleshooting

### Issue: "Failed to fetch token: 404"
**Cause**: The endpoint path is incorrect  
**Solution**: Ensure you're using `/api/webrtc/generate-room` instead of `/api/generate-room`

### Issue: "Connection refused on port 3002"
**Cause**: Still pointing to the old service port  
**Solution**: Update `NEXT_PUBLIC_WEBRTC_TOKEN_URL` to use port `3001`

### Issue: CORS errors
**Cause**: CORS configuration might need updating  
**Solution**: Check that `one-backend/.env` has your frontend URL in `CORS_ALLOWED_ORIGINS`:
```bash
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Issue: Authentication errors
**Cause**: Clerk token not being passed correctly  
**Solution**: Verify the Authorization header is set:
```typescript
headers: {
    'Authorization': `Bearer ${clerkToken}`,
}
```

## Files to Update

Based on your codebase, these files likely need updates:

1. **Environment file**:
   - `exsense/.env.local` - Update `NEXT_PUBLIC_WEBRTC_TOKEN_URL`

2. **Hook file**:
   - `exsense/src/hooks/useLiveKitSession.ts` - Update fetch URL (line ~279)

3. **Any other files** that directly call the WebRTC service:
   ```bash
   # Search for files that need updating
   grep -r "/api/generate-room" src/
   grep -r "/api/token" src/
   grep -r "WEBRTC_TOKEN" src/
   ```

## Rollback Plan

If you need to rollback to the old service:

1. Revert the environment variable:
   ```bash
   NEXT_PUBLIC_WEBRTC_TOKEN_URL=http://localhost:3002
   ```

2. Revert the endpoint paths:
   - `/api/webrtc/generate-room` → `/api/generate-room`
   - `/api/webrtc/token` → `/api/token`

3. Restart the standalone `webrtc-token-service`:
   ```bash
   cd webrtc-token-service
   npm start
   ```

## Production Deployment

For production, update your environment variables:

```bash
# Production .env
NEXT_PUBLIC_WEBRTC_TOKEN_URL=https://your-backend.com
```

The endpoints will be:
- `https://your-backend.com/api/webrtc/generate-room`
- `https://your-backend.com/api/webrtc/token`
- etc.

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check the network tab for failed requests
3. Verify environment variables are set correctly
4. Ensure `one-backend` is running on port 3001
5. Check `one-backend` logs for any errors

---

**Migration Status**: Ready for implementation  
**Estimated Time**: 5-10 minutes  
**Risk Level**: Low (backward compatible response format)
