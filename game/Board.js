export default class Board {
  constructor(width = 10, height = 20) {
    this.width = width;
    this.height = height;
    this.grid = Array(height).fill().map(() => Array(width).fill(0));
  }

  isCollision(piece, position) {
    return piece.shape.some((row, dy) => 
      row.some((value, dx) => {
        if (!value) return false;
        const newX = position.x + dx;
        const newY = position.y + dy;
        return newX < 0 || newX >= this.width ||
               newY >= this.height ||
               this.grid[newY][newX];
      })
    );
  }

  clearLines() {
    let linesCleared = 0;
    this.grid = this.grid.filter(row => {
      if (row.every(cell => cell)) {
        linesCleared++;
        return false;
      }
      return true;
    });
    
    while (this.grid.length < this.height) {
      this.grid.unshift(Array(this.width).fill(0));
    }
    return linesCleared;
  }

  placePiece(piece) {
    piece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          this.grid[piece.position.y + y][piece.position.x + x] = value;
        }
      });
    });
  }
}
