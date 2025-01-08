import { SHAPES, COLORS } from '../../game/Constants.js';  // Fix path to Constants

export default class HoldRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.blockSize = 20;
    }

    render(piece) {
        if (!piece) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const shape = piece.shape;
        const color = COLORS[piece.type];
        
        const pieceWidth = shape[0].length * this.blockSize;
        const pieceHeight = shape.length * this.blockSize;
        const xOffset = (this.canvas.width - pieceWidth) / 2;
        const yOffset = (this.canvas.height - pieceHeight) / 2;
        
        shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    this.drawBlock(
                        xOffset + x * this.blockSize,
                        yOffset + y * this.blockSize,
                        color
                    );
                }
            });
        });
    }

    drawBlock(x, y, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, this.blockSize - 1, this.blockSize - 1);
        
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 0.5;
        this.ctx.strokeRect(x, y, this.blockSize - 1, this.blockSize - 1);
    }
}
