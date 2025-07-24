
import { EventEmitter } from 'events';

class MusicEventEmitter extends EventEmitter {
  constructor() {
    super();
  }

  // Method to emit a play/pause toggle event
  togglePlayback() {
    this.emit('togglePlayback');
  }

  // Method to subscribe to the toggle event
  subscribe(callback: () => void) {
    this.on('togglePlayback', callback);
  }

  // Method to unsubscribe from the toggle event
  unsubscribe(callback: () => void) {
    this.off('togglePlayback', callback);
  }
}

export const musicEventEmitter = new MusicEventEmitter();