import { COLORS } from '../../game/Constants.js';

export default class BoardRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.blockSize = 30; // Size of each tetris block
    
    // Set canvas size based on block size
    this.canvas.width = 10 * this.blockSize; // 10 columns
    this.canvas.height = 20 * this.blockSize; // 20 rows
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawBlock(x, y, type, alpha = 1) {
    const color = COLORS[type] || '#ffffff';
    
    // Main block
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(
      x * this.blockSize,
      y * this.blockSize,
      this.blockSize - 1,
      this.blockSize - 1
    );

    // Light edge
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.fillRect(
      x * this.blockSize,
      y * this.blockSize,
      this.blockSize - 1,
      2
    );
    this.ctx.fillRect(
      x * this.blockSize,
      y * this.blockSize,
      2,
      this.blockSize - 1
    );

    // Dark edge
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.fillRect(
      x * this.blockSize + this.blockSize - 2,
      y * this.blockSize,
      2,
      this.blockSize - 1
    );
    this.ctx.fillRect(
      x * this.blockSize,
      y * this.blockSize + this.blockSize - 2,
      this.blockSize - 1,
      2
    );

    this.ctx.globalAlpha = 1;
  }

  renderBoard(grid) {
    grid.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          this.drawBlock(x, y, value);
        }
      });
    });
  }

  renderPiece(piece) {
    if (!piece || !Array.isArray(piece.shape)) {
      console.warn('Invalid piece shape:', piece);
      return;
    }

    piece.shape.forEach((row, y) => {
      if (!Array.isArray(row)) {
        console.warn('Invalid row in piece shape:', row);
        return;
      }
      row.forEach((value, x) => {
        if (value) {
          this.drawBlock(
            piece.position.x + x,
            piece.position.y + y,
            piece.type
          );
        }
      });
    });
  }

  renderGhostPiece(ghostPiece, type) {
    if (!ghostPiece || !Array.isArray(ghostPiece.shape)) return;

    ghostPiece.shape.forEach((row, y) => {
      if (!Array.isArray(row)) return;
      row.forEach((value, x) => {
        if (value) {
          this.drawBlock(
            ghostPiece.position.x + x,
            ghostPiece.position.y + y,
            type,
            0.3 // transparency for ghost piece
          );
        }
      });
    });
  }

  renderGameEndOverlay(isWinner) {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.fillStyle = isWinner ? '#00ff00' : '#ff0000';
    this.ctx.font = 'bold 36px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const text = isWinner ? 'VICTORY!' : 'DEFEAT';
    this.ctx.fillText(
      text,
      this.canvas.width / 2,
      this.canvas.height / 2
    );
  }
}
