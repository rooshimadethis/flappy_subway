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
        ctx.translate(this.x, this.y);

        const w = this.width;
        const h = this.height;

        if (this.type === 'train') {
            // Main Body (Subway Car Front)
            const bodyGrad = ctx.createLinearGradient(0, 0, w, 0);
            bodyGrad.addColorStop(0, '#7f8c8d');
            bodyGrad.addColorStop(0.5, '#bdc3c7');
            bodyGrad.addColorStop(1, '#7f8c8d');

            ctx.fillStyle = bodyGrad;
            this.drawRoundedPart(ctx, 0, 0, w, h, 12);
            ctx.fill();

            // Windshield
            ctx.fillStyle = '#2c3e50';
            this.drawRoundedPart(ctx, 6, 15, w - 12, h * 0.4, 4);
            ctx.fill();

            // Windshield Sheen/Reflection
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.moveTo(8, 17);
            ctx.lineTo(w - 20, 17);
            ctx.lineTo(8, 17 + h * 0.3);
            ctx.closePath();
            ctx.fill();

            // Digital Destination Board
            ctx.fillStyle = '#000';
            ctx.fillRect(w / 2 - 15, 4, 30, 8);
            ctx.fillStyle = '#f1c40f';
            ctx.font = 'bold 6px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('CITY', w / 2, 10);

            // Headlights
            ctx.fillStyle = '#ecf0f1';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#f1c40f';
            // Left light
            ctx.beginPath();
            ctx.arc(12, h - 15, 5, 0, Math.PI * 2);
            ctx.fill();
            // Right light
            ctx.beginPath();
            ctx.arc(w - 12, h - 15, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Grill/Bumper area
            ctx.fillStyle = '#34495e';
            ctx.fillRect(w * 0.2, h - 10, w * 0.6, 6);

            // Side lines for depth
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 1;
            ctx.strokeRect(2, 2, w - 4, h - 4);

        } else if (this.type === 'barrier') {
            // Draw Legs
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(8, 0, 4, h);
            ctx.fillRect(w - 12, 0, 4, h);

            // Horizontal Boards with Stripes
            const boardWidth = w;
            const boardHeight = 15;

            const drawBoard = (y) => {
                ctx.save();
                ctx.translate(0, y);
                // Background
                ctx.fillStyle = '#f1c40f'; // Safety Yellow
                ctx.fillRect(0, 0, boardWidth, boardHeight);

                // Stripes
                ctx.fillStyle = '#2c3e50';
                for (let i = -20; i < boardWidth; i += 20) {
                    ctx.beginPath();
                    ctx.moveTo(i, 0);
                    ctx.lineTo(i + 10, 0);
                    ctx.lineTo(i + 20, boardHeight);
                    ctx.lineTo(i + 10, boardHeight);
                    ctx.closePath();
                    ctx.fill();
                }

                // Board border
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
                ctx.strokeRect(0, 0, boardWidth, boardHeight);
                ctx.restore();
            };

            drawBoard(15);
            drawBoard(45);

            // Warning Light on top
            ctx.fillStyle = '#e67e22';
            ctx.fillRect(w / 2 - 4, 5, 8, 10);
            ctx.fillStyle = '#f1c40f';
            ctx.beginPath();
            ctx.arc(w / 2, 8, 3, 0, Math.PI * 2);
            ctx.fill();

        } else if (this.type === 'sign') {
            // Pole
            const poleGrad = ctx.createLinearGradient(w / 2 - 3, 0, w / 2 + 3, 0);
            poleGrad.addColorStop(0, '#7f8c8d');
            poleGrad.addColorStop(0.5, '#ecf0f1');
            poleGrad.addColorStop(1, '#7f8c8d');

            ctx.fillStyle = poleGrad;
            ctx.fillRect(w / 2 - 3, 0, 6, h);

            // Round Sign
            const radius = 22;
            const centerX = w / 2;
            const centerY = 25;

            // Outer ring
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Inner white bar (No Entry style)
            ctx.fillStyle = '#fff';
            ctx.fillRect(centerX - 15, centerY - 4, 30, 8);

            // Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.beginPath();
            ctx.arc(centerX - 5, centerY - 5, 5, 0, Math.PI * 2);
            ctx.fill();

        } else if (this.type === 'taxi') {
            // Main Body (Classic Yellow Cab)
            const bodyGrad = ctx.createLinearGradient(0, 0, w, 0);
            bodyGrad.addColorStop(0, '#f1c40f');
            bodyGrad.addColorStop(0.5, '#f39c12');
            bodyGrad.addColorStop(1, '#f1c40f');

            ctx.fillStyle = bodyGrad;
            this.drawRoundedPart(ctx, 0, 0, w, h, 8);
            ctx.fill();

            // Checkerboard Side Detail
            ctx.fillStyle = '#000';
            const checkSize = 6;
            for (let x = 0; x < w; x += checkSize * 2) {
                ctx.fillRect(x, h * 0.5, checkSize, checkSize);
                ctx.fillRect(x + checkSize, h * 0.5 + checkSize, checkSize, checkSize);
            }

            // Windshield
            ctx.fillStyle = '#2c3e50';
            this.drawRoundedPart(ctx, 8, 10, w - 16, h * 0.35, 4);
            ctx.fill();

            // Taxi Roof Sign
            ctx.fillStyle = '#000';
            ctx.fillRect(w / 2 - 15, -4, 30, 8);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 5px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('TAXI', w / 2, 2);

            // Headlights
            ctx.fillStyle = '#ecf0f1';
            ctx.beginPath();
            ctx.arc(10, h - 12, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(w - 10, h - 12, 5, 0, Math.PI * 2);
            ctx.fill();

            // Bumper
            ctx.fillStyle = '#34495e';
            ctx.fillRect(4, h - 6, w - 8, 4);
        }

        ctx.restore();
    }

    drawRoundedPart(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
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
