/* global THREE */
import { CONFIG } from '../config.js';

export default class PongGame {
    constructor(containerId, onScore, onGameOver) {
        this.container = document.getElementById(containerId);
        this.onScore = onScore;
        this.onGameOver = onGameOver;

        this.keys = {};
        this.init();
        this.setupInput();
    }

    init() {
        const width = this.container.clientWidth || 300;
        const height = this.container.clientHeight || 800;

        // Scene setup
        this.scene = new THREE.Scene();

        // Camera setup - looking down the court
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.set(0, 18, 25);
        this.camera.lookAt(0, 0, 5);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const spotLight = new THREE.SpotLight(0x00f2fe, 1);
        spotLight.position.set(0, 20, 0);
        spotLight.castShadow = true;
        this.scene.add(spotLight);

        // Court
        const courtGeo = new THREE.PlaneGeometry(CONFIG.pong.courtSize.width, CONFIG.pong.courtSize.height);
        const courtMat = new THREE.MeshPhongMaterial({
            color: 0x1a1a1a,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        this.court = new THREE.Mesh(courtGeo, courtMat);
        this.court.rotation.x = -Math.PI / 2;
        this.scene.add(this.court);

        // Court Grid/Lines for 3D effect
        const grid = new THREE.GridHelper(20, 10, 0x444444, 0x222222);
        grid.position.y = 0.01;
        this.scene.add(grid);

        // Walls (invisible but for collision visualization/feel)
        const wallGeo = new THREE.BoxGeometry(0.2, 1, CONFIG.pong.courtSize.height);
        const wallMat = new THREE.MeshPhongMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.3 });

        this.leftWall = new THREE.Mesh(wallGeo, wallMat);
        this.leftWall.position.set(-CONFIG.pong.courtSize.width / 2 - 0.1, 0.5, 0);
        this.scene.add(this.leftWall);

        this.rightWall = new THREE.Mesh(wallGeo, wallMat);
        this.rightWall.position.set(CONFIG.pong.courtSize.width / 2 + 0.1, 0.5, 0);
        this.scene.add(this.rightWall);

        // Paddles
        const paddleGeo = new THREE.BoxGeometry(CONFIG.pong.paddleSize.width, 0.5, CONFIG.pong.paddleSize.height);
        const playerMat = new THREE.MeshPhongMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.5 });
        const aiMat = new THREE.MeshPhongMaterial({ color: 0x4FACFE, emissive: 0x4FACFE, emissiveIntensity: 0.5 });

        this.playerPaddle = new THREE.Mesh(paddleGeo, playerMat);
        this.playerPaddle.position.set(0, 0.25, CONFIG.pong.courtSize.height / 2 - 1);
        this.scene.add(this.playerPaddle);

        this.aiPaddle = new THREE.Mesh(paddleGeo, aiMat);
        this.aiPaddle.position.set(0, 0.25, -CONFIG.pong.courtSize.height / 2 + 1);
        this.scene.add(this.aiPaddle);

        // Ball
        const ballGeo = new THREE.SphereGeometry(CONFIG.pong.ballSize, 32, 32);
        const ballMat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8 });
        this.ball = new THREE.Mesh(ballGeo, ballMat);
        this.ball.position.set(0, CONFIG.pong.ballSize, 0);
        this.scene.add(this.ball);

        // Game state
        this.ballVelocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            0,
            -CONFIG.pong.ballSpeed
        );
        this.playerTargetX = 0;
        this.isPlaying = false;
    }

    requestPermissions() {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(response => {
                    if (response === 'granted') {
                        this.gyroEnabled = true;
                        console.log("Gyroscope permission granted");
                    }
                })
                .catch(console.error);
        } else {
            this.gyroEnabled = true;
        }
    }

    setupInput() {
        this.gyroEnabled = false;

        window.addEventListener('deviceorientation', (event) => {
            if (!this.isPlaying) return;

            let tilt = 0;
            const orientation = window.orientation || (screen.orientation && screen.orientation.angle) || 0;

            // In landscape mode, the axes are swapped
            if (orientation === 90) {
                tilt = event.beta / 30;
            } else if (orientation === -90 || orientation === 270) {
                tilt = -event.beta / 30;
            } else {
                tilt = event.gamma / 30;
            }

            if (tilt !== 0 && !isNaN(tilt)) {
                tilt = Math.max(-1, Math.min(1, tilt));
                const halfWidth = (CONFIG.pong.courtSize.width - CONFIG.pong.paddleSize.width) / 2;
                this.playerTargetX = tilt * halfWidth;
                this.usingGyro = true;
            }
        });

        // Keyboard Controls - Tracking state for holding
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            this.usingGyro = false;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }

    reset() {
        this.ball.position.set(0, CONFIG.pong.ballSize, 0);
        this.ballVelocity.set(
            (Math.random() - 0.5) * 0.2,
            0,
            -CONFIG.pong.ballSpeed
        );
        this.playerTargetX = 0;
        this.playerPaddle.position.x = 0;
        this.aiPaddle.position.x = 0;
    }

    start() {
        this.isPlaying = true;
        this.reset();
    }

    stop() {
        this.isPlaying = false;
    }

    update(dt) {
        if (!this.isPlaying) return;

        // Handle Keyboard Movement (Continuous when holding)
        if (!this.usingGyro) {
            const step = 0.4 * dt;
            const halfWidth = (CONFIG.pong.courtSize.width - CONFIG.pong.paddleSize.width) / 2;
            if (this.keys['x']) {
                this.playerTargetX = Math.max(-halfWidth, this.playerTargetX - step);
            }
            if (this.keys['v']) {
                this.playerTargetX = Math.min(halfWidth, this.playerTargetX + step);
            }
        }

        // Move Player Paddle towards target (smoothly)
        const lerpFactor = 0.2 * dt;
        this.playerPaddle.position.x += (this.playerTargetX - this.playerPaddle.position.x) * lerpFactor;

        // Simple AI for the other paddle
        const aiLerp = 0.08 * dt;
        const aiTargetX = Math.max(-4, Math.min(4, this.ball.position.x));
        this.aiPaddle.position.x += (aiTargetX - this.aiPaddle.position.x) * aiLerp;

        // Move Ball
        this.ball.position.x += this.ballVelocity.x * dt;
        this.ball.position.z += this.ballVelocity.z * dt;

        // Wall Collisions
        const halfCourtWidth = CONFIG.pong.courtSize.width / 2;
        if (Math.abs(this.ball.position.x) + CONFIG.pong.ballSize > halfCourtWidth) {
            this.ballVelocity.x *= -1;
            this.ball.position.x = Math.sign(this.ball.position.x) * (halfCourtWidth - CONFIG.pong.ballSize);
        }

        // Paddle Collisions
        const checkPaddleCollision = (paddle, isPlayer) => {
            const paddleHalfWidth = CONFIG.pong.paddleSize.width / 2;
            const paddleHalfDepth = CONFIG.pong.paddleSize.height / 2;

            const dx = Math.abs(this.ball.position.x - paddle.position.x);
            const dz = Math.abs(this.ball.position.z - paddle.position.z);

            if (dx < paddleHalfWidth + CONFIG.pong.ballSize && dz < paddleHalfDepth + CONFIG.pong.ballSize) {
                // Collision detected!
                this.ballVelocity.z *= -1;

                // Add some angle based on where it hit the paddle
                const hitOffset = (this.ball.position.x - paddle.position.x) / paddleHalfWidth;
                this.ballVelocity.x += hitOffset * 0.1;

                // Increase speed slightly
                this.ballVelocity.multiplyScalar(1.05);

                if (isPlayer) {
                    this.onScore(); // Bonus points for hitting?
                }

                // Prevent sticking
                this.ball.position.z = paddle.position.z + (isPlayer ? -1 : 1) * (paddleHalfDepth + CONFIG.pong.ballSize + 0.1);
            }
        };

        checkPaddleCollision(this.playerPaddle, true);
        checkPaddleCollision(this.aiPaddle, false);

        // Scoring / Game Over
        const halfCourtDepth = CONFIG.pong.courtSize.height / 2;
        if (this.ball.position.z > halfCourtDepth) {
            // Player missed
            this.onGameOver('🏓 Missed the ball in Pong!');
        } else if (this.ball.position.z < -halfCourtDepth) {
            // AI missed - player gets points and reset ball
            this.onScore();
            this.reset();
        }

        // Subtle tilt of the court based on paddle position for extra juice
        this.court.rotation.y = this.playerPaddle.position.x * 0.02;
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    handleResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
}
