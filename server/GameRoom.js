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
        
        // Take first piece from current bag
        const firstPiece = this.currentBag.shift();
        
        // Create queue from remaining pieces
        this.pieceQueue = [...this.currentBag, ...this.nextBag].slice(0, 6);
        
        return { firstPiece, queue: this.pieceQueue };
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
        this.pieceQueue = [...this.currentBag, ...this.nextBag].slice(0, 6);
        
        console.log('Next piece:', piece);
        console.log('New queue:', this.pieceQueue);
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

    resetGame() {
        this.pieceQueue = [];
        this.currentBag = [];
        this.nextBag = [];
        this.initializeBags();
        
        // Reset game states
        this.gameStates.forEach((state, socketId) => {
            this.gameStates.set(socketId, {
                board: [],
                score: 0,
                level: 0,
                role: state.role,
                currentPiece: null
            });
        });
    }
}

module.exports = GameRoom;
