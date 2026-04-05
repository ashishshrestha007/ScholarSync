const prodManager = {
    async loadProductions() {
        const token = auth.getToken();
        const user = auth.getUser();
        const grid = document.getElementById('productions-grid');

        try {
            const res = await fetch('/api/productions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (!data || data.length === 0) {
                grid.innerHTML = '<div style="grid-column: 1/-1; color: var(--text-secondary);">No productions found.</div>';
                return;
            }

            let html = '';
            data.forEach(p => {
                let statusColor = 'var(--text-secondary)';
                if (p.status === 'approved') statusColor = 'var(--accent-success)';
                if (p.status === 'rejected') statusColor = 'var(--accent-danger)';
                if (p.status === 'pending') statusColor = 'var(--accent-warning)';

                html += `
                    <div class="stat-card" style="flex-direction: column; align-items: flex-start; gap: 1rem; position: relative;">
                        <!-- Status Badge -->
                        <div style="position: absolute; top: 1rem; right: 1rem; font-size: 0.8rem; font-weight: 600; padding: 0.25rem 0.75rem; border-radius: 20px; background: rgba(0,0,0,0.3); color: ${statusColor}; border: 1px solid ${statusColor}; text-transform: uppercase;">
                            ${p.status}
                        </div>

                        ${user.role === 'admin' ? `<div style="font-size: 0.8rem; color: var(--accent-primary); font-weight:600;"><i class="fa-solid fa-user"></i> By: ${p.student_name}</div>` : ''}

                        <div>
                            <h3 style="font-size: 1.2rem; color: white; margin-bottom: 0.25rem;">${p.title}</h3>
                            <span style="font-size: 0.8rem; color: var(--text-secondary); background: rgba(255,255,255,0.1); padding: 0.2rem 0.5rem; border-radius: 4px;">${p.category}</span>
                        </div>
                        <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.4;">${p.description}</p>
                        
                        <div style="margin-top: 0.5rem; width: 100%; display: flex; gap: 0.5rem; justify-content: space-between; align-items: center;">
                            <a href="${p.file_url}" target="_blank" class="btn btn-secondary" style="font-size: 0.8rem; padding: 0.5rem;"><i class="fa-solid fa-download"></i> View File</a>
                            
                            ${user.role === 'admin' && p.status === 'pending' ? `
                                <div style="display:flex; gap: 0.5rem;">
                                    <button class="btn btn-primary" style="background:var(--accent-success); padding: 0.5rem;" onclick="prodManager.changeStatus(${p.id}, 'approved')"><i class="fa-solid fa-check"></i></button>
                                    <button class="btn btn-danger" style="padding: 0.5rem;" onclick="prodManager.changeStatus(${p.id}, 'rejected')"><i class="fa-solid fa-times"></i></button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            });
            grid.innerHTML = html;
        } catch(e) {
            grid.innerHTML = '<div style="color:var(--accent-danger);">Failed to load projects.</div>';
        }
    },

    async changeStatus(id, newStatus) {
        const token = auth.getToken();
        try {
            await fetch(`/api/productions/${id}/status`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });
            // Refresh
            this.loadProductions();
            loadDashboardStats(); // Refresh dashboard counts
        } catch(e) {
            console.error(e);
        }
    }
};

window.prodManager = prodManager;

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('production-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            btn.textContent = 'Uploading...';
            btn.disabled = true;

            const formData = new FormData();
            formData.append('title', document.getElementById('prod-title').value);
            formData.append('category', document.getElementById('prod-category').value);
            formData.append('description', document.getElementById('prod-desc').value);
            formData.append('projectFile', document.getElementById('prod-file').files[0]);

            const token = auth.getToken();
            
            try {
                const res = await fetch('/api/productions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                
                if (res.ok) {
                    alert('Production submitted successfully!');
                    form.reset();
                    // Go back to productions tab
                    document.querySelector('.nav-links li[data-tab="productions"]').click();
                } else {
                    alert('Failed to upload. Format may be unsupported.');
                }
            } catch(e) {
                alert('Network Error');
            } finally {
                btn.textContent = 'Submit Production';
                btn.disabled = false;
            }
        });
    }
});
