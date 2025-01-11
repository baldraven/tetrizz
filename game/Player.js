export default class Player {
  constructor(game) {
    this.game = game;
  }

  move(direction) {
    const newPosition = this.game.currentPiece.move(direction);
    if (this.game.tryMove(newPosition)) {
      this.game.currentPiece.position = newPosition;
    }
  }

  rotate(direction = 'clockwise') {
    if (!this.game.currentPiece) return;
    this.game.rotate(direction);
  }

  hardDrop() {
    while (!this.game.board.isCollision(
      this.game.currentPiece,
      this.game.currentPiece.move('down')
    )) {
      this.game.currentPiece.position = this.game.currentPiece.move('down');
    }
    this.game.lockPiece(); // Instantly lock the piece
  }

  handleInput(key) {
    if (!this.game.currentPiece) return;

    switch(key) {
        case 'j':
            this.move('left');
            break;
        case 'l':
            this.move('right');
            break;
        case 'k':
            this.move('down');
            break;
        case 'a':
            this.rotate('counterclockwise');
            break;
        case 's':
            this.rotate('clockwise');
            break;
        case 'q':
            this.rotate('180');
            break;
        case 'd':
            this.holdPiece();
            break;
    }
  }

  holdPiece() {
    this.game.holdCurrentPiece();
  }
}
