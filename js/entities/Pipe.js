import { CONFIG } from '../config.js';

export default class Pipe {
    constructor(x) {
        this.x = x;
        this.topHeight = Math.random() * (CONFIG.flappy.pipes.maxHeight - CONFIG.flappy.pipes.minHeight) + CONFIG.flappy.pipes.minHeight;
        this.width = CONFIG.flappy.pipes.width;
        this.scored = false;
        this.gradient = null;
    }

    update(dt) {
        this.x -= CONFIG.flappy.pipes.speed * dt;
    }

    draw(ctx) {
        // Safety check for finite number
        if (!Number.isFinite(this.x)) {
            console.warn('Pipe X is non-finite, resetting');
            this.x = CONFIG.flappy.canvas.width;
            return;
        }

        ctx.save();
        ctx.translate(this.x, 0);

        const pipeColor = '#2ECC71';
        const borderColor = '#000';
        const borderWidth = 3;

        ctx.fillStyle = pipeColor;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;

        // Top Pipe
        ctx.fillRect(0, 0, this.width, this.topHeight);
        ctx.strokeRect(0, 0, this.width, this.topHeight);

        // Top Pipe Cap
        ctx.fillRect(-8, this.topHeight - 30, this.width + 16, 30);
        ctx.strokeRect(-8, this.topHeight - 30, this.width + 16, 30);

        const bottomY = this.topHeight + CONFIG.flappy.pipes.gap;
        const bottomHeight = CONFIG.flappy.canvas.height - bottomY;

        // Bottom Pipe
        ctx.fillRect(0, bottomY, this.width, bottomHeight);
        ctx.strokeRect(0, bottomY, this.width, bottomHeight);

        // Bottom Pipe Cap
        ctx.fillRect(-8, bottomY, this.width + 16, 30);
        ctx.strokeRect(-8, bottomY, this.width + 16, 30);

        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(8, 0, 8, this.topHeight - 30);
        ctx.fillRect(8, bottomY + 30, 8, bottomHeight - 30);

        ctx.restore();
    }

    isOffScreen() {
        return this.x + CONFIG.flappy.pipes.width < 0;
    }
}
