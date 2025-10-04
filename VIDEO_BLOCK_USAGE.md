# Video Block Integration - Usage Guide

## Overview
Video has been successfully integrated into the vis feed (whiteboard feed) alongside rrweb replays and excalidraw diagrams.

## Changes Made

### 1. Store Updates (`exsense/src/lib/store.ts`)
- Added `VideoBlock` interface with `id`, `type: 'video'`, `summary`, and `videoUrl` fields
- Updated `WhiteboardBlock` union type to include `VideoBlock`
- Updated `updateBlock` action to handle `VideoBlock` type

### 2. New Component (`exsense/src/components/session/VideoBlockView.tsx`)
- Created similar to `RrwebBlockView`
- Renders video via iframe with the provided `videoUrl`
- Supports fullscreen, autoplay, and other video controls

### 3. Session Page Updates (`exsense/src/app/(app)/session/page.tsx`)
- Removed separate "Video" tab
- Integrated video rendering into the whiteboard feed
- Updated component buttons to only show "Browser" and "Whiteboard"
- Videos now appear as blocks in the vis feed

## How to Add a Video Block

### From Backend/Agent
When your backend wants to add a video to the vis feed, send a message that the frontend will handle to add a block:

```typescript
// Example: Adding a video block via Zustand store
const { addBlock } = useSessionStore.getState();

addBlock({
  id: `video-${Date.now()}`, // or use UUID
  type: 'video',
  summary: 'Introduction to Python',
  videoUrl: 'https://play.gumlet.io/embed/6881f10a1a1f941d68258a13?background=false&autoplay=false'
});
```

### From Frontend Hook (e.g., useLiveKitSession)
You can add video blocks when receiving specific RPC messages:

```typescript
// In useLiveKitSession.ts or similar
if (action === 'ADD_VIDEO') {
  const videoBlock: VideoBlock = {
    id: payload.id || `video-${Date.now()}`,
    type: 'video',
    summary: payload.summary || 'Video',
    videoUrl: payload.videoUrl
  };
  addBlock(videoBlock);
}
```

### Example Video Block Structure
```typescript
{
  id: "video-1234567890",
  type: "video",
  summary: "Course Introduction Video",
  videoUrl: "https://play.gumlet.io/embed/6881f10a1a1f941d68258a13?background=false&autoplay=false"
}
```

## UI Behavior

- Videos appear in the **Whiteboard** tab alongside excalidraw diagrams and rrweb replays
- Each video block has:
  - The video player (iframe)
  - A footer with video icon and summary text
- The video tab has been removed - all content is now in Browser/Whiteboard views

## Testing

To test the video integration, you can manually add a video block via browser console:

```javascript
// Open browser console on the session page
window.__sessionStore.getState().addBlock({
  id: 'test-video-' + Date.now(),
  type: 'video',
  summary: 'Test Video',
  videoUrl: 'https://play.gumlet.io/embed/6881f10a1a1f941d68258a13?background=false&autoplay=false'
});
```

Then switch to the Whiteboard tab to see the video block.
