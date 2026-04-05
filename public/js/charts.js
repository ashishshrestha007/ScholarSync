class ChartManager {
    constructor() {
        this.ctx = document.getElementById('productivityChart');
        this.chartInstance = null;
    }

    async loadChartData() {
        if (!this.ctx) return;
        
        const data = await window.api.getSessionStats();
        const chartData = data.chartData || [];
        
        // Prepare arrays
        const labels = chartData.map(item => {
            const date = new Date(item.label);
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        });
        
        const values = chartData.map(item => item.value);

        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        // Setup gradient
        const canvasCtx = this.ctx.getContext('2d');
        const gradient = canvasCtx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.5)'); // accent-primary with opacity
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

        Chart.defaults.color = '#94a3b8';
        Chart.defaults.font.family = "'Inter', sans-serif";

        this.chartInstance = new Chart(this.ctx, {
            type: 'line',
            data: {
                labels: labels.length ? labels : ['No Data'],
                datasets: [{
                    label: 'Focus Time (Minutes)',
                    data: values.length ? values : [0],
                    borderColor: '#6366f1',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    fill: true,
                    tension: 0.4 // Smooth curves
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#e2e8f0',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return `Focus: ${context.parsed.y} mins`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            stepSize: 25
                        }
                    }
                }
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Ensure Chart.js is loaded
    if(typeof Chart !== 'undefined') {
        window.chartManager = new ChartManager();
    } else {
        console.warn("Chart.js not found. Performance graphs will not render.");
    }
});
