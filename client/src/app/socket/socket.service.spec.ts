import { TestBed } from '@angular/core/testing';
import { SocketService } from './socket.service';

describe('SocketService', () => {
  let service: SocketService;
  let mockSocket: any;

  beforeEach(() => {
    mockSocket = {
      id: 'test-socket-id',
      emit: jasmine.createSpy('emit'),
      on: jasmine.createSpy('on'),
      connect: jasmine.createSpy('connect'),
      disconnect: jasmine.createSpy('disconnect'),
      connected: false,
    };

    const mockIo = jasmine.createSpy('io').and.returnValue(mockSocket);
    (window as any).io = mockIo;

    TestBed.configureTestingModule({
      providers: [
        SocketService,
        { provide: 'SOCKET_CONFIG', useValue: { url: '/' } },
      ],
    });

    service = TestBed.inject(SocketService);
    (service as any).socket = mockSocket;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Socket Operations', () => {
    it('should return socket id', () => {
      mockSocket.connected = true;
      expect(service.getSocketId()).toBe('test-socket-id');
    });

    it('should emit events correctly', () => {
      const eventName = 'testEvent';
      const eventData = { test: 'data' };

      service.emit(eventName, eventData);

      expect(mockSocket.emit).toHaveBeenCalledWith(eventName, eventData);
    });

    it('should listen to events correctly', () => {
      const eventName = 'testEvent';
      const testData = { message: 'test' };
      let receivedData: any;

      service.on(eventName).subscribe((data) => {
        receivedData = data;
      });

      const onCallback = mockSocket.on.calls
        .allArgs()
        .find(([event]: any) => event === eventName)?.[1];
      if (onCallback) {
        onCallback(testData);
      }

      expect(receivedData).toEqual(testData);
    });
  });

  describe('Connection Management', () => {
    it('should handle connection status correctly', (done) => {
      let connectionStatus = false;

      service.getConnectionStatus().subscribe((status) => {
        connectionStatus = status;
        if (status === true) {
          expect(connectionStatus).toBe(true);
          done();
        }
      });

      const onCallback = mockSocket.on.calls
        .allArgs()
        .find(([event]: [string, Function]) => event === 'connect')?.[1];

      if (onCallback) {
        mockSocket.connected = true;
        onCallback();
      }
    });

    it('should handle manual connection', () => {
      service.connect();
      expect(mockSocket.connect).toHaveBeenCalled();
    });

    it('should handle manual disconnection', () => {
      service.disconnect();
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });
});
