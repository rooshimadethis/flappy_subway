import { CONFIG } from '../config.js';
import { logError } from '../utils.js';

export default class Bird {
    constructor() {
        this.x = CONFIG.flappy.bird.x;
        this.y = CONFIG.flappy.bird.y;
        this.radius = CONFIG.flappy.bird.radius;
        this.velocity = 0;
        this.rotation = 0;
        this.wingAngle = 0;
        this.blinkTimer = 0;
        this.isBlinking = false;
        this.cachedGradient = null;
    }

    jump() {
        this.velocity = CONFIG.flappy.bird.jumpStrength;
    }

    update(dt) {
        this.velocity += CONFIG.flappy.bird.gravity * dt;
        this.velocity = Math.min(this.velocity, CONFIG.flappy.bird.maxVelocity);
        this.y += this.velocity * dt;

        // Update rotation
        this.rotation = Math.min(Math.max(this.velocity * 3, -25), 90);

        this.wingAngle += 0.4 * dt;
        this.blinkTimer += 1 * dt;
        if (this.blinkTimer > 150 && Math.random() < 0.05) {
            this.isBlinking = true;
            this.blinkTimer = 0;
        }
        if (this.isBlinking && this.blinkTimer > 5) {
            this.isBlinking = false;
            this.blinkTimer = 0;
        }

        if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.velocity = 0;
        }
    }

    draw(ctx) {
        try {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate((this.rotation * Math.PI) / 180);

            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 5;

            // Cache the bird body gradient
            if (!this.cachedGradient) {
                this.cachedGradient = ctx.createRadialGradient(-5, -5, 0, 0, 0, this.radius);
                this.cachedGradient.addColorStop(0, '#FFE066');
                this.cachedGradient.addColorStop(1, '#FFCC00');
            }

            ctx.fillStyle = this.cachedGradient;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255, 182, 193, 0.6)';
            ctx.beginPath();
            ctx.ellipse(12, 5, 6, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            if (!this.isBlinking) {
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(10, -8, 11, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.arc(12, -7, 5, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(14, -9, 2.5, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(11, -5, 1, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(4, -8);
                ctx.quadraticCurveTo(10, -4, 16, -8);
                ctx.stroke();
            }

            if (!this.beakGradient) {
                this.beakGradient = ctx.createLinearGradient(15, 0, 30, 10);
                this.beakGradient.addColorStop(0, '#FF7F50');
                this.beakGradient.addColorStop(1, '#FF4500');
            }

            ctx.fillStyle = this.beakGradient;
            ctx.beginPath();
            ctx.moveTo(this.radius - 2, 2);
            ctx.quadraticCurveTo(this.radius + 12, 4, this.radius - 2, 10);
            ctx.fill();

            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            ctx.lineWidth = 1;
            ctx.stroke();

            const wingFlap = Math.sin(this.wingAngle) * 6;
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.ellipse(-6, 5 + wingFlap, 14, 9, -0.2, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#E6B800';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Beanie Hat
            ctx.fillStyle = '#E74C3C'; // Main beanie color (Red)
            ctx.strokeStyle = '#c0392b';
            ctx.lineWidth = 2;

            // Beanie Body (The knitted part)
            ctx.beginPath();
            ctx.moveTo(-18, -18);
            ctx.bezierCurveTo(-18, -40, 18, -40, 18, -18);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Beanie Cuff (The folded part at the bottom)
            ctx.fillStyle = '#C0392B'; // Slightly darker for the cuff
            ctx.beginPath();
            // Using ellipse for the cuff to match the rounded look
            ctx.ellipse(0, -18, 21, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Pom-pom on top
            ctx.fillStyle = '#FFFFFF'; // White pom-pom
            ctx.beginPath();
            ctx.arc(0, -38, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.restore();
        } catch (e) {
            logError(e);
        }
    }

    checkCollision(pipes, groundY) {
        if (this.y + this.radius > groundY) {
            return true;
        }

        for (let pipe of pipes) {
            const collisionPadding = 4;

            if (
                this.x + this.radius - collisionPadding > pipe.x &&
                this.x - this.radius + collisionPadding < pipe.x + CONFIG.flappy.pipes.width
            ) {
                if (
                    this.y - this.radius + collisionPadding < pipe.topHeight ||
                    this.y + this.radius - collisionPadding > pipe.topHeight + CONFIG.flappy.pipes.gap
                ) {
                    return true;
                }
            }
        }
        return false;
    }

    reset() {
        this.y = CONFIG.flappy.bird.y;
        this.velocity = 0;
        this.rotation = 0;
    }
}
