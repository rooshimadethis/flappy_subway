// ===== DUAL GAME CONFIGURATION =====
const CONFIG = {
    flappy: {
        canvas: { width: 600, height: 800 },
        bird: {
            x: 150,
            y: 300,
            radius: 22,
            gravity: 0.4,
            jumpStrength: -9,
            maxVelocity: 12
        },
        pipes: {
            width: 80,
            gap: 200,
            speed: 3,
            spawnInterval: 1800,
            minHeight: 100,
            maxHeight: 400
        }
    },
    subway: {
        canvas: { width: 600, height: 800 },
        player: {
            lane: 1, // 0 = left, 1 = center, 2 = right
            laneWidth: 150,
            y: 550,
            width: 50,
            height: 70
        },
        obstacles: {
            speed: 8,
            spawnInterval: 1200,
            types: ['train', 'barrier', 'sign']
        },
        coins: {
            speed: 8,
            spawnInterval: 800
        }
    }
};

// ===== FIREBASE CONFIGURATION =====
// TODO: Replace with your actual Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyCBXU8m653_Y4WX0zIq8tQ9XQA73H6Zbl0",
    authDomain: "flappy-subway.firebaseapp.com",
    databaseURL: "https://flappy-subway-default-rtdb.firebaseio.com",
    projectId: "flappy-subway",
    storageBucket: "flappy-subway.firebasestorage.app",
    messagingSenderId: "371224647268",
    appId: "1:371224647268:web:07bc5e7e6cd57870707171",
    measurementId: "G-3MRZR5H3LC"
};
// Initialize Firebase safely
let firebaseDb = null;
try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        firebaseDb = firebase.database();
        console.log("Firebase initialized successfully");
    } else {
        console.warn("Firebase SDK not loaded");
    }
} catch (e) {
    console.error("Firebase initialization failed:", e);
}

// ===== CACHED ASSETS =====
const ASSETS = {
    gradients: {},
    colors: {}
};

// ===== LEADERBOARD MANAGER =====
class LeaderboardManager {
    constructor() {
        this.modal = document.getElementById('leaderboardModal');
        this.list = document.getElementById('leaderboardList');
        this.closeBtn = document.getElementById('closeLeaderboard');
        this.viewBtn = document.getElementById('viewLeaderboardButton');
        this.submitBtn = document.getElementById('submitScoreButton');
        this.nameInput = document.getElementById('playerNameInput');

        this.setupListeners();
    }

    setupListeners() {
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.hide());
        }
        if (this.viewBtn) {
            this.viewBtn.addEventListener('click', () => {
                this.show();
                this.fetchScores();
            });
        }
        if (this.submitBtn) {
            this.submitBtn.addEventListener('click', () => this.submitScore());
        }

        // Close on backdrop click
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.hide();
            });
        }
    }

    show() {
        if (this.modal) this.modal.classList.remove('hidden');
    }

    hide() {
        if (this.modal) this.modal.classList.add('hidden');
    }

    async submitScore() {
        if (!firebaseDb) {
            alert("Firebase not configured! Cannot submit score.");
            return;
        }

        const name = this.nameInput.value.trim();
        const score = parseInt(document.getElementById('finalTotalScore').textContent) || 0;

        if (!name) {
            alert("Please enter a name!");
            return;
        }

        try {
            this.submitBtn.disabled = true;
            this.submitBtn.textContent = "Submitting...";

            const scoresRef = firebaseDb.ref('scores');
            await scoresRef.push({
                name: name,
                score: score,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });

            // Show success styling
            this.submitBtn.textContent = "Submitted! ✅";
            this.submitBtn.style.background = "#27AE60";

            // Disable input after submission
            this.nameInput.disabled = true;

            // Show leaderboard after short delay
            setTimeout(() => {
                this.show();
                this.fetchScores();
            }, 1000);

        } catch (e) {
            console.error("Error submitting score:", e);
            let msg = "Failed to submit score.";

            // Check for common deployment issues
            if (e.code === 'PERMISSION_DENIED') {
                msg += "\n\nPermission denied. Check your Firebase Database Rules.";
            } else if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                msg += "\n\nNote: If this works locally but not here, you likely need to add '" + window.location.hostname + "' to your Firebase Authorized Domains or API Key restrictions.";
            }

            alert(msg);
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = "SUBMIT SCORE 🏆";
        }
    }

    fetchScores() {
        if (!firebaseDb) {
            this.list.innerHTML = '<div class="loading-spinner">Leaderboard unavailable (Firebase not configured)</div>';
            return;
        }

        this.list.innerHTML = '<div class="loading-spinner">Loading scores...</div>';

        const scoresRef = firebaseDb.ref('scores');
        scoresRef.orderByChild('score').limitToLast(10).once('value')
            .then((snapshot) => {
                const scores = [];
                snapshot.forEach((childSnapshot) => {
                    scores.push(childSnapshot.val());
                });

                // Firebase returns ascending order, so reverse it
                scores.reverse();

                this.renderScores(scores);
            })
            .catch((e) => {
                console.error("Error fetching scores:", e);
                let errorDetails = "Error loading scores";

                if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                    errorDetails += "<br><span style='font-size: 0.8em; color: #ff6b6b'>Host not authorized? Check Firebase Console.</span>";
                }

                this.list.innerHTML = `<div class="loading-spinner">${errorDetails}</div>`;
            });
    }

    renderScores(scores) {
        if (scores.length === 0) {
            this.list.innerHTML = '<div class="loading-spinner">No scores yet! Be the first!</div>';
            return;
        }

        let html = '';
        scores.forEach((entry, index) => {
            let rankEmoji = '';
            if (index === 0) rankEmoji = '🥇';
            else if (index === 1) rankEmoji = '🥈';
            else if (index === 2) rankEmoji = '🥉';
            else rankEmoji = `#${index + 1}`;

            html += `
                <div class="leaderboard-entry">
                    <div class="leaderboard-rank">${rankEmoji}</div>
                    <div class="leaderboard-name">${this.escapeHtml(entry.name)}</div>
                    <div class="leaderboard-score">${entry.score}</div>
                </div>
            `;
        });
        this.list.innerHTML = html;
    }

    escapeHtml(text) {
        if (!text) return text;
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Error Logger Helper
function logError(error) {
    console.error(error);
    let errDiv = document.getElementById('error-display');
    if (!errDiv) {
        errDiv = document.createElement('div');
        errDiv.id = 'error-display';
        document.body.appendChild(errDiv);
    }
    errDiv.style.display = 'block';
    errDiv.textContent = 'Error: ' + error.message;
}

// ===== GAME STATE =====
class DualGameState {
    constructor() {
        this.flappyScore = 0;
        this.subwayScore = 0;
        this.highScore = parseInt(localStorage.getItem('dualChallengeHighScore')) || 0;
        this.isPlaying = false;
        this.isGameOver = false;
        this.deathCause = '';
    }

    incrementFlappyScore() {
        this.flappyScore += 3;
        this.updateHighScore();
    }

    incrementSubwayScore(points = 1) {
        this.subwayScore += points;
        this.updateHighScore();
    }

    getTotalScore() {
        return this.flappyScore + this.subwayScore;
    }

    updateHighScore() {
        const total = this.getTotalScore();
        if (total > this.highScore) {
            this.highScore = total;
            localStorage.setItem('dualChallengeHighScore', this.highScore);
        }
    }

    reset() {
        this.flappyScore = 0;
        this.subwayScore = 0;
        this.isPlaying = false;
        this.isGameOver = false;
        this.deathCause = '';
    }
}

// ===== FLAPPY BIRD CLASSES =====
class Bird {
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

            // Fedora Hat
            // Brim
            ctx.fillStyle = '#2C3E50';
            ctx.strokeStyle = '#1a252f';
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.ellipse(2, -18, 22, 6, 0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Crown
            ctx.beginPath();
            ctx.moveTo(-10, -20);
            ctx.lineTo(-12, -38);
            ctx.bezierCurveTo(-5, -45, 15, -45, 16, -38);
            ctx.lineTo(14, -20);
            ctx.bezierCurveTo(5, -16, -5, -16, -10, -20);
            ctx.fill();
            ctx.stroke();

            // Hat Band
            ctx.fillStyle = '#E74C3C'; // Red band
            ctx.beginPath();
            ctx.moveTo(-11, -25);
            ctx.lineTo(-11, -30);
            ctx.bezierCurveTo(2, -32, 14, -30, 15, -30);
            ctx.lineTo(15, -25);
            ctx.bezierCurveTo(5, -23, -5, -23, -11, -25);
            ctx.fill();

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

class Pipe {
    constructor(x) {
        this.x = x;
        this.topHeight = Math.random() * (CONFIG.flappy.pipes.maxHeight - CONFIG.flappy.pipes.minHeight) + CONFIG.flappy.pipes.minHeight;
        this.width = CONFIG.flappy.pipes.width;
        this.scored = false;
        this.gradient = null;
    }

    update(dt) {
        this.x -= CONFIG.flappy.pipes.speed * dt;
    }

    draw(ctx) {
        // Safety check for finite number
        if (!Number.isFinite(this.x)) {
            console.warn('Pipe X is non-finite, resetting');
            this.x = CONFIG.flappy.canvas.width;
            return;
        }

        // Safe Gradient Creation
        // Safe Gradient Creation with Caching
        if (!this.gradient) {
            try {
                // Create gradient relative to 0,0 since we will translate
                this.gradient = ctx.createLinearGradient(0, 0, CONFIG.flappy.pipes.width, 0);
                this.gradient.addColorStop(0, '#229954');
                this.gradient.addColorStop(0.5, '#2ECC71');
                this.gradient.addColorStop(1, '#27AE60');
            } catch (e) {
                this.gradient = '#2ECC71';
            }
        }

        ctx.save();
        ctx.translate(this.x, 0); // Translate to pipe position

        ctx.fillStyle = this.gradient;
        const borderColor = '#1E8449';
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;

        // Draw relative to (0,0)
        ctx.fillRect(0, 0, CONFIG.flappy.pipes.width, this.topHeight);
        ctx.strokeRect(0, 0, CONFIG.flappy.pipes.width, this.topHeight);

        ctx.fillRect(-5, this.topHeight - 30, CONFIG.flappy.pipes.width + 10, 30);
        ctx.strokeRect(-5, this.topHeight - 30, CONFIG.flappy.pipes.width + 10, 30);

        const bottomY = this.topHeight + CONFIG.flappy.pipes.gap;
        const bottomHeight = CONFIG.flappy.canvas.height - bottomY - 100;
        ctx.fillRect(0, bottomY, CONFIG.flappy.pipes.width, bottomHeight);
        ctx.strokeRect(0, bottomY, CONFIG.flappy.pipes.width, bottomHeight);

        ctx.fillRect(-5, bottomY, CONFIG.flappy.pipes.width + 10, 30);
        ctx.strokeRect(-5, bottomY, CONFIG.flappy.pipes.width + 10, 30);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(10, 0, 10, this.topHeight - 30);
        ctx.fillRect(10, bottomY + 30, 10, bottomHeight - 30);

        ctx.restore();
    }

    isOffScreen() {
        return this.x + CONFIG.flappy.pipes.width < 0;
    }
}

// ===== SUBWAY SURFERS CLASSES =====
class SubwayPlayer {
    constructor() {
        this.targetLane = 1;
        this.currentLane = 1;
        this.x = this.getLaneX(1);
        this.y = CONFIG.subway.player.y;
        this.width = CONFIG.subway.player.width;
        this.height = CONFIG.subway.player.height;
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

class SubwayObstacle {
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

class SubwayCoin {
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

// ===== DUAL GAME MANAGER =====
class DualGame {
    constructor() {
        console.log("Initializing DualGame...");
        try {
            this.flappyCanvas = document.getElementById('flappyCanvas');
            this.flappyCtx = this.flappyCanvas.getContext('2d');
            this.subwayCanvas = document.getElementById('subwayCanvas');
            this.subwayCtx = this.subwayCanvas.getContext('2d');

            this.state = new DualGameState();
            this.leaderboard = new LeaderboardManager();

            // Show leaderboard on initial load
            setTimeout(() => {
                this.leaderboard.show();
                this.leaderboard.fetchScores();
            }, 500);

            this.bird = new Bird();
            this.pipes = [];
            this.lastPipeTime = 0;

            this.player = new SubwayPlayer();
            this.obstacles = [];
            this.coins = [];
            this.lastObstacleTime = 0;
            this.lastCoinTime = 0;

            this.lastFrameTime = 0;
            this.gameOverTime = 0;

            this.setupCanvases();
            this.initSharedAssets(); // Initialize shared gradients/assets
            this.setupEventListeners();
            this.updateUI();

            // Kickstart the game loop safely
            requestAnimationFrame((timestamp) => {
                this.lastFrameTime = timestamp;
                this.animate(timestamp);
            });
            console.log("DualGame initialized successfully.");
        } catch (e) {
            logError(e);
        }
    }

    setupCanvases() {
        if (!this.flappyCanvas || !this.subwayCanvas) {
            throw new Error("Canvases not found!");
        }
        this.flappyCanvas.width = CONFIG.flappy.canvas.width;
        this.flappyCanvas.height = CONFIG.flappy.canvas.height;
        this.subwayCanvas.width = CONFIG.subway.canvas.width;
        this.subwayCanvas.height = CONFIG.subway.canvas.height;
    }

    initSharedAssets() {
        // Cache sky gradient
        this.skyGradient = this.flappyCtx.createLinearGradient(0, 0, 0, CONFIG.flappy.canvas.height);
        this.skyGradient.addColorStop(0, '#87CEEB');
        this.skyGradient.addColorStop(0.7, '#4A90E2');
        this.skyGradient.addColorStop(1, '#F4A460');

        // Cache subway gradient
        this.subwayGradient = this.subwayCtx.createLinearGradient(0, 0, 0, CONFIG.subway.canvas.height);
        this.subwayGradient.addColorStop(0, '#2C3E50');
        this.subwayGradient.addColorStop(0.5, '#34495E');
        this.subwayGradient.addColorStop(1, '#1A252F');

        // Cache flappy ground gradient
        const groundHeight = 100;
        const groundY = CONFIG.flappy.canvas.height - groundHeight;
        this.groundGradient = this.flappyCtx.createLinearGradient(0, groundY, 0, CONFIG.flappy.canvas.height);
        this.groundGradient.addColorStop(0, '#8B7355');
        this.groundGradient.addColorStop(1, '#DEB887');
        this.groundY = groundY;
    }

    setupEventListeners() {
        const startBtn = document.getElementById('startButton');
        if (startBtn) {
            startBtn.addEventListener('click', (e) => {
                console.log("Start button clicked");
                e.preventDefault();
                e.stopPropagation();
                this.startGame();
            });
        }

        const startLeaderboardBtn = document.getElementById('startScreenLeaderboardBtn');
        if (startLeaderboardBtn) {
            startLeaderboardBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.leaderboard.show();
                this.leaderboard.fetchScores();
            });
        }

        const restartBtn = document.getElementById('restartButton');
        if (restartBtn) {
            restartBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.restartGame();
            });
        }

        const resetScoreBtn = document.getElementById('resetScoreButton');
        if (resetScoreBtn) {
            resetScoreBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Reset high score
                this.state.highScore = 0;
                localStorage.setItem('dualChallengeHighScore', 0);

                // Update UI elements
                const highScoreEl = document.getElementById('highScore');
                if (highScoreEl) highScoreEl.textContent = '0';

                const finalHighScoreEl = document.getElementById('finalHighScore');
                if (finalHighScoreEl) finalHighScoreEl.textContent = '0';

                console.log("High score reset to 0");
            });
        }

        document.addEventListener('keydown', (e) => {
            if (!this.state.isPlaying || this.state.isGameOver) {
                if (e.code === 'Space' || e.code === 'Enter') {
                    e.preventDefault();
                    if (!this.state.isPlaying && !this.state.isGameOver) {
                        this.startGame();
                    } else if (this.state.isGameOver) {
                        if (Date.now() - this.gameOverTime < 2000) return;
                        this.restartGame();
                    }
                }
                return;
            }

            if (e.code === 'Space') {
                e.preventDefault();
                this.bird.jump();
            }

            if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
                e.preventDefault();
                this.player.moveLeft();
            }
            if (e.code === 'KeyD' || e.code === 'ArrowRight') {
                e.preventDefault();
                this.player.moveRight();
            }
        });

        // Touch Controls for Mobile
        let touchStartX = 0;
        let touchStartY = 0;

        document.addEventListener('touchstart', (e) => {
            if (e.target.tagName === 'BUTTON') return;

            // Handle Game Start/Restart on Tap
            if (!this.state.isPlaying || this.state.isGameOver) {
                e.preventDefault(); // Prevent standard touch behaviors (scroll/zoom)
                if (!this.state.isPlaying && !this.state.isGameOver) {
                    this.startGame();
                } else if (this.state.isGameOver) {
                    if (Date.now() - this.gameOverTime < 2000) return;
                    this.restartGame();
                }
                return;
            }

            const touch = e.changedTouches[0];
            const halfWidth = window.innerWidth / 2;

            if (touch.clientX < halfWidth) {
                // Left side: Flappy Bird Jump
                e.preventDefault();
                this.bird.jump();
            } else {
                // Right side: Record for Swipe
                touchStartX = touch.clientX;
                touchStartY = touch.clientY;
            }
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            if (!this.state.isPlaying) return;

            const touch = e.changedTouches[0];
            const halfWidth = window.innerWidth / 2;

            if (touch.clientX >= halfWidth) {
                const touchEndX = touch.clientX;
                const deltaX = touchEndX - touchStartX;
                const threshold = 30; // Minimum swipe distance

                if (Math.abs(deltaX) > threshold) {
                    e.preventDefault();
                    if (deltaX > 0) {
                        this.player.moveRight();
                    } else {
                        this.player.moveLeft();
                    }
                }
            }
        }, { passive: false });
    }

    startGame() {
        console.log("Executed startGame()");
        const startScreen = document.getElementById('startScreen');
        if (startScreen) {
            startScreen.classList.add('hidden'); // Use class list safely
        }

        this.state.isPlaying = true;
        this.lastPipeTime = Date.now();
        this.lastObstacleTime = Date.now();
        this.lastCoinTime = Date.now();
    }

    restartGame() {
        document.getElementById('gameOverScreen').classList.add('hidden');

        // Reset Leaderboard UI
        const submitBtn = document.getElementById('submitScoreButton');
        const nameInput = document.getElementById('playerNameInput');
        if (submitBtn) {
            submitBtn.textContent = "SUBMIT SCORE 🏆";
            submitBtn.disabled = false;
            submitBtn.style.background = "#27AE60";
        }
        if (nameInput) {
            nameInput.disabled = false;
            nameInput.value = "";
        }

        this.state.reset();
        this.bird.reset();
        this.player.reset();
        this.pipes = [];
        this.obstacles = [];
        this.coins = [];
        this.updateUI();
        this.state.isPlaying = true;
        this.lastPipeTime = Date.now();
        this.lastObstacleTime = Date.now();
        this.lastCoinTime = Date.now();
    }

    gameOver(cause) {
        console.log("Game Over:", cause);
        this.state.isGameOver = true;
        this.state.isPlaying = false;
        this.state.deathCause = cause;
        this.gameOverTime = Date.now();

        document.getElementById('deathMessage').textContent = cause;
        document.getElementById('finalFlappyScore').textContent = this.state.flappyScore;
        document.getElementById('finalSubwayScore').textContent = this.state.subwayScore;
        document.getElementById('finalTotalScore').textContent = this.state.getTotalScore();
        document.getElementById('finalHighScore').textContent = this.state.highScore;
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }

    updateUI() {
        if (!this.state) return;
        document.getElementById('flappyScore').textContent = this.state.flappyScore;
        document.getElementById('subwayScore').textContent = this.state.subwayScore;
        document.getElementById('totalScore').textContent = this.state.getTotalScore();
        document.getElementById('highScore').textContent = this.state.highScore;
    }

    update(dt) {
        if (!this.state.isPlaying || this.state.isGameOver) return;

        const now = Date.now();

        // ===== UPDATE FLAPPY BIRD =====
        this.bird.update(dt);

        if (now - this.lastPipeTime > CONFIG.flappy.pipes.spawnInterval) {
            this.pipes.push(new Pipe(CONFIG.flappy.canvas.width));
            this.lastPipeTime = now;
        }

        for (let i = this.pipes.length - 1; i >= 0; i--) {
            this.pipes[i].update(dt);

            if (!this.pipes[i].scored && this.bird.x > this.pipes[i].x + this.pipes[i].width) {
                this.pipes[i].scored = true;
                this.state.incrementFlappyScore();
                this.updateUI();
                console.log("Score:", this.state.flappyScore);
            }

            if (this.pipes[i].isOffScreen()) {
                this.pipes.splice(i, 1);
            }
        }

        const groundY = CONFIG.flappy.canvas.height - 100;
        if (this.bird.checkCollision(this.pipes, groundY)) {
            this.gameOver('💀 Died in Flappy Bird!');
            return;
        }

        // ===== UPDATE SUBWAY SURFERS =====
        this.player.update(dt);

        if (now - this.lastObstacleTime > CONFIG.subway.obstacles.spawnInterval) {
            const lane = Math.floor(Math.random() * 3);
            const type = CONFIG.subway.obstacles.types[Math.floor(Math.random() * CONFIG.subway.obstacles.types.length)];
            this.obstacles.push(new SubwayObstacle(lane, type));
            this.lastObstacleTime = now;
        }

        if (now - this.lastCoinTime > CONFIG.subway.coins.spawnInterval) {
            const lane = Math.floor(Math.random() * 3);
            this.coins.push(new SubwayCoin(lane));
            this.lastCoinTime = now;
        }

        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            this.obstacles[i].update(dt);

            if (!this.obstacles[i].passed && this.obstacles[i].y > this.player.y + this.player.height) {
                this.obstacles[i].passed = true;
                if (this.obstacles[i].type === 'train') {
                    this.state.incrementSubwayScore(1);
                    this.updateUI();
                }
            }

            if (this.obstacles[i].isOffScreen()) {
                this.obstacles.splice(i, 1);
            }
        }

        for (let i = this.coins.length - 1; i >= 0; i--) {
            this.coins[i].update(dt);

            if (!this.coins[i].collected && this.coins[i].checkCollection(this.player)) {
                this.coins[i].collected = true;
                this.state.incrementSubwayScore(1);
                this.updateUI();
                this.coins.splice(i, 1);
            } else if (this.coins[i].isOffScreen()) {
                this.coins.splice(i, 1);
            }
        }

        if (this.player.checkCollision(this.obstacles)) {
            this.gameOver('💥 Crashed in Subway Surfers!');
            return;
        }
    }

    draw() {
        try {
            this.flappyCtx.clearRect(0, 0, CONFIG.flappy.canvas.width, CONFIG.flappy.canvas.height);

            // Use cached sky gradient
            this.flappyCtx.fillStyle = this.skyGradient;
            this.flappyCtx.fillRect(0, 0, CONFIG.flappy.canvas.width, CONFIG.flappy.canvas.height);

            for (let pipe of this.pipes) {
                pipe.draw(this.flappyCtx);
            }

            this.bird.draw(this.flappyCtx);
            this.drawFlappyGround();

            this.subwayCtx.clearRect(0, 0, CONFIG.subway.canvas.width, CONFIG.subway.canvas.height);

            // Use cached subway gradient
            this.subwayCtx.fillStyle = this.subwayGradient;
            this.subwayCtx.fillRect(0, 0, CONFIG.subway.canvas.width, CONFIG.subway.canvas.height);

            this.drawSubwayLanes();

            for (let coin of this.coins) {
                coin.draw(this.subwayCtx);
            }

            for (let obstacle of this.obstacles) {
                obstacle.draw(this.subwayCtx);
            }

            this.player.draw(this.subwayCtx);
        } catch (e) {
            logError(e);
        }
    }

    drawFlappyGround() {
        const groundHeight = 100;

        this.flappyCtx.fillStyle = this.groundGradient;
        this.flappyCtx.fillRect(0, this.groundY, CONFIG.flappy.canvas.width, groundHeight);

        this.flappyCtx.fillStyle = '#228B22';
        for (let i = 0; i < CONFIG.flappy.canvas.width; i += 20) {
            this.flappyCtx.fillRect(i, this.groundY, 10, 5);
        }
    }

    drawSubwayLanes() {
        const laneWidth = CONFIG.subway.player.laneWidth;
        const startX = (CONFIG.subway.canvas.width - laneWidth * 3) / 2;

        this.subwayCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.subwayCtx.lineWidth = 3;

        for (let i = 0; i <= 3; i++) {
            const x = startX + i * laneWidth;
            this.subwayCtx.beginPath();
            this.subwayCtx.moveTo(x, 0);
            this.subwayCtx.lineTo(x, CONFIG.subway.canvas.height);
            this.subwayCtx.stroke();
        }

        const dashOffset = (Date.now() * 0.3) % 40;
        this.subwayCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.subwayCtx.lineWidth = 2;
        this.subwayCtx.setLineDash([20, 20]);

        for (let i = 1; i < 3; i++) {
            const x = startX + i * laneWidth;
            this.subwayCtx.beginPath();
            this.subwayCtx.lineDashOffset = -dashOffset;
            this.subwayCtx.moveTo(x, 0);
            this.subwayCtx.lineTo(x, CONFIG.subway.canvas.height);
            this.subwayCtx.stroke();
        }

        this.subwayCtx.setLineDash([]);
    }

    animate(timestamp) {
        try {
            if (!this.lastFrameTime) this.lastFrameTime = timestamp;
            const deltaTime = timestamp - this.lastFrameTime;
            this.lastFrameTime = timestamp;

            // Cap dt to prevent massive jumps if tab is inactive (e.g., max 100ms)
            // Normalize to 60 FPS (16.67ms per frame)
            // dt = 1.0 means 60 FPS. dt = 2.0 means 30 FPS.
            const dt = Math.min(deltaTime, 100) / 16.67;

            this.update(dt);
            this.draw();
        } catch (e) {
            logError(e);
        }
        requestAnimationFrame((t) => this.animate(t));
    }
}

let game;
window.addEventListener('load', () => {
    game = new DualGame();

    // Fullscreen Logic
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) fullscreenBtn.addEventListener('click', toggleFullscreen);

    const inGameFullscreenBtn = document.getElementById('inGameFullscreenBtn');
    if (inGameFullscreenBtn) inGameFullscreenBtn.addEventListener('click', toggleFullscreen);

    const gameOverFullscreenBtn = document.getElementById('gameOverFullscreenBtn');
    if (gameOverFullscreenBtn) gameOverFullscreenBtn.addEventListener('click', toggleFullscreen);
});
