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

  rotate() {
    const rotated = this.game.currentPiece.rotate();
    const currentPosition = this.game.currentPiece.position;
    if (!this.game.board.isCollision({ shape: rotated, position: currentPosition })) {
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
