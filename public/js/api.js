const API_BASE = '/api';

const api = {
    // Goals API
    getGoals: async () => {
        try {
            const res = await fetch(`${API_BASE}/goals`);
            return await res.json();
        } catch (error) {
            console.error("Failed to fetch goals", error);
            return { goals: [] };
        }
    },
    
    addGoal: async (title) => {
        try {
            const res = await fetch(`${API_BASE}/goals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title })
            });
            return await res.json();
        } catch (error) {
            console.error("Failed to add goal", error);
            return null;
        }
    },
    
    updateGoal: async (id, is_completed) => {
        try {
            const res = await fetch(`${API_BASE}/goals/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_completed: is_completed ? 1 : 0 })
            });
            return await res.json();
        } catch (error) {
            console.error("Failed to update goal", error);
            return null;
        }
    },
    
    deleteGoal: async (id) => {
        try {
            const res = await fetch(`${API_BASE}/goals/${id}`, {
                method: 'DELETE'
            });
            return await res.json();
        } catch (error) {
            console.error("Failed to delete goal", error);
            return null;
        }
    },

    // Study Sessions API
    saveSession: async (duration_minutes, topic) => {
        try {
            const res = await fetch(`${API_BASE}/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ duration_minutes, topic })
            });
            return await res.json();
        } catch (error) {
            console.error("Failed to save session", error);
            return null;
        }
    },

    getSessionStats: async () => {
        try {
            const res = await fetch(`${API_BASE}/sessions/stats`);
            return await res.json();
        } catch (error) {
            console.error("Failed to fetch session stats", error);
            return { chartData: [], totalMinutes: 0, todayMinutes: 0 };
        }
    }
};

window.api = api;
