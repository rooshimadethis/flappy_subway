export default class DualGameState {
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
