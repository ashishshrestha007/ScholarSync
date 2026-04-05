class TimerManager {
    constructor() {
        this.timeDisplay = document.getElementById('time-display');
        this.startBtn = document.getElementById('start-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.modeBtns = document.querySelectorAll('.mode-btn');
        this.topicInput = document.getElementById('session-topic');
        this.timerStatus = document.querySelector('.timer-status');
        this.timerCircle = document.querySelector('.timer-circle');

        this.timeLeft = 25 * 60; // default 25 min in seconds
        this.initialTime = 25 * 60;
        this.timerId = null;
        this.isRunning = false;

        this.initEvents();
        this.updateDisplay();
    }

    initEvents() {
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.resetBtn.addEventListener('click', () => this.reset());

        this.modeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.modeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const minutes = parseInt(btn.dataset.time);
                this.setMode(minutes);
            });
        });
    }

    setMode(minutes) {
        this.pause();
        this.initialTime = minutes * 60;
        this.timeLeft = this.initialTime;
        this.updateDisplay();
        this.timerStatus.textContent = minutes === 25 ? 'Ready to focus!' : 'Take a break!';
        
        // Reset small dashboard timer display
        const dashTimer = document.querySelector('.timer-display-small');
        if(dashTimer) dashTimer.textContent = `${String(minutes).padStart(2,'0')}:00`;
    }

    updateDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        this.timeDisplay.textContent = formatted;
        document.title = `${formatted} - ProStudent Focus`;

        // Update small dashboard timer
        const dashTimer = document.querySelector('.timer-display-small');
        if(dashTimer) dashTimer.textContent = formatted;

        // Visual progress circle
        const progress = ((this.initialTime - this.timeLeft) / this.initialTime) * 360;
        this.timerCircle.style.background = `conic-gradient(var(--accent-primary) ${progress}deg, rgba(255, 255, 255, 0.05) ${progress}deg)`;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.startBtn.classList.add('disabled');
        this.pauseBtn.classList.remove('disabled');
        this.timerStatus.textContent = 'Focusing...';

        this.timerId = setInterval(() => {
            this.timeLeft--;
            this.updateDisplay();

            if (this.timeLeft <= 0) {
                this.completeSession();
            }
        }, 1000);
    }

    pause() {
        if (!this.isRunning) return;
        this.isRunning = false;
        clearInterval(this.timerId);
        this.startBtn.classList.remove('disabled');
        this.pauseBtn.classList.add('disabled');
        this.timerStatus.textContent = 'Paused';
    }

    reset() {
        this.pause();
        this.timeLeft = this.initialTime;
        this.updateDisplay();
        this.timerStatus.textContent = 'Ready';
        this.topicInput.value = '';
    }

    async completeSession() {
        this.pause();
        this.timerStatus.textContent = 'Session Complete! 🎉';
        
        // Make noise/alert
        if("Notification" in window && Notification.permission === "granted") {
            new Notification("Time is up!", {
                body: "Great job completing your session."
            });
        }

        // Save session if it was a focus mode (25 mins usually, but let's save any duration > 5 mins or based on selected mode. We'll save Pomodoros)
        const isFocusMode = this.initialTime === 25 * 60;
        if (isFocusMode) {
            const minutes = 25;
            const topic = this.topicInput.value.trim() || 'Focus Session';
            await window.api.saveSession(minutes, topic);
            
            // Refresh dashboard stats
            if(window.dashboardManager) window.dashboardManager.loadDashboardStats();
        }
        
        // Auto reset after 3 seconds for convenience
        setTimeout(() => this.reset(), 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Request notification permission if not asked
    if ("Notification" in window && Notification.permission !== "denied" && Notification.permission !== "granted") {
        Notification.requestPermission();
    }
    
    window.timerManager = new TimerManager();
});
