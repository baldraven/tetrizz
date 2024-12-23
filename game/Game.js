import { SHAPES, POINTS, LEVEL, COLORS } from './Constants.js';
import Board from './Board.js';
import Piece from './Piece.js';

export default class Game {
  constructor() {
    this.board = new Board();
    this.score = 0;
    this.level = 0;
    this.isGameOver = false;
    this.pieceQueue = [];  // Initialize empty queue
    this.currentPiece = null;  // Don't generate piece immediately
    this.lockDelay = 500; // 500ms lock delay
    this.lockTimer = 0;
    this.isLocking = false;
    this.lastMoveWasReset = false;
    this.holdPiece = null;
    this.hasHeldThisTurn = false;
  }

  generatePiece() {
    if (!this.pieceQueue || this.pieceQueue.length === 0) {
      console.log('Waiting for piece queue...');
      return null;
    }
    const type = this.pieceQueue.shift(); // Remove and get the next piece
    const piece = new Piece(SHAPES[type], type);
    
    // Check for top out (game over)
    if (this.board.isCollision(piece, piece.position)) {
      this.isGameOver = true;
      return null;
    }
    
    return piece;
  }

  // Add method to initialize the first piece
  initializeFirstPiece() {
    if (this.currentPiece === null && this.pieceQueue.length > 0) {
      this.currentPiece = this.generatePiece();
    }
  }

  updateQueue(newQueue) {
    this.pieceQueue = newQueue;
  }

  update() {
    if (this.isGameOver) return 'gameover';  // Add this line at the start
    if (this.isGameOver || !this.currentPiece) return;

    const newPosition = this.currentPiece.move('down');
    
    if (this.board.isCollision(this.currentPiece, newPosition)) {
        // Start lock delay if not already started
        if (!this.isLocking) {
            this.isLocking = true;
            this.lockTimer = this.lockDelay;
            return 'locking';
        }
        
        // Update lock timer
        this.lockTimer -= this.getDropInterval();
        
        // Lock piece when timer expires
        if (this.lockTimer <= 0) {
            this.lockPiece();
            this.isLocking = false;
            this.lastMoveWasReset = false;
            return 'locked';
        }
        return 'locking';
    } else {
        // Reset lock state when piece moves down successfully
        this.isLocking = false;
        this.lastMoveWasReset = false;
        this.currentPiece.position = newPosition;
        return 'moved';
    }
  }

  lockPiece() {
    if (!this.currentPiece) return;
    
    this.board.placePiece(this.currentPiece);
    const linesCleared = this.board.clearLines();
    this.updateScore(linesCleared);
    this.currentPiece = null;  // Set to null to trigger piece request
    this.hasHeldThisTurn = false; // Reset hold flag when piece locks
    
    // Check if any blocks are in the top row
    if (this.board.grid[0].some(cell => cell !== 0)) {
      this.isGameOver = true;
    }
  }

  updateScore(linesCleared) {
    switch(linesCleared) {
      case 1: this.score += POINTS.SINGLE; break;
      case 2: this.score += POINTS.DOUBLE; break;
      case 3: this.score += POINTS.TRIPLE; break;
      case 4: this.score += POINTS.TETRIS; break;
    }
    this.level = Math.floor(this.score / 1000);
  }

  getDropInterval() {
    const baseInterval = 1000; // 1 second base interval
    const speedFactor = Math.pow(0.8, this.level); // Exponential speed increase
    return baseInterval * speedFactor;
  }

  getGhostPiecePosition() {
    let ghostPiece = {
      shape: this.currentPiece.shape,
      position: { ...this.currentPiece.position }
    };

    while (!this.board.isCollision(ghostPiece, {
      x: ghostPiece.position.x,
      y: ghostPiece.position.y + 1
    })) {
      ghostPiece.position.y++;
    }

    return ghostPiece;
  }

  // Add method to handle movements during lock delay
  tryMove(newPosition) {
    if (this.isLocking && !this.lastMoveWasReset && 
        !this.board.isCollision(this.currentPiece, newPosition)) {
        // Allow 15 move resets maximum
        this.lockTimer = this.lockDelay;
        this.lastMoveWasReset = true;
        return true;
    }
    return !this.board.isCollision(this.currentPiece, newPosition);
  }

  holdCurrentPiece() {
    if (this.hasHeldThisTurn || !this.currentPiece) return false;
    
    const currentType = this.currentPiece.type;
    const currentShape = SHAPES[currentType];
    
    if (this.holdPiece === null) {
        // Store current piece in hold
        this.holdPiece = { type: currentType, shape: currentShape };
        // Current piece becomes null to trigger next piece request
        this.currentPiece = null;
    } else {
        // Swap current piece with hold piece
        const tempHold = this.holdPiece;
        this.holdPiece = { type: currentType, shape: currentShape };
        this.currentPiece = new Piece(SHAPES[tempHold.type], tempHold.type);
    }
    
    this.hasHeldThisTurn = true;
    return true;
  }

  handleInput(key) {
    if (this.isGameOver) return false;  // Add this line at the start
    // ...existing code...
  }
}
