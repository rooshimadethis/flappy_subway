import { firebaseDb } from '../config.js';

// ===== LEADERBOARD MANAGER =====
export default class LeaderboardManager {
    constructor() {
        this.modal = document.getElementById('leaderboardModal');
        this.list = document.getElementById('leaderboardList');
        this.closeBtn = document.getElementById('closeLeaderboard');
        this.submitBtn = document.getElementById('submitScoreButton');
        this.nameInput = document.getElementById('playerNameInput');

        // Filter buttons
        this.filterHard = document.getElementById('filterHard');
        this.filterEasy = document.getElementById('filterEasy');
        this.tabThisWeek = document.getElementById('tabThisWeek');
        this.tabAllTime = document.getElementById('tabAllTime');

        this.activeMode = 'hard'; // 'hard' or 'easy'
        this.activeTimeframe = 'weekly'; // 'weekly' or 'allTime'

        this.setupListeners();
        this.setupFilters();
    }

    setupFilters() {
        if (this.filterHard) this.filterHard.addEventListener('click', () => this.switchMode('hard'));
        if (this.filterEasy) this.filterEasy.addEventListener('click', () => this.switchMode('easy'));
        if (this.tabThisWeek) this.tabThisWeek.addEventListener('click', () => this.switchTimeframe('weekly'));
        if (this.tabAllTime) this.tabAllTime.addEventListener('click', () => this.switchTimeframe('allTime'));
    }

    switchMode(mode) {
        this.activeMode = mode;
        this.filterHard.classList.toggle('active', mode === 'hard');
        this.filterEasy.classList.toggle('active', mode === 'easy');
        this.fetchScores();
    }

    switchTimeframe(timeframe) {
        this.activeTimeframe = timeframe;
        this.tabThisWeek.classList.toggle('active', timeframe === 'weekly');
        this.tabAllTime.classList.toggle('active', timeframe === 'allTime');
        this.fetchScores();
    }

    getYearWeek() {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
        const week1 = new Date(d.getFullYear(), 0, 4);
        const week = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        return `${d.getFullYear()}_${week.toString().padStart(2, '0')}`;
    }

    setupListeners() {
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hide();
            });
        }
        if (this.submitBtn) {
            this.submitBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.submitScore();
            });
        }
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    e.stopPropagation();
                    this.hide();
                }
            });

            // Prevent all touch events from reaching the game engine when modal is open
            this.modal.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
            this.modal.addEventListener('touchmove', (e) => {
                // If touching the list, let it bubble to the list's own handler
                // but stop it from reaching the document/game
                if (e.target.closest('#leaderboardList')) {
                    e.stopPropagation();
                } else {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }, { passive: false });
            this.modal.addEventListener('touchend', (e) => e.stopPropagation(), { passive: true });
        }
    }

    isVisible() {
        return this.modal && !this.modal.classList.contains('hidden');
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

        const isHardMode = !document.getElementById('finalPongScore').parentElement.classList.contains('hidden');
        const mode = isHardMode ? 'hard' : 'easy';

        if (!name) {
            alert("Please enter a name!");
            return;
        }

        try {
            this.submitBtn.disabled = true;
            this.submitBtn.textContent = "Submitting...";

            const scoreData = {
                name: name,
                score: score,
                mode: mode,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };

            const updates = {};
            const weekId = this.getYearWeek();

            // Store in new segmented paths (leaderboard/hard/allTime etc)
            const newKey = firebaseDb.ref(`leaderboard/${mode}/allTime`).push().key;
            updates[`/leaderboard/${mode}/allTime/${newKey}`] = scoreData;
            updates[`/leaderboard/${mode}/weekly/${weekId}/${newKey}`] = scoreData;

            await firebaseDb.ref().update(updates);

            this.submitBtn.textContent = "Submitted! ✅";
            this.submitBtn.style.background = "#059669";
            this.submitBtn.style.transform = "translate(6px, 6px)";
            this.nameInput.disabled = true;

            setTimeout(() => {
                // When we show the leaderboard after submission, auto-switch to the mode they just played
                this.switchMode(mode);
                this.show();
            }, 1000);

        } catch (e) {
            console.error("Error submitting score:", e);
            alert("Failed to submit score.");
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = "SUBMIT SCORE 🏆";
        }
    }

    fetchScores() {
        if (!firebaseDb) {
            this.list.innerHTML = '<div class="loading-spinner">Leaderboard unavailable</div>';
            return;
        }

        this.list.innerHTML = '<div class="loading-spinner">Loading scores...</div>';

        let path = `leaderboard/${this.activeMode}/allTime`;
        if (this.activeTimeframe === 'weekly') {
            path = `leaderboard/${this.activeMode}/weekly/${this.getYearWeek()}`;
        }

        const scoresRef = firebaseDb.ref(path);
        scoresRef.orderByChild('score').limitToLast(10).once('value')
            .then((snapshot) => {
                const scores = [];
                snapshot.forEach((childSnapshot) => {
                    scores.push(childSnapshot.val());
                });
                scores.reverse();
                this.renderScores(scores);
            })
            .catch((e) => {
                console.error("Error fetching scores:", e);
                this.list.innerHTML = `<div class="loading-spinner">Error loading scores</div>`;
            });
    }

    renderScores(scores) {
        if (scores.length === 0) {
            this.list.innerHTML = '<div class="loading-spinner">No scores yet in this category!</div>';
            return;
        }

        let html = '';
        scores.forEach((entry, index) => {
            let rankEmoji = '';
            if (index === 0) rankEmoji = '🥇';
            else if (index === 1) rankEmoji = '🥈';
            else if (index === 2) rankEmoji = '🥉';
            else rankEmoji = `#${index + 1}`;

            const isHard = entry.mode === 'hard';
            const modeBadge = isHard ? '<span class="mode-badge hard">💀 HARD</span>' : '<span class="mode-badge easy">🐣 EASY</span>';
            const entryClass = isHard ? 'leaderboard-entry hard-mode-entry' : 'leaderboard-entry';

            html += `
                <div class="${entryClass}">
                    <div class="leaderboard-rank">${rankEmoji}</div>
                    <div class="leaderboard-name">${this.escapeHtml(entry.name)}</div>
                    <div class="leaderboard-score-section">
                        ${modeBadge}
                        <div class="leaderboard-score">${entry.score}</div>
                    </div>
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
