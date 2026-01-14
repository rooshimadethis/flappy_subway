import { CONFIG } from '../config.js';
import { logError } from '../utils.js';

export default class SubwayPlayer {
    constructor() {
        this.targetLane = 1;
        this.currentLane = 1;
        this.width = CONFIG.subway.player.width;
        this.height = CONFIG.subway.player.height;
        this.x = this.getLaneX(1);
        this.y = CONFIG.subway.player.y;
        this.animationFrame = 0;
        this.gradient = null;
    }

    getLaneX(lane) {
        const laneWidth = CONFIG.subway.player.laneWidth;
        const startX = (CONFIG.subway.canvas.width - laneWidth * 3) / 2;
        return startX + lane * laneWidth + laneWidth / 2 - this.width / 2;
    }

    moveLeft() {
        if (this.targetLane > 0) {
            this.targetLane--;
        }
    }

    moveRight() {
        if (this.targetLane < 2) {
            this.targetLane++;
        }
    }

    update(dt) {
        const targetX = this.getLaneX(this.targetLane);
        this.x += (targetX - this.x) * 0.3 * dt;

        if (Math.abs(targetX - this.x) < 1) {
            this.x = targetX;
            this.currentLane = this.targetLane;
        }

        this.animationFrame += 0.2 * dt;
    }

    draw(ctx) {
        try {
            // Safety Check
            if (!Number.isFinite(this.x) || !Number.isFinite(this.y)) {
                console.warn('Player coordinates non-finite:', this.x, this.y);
                this.x = this.getLaneX(1);
                this.y = CONFIG.subway.player.y;
                return;
            }

            ctx.save();
            ctx.translate(this.x, this.y);

            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(this.width / 2, this.height + 5, this.width / 2, 8, 0, 0, Math.PI * 2);
            ctx.fill();

            // Safe Gradient
            if (!this.gradient) {
                try {
                    this.gradient = ctx.createLinearGradient(0, 0, 0, this.height);
                    this.gradient.addColorStop(0, '#4ECDC4');
                    this.gradient.addColorStop(1, '#44A08D');
                } catch (e) {
                    this.gradient = '#4ECDC4';
                }
            }

            ctx.fillStyle = this.gradient;
            this.drawRoundedRect(ctx, 0, 0, this.width, this.height, 10);
            ctx.fill();

            // Head
            ctx.fillStyle = '#FFD93D';
            ctx.beginPath();
            ctx.arc(this.width / 2, -15, 20, 0, Math.PI * 2);
            ctx.fill();

            // Hat/Hair
            ctx.fillStyle = '#FF6B6B';
            ctx.beginPath();
            ctx.arc(this.width / 2, -25, 22, Math.PI, 0);
            ctx.fill();

            // Eyes
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(this.width / 2 - 7, -18, 3, 0, Math.PI * 2);
            ctx.arc(this.width / 2 + 7, -18, 3, 0, Math.PI * 2);
            ctx.fill();

            // Legs
            const legOffset = Math.sin(this.animationFrame) * 8;
            ctx.fillStyle = '#2C3E50';
            ctx.fillRect(10, this.height - 5, 12, 25 + legOffset);
            ctx.fillRect(28, this.height - 5, 12, 25 - legOffset);

            ctx.restore();
        } catch (e) {
            logError(e);
        }
    }

    drawRoundedRect(ctx, x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    checkCollision(obstacles) {
        const playerCenterX = this.x + this.width / 2;

        for (let obstacle of obstacles) {
            const obstacleCenterX = obstacle.x + obstacle.width / 2;
            const distance = Math.abs(playerCenterX - obstacleCenterX);

            if (
                obstacle.y + obstacle.height > this.y + 10 &&
                obstacle.y < this.y + this.height &&
                distance < (this.width + obstacle.width) / 2 - 10
            ) {
                return true;
            }
        }

        return false;
    }

    reset() {
        this.targetLane = 1;
        this.currentLane = 1;
        this.x = this.getLaneX(1);
    }
}
