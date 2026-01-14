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

        // Load the pixel art bird
        this.image = new Image();
        this.image.src = 'assets/pixel_bird.png';
        this.imageLoaded = false;
        this.image.onload = () => {
            this.imageLoaded = true;
        };
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

            if (this.imageLoaded) {
                // Draw image centered at (0,0) with size based on radius
                const size = this.radius * 3.2;
                ctx.drawImage(this.image, -size / 2, -size / 2, size, size);
            } else {
                // Fallback while loading (Cute Pigeon Shape)
                const s = this.radius / 5;

                // Body
                ctx.fillStyle = '#808e9b';
                ctx.beginPath();
                ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                ctx.fill();

                // Iridescent neck
                ctx.fillStyle = '#4834d4';
                ctx.globalAlpha = 0.5;
                ctx.beginPath();
                ctx.ellipse(this.radius * 0.4, -this.radius * 0.2, this.radius * 0.4, this.radius * 0.6, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;

                // Orange Beak
                ctx.fillStyle = '#FF9F43';
                ctx.beginPath();
                ctx.moveTo(this.radius * 0.8, -s);
                ctx.lineTo(this.radius * 0.8, s);
                ctx.lineTo(this.radius * 1.3, 0);
                ctx.closePath();
                ctx.fill();

                // Eye
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(this.radius * 0.4, -this.radius * 0.4, s, 0, Math.PI * 2);
                ctx.fill();
            }

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
