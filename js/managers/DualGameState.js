export default class DualGameState {
    constructor() {
        this.flappyScore = 0;
        this.pongScore = 0;
        this.subwayScore = 0;
        this.highScore = parseInt(localStorage.getItem('dualChallengeHighScore')) || 0;
        this.isPlaying = false;
        this.isGameOver = false;
        this.deathCause = '';
        this.mode = 'hard'; // 'easy' or 'hard'
    }

    incrementFlappyScore() {
        this.flappyScore += 3;
        this.updateHighScore();
    }

    incrementPongScore() {
        this.pongScore += 5; // Pong points are worth more since it's hard!
        this.updateHighScore();
    }

    incrementSubwayScore(points = 1) {
        this.subwayScore += points;
        this.updateHighScore();
    }

    getTotalScore() {
        if (this.mode === 'easy') {
            return this.flappyScore + this.subwayScore;
        }
        return this.flappyScore + this.pongScore + this.subwayScore;
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
        this.pongScore = 0;
        this.subwayScore = 0;
        this.isPlaying = false;
        this.isGameOver = false;
        this.deathCause = '';
    }
}
