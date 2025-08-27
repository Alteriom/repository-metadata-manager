// Setup file for Jest tests
// Suppress console warnings during tests
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

beforeEach(() => {
    // Mock console methods to reduce noise during tests
    console.warn = jest.fn();
    console.error = jest.fn();
    console.log = jest.fn();
});

afterEach(() => {
    // Restore original console methods
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
});
