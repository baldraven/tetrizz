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
                this.handleInput(event.key); // Immediate response
            }
        });

        document.addEventListener('keyup', (event) => {
            this.heldKeys.delete(event.key);
            this.moveCounter = 0;
        });
    }

    handleInput(key) {
        if (!this.game.currentPiece || !this.gameStarted) return;
        
        let needsNewPiece = false;
        
        switch(key) {
            case 'k':
                // If piece locks after soft drop, request new piece
                if (this.game.update() === 'locked') {
                    needsNewPiece = true;
                }
                break;
            case 'c':
                this.player.hardDrop();
                needsNewPiece = true;
                break;
            default:
                this.player.handleInput(key);
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

            // Handle held keys with auto-repeat
            this.moveCounter += deltaTime;
            if (this.moveCounter >= this.moveDelay) {
                const repeatInterval = this.moveCounter >= this.moveDelay + this.moveInterval;
                if (repeatInterval) {
                    this.heldKeys.forEach(key => {
                        if (['j', 'l', 'k'].includes(key)) { // Only auto-repeat movement keys
                            this.handleInput(key);
                        }
                    });
                    this.moveCounter = this.moveDelay; // Reset to delay point
                }
            }

            // Handle piece dropping
            this.dropCounter += deltaTime;
            if (this.dropCounter > this.game.getDropInterval()) {
                const updateResult = this.game.update();
                if (updateResult === 'locked') {
                    // Request new piece when current piece is locked
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

        grid.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    // Assuming value contains the piece type as string ('I', 'O', etc.)
                    this.ctx.fillStyle = COLORS[value];
                    this.ctx.fillRect(x * blockSize, y * blockSize, blockSize - 1, blockSize - 1);
                }
            });
        });
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
