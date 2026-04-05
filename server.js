const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'student-suite-secretley';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Access denied." });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid token." });
        req.user = user;
        next();
    });
};

/* --- AUTH API --- */
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "All fields required." });

    try {
        const hash = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)`, [name, email, hash], function(err) {
            if (err) return res.status(400).json({ error: "Email exists." });
            res.status(201).json({ message: "Registered", userId: this.lastID });
        });
    } catch(e) { res.status(500).json({ error: "Server error" }); }
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err || !user) return res.status(401).json({ error: "Invalid credentials." });
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: "Invalid credentials." });
        const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    db.get(`SELECT id, name, email FROM users WHERE id = ?`, [req.user.id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: "Not found." });
        res.json(user);
    });
});

/* --- TASKS API --- */
app.get('/api/tasks', authenticateToken, (req, res) => {
    const { filter } = req.query; // 'today' or 'all'
    let query = `SELECT * FROM tasks WHERE user_id = ? ORDER BY due_date ASC`;
    if (filter === 'today') {
        query = `SELECT * FROM tasks WHERE user_id = ? AND due_date = date('now', 'localtime') ORDER BY id DESC`;
    }
    db.all(query, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/tasks', authenticateToken, (req, res) => {
    const { title, description, due_date, start_time, end_time } = req.body;
    const date = due_date || new Date().toISOString().split('T')[0];
    db.run(`INSERT INTO tasks (user_id, title, description, due_date, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)`, 
        [req.user.id, title, description, date, start_time || null, end_time || null], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, title });
    });
});

app.put('/api/tasks/:id', authenticateToken, (req, res) => {
    // Allows updating status or text
    const { title, description, status } = req.body;
    db.run(`UPDATE tasks SET title = COALESCE(?, title), description = COALESCE(?, description), status = COALESCE(?, status) WHERE id = ? AND user_id = ?`,
        [title, description, status, req.params.id, req.user.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ updated: this.changes });
    });
});

app.delete('/api/tasks/:id', authenticateToken, (req, res) => {
    db.run(`DELETE FROM tasks WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

/* --- STUDY SESSIONS --- */
app.get('/api/study', authenticateToken, (req, res) => {
    db.all(`SELECT * FROM study_sessions WHERE user_id = ? ORDER BY created_at DESC`, [req.user.id], (err, rows) => {
        res.json(rows || []);
    });
});

app.post('/api/study', authenticateToken, (req, res) => {
    const { subject, duration_minutes } = req.body;
    db.run(`INSERT INTO study_sessions (user_id, subject, duration_minutes) VALUES (?, ?, ?)`, 
        [req.user.id, subject, duration_minutes], function(err) {
        res.status(201).json({ id: this.lastID });
    });
});

/* --- NOTEBOOK --- */
app.get('/api/notes', authenticateToken, (req, res) => {
    db.all(`SELECT * FROM notes WHERE user_id = ? ORDER BY id DESC`, [req.user.id], (err, rows) => {
        res.json(rows || []);
    });
});
app.post('/api/notes', authenticateToken, (req, res) => {
    const { question, answer } = req.body;
    db.run(`INSERT INTO notes (user_id, question, answer) VALUES (?, ?, ?)`, [req.user.id, question, answer], function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.status(201).json({ id: this.lastID });
    });
});
app.put('/api/notes/:id', authenticateToken, (req, res) => {
    const { question, answer } = req.body;
    db.run(`UPDATE notes SET question = COALESCE(?, question), answer = COALESCE(?, answer) WHERE id = ? AND user_id = ?`, 
        [question, answer, req.params.id, req.user.id], function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.json({ success: true });
    });
});
app.delete('/api/notes/:id', authenticateToken, (req, res) => {
    db.run(`DELETE FROM notes WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id], function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.json({ success: true, deleted: this.changes });
    });
});

/* --- DASHBOARD LOGIC --- */
app.get('/api/dashboard', authenticateToken, (req, res) => {
    const stats = { total: 0, completed: 0, pending: 0, studyHoursToday: 0 };
    db.get(`SELECT COUNT(*) as c FROM tasks WHERE user_id = ?`, [req.user.id], (err, r) => { stats.total = r?r.c:0;
        db.get(`SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND status = 'completed'`, [req.user.id], (err, r) => { stats.completed = r?r.c:0;
            db.get(`SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND status != 'completed'`, [req.user.id], (err, r) => { stats.pending = r?r.c:0;
                db.get(`SELECT SUM(duration_minutes) as m FROM study_sessions WHERE user_id = ? AND date = date('now', 'localtime')`, [req.user.id], (err, r) => {
                    stats.studyHoursToday = r && r.m ? (r.m / 60).toFixed(1) : 0;
                    res.json(stats);
                });
            });
        });
    });
});

app.get('/api/analytics', authenticateToken, (req, res) => {
    // 7 days study progress grouping
    db.all(`SELECT date, SUM(duration_minutes) as minutes FROM study_sessions WHERE user_id = ? GROUP BY date ORDER BY date ASC LIMIT 14`, [req.user.id], (err, rows) => {
        res.json(rows || []);
    });
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
