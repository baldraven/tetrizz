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
        this.lastGameStates = new Map(); // Store last known states
        this.vacantRoles = new Set(); // Track which roles are available
        this.currentPiece = null;  // Add this to track current piece
    }

    initializeBags() {
        this.currentBag = this.generateNewBag();
        this.nextBag = this.generateNewBag();
        
        // Take first piece from current bag
        const firstPiece = this.currentBag.shift();
        this.currentPiece = firstPiece;  // Store current piece
        
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
        this.currentPiece = piece;  // Update current piece
        this.pieceQueue = [...this.currentBag, ...this.nextBag].slice(0, 6);
        
        console.log('Next piece:', piece);
        console.log('New queue:', this.pieceQueue);
        return piece;
    }

    getCurrentOrNewGameState() {
        if (!this.isGameActive()) {
            // Start new game
            return this.initializeBags();
        } else {
            // Return current state
            return {
                firstPiece: this.currentPiece,
                queue: this.pieceQueue
            };
        }
    }

    addPlayer(socket) {
        // Try to assign a vacant role first
        let role;
        if (this.vacantRoles.size > 0) {
            // Get the first vacant role
            role = Array.from(this.vacantRoles)[0];
            this.vacantRoles.delete(role);
        } else {
            // If no vacant roles, assign new role
            role = this.players.size === 0 ? 'player1' : 'player2';
        }

        this.players.add(socket.id);
        this.playerRoles.set(socket.id, role);

        // Restore previous state if exists, otherwise create new state
        const previousState = this.lastGameStates.get(role) || {
            board: [],
            score: 0,
            level: 0,
            role,
            currentPiece: null,
            holdPiece: null
        };

        this.gameStates.set(socket.id, previousState);
        
        // Initialize bags if this is the first player and no game is active
        if (this.players.size === 1 && !this.isGameActive()) {
            this.initializeBags();
        }

        if (this.players.size === 2) {
            this.activeGames.add('default');
        }

        return { role, gameState: previousState };
    }

    removePlayer(socketId) {
        const role = this.playerRoles.get(socketId);
        // Store the last known state before removing player
        if (role) {
            this.lastGameStates.set(role, this.gameStates.get(socketId));
            this.vacantRoles.add(role);
        }

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
        // Don't call initializeBags here anymore, it will be called separately
    }
}

module.exports = GameRoom;
