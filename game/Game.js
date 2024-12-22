import { SHAPES, POINTS, LEVEL, COLORS } from './Constants.js';
import Board from './Board.js';
import Piece from './Piece.js';

export default class Game {
  constructor() {
    this.board = new Board();
    this.score = 0;
    this.level = 0;
    this.isGameOver = false;
    this.currentPiece = this.generatePiece();
  }

  generatePiece() {
    const types = Object.keys(SHAPES);
    const type = types[Math.floor(Math.random() * types.length)];
    return new Piece(SHAPES[type], type);
  }

  update() {
    if (this.isGameOver) return;

    const newPosition = this.currentPiece.move('down');
    if (this.board.isCollision(this.currentPiece, newPosition)) {
      this.board.placePiece(this.currentPiece);
      const linesCleared = this.board.clearLines();
      this.updateScore(linesCleared);
      this.currentPiece = this.generatePiece();
      
      if (this.board.isCollision(this.currentPiece, this.currentPiece.position)) {
        this.isGameOver = true;
      }
    } else {
      this.currentPiece.position = newPosition;
    }
  }

  lockPiece() {
    this.board.placePiece(this.currentPiece);
    const linesCleared = this.board.clearLines();
    this.updateScore(linesCleared);
    this.currentPiece = this.generatePiece();
    
    if (this.board.isCollision(this.currentPiece, this.currentPiece.position)) {
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
}
