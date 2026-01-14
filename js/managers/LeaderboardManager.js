import { firebaseDb } from '../config.js';

// ===== LEADERBOARD MANAGER =====
export default class LeaderboardManager {
    constructor() {
        this.modal = document.getElementById('leaderboardModal');
        this.list = document.getElementById('leaderboardList');
        this.closeBtn = document.getElementById('closeLeaderboard');
        this.viewBtn = document.getElementById('viewLeaderboardButton');
        this.submitBtn = document.getElementById('submitScoreButton');
        this.nameInput = document.getElementById('playerNameInput');

        this.tabThisWeek = document.getElementById('tabThisWeek');
        this.tabAllTime = document.getElementById('tabAllTime');
        this.activeTab = 'weekly'; // 'weekly' or 'allTime'

        this.setupListeners();
        this.setupTabs();
    }

    setupTabs() {
        if (this.tabThisWeek && this.tabAllTime) {
            this.tabThisWeek.addEventListener('click', () => this.switchTab('weekly'));
            this.tabAllTime.addEventListener('click', () => this.switchTab('allTime'));
        }
    }

    switchTab(tab) {
        this.activeTab = tab;

        // Update UI
        if (tab === 'weekly') {
            this.tabThisWeek.classList.add('active');
            this.tabAllTime.classList.remove('active');
        } else {
            this.tabThisWeek.classList.remove('active');
            this.tabAllTime.classList.add('active');
        }

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

            const scoreData = {
                name: name,
                score: score,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };

            // 1. Submit to All-Time Leaderboard
            const updates = {};
            const newScoreKey = firebaseDb.ref('scores').push().key;
            updates['/scores/' + newScoreKey] = scoreData;

            // 2. Submit to Weekly Leaderboard
            const weekId = this.getYearWeek();
            const newWeeklyKey = firebaseDb.ref(`weekly_scores/${weekId}`).push().key;
            updates[`/weekly_scores/${weekId}/${newWeeklyKey}`] = scoreData;

            await firebaseDb.ref().update(updates);

            // Show success styling
            this.submitBtn.textContent = "Submitted! ✅";
            this.submitBtn.style.background = "linear-gradient(135deg, #10b981 0%, #059669 100%)";
            this.submitBtn.style.boxShadow = "0 4px 0 #065f46, 0 10px 30px rgba(16, 185, 129, 0.3)";

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

        let path = 'scores';
        if (this.activeTab === 'weekly') {
            path = `weekly_scores/${this.getYearWeek()}`;
        }

        const scoresRef = firebaseDb.ref(path);
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
