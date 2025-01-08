import Game from '../game/Game.js';
import Player from '../game/Player.js';
import { SHAPES } from '../game/Constants.js';
import Piece from '../game/Piece.js';
import BoardRenderer from './renderers/BoardRenderer.js';
import PreviewRenderer from './renderers/PreviewRenderer.js';
import HoldRenderer from './renderers/HoldRenderer.js';
import GameNetwork from './network/GameNetwork.js';
import InputHandler from './input/InputHandler.js';

export default class GameClient {
    constructor(leftCanvas, rightCanvas) {
        this.setupGame();
        this.setupRenderers(leftCanvas, rightCanvas);
        this.setupNetwork();
        this.setupInput();
        this.createRestartButton();
        
        this.lastTime = 0;
        this.dropCounter = 0;
        this.gameStarted = false;
        this.gameOver = false;
        this.isWinner = false;
    }

    setupGame() {
        this.game = new Game();
        this.player = new Player(this.game);
        this.setupGameCallbacks();
    }

    setupRenderers(leftCanvas, rightCanvas) {
        this.playerRenderer = new BoardRenderer(leftCanvas);
        this.opponentRenderer = new BoardRenderer(rightCanvas);
        
        // Setup preview renderer with error handling
        const previewCanvas = document.querySelector('.preview-queue');
        if (!previewCanvas) {
            console.error('Preview canvas not found!');
            return;
        }
        this.previewRenderer = new PreviewRenderer(previewCanvas);
        
        // Setup hold renderers
        const holdCanvas = document.querySelector('.player1-hold .hold-piece');
        const opponentHoldCanvas = document.querySelector('.player2-hold .hold-piece');
        
        if (!holdCanvas || !opponentHoldCanvas) {
            console.error('Hold canvases not found!');
            return;
        }
        
        this.holdRenderer = new HoldRenderer(holdCanvas);
        this.opponentHoldRenderer = new HoldRenderer(opponentHoldCanvas);
    }

    setupNetwork() {
        const handlers = {
            playerAssigned: this.handlePlayerAssigned.bind(this),
            startGame: this.handleGameStart.bind(this),
            gameUpdate: this.handleGameUpdate.bind(this),
            queueUpdate: this.handleQueueUpdate.bind(this),
            gameOver: this.handleGameOver.bind(this),
            gameRestart: this.handleGameRestart.bind(this),
            receiveGarbage: this.handleReceiveGarbage.bind(this)
        };
        
        this.network = new GameNetwork(handlers);
    }

    setupInput() {
        this.input = new InputHandler();
        this.input.setupEvents(this.handleInput.bind(this));
    }

    setupGameCallbacks() {
        this.game.onGarbageSend = amount => this.network.sendGarbage(amount);
        this.game.onTSpin = lines => this.showPopup('tspin', lines);
        this.game.onCombo = combo => this.showPopup('combo', combo);
    }

    handleInput(key) {
        if (this.gameOver || !this.gameStarted) return;
        
        let needsNewPiece = false;
        
        if (key === 'c') {
            this.player.hardDrop();
            needsNewPiece = true;
        } else {
            this.player.handleInput(key);
            if (this.game.currentPiece === null) {
                needsNewPiece = true;
            }
        }

        this.sendGameState();
        if (needsNewPiece) {
            this.network.requestPiece();
        }
    }

    handlePlayerAssigned({ playerId, gameState, currentQueue }) {
        console.log('Assigned as:', playerId);
        this.playerId = playerId;
        
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
            this.startGameLoop();
        }
    }

    handleGameStart({ firstPiece, initialQueue }) {
        console.log('Game started with:', firstPiece);
        this.gameStarted = true;
        this.game.pieceQueue = initialQueue;
        if (!this.game.currentPiece && firstPiece) {
            this.game.currentPiece = new Piece(SHAPES[firstPiece], firstPiece);
        }
        this.startGameLoop();
    }

    handleGameUpdate(data) {
        if (data.playerId !== this.playerId) {
            this.renderOpponentGame(data);
            if (data.isGameOver) {
                this.opponentGameOver = true;
                this.isWinner = true;
                this.gameOver = true;
                this.render(); // Changed from this.showGameEndScreens()
            }
        }
    }

    handleQueueUpdate({ queue, nextPiece }) {
        this.game.pieceQueue = queue;
        if (nextPiece && this.game.currentPiece === null) {
            this.game.currentPiece = new Piece(SHAPES[nextPiece], nextPiece);
        }
    }

    handleGameOver({ winner }) {
        this.gameOver = true;
        this.isWinner = winner === this.playerId;
        this.render(); // Changed from this.showGameEndScreens()
        this.restartButton.style.display = 'block';
    }

    handleGameRestart() {
        this.restartGame();
    }

    // Add the missing restartGame method
    restartGame() {
        // Reset game state
        this.gameOver = false;
        this.isWinner = false;
        this.game = new Game();
        this.player = new Player(this.game);
        this.setupGameCallbacks();
        this.gameStarted = false;
        this.dropCounter = 0;
        
        // Clear renderers
        this.playerRenderer?.clear();
        this.opponentRenderer?.clear();
        this.previewRenderer?.render([]);
        this.holdRenderer?.render(null);
        this.opponentHoldRenderer?.render(null);
        
        // Hide restart button
        this.restartButton.style.display = 'none';
    }

    handleReceiveGarbage({ amount }) {
        console.log('Received garbage:', amount);
        this.game.receiveGarbage(amount);
    }

    createRestartButton() {
        this.restartButton = document.createElement('button');
        this.restartButton.className = 'restart-button';
        this.restartButton.textContent = 'Play Again';
        this.restartButton.style.display = 'none';
        this.restartButton.addEventListener('click', () => {
            this.network.requestRestart();
            this.restartButton.style.display = 'none';
        });
        document.body.appendChild(this.restartButton);
    }

    showPopup(type, value) {
        const popup = document.createElement('div');
        popup.className = `${type}-popup`;
        
        if (type === 'tspin') {
            popup.textContent = value > 0 ? 
                `T-SPIN ${['SINGLE', 'DOUBLE', 'TRIPLE'][value-1]}!` : 
                'T-SPIN!';
        } else if (type === 'combo') {
            if (value <= 1) return;
            popup.textContent = `${value} COMBO!`;
        }

        const playerSection = document.querySelector('.player-section:first-child');
        popup.style.left = '50%';
        popup.style.top = type === 'tspin' ? '40%' : '50%';
        playerSection.appendChild(popup);
        
        setTimeout(() => popup.remove(), 1000);
    }

    updateGame(deltaTime) {
        this.dropCounter += deltaTime;
        if (this.dropCounter > this.game.getDropInterval()) {
            const updateResult = this.game.update();
            if (updateResult === 'locked') {
                this.network.requestPiece();
            }
            this.dropCounter = 0;
            this.sendGameState();
        }
    }

    sendGameState() {
        const state = {
            board: this.game.board.grid,
            level: this.game.level,
            playerId: this.playerId,
            currentPiece: this.game.currentPiece ? {
                shape: this.game.currentPiece.shape,
                position: this.game.currentPiece.position,
                type: this.game.currentPiece.type
            } : null,
            holdPiece: this.game.holdPiece,
            isGameOver: this.game.isGameOver, // Make sure this is included
            garbageQueue: this.game.garbageQueue,
            combo: this.game.combo
        };
        this.network.sendGameState(state);

        // Add immediate game over check
        if (this.game.isGameOver && !this.gameOver) {
            this.gameOver = true;
            this.isWinner = false;
            this.network.sendGameState({...state, isGameOver: true});
        }
    }

    startGameLoop() {
        const gameLoop = (timestamp) => {
            if (this.gameOver) return;
            
            const deltaTime = timestamp - this.lastTime;
            this.lastTime = timestamp;

            this.input.update(deltaTime, this.handleInput.bind(this));
            this.updateGame(deltaTime);
            this.render();

            requestAnimationFrame(gameLoop);
        };

        requestAnimationFrame(gameLoop);
    }

    render() {
        if (!this.gameStarted) return;

        // Add null checks for renderers
        if (this.playerRenderer) {
            this.playerRenderer.clear();
            this.playerRenderer.renderBoard(this.game.board.grid);
            if (this.game.currentPiece) {
                this.playerRenderer.renderGhostPiece(
                    this.game.getGhostPiecePosition(),
                    this.game.currentPiece.type
                );
                this.playerRenderer.renderPiece(this.game.currentPiece);
            }
        }

        // Render preview queue
        if (this.previewRenderer) {
            this.previewRenderer.render(this.game.pieceQueue);
        }

        // Render hold pieces
        if (this.holdRenderer && this.game.holdPiece) {
            this.holdRenderer.render(this.game.holdPiece);
        }
        
        if (this.gameOver) {
            this.playerRenderer?.renderGameEndOverlay(this.isWinner);
            this.opponentRenderer?.renderGameEndOverlay(!this.isWinner);
        }
    }

    // Add the missing renderOpponentGame method
    renderOpponentGame(data) {
        // Render opponent's board
        this.opponentRenderer.clear();
        this.opponentRenderer.renderBoard(data.board);
        
        // Render opponent's current piece if exists
        if (data.currentPiece) {
            this.opponentRenderer.renderPiece(data.currentPiece);
        }
        
        // Render opponent's hold piece if exists
        if (data.holdPiece) {
            this.opponentHoldRenderer.render(data.holdPiece);
        }
    }

    // ... Add helper methods for popups, UI updates, etc.
}

// Initialize game
window.addEventListener('DOMContentLoaded', () => {
    new GameClient(
        document.getElementById('player1'),
        document.getElementById('player2')
    );
});
