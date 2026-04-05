const auth = {
    getToken() {
        return localStorage.getItem('spt_token');
    },
    getUser() {
        const u = localStorage.getItem('spt_user');
        return u ? JSON.parse(u) : null;
    },
    async login(email, password) {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('spt_token', data.token);
                localStorage.setItem('spt_user', JSON.stringify(data.user));
            }
            return data;
        } catch (error) {
            return { error: 'Network error occurred.' };
        }
    },
    async register(name, email, password) {
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            return await res.json();
        } catch (error) {
            return { error: 'Network error occurred.' };
        }
    },
    logout() {
        localStorage.removeItem('spt_token');
        localStorage.removeItem('spt_user');
        window.location.href = 'login.html';
    },
    async getProfile() {
        const token = this.getToken();
        if (!token) return null;
        try {
            const res = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) return await res.json();
            return null;
        } catch(e) { return null; }
    },
    async updateProfile(name, password) {
        try {
            const res = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${this.getToken()}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ name, password })
            });
            return await res.json();
        } catch(e) { return { error: 'Network problem'} }
    }
}
window.auth = auth;

// Global auth check for protected pages
if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('register.html')) {
    if (!auth.getToken()) {
        window.location.href = 'login.html';
    }
}
