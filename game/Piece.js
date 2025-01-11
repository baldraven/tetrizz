import { WALLKICK_DATA, WALLKICK_DATA_I } from './Constants.js';

export default class Piece {
  constructor(shape, type) {
    this.shape = shape;
    this.type = type;
    this.position = { x: 3, y: 0 };
    this.rotationState = 0; // Track current rotation state (0-3)
  }

  getWallKickData(prevState, newState) {
    const kickData = this.type === 'I' ? WALLKICK_DATA_I : WALLKICK_DATA;
    return kickData[`${prevState}>${newState}`] || [];
  }

  rotateClockwise(shape = this.shape) {
    const N = shape.length;
    const M = shape[0].length;
    const rotated = [];
    
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
    const N = this.shape.length;
    const M = this.shape[0].length;
    const rotated = [];
    
    for (let i = M - 1; i >= 0; i--) {
      const row = [];
      for (let j = 0; j < N; j++) {
        row.push(this.shape[j][i]);
      }
      rotated.push(row);
    }
    return rotated;
  }

  rotate180() {
    let rotated = this.rotateClockwise();
    rotated = this.rotateClockwise(rotated);
    return rotated;
  }

  // Update rotate method to return necessary rotation info
  rotate(direction = 'clockwise') {
    const prevState = this.rotationState;
    let newState;
    let rotatedShape;

    switch (direction) {
      case 'clockwise':
        rotatedShape = this.rotateClockwise();
        newState = (this.rotationState + 1) % 4;
        break;
      case 'counterclockwise':
        rotatedShape = this.rotateCounterClockwise();
        newState = (this.rotationState + 3) % 4;
        break;
      case '180':
        rotatedShape = this.rotate180();
        newState = (this.rotationState + 2) % 4;
        break;
      default:
        return { shape: this.shape, kicks: [], newState: this.rotationState };
    }

    // For O piece, just return current shape without kicks
    if (this.type === 'O') {
      return {
        shape: this.shape,
        kicks: [],
        newState: this.rotationState
      };
    }

    // Ensure rotatedShape is a proper array
    if (!Array.isArray(rotatedShape)) {
      console.error('Invalid rotation result:', rotatedShape);
      return { shape: this.shape, kicks: [], newState: this.rotationState };
    }

    return {
      shape: rotatedShape,
      kicks: this.getWallKickData(prevState, newState),
      newState
    };
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
