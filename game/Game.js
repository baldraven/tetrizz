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
  }

  generatePiece() {
    if (!this.pieceQueue || this.pieceQueue.length === 0) {
      console.log('Waiting for piece queue...');
      return null;
    }
    const type = this.pieceQueue[0];
    // Don't remove the piece here, wait for server confirmation
    return new Piece(SHAPES[type], type);
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
    if (this.isGameOver || !this.currentPiece) return;

    const newPosition = this.currentPiece.move('down');
    if (this.board.isCollision(this.currentPiece, newPosition)) {
      this.lockPiece();
      return true; // Indicate that piece was locked
    } else {
      this.currentPiece.position = newPosition;
      return false;
    }
  }

  lockPiece() {
    if (!this.currentPiece) return;
    
    this.board.placePiece(this.currentPiece);
    const linesCleared = this.board.clearLines();
    this.updateScore(linesCleared);
    this.currentPiece = null;  // Set to null to trigger piece request
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
}
