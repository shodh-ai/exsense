// File: exsense/src/lib/MicEventEmitter.ts

type EventCallback = (stream: MediaStream | null) => void;

class MicEventEmitter {
    private listeners: EventCallback[] = [];

    // The 'on' and 'off' methods are now explicitly named for clarity
    subscribe(callback: EventCallback): void {
        this.listeners.push(callback);
    }

    unsubscribe(callback: EventCallback): void {
        this.listeners = this.listeners.filter(l => l !== callback);
    }

    // The 'emit' method remains the same
    emit(stream: MediaStream | null): void {
        this.listeners.forEach(listener => listener(stream));
    }
}

export const micEventEmitter = new MicEventEmitter();