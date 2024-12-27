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
        this.previewCanvas.classList.add('preview-queue');
        
        // Find the preview section and append the canvas to it
        const previewSection = document.querySelector('.preview-section');
        previewSection.appendChild(this.previewCanvas);
        
        this.previewCtx = this.previewCanvas.getContext('2d');
        
        // Add hold piece canvases for both players
        const holdSections = document.querySelectorAll('.hold-section');
        this.holdCanvas = document.createElement('canvas');
        this.opponentHoldCanvas = document.createElement('canvas');
        
        [this.holdCanvas, this.opponentHoldCanvas].forEach((canvas, index) => {
            canvas.width = 80;
            canvas.height = 80;
            canvas.classList.add('hold-piece');
        });

        // Append to correct sections
        document.querySelector('.player1-hold').appendChild(this.holdCanvas);
        document.querySelector('.player2-hold').appendChild(this.opponentHoldCanvas);
        
        this.holdCtx = this.holdCanvas.getContext('2d');
        this.opponentHoldCtx = this.opponentHoldCanvas.getContext('2d');
        
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
        this.gameOver = false;
        this.isWinner = false;  // Add this line
        this.opponentGameOver = false;  // Add this line
        this.restartButton = null;
        this.createRestartButton();
    }

    createRestartButton() {
        this.restartButton = document.createElement('button');
        this.restartButton.className = 'restart-button';
        this.restartButton.textContent = 'Play Again';
        this.restartButton.style.display = 'none';
        this.restartButton.addEventListener('click', () => {
            this.socket.emit('requestRestart');
            this.restartButton.style.display = 'none';
        });
        document.body.appendChild(this.restartButton);
    }

    setupSocketEvents() {
        this.socket.on('playerAssigned', ({ playerId, gameState, currentQueue }) => {
            console.log('Assigned as:', playerId);
            this.playerId = playerId;
            
            // Clear both canvases first
            const leftCtx = this.leftCanvas.getContext('2d');
            const rightCtx = this.rightCanvas.getContext('2d');
            
            // Assign contexts based on player role
            if (this.playerId === 'player1') {
                this.ctx = leftCtx;
                this.opponentCtx = rightCtx;
                this.holdCtx = this.holdCanvas.getContext('2d');
                this.opponentHoldCtx = this.opponentHoldCanvas.getContext('2d');
                document.querySelector('.player-section:first-child h2').style.color = 'red';
            } else {
                this.ctx = rightCtx;
                this.opponentCtx = leftCtx;
                this.holdCtx = this.opponentHoldCanvas.getContext('2d');
                this.opponentHoldCtx = this.holdCanvas.getContext('2d');
                document.querySelector('.player-section:last-child h2').style.color = 'red';
            }

            // Restore game state if exists
            if (gameState && gameState.board.length > 0) {
                this.game.board.grid = gameState.board;
                this.game.score = gameState.score;
                this.game.level = gameState.level;
                this.game.holdPiece = gameState.holdPiece;
                this.game.pieceQueue = currentQueue;
                
                if (gameState.currentPiece) {
                    this.game.currentPiece = new Piece(
                        SHAPES[gameState.currentPiece.type],
                        gameState.currentPiece.type
                    );
                    this.game.currentPiece.position = gameState.currentPiece.position;
                }
                
                this.gameStarted = true;
                this.renderPreviewQueue();
                this.startGameLoop();
            }
        });

        this.socket.on('startGame', ({ firstPiece, initialQueue }) => {
            console.log('Game started/restarted with piece:', firstPiece, 'and queue:', initialQueue);
            this.gameStarted = true;
            this.game.pieceQueue = initialQueue;
            if (!this.game.currentPiece && firstPiece) {
                this.game.currentPiece = new Piece(SHAPES[firstPiece], firstPiece);
            }
            this.renderPreviewQueue();
            this.startGameLoop();
        });

        this.socket.on('gameUpdate', (data) => {
            if (data.playerId !== this.playerId) {
                this.renderOpponentGame(data);
                // Track opponent's game over state
                if (data.isGameOver) {
                    this.opponentGameOver = true;
                    this.isWinner = true;
                    this.gameOver = true;
                    this.showGameEndScreens();  // Changed from showWinScreen
                }
            }
        });

        this.socket.on('queueUpdate', ({ queue, nextPiece }) => {
            this.game.pieceQueue = queue;
            if (nextPiece && this.game.currentPiece === null) {
                this.game.currentPiece = new Piece(SHAPES[nextPiece], nextPiece);
            }
            this.renderPreviewQueue();
        });

        this.socket.on('gameOver', ({ winner }) => {
            this.gameOver = true;
            this.isWinner = winner === this.playerId;
            this.showGameEndScreens();
            this.restartButton.style.display = 'block';
        });

        this.socket.on('gameRestart', () => {
            this.restartGame();
        });

        // Remove the gameOver socket event as we'll handle it through gameUpdate
    }

    showGameEndScreens() {
        // Draw player's board outcome
        this.drawGameEndOverlay(this.ctx, true); // true = is player's board
        
        // Draw opponent's board outcome
        this.drawGameEndOverlay(this.opponentCtx, false); // false = is opponent's board
    }

    drawGameEndOverlay(ctx, isPlayerBoard) {
        // Draw overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.leftCanvas.width, this.leftCanvas.height);

        // Draw text
        ctx.font = '30px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (this.isWinner === isPlayerBoard) {
            // Show VICTORY on winner's board, DEFEAT on loser's board
            ctx.fillStyle = '#00ff00';
            ctx.fillText('VICTORY!', ctx.canvas.width / 2, ctx.canvas.height / 2);
        } else {
            ctx.fillStyle = '#ff0000';
            ctx.fillText('DEFEAT!', ctx.canvas.width / 2, ctx.canvas.height / 2);
        }
    }

    restartGame() {
        // Reset game state
        this.gameOver = false;
        this.isWinner = false;
        this.opponentGameOver = false;
        this.game = new Game();
        this.player = new Player(this.game);
        this.restartButton.style.display = 'none';

        // Clear both canvases
        [this.ctx, this.opponentCtx].forEach(ctx => {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        });

        // Reset scores
        document.getElementById('score1').textContent = '0';
        document.getElementById('score2').textContent = '0';

        // Clear hold pieces
        [this.holdCtx, this.opponentHoldCtx].forEach(ctx => {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        });

        // Clear preview queue
        this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    }

    setupEvents() {
        document.addEventListener('keydown', (event) => {
            if (!this.gameStarted) return;
            
            // Always process new key even if already held
            this.handleInput(event.key);
            // Then add to held keys set
            this.heldKeys.add(event.key);
        });

        document.addEventListener('keyup', (event) => {
            this.heldKeys.delete(event.key);
        });
    }

    handleInput(key) {
        if (this.gameOver) return;
        if (!this.game.currentPiece || !this.gameStarted) return;
        
        const now = performance.now();
        let needsNewPiece = false;
        let inputProcessed = false;

        // Process movement inputs
        if (['j', 'l'].includes(key)) {
            if (now - this.lastMoveTime >= this.DCD) {
                this.player.move(key === 'j' ? 'left' : 'right');
                this.lastMoveTime = now;
                inputProcessed = true;
            }
        }

        // Process rotation inputs (always process regardless of timing)
        if (['a', 's', 'q'].includes(key)) {
            const direction = {
                'a': 'counterclockwise',
                's': 'clockwise',
                'q': '180'
            }[key];
            this.player.rotate(direction);
            inputProcessed = true;
        }

        // Process other inputs
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
                inputProcessed = true;
                break;
            case 'c':
                this.player.hardDrop();
                needsNewPiece = true;
                inputProcessed = true;
                break;
            case 'd':
                if (this.game.holdCurrentPiece()) {
                    if (this.game.currentPiece === null) {
                        this.socket.emit('requestPiece');
                    }
                }
                inputProcessed = true;
                break;
        }

        if (inputProcessed) {
            this.sendGameState();
            if (needsNewPiece || this.game.currentPiece === null) {
                this.socket.emit('requestPiece');
            }
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
            },
            holdPiece: this.game.holdPiece,
            isGameOver: this.game.isGameOver
        };
        this.socket.emit('gameUpdate', state);

        if (this.game.isGameOver && !this.gameOver) {
            this.gameOver = true;
            this.isWinner = false;
            this.showGameEndScreens();  // Changed from showGameOver
        }
        
        // Update score based on player role
        const scoreElement = this.playerId === 'player1' ? 'score1' : 'score2';
        document.getElementById(scoreElement).textContent = this.game.score;
    }

    startGameLoop() {
        const gameLoop = (timestamp) => {
            if (this.gameOver) return;
            const deltaTime = timestamp - this.lastTime;
            this.lastTime = timestamp;

            // Handle held keys with DAS
            if (this.heldKeys.size > 0) {
                this.dasTimer += deltaTime;
                
                if (this.dasTimer >= this.DAS) {
                    this.heldKeys.forEach(key => {
                        if (['j', 'l'].includes(key)) {
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
        this.renderHoldPiece();  // Add this line

        // Re-render game over/victory overlay if game is over
        if (this.gameOver) {
            this.showGameEndScreens();  // This will be the only place we call showGameEndScreens
        }
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

    renderHoldPiece(piece = this.game.holdPiece, context = this.holdCtx) {
        if (!piece) return;
        
        context.clearRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);
        const blockSize = 20;
        const shape = piece.shape;
        const color = COLORS[piece.type];
        
        // Center the piece
        const pieceWidth = shape[0].length * blockSize;
        const pieceHeight = shape.length * blockSize;
        const xOffset = (this.holdCanvas.width - pieceWidth) / 2;
        const yOffset = (this.holdCanvas.height - pieceHeight) / 2;
        
        shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    context.fillStyle = color;
                    context.fillRect(
                        xOffset + x * blockSize,
                        yOffset + y * blockSize,
                        blockSize - 1,
                        blockSize - 1
                    );
                    
                    context.strokeStyle = '#000';
                    context.lineWidth = 0.5;
                    context.strokeRect(
                        xOffset + x * blockSize,
                        yOffset + y * blockSize,
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

        // Render opponent's hold piece
        if (data.holdPiece) {
            this.renderHoldPiece(data.holdPiece, this.opponentHoldCtx);
        }

        // Update opponent's score
        const scoreElement = data.playerId === 'player1' ? 'score1' : 'score2';
        document.getElementById(scoreElement).textContent = data.score;

        // Show game over on opponent's board if they lost
        if (data.isGameOver) {
            // Remove the showGameEndScreens call from here since it's already called in render()
            this.opponentGameOver = true;
            this.isWinner = true;
            this.gameOver = true;
        }
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
