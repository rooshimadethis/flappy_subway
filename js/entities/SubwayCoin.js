import { CONFIG } from '../config.js';

export default class SubwayCoin {
    constructor(lane) {
        this.lane = lane;
        this.width = CONFIG.subway.coins.width;
        this.height = CONFIG.subway.coins.height;
        this.x = this.getLaneX(lane);
        this.y = -this.height;
        this.speed = CONFIG.subway.coins.speed;
        this.rotation = Math.random() * Math.PI;
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

        // Simple flip animation (Retro style)
        const scaleX = Math.abs(Math.sin(this.rotation)) > 0.5 ? 1 : 0.2;
        ctx.scale(scaleX, 1);

        ctx.fillStyle = '#FFD700';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // Coin detail (Square in middle)
        ctx.fillStyle = '#F39C12';
        ctx.fillRect(-this.width / 6, -this.height / 6, this.width / 3, this.height / 3);

        ctx.restore();
    }

    checkCollection(player) {
        return (
            this.x < player.x + player.width &&
            this.x + this.width > player.x &&
            this.y < player.y + player.height &&
            this.y + this.height > player.y
        );
    }

    isOffScreen() {
        return this.y > CONFIG.subway.canvas.height;
    }
}
