import { CONFIG } from '../config.js';

export default class SubwayObstacle {
    constructor(lane, type) {
        this.lane = lane;
        this.type = type;
        this.width = 60;
        this.height = 80;
        this.x = this.getLaneX(lane);
        this.y = -this.height;
        this.speed = CONFIG.subway.obstacles.speed;
        this.color = this.getColor(type);

        // Pre-calculate derived colors
        this.darkColor = this.adjustBrightness(this.color, -30);
        this.lightColor = this.adjustBrightness(this.color, 20);

        this.passed = false;
    }

    getColor(type) {
        switch (type) {
            case 'train': return '#E74C3C';
            case 'barrier': return '#F39C12';
            case 'sign': return '#3498DB';
            default: return '#95A5A6';
        }
    }

    getLaneX(lane) {
        const laneWidth = CONFIG.subway.player.laneWidth;
        const startX = (CONFIG.subway.canvas.width - laneWidth * 3) / 2;
        return startX + lane * laneWidth + laneWidth / 2 - this.width / 2;
    }

    update(dt) {
        this.y += this.speed * dt;
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(this.x + 10, this.y + 10, this.width, this.height);

        const depth = 15;

        // Use pre-calculated colors
        ctx.fillStyle = this.darkColor;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width, this.y);
        ctx.lineTo(this.x + this.width + depth, this.y - depth);
        ctx.lineTo(this.x + this.width + depth, this.y + this.height - depth);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.fill();

        ctx.fillStyle = this.lightColor;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + depth, this.y - depth);
        ctx.lineTo(this.x + this.width + depth, this.y - depth);
        ctx.lineTo(this.x + this.width, this.y);
        ctx.fill();

        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        if (this.type === 'train') {
            ctx.fillStyle = '#34495E';
            ctx.fillRect(this.x + 5, this.y + 10, this.width - 10, 20);

            ctx.fillStyle = '#F1C40F';
            ctx.beginPath();
            ctx.arc(this.x + 10, this.y + this.height - 15, 5, 0, Math.PI * 2);
            ctx.arc(this.x + this.width - 10, this.y + this.height - 15, 5, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'barrier') {
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y + 20);
            ctx.lineTo(this.x + this.width, this.y + 40);
            ctx.lineTo(this.x + this.width, this.y + 60);
            ctx.lineTo(this.x, this.y + 40);
            ctx.fill();
        }

        ctx.restore();
    }

    adjustBrightness(color, percent) {
        if (!color) return '#000000';
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255))
            .toString(16).slice(1);
    }

    isOffScreen() {
        return this.y > CONFIG.subway.canvas.height;
    }
}
