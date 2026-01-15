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

            // Do not show leaderboard on initial load anymore

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
            this.initSharedAssets();
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
        this.skyColor = '#87CEEB';
        this.subwayBgColor = '#2C3E50';
        const groundHeight = 100;
        this.groundColor = '#8B7355';
        this.groundY = CONFIG.flappy.canvas.height - groundHeight;
    }

    setupEventListeners() {
        const startEasyBtn = document.getElementById('startEasyButton');
        const startHardBtn = document.getElementById('startHardButton');

        if (startEasyBtn) {
            startEasyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.startGame('easy');
            });
        }

        if (startHardBtn) {
            startHardBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.startGame('hard');
            });
        }

        const startLeaderboardBtn = document.getElementById('startScreenLeaderboardBtn');
        if (startLeaderboardBtn) {
            startLeaderboardBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.leaderboard.show();
                this.leaderboard.fetchScores();
            });
        }

        const restartBtn = document.getElementById('restartButton');
        if (restartBtn) {
            restartBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.restartGame();
            });
        }

        const switchModeBtn = document.getElementById('switchModeButton');
        if (switchModeBtn) {
            switchModeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleMode();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (document.activeElement.tagName === 'INPUT') return;
            if (this.leaderboard.isVisible()) return;

            if (!this.state.isPlaying || this.state.isGameOver) {
                if (e.code === 'Space' || e.code === 'Enter') {
                    e.preventDefault();
                    if (!this.state.isPlaying && !this.state.isGameOver) {
                        // Default to hard if using keyboard shortcuts at start? 
                        // Actually, maybe don't start from space/enter if there's mode choice.
                        // Or default to preferred? Let's just avoid start from keyboard if screen is visible.
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

        // Touch Controls
        let touchStartX = 0;
        let touchStartY = 0;

        document.addEventListener('touchstart', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
            if (this.leaderboard.isVisible()) return;

            if (!this.state.isPlaying || this.state.isGameOver) {
                if (this.state.isGameOver) {
                    if (Date.now() - this.gameOverTime < 1000) return;
                    this.restartGame();
                }
                return;
            }

            const touch = e.changedTouches[0];
            const halfWidth = window.innerWidth / 2;

            if (touch.clientX < halfWidth) {
                e.preventDefault();
                this.bird.jump();
            } else {
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
                const threshold = 30;

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

        window.addEventListener('resize', () => {
            if (this.pongGame) this.pongGame.handleResize();
        });
    }

    applyModeUI(mode) {
        const panels = document.querySelectorAll('.game-panel');
        const pongPanel = document.querySelector('.middle-panel');
        const middleDivider = document.querySelector('.middle-divider');
        const pongScores = document.querySelectorAll('.pong-score-section, .pong-divider, .pong-final-score');
        const hardOnlyElements = document.querySelectorAll('.hard-only');

        if (mode === 'easy') {
            pongPanel.classList.add('hidden');
            middleDivider.classList.add('hidden');
            pongScores.forEach(el => el.classList.add('hidden'));
            hardOnlyElements.forEach(el => el.classList.add('hidden'));
            document.querySelector('.subtitle-container').classList.remove('hard-mode');
        } else {
            pongPanel.classList.remove('hidden');
            middleDivider.classList.remove('hidden');
            pongScores.forEach(el => el.classList.remove('hidden'));
            hardOnlyElements.forEach(el => el.classList.remove('hidden'));
            document.querySelector('.subtitle-container').classList.add('hard-mode');
        }

        // Trigger pong resize after layout change
        setTimeout(() => this.pongGame.handleResize(), 50);
    }

    startGame(mode) {
        console.log("Starting game in mode:", mode);
        this.state.mode = mode || 'hard';
        this.applyModeUI(this.state.mode);

        const startScreen = document.getElementById('startScreen');
        if (startScreen) {
            startScreen.classList.add('hidden');
        }

        this.state.isPlaying = true;
        this.lastPipeTime = Date.now();
        this.lastObstacleTime = Date.now();
        this.lastCoinTime = Date.now();

        if (this.state.mode === 'hard') {
            this.pongGame.requestPermissions();
            this.pongGame.start();
        }
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

        // Show start screen again to allow mode choice? 
        // Or just restart in current mode? Usually, "Try Again" means same mode.
        this.state.isPlaying = true;
        this.lastPipeTime = Date.now();
        this.lastObstacleTime = Date.now();
        this.lastCoinTime = Date.now();

        if (this.state.mode === 'hard') {
            this.pongGame.requestPermissions();
            this.pongGame.start();
        } else {
            this.pongGame.stop();
        }
    }

    toggleMode() {
        // Toggle mode
        const newMode = this.state.mode === 'easy' ? 'hard' : 'easy';
        console.log("Switching mode to:", newMode);

        this.state.mode = newMode;
        this.applyModeUI(newMode);

        // Restart with fresh state
        this.restartGame();
    }

    gameOver(cause) {
        console.log("Game Over:", cause);
        this.state.isGameOver = true;
        this.state.isPlaying = false;
        this.state.deathCause = cause;
        this.gameOverTime = Date.now();

        if (this.pongGame) this.pongGame.stop();

        document.getElementById('deathMessage').textContent = cause;
        document.getElementById('finalFlappyScore').textContent = this.state.flappyScore;
        document.getElementById('finalSubwayScore').textContent = this.state.subwayScore;

        if (this.state.mode === 'hard') {
            document.getElementById('finalPongScore').textContent = this.state.pongScore;
            document.querySelector('.pong-final-score').classList.remove('hidden');
        } else {
            document.querySelector('.pong-final-score').classList.add('hidden');
        }

        document.getElementById('finalTotalScore').textContent = this.state.getTotalScore();
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }

    updateUI() {
        if (!this.state) return;
        document.getElementById('flappyScore').textContent = this.state.flappyScore;
        document.getElementById('subwayScore').textContent = this.state.subwayScore;
        document.getElementById('totalScore').textContent = this.state.getTotalScore();
        document.getElementById('highScore').textContent = this.state.highScore;

        const pongScoreEl = document.getElementById('pongScore');
        if (pongScoreEl) pongScoreEl.textContent = this.state.pongScore;
    }

    update(dt) {
        if (!this.state.isPlaying || this.state.isGameOver) return;

        const now = Date.now();

        // Update Flappy
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
            }
            if (this.pipes[i].isOffScreen()) this.pipes.splice(i, 1);
        }
        if (this.bird.checkCollision(this.pipes, this.groundY)) {
            this.gameOver('💀 Died in Flappy Bird!');
            return;
        }

        // Update Subway
        this.player.update(dt);
        this.subwaySpawnTimer += dt;
        const subwayIntervalFrames = CONFIG.subway.obstacles.spawnInterval / 16.67;
        if (this.subwaySpawnTimer >= subwayIntervalFrames) {
            this.subwaySpawnTimer -= subwayIntervalFrames;
            this.coinSpawnedThisCycle = false;
            const lane = Math.floor(Math.random() * 3);
            const type = CONFIG.subway.obstacles.types[Math.floor(Math.random() * CONFIG.subway.obstacles.types.length)];
            this.obstacles.push(new SubwayObstacle(lane, type));
        }
        if (!this.coinSpawnedThisCycle && this.subwaySpawnTimer >= subwayIntervalFrames / 2) {
            this.coinSpawnedThisCycle = true;
            this.coins.push(new SubwayCoin(Math.floor(Math.random() * 3)));
        }
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            this.obstacles[i].update(dt);
            if (!this.obstacles[i].passed && this.obstacles[i].y > this.player.y + this.player.height) {
                this.obstacles[i].passed = true;
                // Score for ANY obstacle passed
                this.state.incrementSubwayScore(1);
                this.updateUI();
            }
            if (this.obstacles[i].isOffScreen()) this.obstacles.splice(i, 1);
        }
        for (let i = this.coins.length - 1; i >= 0; i--) {
            this.coins[i].update(dt);
            if (!this.coins[i].collected && this.coins[i].checkCollection(this.player)) {
                this.coins[i].collected = true;
                this.state.incrementSubwayScore(1);
                this.updateUI();
                this.coins.splice(i, 1);
            } else if (this.coins[i].isOffScreen()) this.coins.splice(i, 1);
        }
        if (this.player.checkCollision(this.obstacles)) {
            this.gameOver('💥 Crashed in Subway Surfers!');
            return;
        }

        // Update Pong
        if (this.state.mode === 'hard') {
            this.pongGame.update(dt);
        }
    }

    draw() {
        try {
            this.flappyCtx.clearRect(0, 0, CONFIG.flappy.canvas.width, CONFIG.flappy.canvas.height);
            this.flappyCtx.fillStyle = this.skyColor;
            this.flappyCtx.fillRect(0, 0, CONFIG.flappy.canvas.width, CONFIG.flappy.canvas.height);
            for (let pipe of this.pipes) pipe.draw(this.flappyCtx);
            this.bird.draw(this.flappyCtx);
            this.drawFlappyGround();

            this.subwayCtx.clearRect(0, 0, CONFIG.subway.canvas.width, CONFIG.subway.canvas.height);
            this.subwayCtx.fillStyle = this.subwayBgColor;
            this.subwayCtx.fillRect(0, 0, CONFIG.subway.canvas.width, CONFIG.subway.canvas.height);
            this.drawSubwayLanes();
            for (let coin of this.coins) coin.draw(this.subwayCtx);
            for (let obstacle of this.obstacles) obstacle.draw(this.subwayCtx);
            this.player.draw(this.subwayCtx);

            if (this.state.mode === 'hard') {
                this.pongGame.render();
            }
        } catch (e) {
            logError(e);
        }
    }

    drawFlappyGround() {
        this.flappyCtx.fillStyle = this.groundColor;
        this.flappyCtx.fillRect(0, this.groundY, CONFIG.flappy.canvas.width, CONFIG.flappy.canvas.height - this.groundY);
        this.flappyCtx.fillStyle = '#228B22';
        this.flappyCtx.fillRect(0, this.groundY, CONFIG.flappy.canvas.width, 10);
    }

    drawSubwayLanes() {
        const laneWidth = CONFIG.subway.player.laneWidth;
        const totalRoadWidth = laneWidth * 3;
        const startX = (CONFIG.subway.canvas.width - totalRoadWidth) / 2;
        this.subwayCtx.fillStyle = '#1a1a1a';
        this.subwayCtx.fillRect(startX, 0, totalRoadWidth, CONFIG.subway.canvas.height);
        this.subwayCtx.fillStyle = '#333';
        this.subwayCtx.fillRect(startX - 4, 0, 4, CONFIG.subway.canvas.height);
        this.subwayCtx.fillRect(startX + totalRoadWidth, 0, 4, CONFIG.subway.canvas.height);
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
    const toggleFullscreen = () => {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        if (isIOS) {
            const iosModal = document.getElementById('iosModal');
            if (iosModal) {
                iosModal.classList.remove('hidden');
                document.getElementById('closeIosModal').onclick = () => iosModal.classList.add('hidden');
                iosModal.onclick = (e) => { if (e.target === iosModal) iosModal.classList.add('hidden'); };
            }
            return;
        }
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    // Fix for mobile viewport height and browser chrome detection
    const fixViewportHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);

        // Detect if user is in browser vs standalone/fullscreen
        const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
        const isFullscreen = !!document.fullscreenElement;

        if (!isStandalone && !isFullscreen) {
            document.body.classList.add('is-not-fullscreen');
        } else {
            document.body.classList.remove('is-not-fullscreen');
        }
    };

    window.addEventListener('resize', fixViewportHeight);
    window.addEventListener('orientationchange', fixViewportHeight);
    fixViewportHeight();

    document.getElementById('fullscreenBtn')?.addEventListener('click', toggleFullscreen);
    document.getElementById('inGameFullscreenBtn')?.addEventListener('click', toggleFullscreen);
    document.getElementById('gameOverFullscreenBtn')?.addEventListener('click', toggleFullscreen);
});
