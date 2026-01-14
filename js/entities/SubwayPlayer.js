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

        // Load the pixel art pigeon pieces
        this.images = {
            body: new Image(),
            leftFoot: new Image(),
            rightFoot: new Image()
        };

        this.images.body.src = 'assets/pigeon_body.png';
        this.images.leftFoot.src = 'assets/pigeon_left_foot.png';
        this.images.rightFoot.src = 'assets/pigeon_right_foot.png';

        this.imagesLoaded = 0;
        const onLoaded = () => { this.imagesLoaded++; };

        this.images.body.onload = onLoaded;
        this.images.leftFoot.onload = onLoaded;
        this.images.rightFoot.onload = onLoaded;
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

            if (this.imagesLoaded >= 3) {
                // Drawing with pixel art images
                const size = this.width * 1.8; // Adjust size as needed
                const centerX = this.width / 2;
                const centerY = this.height / 2;

                // Body bobbing (horizontal "thrust")
                const bobX = Math.cos(this.animationFrame * 0.5) * 4;
                const bobY = Math.abs(Math.sin(this.animationFrame * 0.5)) * 3;

                // Walking animation for feet
                const footCycle = this.animationFrame * 0.6;
                const footAmpX = 8;
                const footAmpY = 5;

                const leftFootX = Math.sin(footCycle) * footAmpX;
                const leftFootY = Math.abs(Math.cos(footCycle)) * -footAmpY;

                const rightFootX = Math.sin(footCycle + Math.PI) * footAmpX;
                const rightFootY = Math.abs(Math.cos(footCycle + Math.PI)) * -footAmpY;

                // Draw shadow
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                ctx.beginPath();
                ctx.ellipse(centerX, this.height - 5, this.width / 2 + 5, 10, 0, 0, Math.PI * 2);
                ctx.fill();

                // Draw Pigeon
                // 1. Feet (underneath body)
                ctx.drawImage(this.images.leftFoot, centerX - size / 2 + leftFootX, centerY - size / 2 + leftFootY, size, size);
                ctx.drawImage(this.images.rightFoot, centerX - size / 2 + rightFootX, centerY - size / 2 + rightFootY, size, size);

                // 2. Body (bobbing)
                const bodyX = centerX - size / 2 + bobX;
                const bodyY = centerY - size / 2 - bobY;
                ctx.drawImage(this.images.body, bodyX, bodyY, size, size);

                // 3. Fedora (Drawn on top of the head)
                const hatX = bodyX + size * 0.63; // Estimating head position
                const hatY = bodyY + size * 0.21;

                ctx.save();
                ctx.translate(hatX, hatY);
                ctx.rotate(-0.1); // Slight tilt for style

                // Fedora Brim
                ctx.fillStyle = '#2d3436';
                ctx.beginPath();
                ctx.ellipse(0, 0, size * 0.18, size * 0.05, 0, 0, Math.PI * 2);
                ctx.fill();

                // Fedora Crown
                this.drawRoundedPart(ctx, -size * 0.1, -size * 0.15, size * 0.2, size * 0.15, size * 0.03);

                // Ribbon/Band
                ctx.fillStyle = '#636e72';
                ctx.fillRect(-size * 0.1, -size * 0.05, size * 0.2, size * 0.03);

                ctx.restore();

            } else {
                // Fallback while loading (Legacy drawing logic)
                const s = this.width / 5; // Scale unit
                const bodyColor = '#808e9b';
                const feetColor = '#ff7f50';

                // Head bobbing
                const bobX = Math.cos(this.animationFrame * 0.5) * 3;
                const bobY = Math.abs(Math.sin(this.animationFrame * 0.5)) * 2;

                // Draw shadow
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                ctx.beginPath();
                ctx.ellipse(this.width / 2, this.height - 5, this.width / 2 + 5, 10, 0, 0, Math.PI * 2);
                ctx.fill();

                // Feet
                const legCycle = this.animationFrame * 0.5;
                const leftLegOffset = Math.sin(legCycle) * 12;
                const rightLegOffset = Math.sin(legCycle + Math.PI) * 12;

                this.drawPigeonFoot(ctx, s * 1.5, 5.5 * s + Math.max(0, leftLegOffset), s, feetColor);
                this.drawPigeonFoot(ctx, s * 3.5, 5.5 * s + Math.max(0, rightLegOffset), s, feetColor);

                // Body
                ctx.fillStyle = bodyColor;
                ctx.beginPath();
                ctx.ellipse(this.width / 2 - s * 0.5, 3.5 * s, 2.5 * s, 2 * s, 0, 0, Math.PI * 2);
                ctx.fill();

                // Head
                const headX = this.width - s * 1.5 + bobX;
                const headY = 1.5 * s - bobY;
                ctx.fillStyle = bodyColor;
                ctx.beginPath();
                ctx.arc(headX, headY, 1.8 * s, 0, Math.PI * 2);
                ctx.fill();

                // Eye
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(headX + 0.5 * s, headY - 0.2 * s, 0.5 * s, 0, Math.PI * 2);
                ctx.fill();
            }

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
