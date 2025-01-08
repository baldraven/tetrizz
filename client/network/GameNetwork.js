export default class GameNetwork {
    constructor(handlers) {
        this.socket = io();
        this.handlers = handlers;
        this.setupSocketEvents();
    }

    setupSocketEvents() {
        this.socket.on('connect', () => console.log('Connected to server'));
        this.socket.on('connect_error', (error) => console.error('Connection error:', error));
        
        // Map socket events to handlers
        const events = [
            'playerAssigned',
            'startGame',
            'gameUpdate',
            'queueUpdate',
            'gameOver',
            'gameRestart',
            'receiveGarbage',
            'roomFull'
        ];

        events.forEach(event => {
            if (this.handlers[event]) {
                this.socket.on(event, this.handlers[event]);
            }
        });
    }

    sendGameState(state) {
        this.socket.emit('gameUpdate', state);
    }

    requestPiece() {
        this.socket.emit('requestPiece');
    }

    sendGarbage(amount) {
        this.socket.emit('sendGarbage', { amount });
    }

    requestRestart() {
        this.socket.emit('requestRestart');
    }
}
