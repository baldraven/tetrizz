import { SHAPES, POINTS, LEVEL } from './Constants.js';
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
    const shapes = Object.values(SHAPES);
    const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
    return new Piece(randomShape);
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
    return LEVEL[Math.min(this.level, 5)];
  }
}
