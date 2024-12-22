import Game from '../game/Game.js';
import Player from '../game/Player.js';
import { COLORS, SHAPES } from '../game/Constants.js';
import Piece from '../game/Piece.js';

class GameClient {
    constructor(leftCanvas, rightCanvas) {
        this.leftCanvas = leftCanvas;
        this.rightCanvas = rightCanvas;
        this.ctx = null;
        this.opponentCtx = null;
        this.game = new Game();
        this.player = new Player(this.game);
        this.socket = io();
        this.playerId = null;
        this.gameStarted = false;
        
        this.lastTime = 0;
        this.dropCounter = 0;
        this.moveCounter = 0;
        this.moveDelay = 100; // Initial delay before auto-repeat
        this.moveInterval = 50; // Speed of auto-repeat
        this.heldKeys = new Set();
        
        this.previewCanvas = document.createElement('canvas');
        this.previewCanvas.width = 100;
        this.previewCanvas.height = 400;
        document.querySelector('.game-container').appendChild(this.previewCanvas);
        this.previewCtx = this.previewCanvas.getContext('2d');
        
        this.setupSocketEvents();
        this.setupEvents();

        // Add error handling for socket connection
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
        });

        this.socket.on('roomFull', () => {
            console.log('Room is full, cannot join');
            // Optionally display message to user
            alert('Game room is full. Please try again later.');
        });

        // Control timing constants
        this.DAS = 100;  // Delayed Auto Shift: 100ms
        this.ARR = 0;    // Auto-Repeat Rate: 0ms (instant)
        this.DCD = 5;    // DAS Cut Delay: 5ms
        this.lastMoveTime = 0;
        this.dasTimer = 0;
    }

    setupSocketEvents() {
        this.socket.on('playerAssigned', ({ playerId }) => {
            console.log('Assigned as:', playerId);
            this.playerId = playerId;
            
            // Clear both canvases first
            const leftCtx = this.leftCanvas.getContext('2d');
            const rightCtx = this.rightCanvas.getContext('2d');
            leftCtx.fillStyle = '#fff';
            rightCtx.fillStyle = '#fff';
            leftCtx.fillRect(0, 0, this.leftCanvas.width, this.leftCanvas.height);
            rightCtx.fillRect(0, 0, this.rightCanvas.width, this.rightCanvas.height);

            // Assign contexts based on player role
            if (this.playerId === 'player1') {
                this.ctx = leftCtx;
                this.opponentCtx = rightCtx;
                document.querySelector('.player-section:first-child h2').style.color = 'red';
            } else {
                this.ctx = rightCtx;
                this.opponentCtx = leftCtx;
                document.querySelector('.player-section:last-child h2').style.color = 'red';
            }
        });

        this.socket.on('startGame', ({ initialQueue }) => {
            console.log('Game started with queue:', initialQueue);
            this.gameStarted = true;
            this.game.pieceQueue = initialQueue;
            this.game.initializeFirstPiece(); // Initialize the first piece
            this.renderPreviewQueue();
            this.startGameLoop(); // Both players start their game loops
        });

        this.socket.on('gameUpdate', (data) => {
            if (data.playerId !== this.playerId) {
                this.renderOpponentGame(data);
            }
        });

        this.socket.on('queueUpdate', ({ queue, nextPiece }) => {
            this.game.pieceQueue = queue;
            if (nextPiece && this.game.currentPiece === null) {
                this.game.currentPiece = new Piece(SHAPES[nextPiece], nextPiece);
            }
            this.renderPreviewQueue();
        });
    }

    setupEvents() {
        document.addEventListener('keydown', (event) => {
            if (!this.gameStarted) return;
            
            if (!this.heldKeys.has(event.key)) {
                this.heldKeys.add(event.key);
                this.dasTimer = 0;  // Reset DAS timer on new keypress
                this.handleInput(event.key); // Immediate response
            }
        });

        document.addEventListener('keyup', (event) => {
            this.heldKeys.delete(event.key);
            if (this.heldKeys.size === 0) {
                this.dasTimer = 0;
            }
        });
    }

    handleInput(key) {
        if (!this.game.currentPiece || !this.gameStarted) return;
        
        const now = performance.now();
        let needsNewPiece = false;
        
        switch(key) {
            case 'k':
                // Instant soft drop
                while (!this.game.board.isCollision(
                    this.game.currentPiece,
                    this.game.currentPiece.move('down')
                )) {
                    this.game.currentPiece.position = this.game.currentPiece.move('down');
                }
                if (this.game.update() === 'locked') {
                    needsNewPiece = true;
                }
                break;
            case 'c':
                this.player.hardDrop();
                needsNewPiece = true;
                break;
            default:
                if (now - this.lastMoveTime >= this.DCD) {
                    this.player.handleInput(key);
                    this.lastMoveTime = now;
                }
                break;
        }

        this.sendGameState();

        if (needsNewPiece || this.game.currentPiece === null) {
            this.socket.emit('requestPiece');
        }
    }

    sendGameState() {
        if (!this.game.currentPiece) return;

        const state = {
            board: this.game.board.grid,
            score: this.game.score,
            level: this.game.level,
            playerId: this.playerId,
            currentPiece: {
                shape: this.game.currentPiece.shape,
                position: this.game.currentPiece.position,
                type: this.game.currentPiece.type
            }
        };
        this.socket.emit('gameUpdate', state);
        
        // Update score based on player role
        const scoreElement = this.playerId === 'player1' ? 'score1' : 'score2';
        document.getElementById(scoreElement).textContent = this.game.score;
    }

    startGameLoop() {
        const gameLoop = (timestamp) => {
            const deltaTime = timestamp - this.lastTime;
            this.lastTime = timestamp;

            // Handle held keys with DAS
            if (this.heldKeys.size > 0) {
                this.dasTimer += deltaTime;
                
                if (this.dasTimer >= this.DAS) {
                    this.heldKeys.forEach(key => {
                        if (['j', 'l'].includes(key)) {
                            // After DAS, move as fast as possible (ARR = 0)
                            this.handleInput(key);
                        }
                    });
                }
            } else {
                this.dasTimer = 0;
            }

            // Handle piece dropping
            this.dropCounter += deltaTime;
            if (this.dropCounter > this.game.getDropInterval()) {
                const updateResult = this.game.update();
                if (updateResult === 'locked') {
                    this.socket.emit('requestPiece');
                }
                this.dropCounter = 0;
                this.sendGameState();
            }

            this.render();
            requestAnimationFrame(gameLoop);
        };

        requestAnimationFrame(gameLoop);
    }

    render() {
        if (!this.ctx || !this.game.currentPiece) return;  // Don't render if no piece or context
        this.ctx.clearRect(0, 0, this.leftCanvas.width, this.leftCanvas.height);
        this.renderBoard();
        this.renderGhostPiece();  // Add this line before rendering current piece
        this.renderCurrentPiece();
    }

    renderGhostPiece() {
        if (!this.game.currentPiece) return;  // Skip if no current piece
        const ghostPiece = this.game.getGhostPiecePosition();
        const blockSize = this.leftCanvas.width / 10;
        const color = COLORS[this.game.currentPiece.type];

        ghostPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    // Convert hex to rgba for ghost piece
                    const r = parseInt(color.slice(1,3), 16);
                    const g = parseInt(color.slice(3,5), 16);
                    const b = parseInt(color.slice(5,7), 16);
                    
                    this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.2)`;
                    this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
                    this.ctx.lineWidth = 1;

                    const ghostX = (ghostPiece.position.x + x) * blockSize;
                    const ghostY = (ghostPiece.position.y + y) * blockSize;
                    
                    this.ctx.fillRect(ghostX, ghostY, blockSize - 1, blockSize - 1);
                    this.ctx.strokeRect(ghostX, ghostY, blockSize - 1, blockSize - 1);
                }
            });
        });
    }

    renderBoard() {
        const grid = this.game.board.grid;
        const blockSize = this.leftCanvas.width / 10;

        // Draw grid background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        for (let y = 0; y < 20; y++) {
            for (let x = 0; x < 10; x++) {
                this.ctx.fillRect(
                    x * blockSize, 
                    y * blockSize, 
                    blockSize - 1, 
                    blockSize - 1
                );
            }
        }

        // Draw pieces with gradient and glow
        grid.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    const color = COLORS[value];
                    const gradient = this.ctx.createLinearGradient(
                        x * blockSize,
                        y * blockSize,
                        (x + 1) * blockSize,
                        (y + 1) * blockSize
                    );
                    gradient.addColorStop(0, color);
                    gradient.addColorStop(1, this.adjustColor(color, -30));
                    
                    this.ctx.shadowColor = color;
                    this.ctx.shadowBlur = 5;
                    this.ctx.fillStyle = gradient;
                    this.ctx.fillRect(
                        x * blockSize,
                        y * blockSize,
                        blockSize - 1,
                        blockSize - 1
                    );
                    this.ctx.shadowBlur = 0;
                }
            });
        });
    }

    adjustColor(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
        const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
        const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    renderCurrentPiece() {
        if (!this.game.currentPiece) return;  // Skip if no current piece
        const piece = this.game.currentPiece;
        const blockSize = this.leftCanvas.width / 10;
        const color = COLORS[piece.type];

        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    this.ctx.fillStyle = color;
                    this.ctx.fillRect(
                        (piece.position.x + x) * blockSize,
                        (piece.position.y + y) * blockSize,
                        blockSize - 1,
                        blockSize - 1
                    );
                }
            });
        });
    }

    renderOpponentGame(data) {
        this.opponentCtx.clearRect(0, 0, this.rightCanvas.width, this.rightCanvas.height);
        
        // Render opponent's board
        const blockSize = this.rightCanvas.width / 10;
        data.board.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    this.opponentCtx.fillStyle = COLORS[value];
                    this.opponentCtx.fillRect(
                        x * blockSize, 
                        y * blockSize, 
                        blockSize - 1, 
                        blockSize - 1
                    );
                }
            });
        });

        // Render opponent's current piece
        if (data.currentPiece) {
            const piece = data.currentPiece;
            const color = COLORS[piece.type];
            piece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        this.opponentCtx.fillStyle = color;
                        this.opponentCtx.fillRect(
                            (piece.position.x + x) * blockSize,
                            (piece.position.y + y) * blockSize,
                            blockSize - 1,
                            blockSize - 1
                        );
                    }
                });
            });
        }

        // Update opponent's score
        const scoreElement = data.playerId === 'player1' ? 'score1' : 'score2';
        document.getElementById(scoreElement).textContent = data.score;
    }

    renderPreviewQueue() {
        const blockSize = 20;
        const padding = 10;
        const pieceSpacing = 70; // Increased spacing between pieces
        this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
        
        this.game.pieceQueue.forEach((type, index) => {
            const shape = SHAPES[type];
            const color = COLORS[type];
            
            // Calculate dimensions and centering
            const pieceWidth = shape[0].length * blockSize;
            const pieceHeight = shape.length * blockSize;
            const xOffset = (this.previewCanvas.width - pieceWidth) / 2;
            const yBase = index * pieceSpacing + padding;
            
            // Additional vertical adjustments for specific pieces
            let yAdjust = 0;
            if (type === 'I') yAdjust = blockSize / 2;
            if (type === 'O') yAdjust = -blockSize / 2;
            
            // Draw piece with border
            shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        const xPos = xOffset + x * blockSize;
                        const yPos = yBase + y * blockSize + yAdjust;
                        
                        // Draw block background
                        this.previewCtx.fillStyle = color;
                        this.previewCtx.fillRect(
                            xPos,
                            yPos,
                            blockSize - 1,
                            blockSize - 1
                        );
                        
                        // Draw block border
                        this.previewCtx.strokeStyle = '#000';
                        this.previewCtx.lineWidth = 0.5;
                        this.previewCtx.strokeRect(
                            xPos,
                            yPos,
                            blockSize - 1,
                            blockSize - 1
                        );
                    }
                });
            });
        });
    }
}

// Single initialization
window.addEventListener('DOMContentLoaded', () => {
    const leftCanvas = document.getElementById('player1');
    const rightCanvas = document.getElementById('player2');
    new GameClient(leftCanvas, rightCanvas);
});
