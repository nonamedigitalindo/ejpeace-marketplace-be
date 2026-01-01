
/**
 * Strict Date Utility
 * Enforces Asia/Jakarta timezone preservation
 */

const toJakartaDateString = (isoString) => {
    if (!isoString) return null;

    // 1. Strict Validation: Must contain timezone offset (+ or - or Z)
    // The user requirement says: "If timezone is missing, configuration must fail"
    // ISO 8601 with offset usually looks like: 2026-01-01T01:00:00+07:00
    if (!isoString.match(/([+-]\d{2}:?\d{2}|Z)$/)) {
        throw new Error(`Strict Timezone Error: Datetime must include timezone offset (e.g., +07:00). Value: ${isoString}`);
    }

    // 2. Parse Date
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid Date Format: ${isoString}`);
    }

    // 3. Convert to Asia/Jakarta String Literal
    // We explicitly target Asia/Jakarta regardless of system/server timezone
    const options = {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    };

    try {
        const formatter = new Intl.DateTimeFormat("en-CA", options);
        // en-CA format: YYYY-MM-DD
        // parts might vary slightly across node versions, safer to formatToParts

        // Quick Hack for en-CA: "2026-01-01, 01:00:00" or similar
        // Let's use formatToParts for maximum safety
        const parts = formatter.formatToParts(date);
        const getPart = (type) => parts.find(p => p.type === type)?.value;

        const year = getPart('year');
        const month = getPart('month');
        const day = getPart('day');
        const hour = getPart('hour');
        const minute = getPart('minute');
        const second = getPart('second');

        // MySQL Format: YYYY-MM-DD HH:MM:SS
        return `${year}-${month}-${day} ${hour}:${minute}:${second}`;

    } catch (error) {
        throw new Error(`Timezone Conversion Failed: ${error.message}`);
    }
};

module.exports = {
    toJakartaDateString
};
