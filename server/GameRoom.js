class GameRoom {
    constructor(id) {
        this.id = id;
        this.players = new Set();
        this.gameStates = new Map();
        this.playerRoles = new Map();
        this.activeGames = new Set();
        this.pieceQueue = [];
        this.pieceTypes = ['I', 'O', 'T', 'L', 'J', 'S', 'Z'];
        this.initializePieceQueue();
    }

    initializePieceQueue() {
        // Fill queue with 7 pieces
        while (this.pieceQueue.length < 7) {
            this.addNewPieceToQueue();
        }
    }

    addNewPieceToQueue() {
        const type = this.pieceTypes[Math.floor(Math.random() * this.pieceTypes.length)];
        this.pieceQueue.push(type);
    }

    getNextPiece() {
        const piece = this.pieceQueue.shift();
        this.addNewPieceToQueue();
        console.log('Current queue:', this.pieceQueue);  // Debug log
        return piece;
    }

    addPlayer(socket) {
        this.players.add(socket.id);
        const role = this.players.size === 1 ? 'player1' : 'player2';
        this.playerRoles.set(socket.id, role);
        this.gameStates.set(socket.id, {
            board: [],
            score: 0,
            level: 0,
            role,
            currentPiece: null
        });
        
        if (this.players.size === 2) {
            this.activeGames.add('default');
        }
    }

    removePlayer(socketId) {
        this.players.delete(socketId);
        this.gameStates.delete(socketId);
        this.playerRoles.delete(socketId);
        if (this.players.size < 2) {
            this.activeGames.clear();
        }
    }

    updatePlayerState(socketId, gameState) {
        this.gameStates.set(socketId, gameState);
    }

    getOtherPlayers(socketId) {
        return Array.from(this.players).filter(id => id !== socketId);
    }

    isGameActive() {
        return this.activeGames.has('default');
    }
}

module.exports = GameRoom;
