const prisma = require('../config/database');
const statsService = require('./statisticsService');

/**
 * Evaluate a formula-based statistic.
 * Formulas reference other statistics by their ID: e.g., "{1} + {2}" means Stat #1 + Stat #2.
 * Supported operators: +, -, *, /, (, )
 * Special functions: AVG({1},{2}), SUM({1},{2}), MAX({1},{2}), MIN({1},{2})
 */
async function evaluateFormula(formulaStatistic, viewType = 'daily', dateFrom = null, dateTo = null) {
    const formula = formulaStatistic.formula;
    if (!formula) return { labels: [], values: [], trend: [], tableData: [] };

    // Extract all referenced statistic IDs from formula
    const idRegex = /\{(\d+)\}/g;
    const referencedIds = [];
    let match;
    while ((match = idRegex.exec(formula)) !== null) {
        const id = parseInt(match[1]);
        if (!referencedIds.includes(id)) referencedIds.push(id);
    }

    if (referencedIds.length === 0) {
        return { labels: [], values: [], trend: [], tableData: [] };
    }

    // Fetch chart data for all referenced statistics
    const dataMap = {};
    for (const id of referencedIds) {
        dataMap[id] = await statsService.getChartData(id, viewType, dateFrom, dateTo);
    }

    // Find all unique labels across all datasets
    const allLabels = [...new Set(
        Object.values(dataMap).flatMap(d => d.labels)
    )].sort();

    // For each label, evaluate the formula
    const resultValues = [];
    for (const label of allLabels) {
        let expr = formula;

        // Replace {id} with the value at this label
        for (const id of referencedIds) {
            const data = dataMap[id];
            const idx = data.labels.indexOf(label);
            const val = idx >= 0 ? data.values[idx] : 0;
            expr = expr.replace(new RegExp(`\\{${id}\\}`, 'g'), String(val));
        }

        // Handle AVG, SUM, MAX, MIN
        expr = expr.replace(/AVG\(([^)]+)\)/gi, (_, args) => {
            const nums = args.split(',').map(Number);
            return nums.reduce((a, b) => a + b, 0) / nums.length;
        });
        expr = expr.replace(/SUM\(([^)]+)\)/gi, (_, args) => {
            const nums = args.split(',').map(Number);
            return nums.reduce((a, b) => a + b, 0);
        });
        expr = expr.replace(/MAX\(([^)]+)\)/gi, (_, args) => {
            return Math.max(...args.split(',').map(Number));
        });
        expr = expr.replace(/MIN\(([^)]+)\)/gi, (_, args) => {
            return Math.min(...args.split(',').map(Number));
        });

        // Safely evaluate mathematical expression
        try {
            // Only allow digits, operators, parentheses, dots, spaces
            const sanitized = expr.replace(/[^0-9+\-*/().e\s]/g, '');
            const result = Function(`"use strict"; return (${sanitized});`)();
            resultValues.push(isFinite(result) ? parseFloat(result.toFixed(2)) : 0);
        } catch {
            resultValues.push(0);
        }
    }

    const trend = statsService.calculateTrendLine(resultValues.map(v => ({ value: v })));

    const tableData = resultValues.map((value, idx) => ({
        key: allLabels[idx],
        value,
        authorName: 'Formula',
        authorType: 'system',
        date: new Date(),
        id: null,
        runningTotal: resultValues.slice(0, idx + 1).reduce((a, b) => a + b, 0),
        changePercent: idx > 0 ? statsService.calculateChangePercent(value, resultValues[idx - 1]) : null,
        changePercentFormatted: idx > 0 ? statsService.formatChangePercent(
            statsService.calculateChangePercent(value, resultValues[idx - 1])
        ) : 'N/A',
    })).reverse();

    return {
        labels: allLabels,
        values: resultValues,
        trend,
        tableData,
    };
}

/**
 * Recalculate all formula-based statistics for an organization
 */
async function recalculateFormulas(organizationId) {
    const formulaStats = await prisma.statistic.findMany({
        where: {
            organizationId,
            graphType: 'formula',
            status: 'active',
        },
    });

    for (const stat of formulaStats) {
        try {
            const data = await evaluateFormula(stat);
            // Store results as StatisticValue entries with authorType 'system'
            for (let i = 0; i < data.labels.length; i++) {
                const dateParts = data.labels[i].split('-');
                let date;
                if (dateParts.length === 3) {
                    date = new Date(data.labels[i]);
                } else if (dateParts.length === 2 && dateParts[1].startsWith('W')) {
                    // Weekly format - use first day of that week
                    date = new Date(parseInt(dateParts[0]), 0, 1 + (parseInt(dateParts[1].slice(1)) - 1) * 7);
                } else if (dateParts.length === 2 && dateParts[1].startsWith('Q')) {
                    date = new Date(parseInt(dateParts[0]), (parseInt(dateParts[1].slice(1)) - 1) * 3, 1);
                } else if (dateParts.length === 2) {
                    date = new Date(`${dateParts[0]}-${dateParts[1]}-01`);
                } else {
                    date = new Date(`${dateParts[0]}-01-01`);
                }

                if (isNaN(date.getTime())) continue;

                await prisma.statisticValue.upsert({
                    where: {
                        statisticId_recordDate: {
                            statisticId: stat.id,
                            recordDate: date,
                        },
                    },
                    update: { value: data.values[i] },
                    create: {
                        statisticId: stat.id,
                        organizationId,
                        recordDate: date,
                        value: data.values[i],
                        authorType: 'system',
                    },
                });
            }
        } catch (err) {
            console.error(`Formula recalc error for stat ${stat.id}:`, err);
        }
    }
}

module.exports = { evaluateFormula, recalculateFormulas };
