

import { EventEmitter } from 'events';

type TranscriptCallback = (transcript: string) => void;

class TranscriptEventEmitter extends EventEmitter {
  /**
   * Subscribes a component to listen for new transcript events.
   * @param callback The function to execute when a transcript is received.
   */
  subscribe(callback: TranscriptCallback) {
    this.on('transcript', callback);
  }

  /**
   * Unsubscribes a component from transcript events to prevent memory leaks.
   * @param callback The same function used to subscribe.
   */
  unsubscribe(callback: TranscriptCallback) {
    this.off('transcript', callback);
  }

  /**
   * Emits a new transcript to all subscribed components.
   * @param transcript The transcribed text to display. Pass an empty string to hide the bubble.
   */
  emitTranscript(transcript: string) {
    this.emit('transcript', transcript);
  }
}

// Create a singleton instance to be used across the application.
export const transcriptEventEmitter = new TranscriptEventEmitter();