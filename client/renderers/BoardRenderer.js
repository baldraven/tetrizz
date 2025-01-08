import { COLORS } from '../../game/Constants.js';

export default class BoardRenderer {
    constructor(canvas, blockSize = 30) {
        this.ctx = canvas.getContext('2d');
        this.canvas = canvas;
        this.blockSize = blockSize;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    renderBoard(grid) {
        // Draw grid background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        for (let y = 0; y < 20; y++) {
            for (let x = 0; x < 10; x++) {
                this.ctx.fillRect(
                    x * this.blockSize, 
                    y * this.blockSize, 
                    this.blockSize - 1, 
                    this.blockSize - 1
                );
            }
        }

        // Draw pieces
        grid.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    this.renderBlock(x, y, value);
                }
            });
        });
    }

    renderPiece(piece) {
        if (!piece) return;
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    this.renderBlock(
                        piece.position.x + x,
                        piece.position.y + y,
                        piece.type
                    );
                }
            });
        });
    }

    renderGhostPiece(ghostPiece, type) {
        const color = COLORS[type];
        const [r, g, b] = this.hexToRgb(color);
        
        ghostPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.2)`;
                    this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
                    this.renderGhostBlock(
                        ghostPiece.position.x + x,
                        ghostPiece.position.y + y
                    );
                }
            });
        });
    }

    renderGameEndOverlay(isWinner) {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.font = '30px "Press Start 2P"';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = isWinner ? '#00ff00' : '#ff0000';
        this.ctx.fillText(
            isWinner ? 'VICTORY!' : 'DEFEAT!',
            this.canvas.width / 2,
            this.canvas.height / 2
        );
    }

     renderBlock(x, y, type) {
        const color = COLORS[type] || COLORS.garbage;
        const gradient = this.createBlockGradient(x, y, color);
        
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 5;
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(
            x * this.blockSize,
            y * this.blockSize,
            this.blockSize - 1,
            this.blockSize - 1
        );
        this.ctx.shadowBlur = 0;
    }

     renderGhostBlock(x, y) {
        this.ctx.fillRect(
            x * this.blockSize,
            y * this.blockSize,
            this.blockSize - 1,
            this.blockSize - 1
        );
        this.ctx.strokeRect(
            x * this.blockSize,
            y * this.blockSize,
            this.blockSize - 1,
            this.blockSize - 1
        );
    }

     createBlockGradient(x, y, color) {
        const gradient = this.ctx.createLinearGradient(
            x * this.blockSize,
            y * this.blockSize,
            (x + 1) * this.blockSize,
            (y + 1) * this.blockSize
        );
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, this.adjustColor(color, -30));
        return gradient;
    }

     hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ];
    }

     adjustColor(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
        const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
        const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
        return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
    }
}
