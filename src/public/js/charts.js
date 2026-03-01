/**
 * MAKH Statistics - ApexCharts Integration
 */

const ChartManager = {
    charts: {},
    defaultOptions: {
        chart: {
            type: 'line',
            toolbar: {
                show: true,
                tools: {
                    download: true,
                    selection: false,
                    zoom: true,
                    zoomin: true,
                    zoomout: true,
                    pan: false,
                    reset: true,
                },
            },
            fontFamily: 'Inter, sans-serif',
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 600,
            },
        },
        stroke: {
            width: [3, 2],
            curve: 'smooth',
            dashArray: [0, 5],
        },
        colors: ['#1e293b', '#dc2626'],
        markers: {
            size: [4, 0],
            strokeWidth: 2,
            hover: { sizeOffset: 3 },
        },
        grid: {
            borderColor: '#e2e8f0',
            strokeDashArray: 4,
            padding: { left: 10, right: 10 },
        },
        tooltip: {
            theme: 'dark',
            shared: true,
            intersect: false,
            y: {
                formatter: (val) => val !== null ? val.toLocaleString('hu-HU') : 'N/A',
            },
        },
        legend: {
            show: true,
            position: 'top',
            horizontalAlign: 'right',
            fontSize: '12px',
            markers: { radius: 2 },
        },
    },

    /**
     * Create a mini chart for the main page card
     */
    createMiniChart(containerId, labels, values, trend) {
        const el = document.getElementById(containerId);
        if (!el) return;

        // Clear loading state
        el.innerHTML = '';

        if (!values || values.length === 0) {
            el.innerHTML = '<div class="text-center text-muted py-4"><i class="bi bi-inbox me-2"></i>Nincs adat</div>';
            return;
        }

        const options = {
            ...this.defaultOptions,
            chart: {
                ...this.defaultOptions.chart,
                height: 200,
                sparkline: { enabled: false },
                toolbar: { show: false },
            },
            series: [
                { name: 'Érték', data: values },
                { name: 'Trend', data: trend || [] },
            ],
            xaxis: {
                categories: labels,
                labels: {
                    show: true,
                    rotate: -45,
                    rotateAlways: false,
                    style: { fontSize: '10px', colors: '#94a3b8' },
                },
                axisBorder: { show: false },
                axisTicks: { show: false },
            },
            yaxis: {
                labels: {
                    style: { fontSize: '10px', colors: '#94a3b8' },
                    formatter: (val) => {
                        if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
                        if (val >= 1000) return (val / 1000).toFixed(0) + 'k';
                        return val.toFixed(0);
                    },
                },
            },
            legend: { show: false },
            dataLabels: { enabled: false },
        };

        const chart = new ApexCharts(el, options);
        chart.render();
        this.charts[containerId] = chart;
    },

    /**
     * Create the full detail chart
     */
    createDetailChart(containerId, labels, values, trend, options = {}) {
        const el = document.getElementById(containerId);
        if (!el) return;

        el.innerHTML = '';

        if (!values || values.length === 0) {
            el.innerHTML = '<div class="text-center text-muted py-5"><i class="bi bi-inbox me-2"></i>Nincs adat. Vigyen be értéket a "+" gombbal.</div>';
            return;
        }

        const series = [
            { name: 'Aktuális értékek', data: values },
            { name: 'Trend vonal', data: trend || [] },
        ];

        const annotations = {};
        if (options.viabilityThreshold) {
            annotations.yaxis = [{
                y: options.viabilityThreshold,
                borderColor: options.isInverted ? '#dc2626' : '#16a34a',
                strokeDashArray: 4,
                label: {
                    text: 'Életképesség határvonal',
                    borderColor: 'transparent',
                    style: {
                        background: options.isInverted ? '#fee2e2' : '#dcfce7',
                        color: options.isInverted ? '#dc2626' : '#16a34a',
                        fontSize: '11px',
                    },
                },
            }];
        }

        const chartOptions = {
            ...this.defaultOptions,
            chart: {
                ...this.defaultOptions.chart,
                height: 350,
            },
            series,
            annotations,
            xaxis: {
                categories: labels,
                labels: {
                    rotate: -45,
                    rotateAlways: labels.length > 12,
                    style: { fontSize: '11px', colors: '#64748b' },
                },
            },
            yaxis: {
                labels: {
                    style: { fontSize: '11px', colors: '#64748b' },
                    formatter: (val) => {
                        if (val === null || val === undefined) return 'N/A';
                        if (options.measurementType === 'percentage') return val.toFixed(2) + '%';
                        return val.toLocaleString('hu-HU');
                    },
                },
                min: options.axisMin !== undefined ? options.axisMin : undefined,
                max: options.axisMax !== undefined ? options.axisMax : undefined,
            },
            dataLabels: {
                enabled: options.showValues !== false,
                enabledOnSeries: [0],
                formatter: (val) => {
                    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
                    if (val >= 1000) return (val / 1000).toFixed(0) + 'k';
                    return val.toFixed(0);
                },
                style: { fontSize: '10px', fontWeight: 600, colors: ['#1e293b'] },
                background: { enabled: true, foreColor: '#1e293b', padding: 4, borderRadius: 4, borderWidth: 0, opacity: 0.8 },
                offsetY: -8,
            },
        };

        const chart = new ApexCharts(el, chartOptions);
        chart.render();
        this.charts[containerId] = chart;

        return chart;
    },

    /**
     * Toggle data labels on/off
     */
    toggleDataLabels(containerId, show) {
        const chart = this.charts[containerId];
        if (chart) {
            chart.updateOptions({
                dataLabels: {
                    enabled: show,
                    enabledOnSeries: [0],
                },
            });
        }
    },
};

// Auto-initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Main page: load graph data via AJAX
    if (typeof statisticIds !== 'undefined' && typeof orgId !== 'undefined' && statisticIds.length > 0) {
        fetch('/' + orgId + '/statistics/page-graph-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        })
            .then(res => res.json())
            .then(result => {
                if (result.success) {
                    Object.entries(result.data).forEach(([statId, data]) => {
                        ChartManager.createMiniChart('chart-' + statId, data.labels, data.values, data.trend);
                    });
                }
            })
            .catch(err => {
                console.error('Failed to load graph data:', err);
                statisticIds.forEach(id => {
                    const el = document.getElementById('chart-' + id);
                    if (el) el.innerHTML = '<div class="text-center text-muted py-3">Hiba az adatok betöltése közben</div>';
                });
            });

        // Values toggle on main page
        const showValuesToggle = document.getElementById('showValuesToggle');
        if (showValuesToggle) {
            showValuesToggle.addEventListener('change', (e) => {
                statisticIds.forEach(id => {
                    ChartManager.toggleDataLabels('chart-' + id, e.target.checked);
                });
            });
        }
    }

    // Detail page: render full chart
    if (typeof detailStatId !== 'undefined' && typeof chartLabels !== 'undefined') {
        const detailChart = ChartManager.createDetailChart('detailChart', chartLabels, chartValues, chartTrend, {
            viabilityThreshold: typeof viabilityThreshold !== 'undefined' ? viabilityThreshold : null,
            isInverted: typeof isInverted !== 'undefined' ? isInverted : false,
            measurementType: typeof measurementType !== 'undefined' ? measurementType : 'numeric',
            showValues: true,
        });

        // Detail values toggle
        const detailToggle = document.getElementById('detailShowValues');
        if (detailToggle) {
            detailToggle.addEventListener('change', (e) => {
                ChartManager.toggleDataLabels('detailChart', e.target.checked);
            });
        }
    }
});
