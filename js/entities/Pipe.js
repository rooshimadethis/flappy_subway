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

        // Safe Gradient Creation with Caching
        if (!this.gradient) {
            try {
                // Create gradient relative to 0,0 since we will translate
                this.gradient = ctx.createLinearGradient(0, 0, CONFIG.flappy.pipes.width, 0);
                this.gradient.addColorStop(0, '#229954');
                this.gradient.addColorStop(0.5, '#2ECC71');
                this.gradient.addColorStop(1, '#27AE60');
            } catch (e) {
                this.gradient = '#2ECC71';
            }
        }

        ctx.save();
        ctx.translate(this.x, 0); // Translate to pipe position

        ctx.fillStyle = this.gradient;
        const borderColor = '#1E8449';
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;

        // Draw relative to (0,0)
        ctx.fillRect(0, 0, CONFIG.flappy.pipes.width, this.topHeight);
        ctx.strokeRect(0, 0, CONFIG.flappy.pipes.width, this.topHeight);

        ctx.fillRect(-5, this.topHeight - 30, CONFIG.flappy.pipes.width + 10, 30);
        ctx.strokeRect(-5, this.topHeight - 30, CONFIG.flappy.pipes.width + 10, 30);

        const bottomY = this.topHeight + CONFIG.flappy.pipes.gap;
        const bottomHeight = CONFIG.flappy.canvas.height - bottomY - 100;
        ctx.fillRect(0, bottomY, CONFIG.flappy.pipes.width, bottomHeight);
        ctx.strokeRect(0, bottomY, CONFIG.flappy.pipes.width, bottomHeight);

        ctx.fillRect(-5, bottomY, CONFIG.flappy.pipes.width + 10, 30);
        ctx.strokeRect(-5, bottomY, CONFIG.flappy.pipes.width + 10, 30);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(10, 0, 10, this.topHeight - 30);
        ctx.fillRect(10, bottomY + 30, 10, bottomHeight - 30);

        ctx.restore();
    }

    isOffScreen() {
        return this.x + CONFIG.flappy.pipes.width < 0;
    }
}
