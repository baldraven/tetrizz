export default class Piece {
  constructor(shape) {
    this.shape = shape;
    this.position = { x: 3, y: 0 };
  }

  rotate() {
    const rotated = [];
    for (let i = 0; i < this.shape[0].length; i++) {
      const row = [];
      for (let j = this.shape.length - 1; j >= 0; j--) {
        row.push(this.shape[j][i]);
      }
      rotated.push(row);
    }
    return rotated;
  }

  move(direction) {
    const newPosition = { ...this.position };
    switch (direction) {
      case 'left':
        newPosition.x--;
        break;
      case 'right':
        newPosition.x++;
        break;
      case 'down':
        newPosition.y++;
        break;
    }
    return newPosition;
  }
}
