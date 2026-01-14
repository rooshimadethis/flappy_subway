import { CONFIG } from '../config.js';

export default class SubwayCoin {
    constructor(lane) {
        this.lane = lane;
        this.width = 30;
        this.height = 30;
        this.x = this.getLaneX(lane);
        this.y = -this.height;
        this.speed = CONFIG.subway.coins.speed;
        this.rotation = Math.random() * Math.PI;
        this.gradient = null;
    }

    getLaneX(lane) {
        const laneWidth = CONFIG.subway.player.laneWidth;
        const startX = (CONFIG.subway.canvas.width - laneWidth * 3) / 2;
        return startX + lane * laneWidth + laneWidth / 2 - this.width / 2;
    }

    update(dt) {
        this.y += this.speed * dt;
        this.rotation += 0.1 * dt;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        const scaleX = Math.abs(Math.sin(this.rotation));
        ctx.scale(scaleX, 1);

        if (!this.gradient) {
            this.gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.width / 2);
            this.gradient.addColorStop(0, '#FFF700');
            this.gradient.addColorStop(1, '#FFA500');
        }

        ctx.fillStyle = this.gradient;
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#F39C12';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 3, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    checkCollection(player) {
        return (
            this.y + this.height > player.y &&
            this.y < player.y + player.height &&
            this.lane === player.currentLane
        );
    }

    isOffScreen() {
        return this.y > CONFIG.subway.canvas.height;
    }
}
