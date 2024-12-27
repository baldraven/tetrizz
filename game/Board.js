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

  addGarbageLines(garbageLines) {
    // Remove lines from the top
    this.grid.splice(0, garbageLines.length);
    
    // Add garbage lines at the bottom
    this.grid.push(...garbageLines);
    
    // Verify board height is correct
    while (this.grid.length < this.height) {
        this.grid.unshift(Array(this.width).fill(0));
    }
  }

  clearLines() {
    let linesCleared = 0;
    let newGrid = [];
    
    // Keep non-full lines
    for (let y = 0; y < this.height; y++) {
        if (!this.grid[y].every(cell => cell !== 0)) {
            newGrid.push(this.grid[y]);
        } else {
            linesCleared++;
        }
    }
    
    // Add new empty lines at the top
    while (newGrid.length < this.height) {
        newGrid.unshift(Array(this.width).fill(0));
    }
    
    this.grid = newGrid;
    return linesCleared;
  }

  placePiece(piece) {
    piece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          // Store the piece type instead of just 1
          this.grid[piece.position.y + y][piece.position.x + x] = piece.type;
        }
      });
    });
  }
}
