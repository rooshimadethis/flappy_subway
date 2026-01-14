import { CONFIG } from '../config.js';

export default class SubwayObstacle {
    constructor(lane, type) {
        this.lane = lane;
        this.type = type;

        const dims = CONFIG.subway.obstacles.dimensions[type] || { width: 50, height: 50 };
        this.width = dims.width;
        this.height = dims.height;

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

        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        if (this.type === 'train') {
            // Roof details
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(this.x + 5, this.y + 5, this.width - 10, 10);

            // Windows along the side
            ctx.fillStyle = '#34495E';
            const windowHeight = 15;
            for (let wy = this.y + 25; wy < this.y + this.height - 25; wy += 30) {
                ctx.fillRect(this.x + 8, wy, this.width - 16, windowHeight);
            }

            // Front lights
            ctx.fillStyle = '#F1C40F';
            ctx.fillRect(this.x + 5, this.y + this.height - 12, 8, 8);
            ctx.fillRect(this.x + this.width - 13, this.y + this.height - 12, 8, 8);
        } else if (this.type === 'barrier') {
            ctx.fillStyle = '#333';
            ctx.fillRect(this.x, this.y + 5, this.width, 6);
            ctx.fillRect(this.x, this.y + 25, this.width, 6);
            // Legs
            ctx.fillRect(this.x + 5, this.y, 4, this.height);
            ctx.fillRect(this.x + this.width - 9, this.y, 4, this.height);
        } else if (this.type === 'sign') {
            ctx.fillStyle = '#2C3E50';
            ctx.fillRect(this.x + this.width / 2 - 2, this.y, 4, this.height);
            ctx.fillStyle = '#3498DB';
            ctx.fillRect(this.x + 5, this.y + 5, this.width - 10, 20);
            ctx.strokeRect(this.x + 5, this.y + 5, this.width - 10, 20);
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
