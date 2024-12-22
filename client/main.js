import Game from '../game/Game.js';
import Player from '../game/Player.js';

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
        
        this.setupSocketEvents();
        this.setupEvents();
    }

    setupSocketEvents() {
        this.socket.on('playerAssigned', ({ playerId }) => {
            this.playerId = playerId;
            // Setup canvases based on player role
            if (this.playerId === 'player1') {
                this.ctx = this.leftCanvas.getContext('2d');
                this.opponentCtx = this.rightCanvas.getContext('2d');
            } else {
                this.ctx = this.rightCanvas.getContext('2d');
                this.opponentCtx = this.leftCanvas.getContext('2d');
            }
        });

        this.socket.on('startGame', () => {
            console.log('Game started!');
            this.gameStarted = true;
            this.startGameLoop(); // Both players start their game loops
        });

        this.socket.on('gameUpdate', (data) => {
            if (data.playerId !== this.playerId) {
                this.renderOpponentGame(data);
            }
        });
    }

    setupEvents() {
        document.addEventListener('keydown', (event) => {
            if (!this.gameStarted) return;
            
            switch(event.key) {
                case 'j':
                    this.player.move('left');
                    break;
                case 'l':
                    this.player.move('right');
                    break;
                case 'k':
                    this.player.move('down');
                    break;
                case 'a':
                    this.player.rotate('counterclockwise');
                    break;
                case 's':
                    this.player.rotate('clockwise');
                    break;
                case 'c':
                    this.player.hardDrop();
                    break;
            }
            this.sendGameState();
        });
    }

    sendGameState() {
        const state = {
            board: this.game.board.grid,
            score: this.game.score,
            level: this.game.level,
            playerId: this.playerId,
            currentPiece: {
                shape: this.game.currentPiece.shape,
                position: this.game.currentPiece.position
            }
        };
        this.socket.emit('gameUpdate', state);
        
        // Update score based on player role
        const scoreElement = this.playerId === 'player1' ? 'score1' : 'score2';
        document.getElementById(scoreElement).textContent = this.game.score;
    }

    startGameLoop() {
        let lastTime = 0;
        const gameLoop = (timestamp) => {
            const deltaTime = timestamp - lastTime;

            if (deltaTime > this.game.getDropInterval()) {
                this.game.update();
                this.render();
                this.sendGameState();
                lastTime = timestamp;
            }

            requestAnimationFrame(gameLoop);
        };

        requestAnimationFrame(gameLoop);
    }

    render() {
        this.ctx.clearRect(0, 0, this.leftCanvas.width, this.leftCanvas.height);
        this.renderBoard();
        this.renderCurrentPiece();
    }

    renderBoard() {
        const grid = this.game.board.grid;
        const blockSize = this.leftCanvas.width / 10;

        grid.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    this.ctx.fillStyle = '#000';
                    this.ctx.fillRect(x * blockSize, y * blockSize, blockSize - 1, blockSize - 1);
                }
            });
        });
    }

    renderCurrentPiece() {
        const piece = this.game.currentPiece;
        const blockSize = this.leftCanvas.width / 10;

        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    this.ctx.fillStyle = '#F00';
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
                    this.opponentCtx.fillStyle = '#000';
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
            piece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        this.opponentCtx.fillStyle = '#F00';
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
}

// Initialize game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    const leftCanvas = document.getElementById('player1');
    const rightCanvas = document.getElementById('player2');
    
    new GameClient(leftCanvas, rightCanvas);
});
