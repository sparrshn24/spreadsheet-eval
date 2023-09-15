const fs = require('fs');
const csvManipulation = require('../csvManipulation.js');

describe('getCellIndices', () => {
    it('should return the correct row and column indices for a cell reference', () => {
        // Test case: A12
        const cellRefA12 = 'A12';
        const [rowA12, colA12] = csvManipulation.getCellIndices(cellRefA12);
        expect(rowA12).toBe(11); // Row index for A1 should be 0
        expect(colA12).toBe(0); // Column index for A1 should be 0

        // Test case: D5
        const cellRefD5 = 'D5';
        const [rowD5, colD5] = csvManipulation.getCellIndices(cellRefD5);
        expect(rowD5).toBe(4); // Row index for D5 should be 4 (5 - 1)
        expect(colD5).toBe(3); // Column index for D5 should be 3 (D is the 4th letter in the alphabet, zero-based)
    });
});

describe('initializeCells', () => {
    it('should initialize a 2x3 array with empty strings', () => {
        const numRows = 2;
        const numCols = 3;

        const result = csvManipulation.initializeCells(numRows, numCols);

        // Check if the result is an array with the expected number of rows
        expect(result).toHaveLength(numRows);

        // Check if each row is an array with the expected number of columns
        result.forEach((row) => {
            expect(row).toHaveLength(numCols);

            // Check if each cell in the row is an empty string
            row.forEach((cell) => {
                expect(cell).toBe('');
            });
        });
    });

    it('initializing an invalid grid', () => {
        const numRows = -2;
        const numCols = 3;

        try {
            csvManipulation.initializeCells(numRows, numCols);
        } catch (error) {
            expect(error.message).toBe('Invalid number of rows or columns');
        }


    });
});

jest.mock('fs');

describe('evaluateCSVFile', () => {
    afterEach(() => {
        // Restore the original implementations of mocked functions after each test
        jest.resetAllMocks();
    });

    it('should return the content of the CSV file when it exists and is not empty', () => {
        const csvFile = 'example.csv';
        const csvData = '1,2,3\n4,5,6\n7,8,9';

        // Mock fs.existsSync to return true
        fs.existsSync.mockReturnValue(true);

        // Mock fs.readFileSync to return the CSV data
        fs.readFileSync.mockReturnValue(csvData);

        const result = csvManipulation.evaluateCSVFile(csvFile);

        expect(result).toBe(csvData);
    });

    it('should handle a non-existing CSV file and log an error', () => {
        const csvFile = 'non-existent.csv';

        // Mock fs.existsSync to return false
        fs.existsSync.mockReturnValue(false);

        // Mock console.error to capture its output
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        // Call the function
        try {
            csvManipulation.evaluateCSVFile(csvFile);
        } catch (error) {
            expect(error.message).toBe('The CSV file does not exist');
        }

        // Assert that an error was logged
        expect(consoleErrorSpy).toHaveBeenCalledWith('The CSV file does not exist');
    });

    it('should handle an empty CSV file and log an error', () => {
        const csvFile = 'empty.csv';

        // Mock fs.existsSync to return true
        fs.existsSync.mockReturnValue(true);

        // Mock fs.readFileSync to return an empty string
        fs.readFileSync.mockReturnValue('');

        // Mock console.error to capture its output
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        // Call the function
        try {
            csvManipulation.evaluateCSVFile(csvFile);
        } catch (error) {
            expect(error.message).toBe('The CSV file is empty');
        }

        // Assert that an error was logged
        expect(consoleErrorSpy).toHaveBeenCalledWith('The CSV file is empty');
    });
});

describe('processCSV', () => {
    beforeEach(() => {
        // Clear the console.log spy before each test
        jest.spyOn(console, 'log').mockClear();
    });

    afterEach(() => {
        // Restore the original console.log function after each test
        jest.restoreAllMocks();
    });

    it('should process CSV data and log the expected results', () => {

        const csvData = '1,2,3\n4,5,6\n7,8,9';

        const evaluateCellSpy = jest.spyOn(csvManipulation, 'evaluateCell');

        // Call the processCSV function with the mock CSV data
        csvManipulation.processCSV(csvData, evaluateCellSpy);

        // Assert that console.log was called with the expected arguments
        expect(console.log).toHaveBeenCalledTimes(1); // The function logs three rows
    });

    it('should process inconsistent CSV data and log the error', () => {

        const csvData = '1,2,3\n4,5\n7,8,9';

        // const evaluateCellSpy = jest.spyOn(csvManipulation, 'evaluateCell');

        // Call the processCSV function with the mock CSV data
        try {
            csvManipulation.processCSV(csvData);
        } catch (error) {
            expect(error.message).toBe('Fix the csv before proceeding. Inconsistent number of columns');
        }

        // Assert that console.log was called with the expected arguments
        expect(console.log).toHaveBeenCalledTimes(1); // The function logs three rows
    });
});

describe('evaluateCell', () => {
    let consoleErrorSpy;

    beforeEach(() => {
        // Create spies for two functions
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        // Reset the spies after each test case
        consoleErrorSpy.mockRestore();
    });
    it('should handle cell references and return the correct sum', () => {
        const cell = "1 2 3";
        const initialCells = ["1", "2", "3"].join(' ').split(' '); // Set up initialCells with referenced values
        const visitedCells = new Set();
        const numRows = 3; // Set the number of rows and columns accordingly
        const numCols = 3;

        const result = csvManipulation.evaluateCell(cell, initialCells, visitedCells, numRows, numCols);

        expect(result).toBe(6); // Expect the sum of A1, A2, and A3 to be 6
    });

    it('should detect circular dependencies, log the error and return #ERR', () => {
        const cell = 'A1';
        const initialCells = [[], [], []]; // Set up initialCells with circular reference
        initialCells[0][0] = 'A1'; // Circular reference to itself
        const visitedCells = new Set();
        const numRows = 3; // Set the number of rows and columns accordingly
        const numCols = 3;
        const result = csvManipulation.evaluateCell(cell, initialCells, visitedCells, numRows, numCols);

        expect(consoleErrorSpy).toHaveBeenCalledWith(`Circular dependence detected in cell '${cell}'.Defaulting them to #ERR`);
        expect(result).toBe('#ERR'); // Expect circular dependency to return #ERR
    });

    it('should detect multiple circular dependencies, log the error and return #ERR', () => {
        const cell = 'A1';
        const initialCells = [['A1'], ['B1']]; // Set up initialCells with circular reference
        // initialCells[0][0] = 'A1'; // Circular reference to itself
        const visitedCells = new Set();
        const numRows = 2; // Set the number of rows and columns accordingly
        const numCols = 2;
        const result = csvManipulation.evaluateCell(cell, initialCells, visitedCells, numRows, numCols);

        expect(consoleErrorSpy).toHaveBeenCalledWith(`Circular dependence detected in cell '${cell}'.Defaulting them to #ERR`);
        expect(result).toBe('#ERR'); // Expect circular dependency to return #ERR
    });

    it('should handle out of bounds cell references, log the error and return #ERR', () => {
        const cell = 'A4';
        const initialCells = [[1], [2], [3]]; // Set up initialCells with valid references
        const visitedCells = new Set();
        const numRows = 3; // Set the number of rows and columns accordingly
        const numCols = 3;

        const result = csvManipulation.evaluateCell(cell, initialCells, visitedCells, numRows, numCols);
        expect(result).toBe('#ERR'); // Expect invalid reference to return #ERR
    });

    it('should handle empty cell value, log the error and return #ERR', () => {
        const cell = '';
        const initialCells = [[1], [2], []]; // Set up initialCells as needed
        const visitedCells = new Set();
        const numRows = 3; // Set the number of rows and columns accordingly
        const numCols = 3;

        const result = csvManipulation.evaluateCell(cell, initialCells, visitedCells, numRows, numCols);

        expect(consoleErrorSpy).toHaveBeenCalledWith('Empty token found. Defaulting to #ERR');
        expect(result).toBe('#ERR'); // Expect empty cell value to return #ERR
    });


    it('should handle invalid cell values and log an error', () => {
        const token = '###a32432';

        // Set up a spy on console.error
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        // Call the function that triggers console.error
        const result = csvManipulation.evaluateCell(token, /* other arguments */);

        // Assert that console.error was called with the expected message
        expect(consoleErrorSpy).toHaveBeenCalledWith(`Invalid cell value format -> '${token}'. Verify. Defaulting to #ERR.`);

        // Assert that the function returns "#ERR" as expected
        expect(result).toBe('#ERR');
    });

});
