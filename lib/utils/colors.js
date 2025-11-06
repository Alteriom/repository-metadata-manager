/**
 * Color utility functions for terminal output
 * Compatible fallback for chalk when using CommonJS
 */

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',

    // Foreground colors
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',

    // Background colors
    bgBlack: '\x1b[40m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
    bgWhite: '\x1b[47m',
};

/**
 * Create a color wrapper function
 */
function createColorFunction(colorCode) {
    return (text) => `${colorCode}${text}${colors.reset}`;
}

/**
 * Chalk-compatible API
 */
const chalk = {
    // Standard colors
    black: createColorFunction(colors.black),
    red: createColorFunction(colors.red),
    green: createColorFunction(colors.green),
    yellow: createColorFunction(colors.yellow),
    blue: createColorFunction(colors.blue),
    magenta: createColorFunction(colors.magenta),
    cyan: createColorFunction(colors.cyan),
    white: createColorFunction(colors.white),
    gray: createColorFunction(colors.gray),
    grey: createColorFunction(colors.gray),

    // Modifiers
    bold: createColorFunction(colors.bright),
    dim: createColorFunction(colors.dim),

    // Background colors
    bgBlack: createColorFunction(colors.bgBlack),
    bgRed: createColorFunction(colors.bgRed),
    bgGreen: createColorFunction(colors.bgGreen),
    bgYellow: createColorFunction(colors.bgYellow),
    bgBlue: createColorFunction(colors.bgBlue),
    bgMagenta: createColorFunction(colors.bgMagenta),
    bgCyan: createColorFunction(colors.bgCyan),
    bgWhite: createColorFunction(colors.bgWhite),
};

module.exports = chalk;
