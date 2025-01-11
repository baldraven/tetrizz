import { SHAPES, COLORS } from '../../game/Constants.js';  // Fix path to Constants

export default class PreviewRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.blockSize = 20;  // Increased from 15
        this.padding = 15;    // Increased from 8
        this.pieceSpacing = 60;  // Increased from 45
    }

    render(pieceQueue) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        pieceQueue.forEach((type, index) => {
            this.renderPiece(type, index);
        });
    }

    renderPiece(type, index) {
        const shape = SHAPES[type];
        const color = COLORS[type];
        
        const pieceWidth = shape[0].length * this.blockSize;
        const xOffset = (this.canvas.width - pieceWidth) / 2;
        const yBase = index * this.pieceSpacing + this.padding;
        
        let yAdjust = type === 'I' ? this.blockSize / 2 : 
                      type === 'O' ? -this.blockSize / 2 : 0;
        
        shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    this.drawBlock(
                        xOffset + x * this.blockSize,
                        yBase + y * this.blockSize + yAdjust,
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
