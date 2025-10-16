import { Room, VideoPresets } from 'livekit-client';

// This instance is created only ONCE when the module is first imported.
// It will be shared across the entire application, solving the re-mount issue.
export const roomInstance = new Room({
    adaptiveStream: false,
    dynacast: false,
    videoCaptureDefaults: {
        resolution: VideoPresets.h1080.resolution,
    },
});
