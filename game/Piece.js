export default class Piece {
  constructor(shape, type) {
    this.shape = shape;
    this.type = type;
    this.position = { x: 3, y: 0 };
  }

  rotate(direction = 'clockwise') {
    if (direction === 'clockwise') {
      return this.rotateClockwise();
    } else if (direction === '180') {
      return this.rotate180();
    } else {
      return this.rotateCounterClockwise();
    }
  }

  rotate180() {
    // Rotate twice clockwise for 180 degrees
    let rotated = this.rotateClockwise();
    rotated = this.rotateClockwise(rotated);
    return rotated;
  }

  rotateClockwise(shape = this.shape) {
    const rotated = [];
    const N = shape.length;
    const M = shape[0].length;
    
    for (let i = 0; i < M; i++) {
      const row = [];
      for (let j = N - 1; j >= 0; j--) {
        row.push(shape[j][i]);
      }
      rotated.push(row);
    }
    return rotated;
  }

  rotateCounterClockwise() {
    const rotated = [];
    const N = this.shape.length;
    const M = this.shape[0].length;
    
    for (let i = M - 1; i >= 0; i--) {
      const row = [];
      for (let j = 0; j < N; j++) {
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
