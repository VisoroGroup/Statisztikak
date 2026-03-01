const prisma = require('../config/database');
const { Decimal } = require('@prisma/client/runtime/library');

/**
 * Calculate change percentage between two values
 */
function calculateChangePercent(current, previous) {
    if (previous === null || previous === undefined) return null;
    const prev = parseFloat(previous);
    const curr = parseFloat(current);
    if (prev === 0) return null; // Division by zero
    return ((curr - prev) / Math.abs(prev) * 100).toFixed(2);
}

/**
 * Format change percent for display
 */
function formatChangePercent(value) {
    if (value === null) return 'N/A';
    const num = parseFloat(value);
    return num >= 0 ? `+${num.toFixed(2)}%` : `${num.toFixed(2)}%`;
}

/**
 * Get the previous working day based on work_days config
 */
function getPreviousWorkday(date, workDays) {
    const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const d = new Date(date);
    do {
        d.setDate(d.getDate() - 1);
    } while (!workDays[dayMap[d.getDay()]]);
    return d;
}

/**
 * Get the next working day based on work_days config
 */
function getNextWorkday(date, workDays) {
    const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const d = new Date(date);
    do {
        d.setDate(d.getDate() + 1);
    } while (!workDays[dayMap[d.getDay()]]);
    return d;
}

/**
 * Check if a date is a workday
 */
function isWorkday(date, workDays) {
    const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return workDays[dayMap[date.getDay()]] === true;
}

/**
 * Resolve the actual record date for when_weekend logic
 * @param {Date} forDate - The date the value is being entered for
 * @param {string} whenWeekend - 'before' (előtt 07:00AM) or 'after' (után 07:00AM)
 * @param {object} workDays - Work days config
 */
function resolveRecordDate(forDate, whenWeekend, workDays) {
    const date = new Date(forDate);
    if (isWorkday(date, workDays)) {
        return date;
    }
    if (whenWeekend === 'before') {
        return getPreviousWorkday(date, workDays);
    }
    return getNextWorkday(date, workDays);
}

/**
 * Aggregate daily values into the requested view period
 */
function aggregateValues(values, viewType) {
    if (viewType === 'daily') {
        return values.map(v => ({
            key: formatDateKey(v.recordDate, 'daily'),
            value: parseFloat(v.value),
            authorName: v.author ? v.author.name : 'Rendszer',
            authorType: v.authorType,
            date: v.recordDate,
            id: v.id ? v.id.toString() : null,
        }));
    }

    const grouped = {};
    for (const v of values) {
        const key = formatDateKey(v.recordDate, viewType);
        if (!grouped[key]) {
            grouped[key] = { sum: 0, count: 0, date: v.recordDate };
        }
        grouped[key].sum += parseFloat(v.value);
        grouped[key].count += 1;
    }

    return Object.entries(grouped).map(([key, data]) => ({
        key,
        value: data.sum,
        authorName: 'Rendszer',
        authorType: 'system',
        date: data.date,
        id: null,
    }));
}

/**
 * Format date into the proper key based on view type
 */
function formatDateKey(date, viewType) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    switch (viewType) {
        case 'daily':
            return `${year}-${month}-${day}`;
        case 'weekly': {
            const weekNum = getISOWeek(d);
            return `${year}-W${String(weekNum).padStart(2, '0')}`;
        }
        case 'monthly':
            return `${year}-${month}`;
        case 'quarterly': {
            const quarter = Math.ceil((d.getMonth() + 1) / 3);
            return `${year}-Q${quarter}`;
        }
        case 'yearly':
            return `${year}`;
        default:
            return `${year}-${month}-${day}`;
    }
}

/**
 * Get ISO week number
 */
function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Build complete data for the values table with change % and running total
 */
function buildValuesTable(aggregatedValues) {
    // Sort by date ascending for running total calculation
    const sorted = [...aggregatedValues].sort((a, b) =>
        new Date(a.date) - new Date(b.date)
    );

    let runningTotal = 0;
    const withTotals = sorted.map((item, idx) => {
        runningTotal += item.value;
        const prevValue = idx > 0 ? sorted[idx - 1].value : null;
        const changePercent = calculateChangePercent(item.value, prevValue);

        return {
            ...item,
            runningTotal,
            changePercent,
            changePercentFormatted: formatChangePercent(changePercent),
        };
    });

    // Return in reverse chronological order for display
    return withTotals.reverse();
}

/**
 * Calculate simple linear regression for trend line
 */
function calculateTrendLine(dataPoints) {
    const n = dataPoints.length;
    if (n < 2) return dataPoints.map(p => p.value);

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += dataPoints[i].value;
        sumXY += i * dataPoints[i].value;
        sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return dataPoints.map((_, i) => parseFloat((slope * i + intercept).toFixed(2)));
}

/**
 * Format number based on measurement type
 */
function formatValue(value, measurementType) {
    if (value === null || value === undefined) return 'NR';
    const num = parseFloat(value);
    switch (measurementType) {
        case 'currency':
            return num.toLocaleString('hu-HU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        case 'percentage':
            return `${num.toFixed(2)}%`;
        default:
            return num.toLocaleString('hu-HU');
    }
}

/**
 * Generate a random API key
 */
function generateApiKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Get chart data for a statistic in the requested view
 */
async function getChartData(statisticId, viewType = 'daily', dateFrom = null, dateTo = null) {
    const where = { statisticId };
    if (dateFrom || dateTo) {
        where.recordDate = {};
        if (dateFrom) where.recordDate.gte = new Date(dateFrom);
        if (dateTo) where.recordDate.lte = new Date(dateTo);
    }

    const values = await prisma.statisticValue.findMany({
        where,
        include: { author: { select: { name: true } } },
        orderBy: { recordDate: 'asc' },
    });

    const aggregated = aggregateValues(values, viewType);
    const tableData = buildValuesTable(aggregated);
    const trendLine = calculateTrendLine(
        [...aggregated].sort((a, b) => new Date(a.date) - new Date(b.date))
    );

    // Sort aggregated by date for chart
    const sortedForChart = [...aggregated].sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
        labels: sortedForChart.map(v => v.key),
        values: sortedForChart.map(v => v.value),
        trend: trendLine,
        tableData,
    };
}

module.exports = {
    calculateChangePercent,
    formatChangePercent,
    resolveRecordDate,
    aggregateValues,
    buildValuesTable,
    calculateTrendLine,
    formatValue,
    generateApiKey,
    getChartData,
    isWorkday,
    formatDateKey,
};
