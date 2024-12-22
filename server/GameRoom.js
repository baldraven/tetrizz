class GameRoom {
    constructor(id) {
        this.id = id;
        this.players = new Set();
        this.gameStates = new Map();
        this.playerRoles = new Map();
        this.activeGames = new Set();
        this.pieceQueue = [];
        this.pieceTypes = ['I', 'O', 'T', 'L', 'J', 'S', 'Z'];
        this.currentBag = [];
        this.nextBag = [];
        this.initializeBags();
    }

    initializeBags() {
        this.currentBag = this.generateNewBag();
        this.nextBag = this.generateNewBag();
        this.pieceQueue = [...this.currentBag, ...this.nextBag].slice(0, 7);
    }

    generateNewBag() {
        // Create array with one of each piece
        const bag = [...this.pieceTypes];
        
        // Fisher-Yates shuffle
        for (let i = bag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [bag[i], bag[j]] = [bag[j], bag[i]];
        }
        
        return bag;
    }

    getNextPiece() {
        if (this.currentBag.length === 0) {
            this.currentBag = this.nextBag;
            this.nextBag = this.generateNewBag();
        }

        const piece = this.currentBag.shift();
        this.pieceQueue = [...this.currentBag, ...this.nextBag].slice(0, 7);
        
        console.log('Current queue:', this.pieceQueue);
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
