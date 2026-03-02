/**
 * Condition Suggestion Service
 * Auto-suggests Hubbard operating conditions based on slope analysis
 */
const prisma = require('../config/database');

/**
 * Calculate normalized slope for a set of data points
 * slope = (last - first) / (periods * average)
 */
function calculateNormalizedSlope(values) {
    if (!values || values.length < 3) return null;

    const n = values.length;
    const first = values[0];
    const last = values[n - 1];
    const avg = values.reduce((sum, v) => sum + v, 0) / n;

    if (avg === 0) return null;
    return (last - first) / (n * avg);
}

/**
 * Check if Putere (Power) condition applies
 * Requires: (a) last 4+ weeks all above 6-month average
 *           (b) last 4 weeks show Normal-level trend (slope -0.1 to +0.4)
 */
function checkPutere(allValues, recentValues) {
    if (recentValues.length < 4) return false;

    // Calculate 6-month average
    const avg6m = allValues.reduce((sum, v) => sum + v, 0) / allValues.length;

    // Check (a): all recent values above 6-month average
    const allAbove = recentValues.every(v => v > avg6m);
    if (!allAbove) return false;

    // Check (b): Normal-level slope (-0.1 to +0.4)
    const slope = calculateNormalizedSlope(recentValues);
    if (slope === null) return false;

    return slope >= -0.1 && slope <= 0.4;
}

/**
 * Map slope to condition type
 * Non-Existență: slope <= -0.5
 * Pericol: -0.5 to -0.1
 * Urgență: -0.1 to +0.1
 * Normal: +0.1 to +0.4
 * Abundență: > +0.4
 * Putere: special rule (checked separately)
 */
function slopeToCondition(slope) {
    if (slope <= -0.5) return 'non_existenta';
    if (slope <= -0.1) return 'pericol_conducere';
    if (slope <= 0.1) return 'urgenta';
    if (slope <= 0.4) return 'normal';
    return 'abundenta';
}

/**
 * Suggest a condition for a statistic based on its recent data
 * @param {number} statisticId - The statistic to analyze
 * @returns {Object} { suggested, slope, confidence, message }
 */
async function suggestCondition(statisticId) {
    // Get all values for this statistic, ordered by date
    const values = await prisma.statisticValue.findMany({
        where: { statisticId: parseInt(statisticId) },
        orderBy: { recordDate: 'asc' },
        select: { value: true, recordDate: true },
    });

    if (values.length < 3) {
        return {
            suggested: null,
            slope: null,
            confidence: 'none',
            message: 'Sunt necesare cel puțin 3 puncte de date pentru sugestie automată.',
        };
    }

    const numericValues = values.map(v => parseFloat(v.value));

    // Use last 4-7 data points for slope analysis
    const windowSize = Math.min(7, Math.max(4, numericValues.length));
    const recentValues = numericValues.slice(-windowSize);
    const slope = calculateNormalizedSlope(recentValues);

    if (slope === null) {
        return {
            suggested: null,
            slope: null,
            confidence: 'none',
            message: 'Nu se poate calcula trendul — valorile sunt constante.',
        };
    }

    // Check Putere (Power) first — special rule
    if (checkPutere(numericValues, recentValues)) {
        return {
            suggested: 'putere',
            slope: parseFloat(slope.toFixed(4)),
            confidence: 'high',
            message: 'Putere: trend stabil în zona superioară (4+ săptămâni peste medie).',
        };
    }

    const suggested = slopeToCondition(slope);

    // Determine confidence
    let confidence = 'medium';
    if (recentValues.length >= 6) confidence = 'high';
    if (recentValues.length <= 3) confidence = 'low';

    // Romanian labels for the message
    const labels = {
        non_existenta: 'Non-Existență',
        non_existenta_extinsa: 'Non-Existență Extinsă',
        pericol_personal: 'Pericol Personal',
        pericol_conducere: 'Pericol de Conducere',
        urgenta: 'Urgență',
        normal: 'Normal',
        abundenta: 'Abundență',
        schimbare_putere: 'Schimbare de Putere',
        putere: 'Putere',
    };

    return {
        suggested,
        slope: parseFloat(slope.toFixed(4)),
        confidence,
        message: `Sugestie: ${labels[suggested] || suggested} (panta: ${slope.toFixed(4)})`,
    };
}

module.exports = { suggestCondition, calculateNormalizedSlope, checkPutere, slopeToCondition };
