import { CONFIG, ASSETS } from './config.js';
import { logError } from './utils.js';
import DualGameState from './managers/DualGameState.js';
import LeaderboardManager from './managers/LeaderboardManager.js';
import Bird from './entities/Bird.js';
import Pipe from './entities/Pipe.js';
import SubwayPlayer from './entities/SubwayPlayer.js';
import SubwayObstacle from './entities/SubwayObstacle.js';
import SubwayCoin from './entities/SubwayCoin.js';
import PongGame from './entities/PongGame.js';

// ===== DUAL GAME MANAGER =====
class DualGame {
    constructor() {
        console.log("Initializing DualGame...");
        try {
            this.flappyCanvas = document.getElementById('flappyCanvas');
            this.flappyCtx = this.flappyCanvas.getContext('2d');
            this.subwayCanvas = document.getElementById('subwayCanvas');
            this.subwayCtx = this.subwayCanvas.getContext('2d');
            this.pongContainer = document.getElementById('pongContainer');

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
            this.subwaySpawnTimer = 0;
            this.coinSpawnedThisCycle = false;

            this.pongGame = new PongGame(
                'pongContainer',
                () => {
                    this.state.incrementPongScore();
                    this.updateUI();
                },
                (cause) => this.gameOver(cause)
            );

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
        // Flat sky color
        this.skyColor = '#87CEEB';

        // Flat subway background
        this.subwayBgColor = '#2C3E50';

        // Flat ground color
        const groundHeight = 100;
        this.groundColor = '#8B7355';
        this.groundY = CONFIG.flappy.canvas.height - groundHeight;
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
            if (document.activeElement.tagName === 'INPUT') return;
            if (this.leaderboard.isVisible()) return;

            if (!this.state.isPlaying || this.state.isGameOver) {
                if (e.code === 'Space' || e.code === 'Enter') {
                    e.preventDefault();
                    if (!this.state.isPlaying && !this.state.isGameOver) {
                        this.startGame();
                    } else if (this.state.isGameOver) {
                        if (Date.now() - this.gameOverTime < 1000) return;
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
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
            if (this.leaderboard.isVisible()) return;

            // Handle Game Start/Restart on Tap
            if (!this.state.isPlaying || this.state.isGameOver) {
                e.preventDefault(); // Prevent standard touch behaviors (scroll/zoom)
                if (!this.state.isPlaying && !this.state.isGameOver) {
                    this.startGame();
                } else if (this.state.isGameOver) {
                    if (Date.now() - this.gameOverTime < 1000) return;
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
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
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
        this.pongGame.requestPermissions();
        this.pongGame.start();
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
        this.subwaySpawnTimer = 0;
        this.coinSpawnedThisCycle = false;
        this.updateUI();
        this.state.isPlaying = true;
        this.lastPipeTime = Date.now();
        this.lastObstacleTime = Date.now();
        this.lastCoinTime = Date.now();
        this.pongGame.requestPermissions();
        this.pongGame.start();
    }

    gameOver(cause) {
        console.log("Game Over:", cause);
        this.state.isGameOver = true;
        this.state.isPlaying = false;
        this.state.deathCause = cause;
        this.gameOverTime = Date.now();

        document.getElementById('deathMessage').textContent = cause;
        document.getElementById('finalFlappyScore').textContent = this.state.flappyScore;
        document.getElementById('finalPongScore').textContent = this.state.pongScore;
        document.getElementById('finalSubwayScore').textContent = this.state.subwayScore;
        document.getElementById('finalTotalScore').textContent = this.state.getTotalScore();
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }

    updateUI() {
        if (!this.state) return;
        document.getElementById('flappyScore').textContent = this.state.flappyScore;
        document.getElementById('pongScore').textContent = this.state.pongScore;
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

        if (this.bird.checkCollision(this.pipes, this.groundY)) {
            this.gameOver('💀 Died in Flappy Bird!');
            return;
        }

        // ===== UPDATE SUBWAY SURFERS =====
        this.player.update(dt);

        this.subwaySpawnTimer += dt;
        const subwayIntervalFrames = CONFIG.subway.obstacles.spawnInterval / 16.67;

        // Spawn Obstacle
        if (this.subwaySpawnTimer >= subwayIntervalFrames) {
            this.subwaySpawnTimer -= subwayIntervalFrames;
            this.coinSpawnedThisCycle = false;

            const lane = Math.floor(Math.random() * 3);
            const type = CONFIG.subway.obstacles.types[Math.floor(Math.random() * CONFIG.subway.obstacles.types.length)];
            this.obstacles.push(new SubwayObstacle(lane, type));
        }

        // Spawn Coin (Synchronized to half-way between obstacles)
        if (!this.coinSpawnedThisCycle && this.subwaySpawnTimer >= subwayIntervalFrames / 2) {
            this.coinSpawnedThisCycle = true;
            const lane = Math.floor(Math.random() * 3);
            this.coins.push(new SubwayCoin(lane));
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

        // ===== UPDATE PONG =====
        this.pongGame.update(dt);
    }

    draw() {
        try {
            this.flappyCtx.clearRect(0, 0, CONFIG.flappy.canvas.width, CONFIG.flappy.canvas.height);

            // Use flat sky color
            this.flappyCtx.fillStyle = this.skyColor;
            this.flappyCtx.fillRect(0, 0, CONFIG.flappy.canvas.width, CONFIG.flappy.canvas.height);

            for (let pipe of this.pipes) {
                pipe.draw(this.flappyCtx);
            }

            this.bird.draw(this.flappyCtx);
            this.drawFlappyGround();

            this.subwayCtx.clearRect(0, 0, CONFIG.subway.canvas.width, CONFIG.subway.canvas.height);

            // Use flat subway color
            this.subwayCtx.fillStyle = this.subwayBgColor;
            this.subwayCtx.fillRect(0, 0, CONFIG.subway.canvas.width, CONFIG.subway.canvas.height);

            this.drawSubwayLanes();

            for (let coin of this.coins) {
                coin.draw(this.subwayCtx);
            }

            for (let obstacle of this.obstacles) {
                obstacle.draw(this.subwayCtx);
            }

            this.player.draw(this.subwayCtx);

            // ===== DRAW PONG =====
            this.pongGame.render();
        } catch (e) {
            logError(e);
        }
    }

    drawFlappyGround() {
        this.flappyCtx.fillStyle = this.groundColor;
        this.flappyCtx.fillRect(0, this.groundY, CONFIG.flappy.canvas.width, CONFIG.flappy.canvas.height - this.groundY);

        // Retro grass line
        this.flappyCtx.fillStyle = '#228B22';
        this.flappyCtx.fillRect(0, this.groundY, CONFIG.flappy.canvas.width, 10);
    }

    drawSubwayLanes() {
        const laneWidth = CONFIG.subway.player.laneWidth;
        const totalRoadWidth = laneWidth * 3;
        const startX = (CONFIG.subway.canvas.width - totalRoadWidth) / 2;

        // Draw Road Base
        this.subwayCtx.fillStyle = '#1a1a1a';
        this.subwayCtx.fillRect(startX, 0, totalRoadWidth, CONFIG.subway.canvas.height);

        // Draw Road Edges (Walls)
        this.subwayCtx.fillStyle = '#333';
        this.subwayCtx.fillRect(startX - 4, 0, 4, CONFIG.subway.canvas.height);
        this.subwayCtx.fillRect(startX + totalRoadWidth, 0, 4, CONFIG.subway.canvas.height);

        // Draw Lane Dividers
        this.subwayCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        for (let i = 1; i < 3; i++) {
            const x = startX + i * laneWidth;
            this.subwayCtx.fillRect(x - 2, 0, 4, CONFIG.subway.canvas.height);
        }
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

// ===== GAME ENTRY POINT =====
let game;

window.addEventListener('load', () => {
    game = new DualGame();

    // Fullscreen Logic
    const toggleFullscreen = () => {
        // Detect iOS (iPhone, iPad, iPod)
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        if (isIOS) {
            // Show iOS instructions modal
            const iosModal = document.getElementById('iosModal');
            if (iosModal) {
                iosModal.classList.remove('hidden');

                // Ensure close button works
                const closeBtn = document.getElementById('closeIosModal');
                if (closeBtn) {
                    closeBtn.onclick = () => {
                        iosModal.classList.add('hidden');
                    };
                }

                // Close on backdrop click
                iosModal.onclick = (e) => {
                    if (e.target === iosModal) {
                        iosModal.classList.add('hidden');
                    }
                };
            }
            return;
        }

        // Standard Fullscreen API for Android/Desktop
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
                alert("Fullscreen not supported on this device/browser.");
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
