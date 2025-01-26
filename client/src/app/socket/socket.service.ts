import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket!: Socket;
  private connectionStatus = new BehaviorSubject<boolean>(false);

  constructor() {
    this.initializeSocket();
    this.setupSocketListeners();
  }

  private initializeSocket(): void {
    this.socket = io('/', {
      path: '/socket.io',
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
  }

  private setupSocketListeners(): void {
    // Connection handler
    this.socket.on('connect', () => {
      console.log('Connected to server with ID:', this.socket.id);
      this.connectionStatus.next(true);
    });

    // Disconnection handler
    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.connectionStatus.next(false);
    });

    // Reconnection handler
    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log('Reconnected to server after', attemptNumber, 'attempts');
      this.connectionStatus.next(true);
    });

    // Reconnection error handler
    this.socket.on('reconnect_error', (error: Error) => {
      console.error('Reconnection error:', error);
    });

    // Reconnection attempt handler
    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log('Attempting to reconnect:', attemptNumber);
    });
  }

  /**
   * Get the current socket ID
   * @returns The socket ID or empty string if not connected
   */
  getSocketId(): string {
    return this.socket.id || '';
  }

  /**
   * Listen to a socket event
   * @param eventName The name of the event to listen to
   * @returns An Observable that emits the event data
   */
  on(eventName: string): Observable<any> {
    return new Observable((observer) => {
      this.socket.on(eventName, (data) => observer.next(data));
    });
  }

  /**
   * Emit a socket event
   * @param eventName The name of the event to emit
   * @param args The arguments to pass with the event
   */
  emit(eventName: string, ...args: unknown[]): void {
    this.socket.emit(eventName, ...args);
  }

  /**
   * Get the current connection status
   * @returns An Observable of the connection status
   */
  getConnectionStatus(): Observable<boolean> {
    return this.connectionStatus.asObservable();
  }

  /**
   * Disconnect the socket
   */
  disconnect(): void {
    this.socket.disconnect();
  }

  /**
   * Connect the socket
   */
  connect(): void {
    this.socket.connect();
  }
}
