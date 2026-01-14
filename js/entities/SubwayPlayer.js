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
        this.blinkTimer = 0;
        this.isBlinking = false;
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

        // Handle blinking
        this.blinkTimer += dt;
        if (this.isBlinking) {
            if (this.blinkTimer > 6) { // Blink for ~100ms
                this.isBlinking = false;
                this.blinkTimer = 0;
            }
        } else if (this.blinkTimer > 150 + Math.random() * 200) { // Blink ogni 2-5 sec
            this.isBlinking = true;
            this.blinkTimer = 0;
        }
    }

    draw(ctx) {
        try {
            if (!Number.isFinite(this.x) || !Number.isFinite(this.y)) {
                this.x = this.getLaneX(1);
                this.y = CONFIG.subway.player.y;
                return;
            }

            ctx.save();
            ctx.translate(this.x, this.y);

            const s = this.width / 5; // Scale unit
            const bodyColor = '#808e9b';
            const bellyColor = '#a5b1be';
            const neckColor = '#7d5fff'; // Iridescent purple
            const feetColor = '#ff7f50'; // Pinkish-orange pigeon feet

            // Head bobbing - more of a "forward/back" pigeon thrust
            const bobX = Math.cos(this.animationFrame * 0.5) * 3;
            const bobY = Math.abs(Math.sin(this.animationFrame * 0.5)) * 2;

            // Draw shadow
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath();
            ctx.ellipse(this.width / 2, this.height - 5, this.width / 2 + 5, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            // 1. FEET (Walking animation underneath the horizontal body)
            const legCycle = this.animationFrame * 0.5;
            const leftLegOffset = Math.sin(legCycle) * 12;
            const rightLegOffset = Math.sin(legCycle + Math.PI) * 12;

            this.drawPigeonFoot(ctx, s * 1.5, 5.5 * s + Math.max(0, leftLegOffset), s, feetColor);
            this.drawPigeonFoot(ctx, s * 3.5, 5.5 * s + Math.max(0, rightLegOffset), s, feetColor);

            // 2. BODY (Horizontal Egg Shape)
            const bodyGrad = ctx.createLinearGradient(0, 2 * s, this.width, 5 * s);
            bodyGrad.addColorStop(0, bodyColor);
            bodyGrad.addColorStop(1, bellyColor);

            ctx.fillStyle = bodyGrad;
            ctx.beginPath();
            // Draw a more horizontal teardrop/egg shape
            ctx.ellipse(this.width / 2 - s * 0.5, 3.5 * s, 2.5 * s, 2 * s, 0, 0, Math.PI * 2);
            ctx.fill();

            // 3. TAIL FEATHERS (Pointier and more pronounced)
            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            // Main tail spike
            ctx.moveTo(s, 2.8 * s);
            ctx.lineTo(-s * 0.8, 2.2 * s);
            ctx.lineTo(0, 3.5 * s);
            // Secondary tail spike
            ctx.moveTo(s * 0.5, 3.2 * s);
            ctx.lineTo(-s * 0.6, 3.8 * s);
            ctx.lineTo(s * 0.8, 4.2 * s);
            ctx.closePath();
            ctx.fill();

            // 4. WINGS (Resting on side)
            ctx.fillStyle = '#6d7985'; // Slightly darker for wing
            ctx.beginPath();
            ctx.ellipse(this.width / 2 - s, 3.5 * s, 1.8 * s, 1.2 * s, 0.2, 0, Math.PI * 2);
            ctx.fill();

            // 5. NECK & HEAD (Offset to the right for profile view)
            const headX = this.width - s * 1.5 + bobX;
            const headY = 1.5 * s - bobY;

            // Neck Iridescence
            ctx.fillStyle = neckColor;
            ctx.beginPath();
            ctx.ellipse(headX - s * 0.5, headY + s, s * 0.8, s * 1.2, 0, 0, Math.PI * 2);
            ctx.fill();

            // Head
            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            ctx.arc(headX, headY, 1.8 * s, 0, Math.PI * 2);
            ctx.fill();

            // 6. BEANIE (Profile view)
            const beanieColor = '#FF6B6B';
            ctx.fillStyle = beanieColor;
            // Main cap
            ctx.beginPath();
            ctx.arc(headX, headY - s * 0.5, 2 * s, Math.PI * 1.1, Math.PI * 1.9);
            ctx.fill();
            // Brim
            ctx.save();
            ctx.translate(headX, headY - s * 0.5);
            ctx.rotate(-0.1);
            this.drawRoundedPart(ctx, -2 * s, -0.5 * s, 4 * s, 0.8 * s, s * 0.3);
            ctx.restore();
            // Pom-pom
            ctx.beginPath();
            ctx.arc(headX - s * 0.5, headY - 2.8 * s, 0.6 * s, 0, Math.PI * 2);
            ctx.fill();

            // 7. BEAK (Sticking out to the right)
            ctx.fillStyle = '#444';
            ctx.beginPath();
            ctx.moveTo(headX + 1.2 * s, headY);
            ctx.lineTo(headX + 2.5 * s, headY + 0.2 * s);
            ctx.lineTo(headX + 1.2 * s, headY + 0.6 * s);
            ctx.closePath();
            ctx.fill();
            // Cere
            ctx.fillStyle = '#eee';
            ctx.beginPath();
            ctx.arc(headX + 1.3 * s, headY + 0.1 * s, 0.3 * s, 0, Math.PI * 2);
            ctx.fill();

            // 8. EYE (Single eye for side profile)
            if (this.isBlinking) {
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(headX + 0.2 * s, headY - 0.2 * s);
                ctx.lineTo(headX + 0.8 * s, headY - 0.2 * s);
                ctx.stroke();
            } else {
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(headX + 0.5 * s, headY - 0.2 * s, 0.5 * s, 0, Math.PI * 2);
                ctx.fill();
                // Shine
                ctx.fillStyle = '#FFF';
                ctx.beginPath();
                ctx.arc(headX + 0.4 * s, headY - 0.3 * s, 0.15 * s, 0, Math.PI * 2);
                ctx.fill();
            }

            // Blush
            ctx.fillStyle = 'rgba(255, 107, 107, 0.2)';
            ctx.beginPath();
            ctx.arc(headX + 0.6 * s, headY + 0.4 * s, 0.4 * s, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        } catch (e) {
            logError(e);
        }
    }

    drawPigeonFoot(ctx, x, y, s, color) {
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        // Leg
        ctx.beginPath();
        ctx.moveTo(x, y - s);
        ctx.lineTo(x, y);
        ctx.stroke();

        // 3 Toes
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 0.5 * s, y + 0.5 * s);
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 0.7 * s);
        ctx.moveTo(x, y);
        ctx.lineTo(x + 0.5 * s, y + 0.5 * s);
        ctx.stroke();
    }

    drawRoundedPart(ctx, x, y, w, h, r) {
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, r);
            ctx.fill();
        } else {
            // Fallback for older browsers
            ctx.fillRect(x, y, w, h);
        }
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
