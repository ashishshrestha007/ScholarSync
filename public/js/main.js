// -------------------------------------------------------------
// Core UI & API Wrapper
// -------------------------------------------------------------
const apiFetch = async (endpoint, options = {}) => {
    const token = auth.getToken();
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    const config = { ...options, headers: { ...headers, ...options.headers } };
    try {
        const res = await fetch(`/api${endpoint}`, config);
        if (!res.ok) {
            const errBody = await res.text();
            console.error("API error details:", errBody);
            throw new Error(`API Error: ${res.status}`);
        }
        return await res.json();
    } catch(err) {
        console.error("Fetch Exception:", err);
        return [];
    }
};

const appUI = {
    init() {
        const user = auth.getUser();
        if (!user) { window.location.href = 'login.html'; return; }
        
        document.getElementById('sidebar-user-name').textContent = user.name;
        document.getElementById('header-user-name').textContent = user.name;

        // Tabs
        const links = document.querySelectorAll('.nav-links li');
        const sections = document.querySelectorAll('.view-section');

        links.forEach(link => {
            link.addEventListener('click', () => {
                links.forEach(l => l.classList.remove('active'));
                sections.forEach(s => s.classList.remove('active'));
                
                link.classList.add('active');
                const tab = link.dataset.tab;
                document.getElementById(tab).classList.add('active');
                
                this.loadTabData(tab);
            });
        });

        // Reminders Check
        setTimeout(() => this.checkReminders(), 3000);
        
        // Load initial tab
        this.loadTabData('dashboard');
    },

    toggleElement(id) {
        const el = document.getElementById(id);
        el.style.display = el.style.display === 'none' ? 'block' : 'none';
    },

    showModal(msg) {
        document.getElementById('reminder-text').innerHTML = msg;
        const m = document.getElementById('reminder-modal');
        m.style.display = 'block';
        setTimeout(() => { m.style.display = 'none'; }, 6000);
    },

    hideModal() {
        document.getElementById('reminder-modal').style.display = 'none';
    },

    async checkReminders() {
        try {
            const stats = await apiFetch('/dashboard');
            let msgs = [];
            if (stats.pending > 0) msgs.push(`You have <strong>${stats.pending}</strong> pending tasks!`);
            if (stats.studyHoursToday == 0) msgs.push(`You haven't logged any study sessions today.`);
            
            if (msgs.length > 0) {
                this.showModal(msgs.join('<br>'));
            }
        } catch(e){}
    },

    loadTabData(tab) {
        if (tab === 'dashboard') { dashboard.load(); analytics.loadMini(); }
        if (tab === 'tasks') taskManager.loadTasks('today');
        if (tab === 'goals') noteManager.loadNotes();
        if (tab === 'calendar') calendar.build();
        if (tab === 'stats') analytics.loadMain();
    }
};

// -------------------------------------------------------------
// Dashboard Module
// -------------------------------------------------------------
const dashboard = {
    async load() {
        const data = await apiFetch('/dashboard');
        document.getElementById('dash-total').textContent = data.total;
        document.getElementById('dash-completed').textContent = data.completed;
        document.getElementById('dash-pending').textContent = data.pending;
        document.getElementById('dash-study-hours').textContent = data.studyHoursToday;

        const tasks = await apiFetch('/tasks?filter=today');
        const list = document.getElementById('dash-todays-tasks');
        list.innerHTML = '';
        if (tasks.length === 0) {
            list.innerHTML = '<li style="color:var(--text-secondary);">No tasks for today.</li>';
            return;
        }

        tasks.forEach(t => {
            if (t.status === 'completed') return; 
            list.innerHTML += `<li class="goal-item" style="padding:0.75rem;">${t.title} <span class="status-badge status-${t.status}">${t.status}</span></li>`;
        });
    }
};

// -------------------------------------------------------------
// Tasks Module
// -------------------------------------------------------------
const taskManager = {
    currentFilter: 'today',
    
    async loadTasks(filter = 'today', btnEle = null) {
        this.currentFilter = filter;
        if (btnEle) {
            document.querySelectorAll('#tasks .filter-tabs button').forEach(b => b.classList.remove('active'));
            btnEle.classList.add('active');
        }

        const data = await apiFetch(`/tasks?filter=${filter}`);
        const c = document.getElementById('tasks-list-container');
        c.innerHTML = '';

        if (data.length === 0) {
            c.innerHTML = '<div style="color:var(--text-secondary);">No tasks found.</div>';
            return;
        }

        data.forEach(t => {
            const isComp = t.status === 'completed';
            let html = `
                <div class="task-card">
                    <div style="flex: 1;">
                        <h4 style="font-size:1.1rem; ${isComp?'text-decoration:line-through;color:var(--text-secondary)':''}">${t.title}</h4>
                        <p style="font-size:0.8rem; color:var(--text-secondary); margin-top:0.25rem;">${t.description || 'No description'}</p>
                        <div style="margin-top:0.5rem; display: flex; gap: 1rem; align-items: center;">
                            <span class="status-badge status-${t.status}">${t.status.toUpperCase()}</span>
                            <span style="font-size:0.8rem; color:var(--text-secondary);"><i class="fa-solid fa-clock"></i> ${t.due_date} 
                                ${t.start_time ? `| ${t.start_time} - ${t.end_time}` : ''}
                            </span>
                        </div>
                    </div>
                    <div style="display:flex; gap:0.5rem; flex-direction:column;">
                        <select class="glass-input" style="padding:0.4rem; font-size:0.8rem;" onchange="taskManager.updateStatus(${t.id}, this.value)">
                            <option value="pending" ${t.status==='pending'?'selected':''}>Pending</option>
                            <option value="in_progress" ${t.status==='in_progress'?'selected':''}>In Progress</option>
                            <option value="completed" ${t.status==='completed'?'selected':''}>Completed</option>
                        </select>
                        <div style="display:flex; gap:0.5rem;">
                            <button class="btn btn-secondary" style="padding:0.4rem; font-size:0.8rem; flex:1;" onclick="taskManager.editTask(${t.id}, this.dataset.title)" data-title="${t.title.replace(/"/g, '&quot;')}"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn btn-danger" style="padding:0.4rem; font-size:0.8rem; flex:1;" onclick="taskManager.deleteTask(${t.id})"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                </div>
            `;
            c.innerHTML += html;
        });
    },

    async updateStatus(id, newStatus) {
        await apiFetch(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
        
        if (newStatus === 'completed') {
            const msgs = [
                "Great job! Keep up the momentum! 🎉",
                "One step closer to your goals! 🚀",
                "You are unstoppable! 💪",
                "Amazing focus! Cross it off! ✔️"
            ];
            const randomMsg = msgs[Math.floor(Math.random() * msgs.length)];
            appUI.showModal(randomMsg);
        }

        this.loadTasks(this.currentFilter);
    },

    async editTask(id, currentTitle) {
        const newTitle = prompt("Edit Task Title:", currentTitle);
        if (!newTitle || newTitle.trim() === "") return;
        
        await apiFetch(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify({ title: newTitle.trim() }) });
        this.loadTasks(this.currentFilter);
    },

    async deleteTask(id) {
        if(!confirm("Are you sure?")) return;
        await apiFetch(`/tasks/${id}`, { method: 'DELETE' });
        this.loadTasks(this.currentFilter);
    }
};

document.getElementById('new-task-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('task-title').value;
    const desc = document.getElementById('task-desc').value;
    const due = document.getElementById('task-date').value;

    const sh = document.getElementById('task-start-hour').value;
    const sm = document.getElementById('task-start-min').value;
    const startTime = (sh && sm) ? `${sh}:${sm}` : '';

    const eh = document.getElementById('task-end-hour').value;
    const em = document.getElementById('task-end-min').value;
    const endTime = (eh && em) ? `${eh}:${em}` : '';

    await apiFetch('/tasks', { 
        method: 'POST', 
        body: JSON.stringify({ 
            title, 
            description: desc, 
            due_date: due, 
            start_time: startTime, 
            end_time: endTime 
        }) 
    });
    
    document.getElementById('new-task-form').reset();
    document.getElementById('task-form-container').style.display = 'none';
    taskManager.loadTasks();
});

// -------------------------------------------------------------
// Pomodoro Timer & Study Logs
// -------------------------------------------------------------
const pomodoro = {
    timeLeft: 25 * 60,
    initialTime: 25 * 60,
    timerId: null,
    
    setMode(mins, btnEle) {
        this.pause();
        this.initialTime = mins * 60;
        this.timeLeft = this.initialTime;
        document.querySelectorAll('.timer-modes button').forEach(b => b.classList.remove('active'));
        if(btnEle) btnEle.classList.add('active');
        this.updateDisplay();
        document.getElementById('pomo-status').textContent = mins === 25 ? "Focus Mode" : (mins === 5 ? "Break Mode" : "Custom Mode");
    },

    setCustomMode() {
        const customMins = parseInt(document.getElementById('pomo-custom-input').value);
        if(!customMins || customMins <= 0) return;
        this.setMode(customMins, null); // custom doesn't highlight default preset modes
    },

    updateDisplay() {
        const m = String(Math.floor(this.timeLeft / 60)).padStart(2, '0');
        const s = String(this.timeLeft % 60).padStart(2, '0');
        document.getElementById('time-display').textContent = `${m}:${s}`;
        
        const prog = ((this.initialTime - this.timeLeft) / this.initialTime) * 360;
        document.getElementById('timer-circle-ui').style.background = `conic-gradient(var(--accent-primary) ${prog}deg, rgba(255, 255, 255, 0.05) ${prog}deg)`;
    },

    start() {
        if (this.timerId) return;
        document.getElementById('pomo-start-btn').classList.add('disabled');
        document.getElementById('pomo-pause-btn').classList.remove('disabled');
        document.getElementById('pomo-status').textContent = "Running...";
        
        this.timerId = setInterval(() => {
            this.timeLeft--;
            this.updateDisplay();
            if (this.timeLeft <= 0) this.complete();
        }, 1000);
    },

    pause() {
        clearInterval(this.timerId);
        this.timerId = null;
        document.getElementById('pomo-start-btn').classList.remove('disabled');
        document.getElementById('pomo-pause-btn').classList.add('disabled');
        document.getElementById('pomo-status').textContent = "Paused";
    },

    reset() {
        this.pause();
        this.timeLeft = this.initialTime;
        this.updateDisplay();
        document.getElementById('pomo-status').textContent = "Ready";
    },

    async complete() {
        this.pause();
        document.getElementById('pomo-status').textContent = "Time Up!";
        
        try { document.getElementById('timer-alarm').play(); } catch(e) {}
        alert("Time is up! Great job!");

        // Log it if it was at least 1 minute of focus time
        const mins = this.initialTime / 60;
        if (mins >= 1) {
            const subj = document.getElementById('pomo-subject').value || "Study Timer Session";
            await apiFetch('/study', { method: 'POST', body: JSON.stringify({ subject: subj, duration_minutes: mins }) });
            appUI.showModal(`Awesome focus! Logged ${mins} mins of study time.`);
        }
    }
};

document.getElementById('manual-study-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const subj = document.getElementById('manual-subject').value;
    const mins = parseInt(document.getElementById('manual-mins').value);
    await apiFetch('/study', { method: 'POST', body: JSON.stringify({ subject: subj, duration_minutes: mins }) });
    document.getElementById('manual-study-form').reset();
    appUI.showModal(`Logged ${mins} mins for ${subj}!`);
});

// -------------------------------------------------------------
// Notebook (Q&A)
// -------------------------------------------------------------
const noteManager = {
    async loadNotes() {
        const notes = await apiFetch('/notes');
        const list = document.getElementById('notebook-list');
        if(!list) return;
        list.innerHTML = '';

        if (!notes || !Array.isArray(notes)) {
            console.error("Notes failed to load properly", notes);
            return;
        }

        notes.forEach(n => {
            const content = `
                <li class="goal-item" style="margin-bottom:0.75rem; flex-direction:column; align-items:flex-start; gap: 0.5rem;">
                    <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                        <h4 style="color:var(--accent-primary); font-size:1.1rem; flex:1;">Q: ${n.question}</h4>
                        <div style="display:flex; gap: 0.5rem;">
                            <button class="btn btn-secondary" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;" onclick="noteManager.editNote(${n.id}, this.dataset.q, this.dataset.a)" data-q="${n.question.replace(/"/g, '&quot;')}" data-a="${(n.answer||'').replace(/"/g, '&quot;')}"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn btn-danger" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;" onclick="noteManager.deleteNote(${n.id})"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                    <div style="color:var(--text-secondary); width:100%; white-space:pre-wrap;">A: ${n.answer || '<em>No answer provided</em>'}</div>
                </li>
            `;
            list.innerHTML += content;
        });
    },

    async addNote() {
        const qInput = document.getElementById('new-note-q');
        const aInput = document.getElementById('new-note-a');
        
        const question = qInput.value.trim();
        const answer = aInput.value.trim();
        
        if (!question) {
            alert("Question cannot be empty!");
            return;
        }
        
        const res = await apiFetch('/notes', { method: 'POST', body: JSON.stringify({ question, answer }) });
        if (res && res.id) {
            qInput.value = '';
            aInput.value = '';
            this.loadNotes();
        } else {
            alert("Failed to save note. Check server connection.");
        }
    },

    async editNote(id, currentQ, currentA) {
        const newQ = prompt("Edit Question:", currentQ);
        if (!newQ || newQ.trim() === "") return;
        
        const newA = prompt("Edit Answer:", currentA);
        
        await apiFetch(`/notes/${id}`, { method: 'PUT', body: JSON.stringify({ question: newQ.trim(), answer: newA?newA.trim():'' }) });
        this.loadNotes();
    },

    async deleteNote(id) {
        if (!confirm("Are you sure you want to delete this note?")) return;
        await apiFetch(`/notes/${id}`, { method: 'DELETE' });
        this.loadNotes();
    }
};

// -------------------------------------------------------------
// Calendar Grid (7 Days Ahead)
// -------------------------------------------------------------
const calendar = {
    async build() {
        const tasks = await apiFetch('/tasks?filter=all');
        const grid = document.getElementById('calendar-grid-container');
        grid.innerHTML = '';

        const today = new Date();
        
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(today.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            
            const dayTasks = tasks.filter(t => t.due_date === dateStr);
            
            let html = `<div class="calendar-day">
                <h4>${d.toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'})}</h4>
            `;

            if (dayTasks.length === 0) {
                html += `<div style="font-size:0.8rem; color:var(--text-secondary); text-align:center;">No Tasks</div>`;
            } else {
                dayTasks.forEach(t => {
                    const isComp = t.status === 'completed';
                    html += `
                        <div class="cal-task-item ${isComp?'completed':''}" title="${t.title}" style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="overflow:hidden; text-overflow:ellipsis;">${t.title}</span>
                            <i class="fa-solid fa-xmark" style="cursor:pointer; color:var(--accent-danger);" onclick="taskManager.deleteTask(${t.id}); setTimeout(()=>calendar.build(), 300)"></i>
                        </div>
                    `;
                });
            }

            html += `</div>`;
            grid.innerHTML += html;
        }
    }
};

// -------------------------------------------------------------
// Analytics
// -------------------------------------------------------------
const analytics = {
    miniChartInstance: null,
    mainChartInstance: null,

    async loadMini() {
        const data = await apiFetch('/analytics');
        if(!document.getElementById('mini-chart')) return;
        this.miniChartInstance = this.renderChartInstance(this.miniChartInstance, 'mini-chart', data);
    },

    async loadMain() {
        const data = await apiFetch('/analytics');
        this.mainChartInstance = this.renderChartInstance(this.mainChartInstance, 'main-analytics-chart', data);
    },

    renderChartInstance(instance, canvasId, data) {
        if (instance) instance.destroy();
        
        const ctx = document.getElementById(canvasId).getContext('2d');
        const labels = data.map(d => new Date(d.date).toLocaleDateString(undefined, {month:'short', day:'numeric'}));
        const values = data.map(d => d.minutes);

        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(168, 85, 247, 0.5)'); 
        gradient.addColorStop(1, 'rgba(168, 85, 247, 0.0)');

        Chart.defaults.color = '#94a3b8';
        Chart.defaults.font.family = "'Inter', sans-serif";

        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.length ? labels : ['No Data'],
                datasets: [{
                    label: 'Study Minutes',
                    data: values.length ? values : [0],
                    borderColor: '#a855f7',
                    backgroundColor: gradient,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    }
};

// Init On Load
document.addEventListener('DOMContentLoaded', () => appUI.init());
