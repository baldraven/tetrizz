export default class Player {
  constructor(game) {
    this.game = game;
  }

  move(direction) {
    const newPosition = this.game.currentPiece.move(direction);
    if (!this.game.board.isCollision(this.game.currentPiece, newPosition)) {
      this.game.currentPiece.position = newPosition;
    }
  }

  rotate(direction = 'clockwise') {
    const rotated = this.game.currentPiece.rotate(direction);
    const currentPosition = this.game.currentPiece.position;
    // Create a test piece with the same format as the current piece
    const testPiece = {
      shape: rotated,
      position: currentPosition
    };
    
    if (!this.game.board.isCollision(testPiece, currentPosition)) {
      this.game.currentPiece.shape = rotated;
    }
  }

  hardDrop() {
    while (!this.game.board.isCollision(
      this.game.currentPiece,
      this.game.currentPiece.move('down')
    )) {
      this.move('down');
    }
  }
}
