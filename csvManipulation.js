const fs = require('fs');

module.exports = {
    getCellIndices,
    initializeCells,
    evaluateCSVFile,
    processCSV,
    evaluateCell
};

// Function to get the row and column of the referenced cell
// Row and Columns both are 0-based. Eg. A1 is (0,0)
// Return the coordinate in the form of [row, col]
function getCellIndices(cellRef) {
    const col = cellRef.charCodeAt(0) - 'A'.charCodeAt(0);
    const row = parseInt(cellRef.slice(1)) - 1;
    // console.log([row, col]);
    return [row, col];
}

// Initialize an empty 2D Array and a basic check on number of rows and number of columns.
function initializeCells(numRows, numCols) {
    if (typeof numRows !== 'number' || typeof numCols !== 'number' || numRows <= 0 || numCols <= 0) {
        throw new Error('Invalid number of rows or columns');
    }
    const defaultVal = '';
    const initialCells = Array(numRows).fill(null).map(() => Array(numCols).fill(defaultVal));
    return initialCells;
}

// Populate the values according to the csv.
function populateCells(rows, numRows, numCols, initialCells) {
    for (let row = 0; row < numRows; row++) {
        const values = rows[row].split(',');
        for (let col = 0; col < numCols; col++) {
            if (values[col] != undefined) {
                initialCells[row][col] = values[col].trim().replace(/\s+/g, ' ');
            }
        }
    }
    return initialCells;
}

// Function to evaluate a particular cell. Core logic of the program is here.
// All erroneous conditions or values are defaulted to #ERR. Program execution never stops.
// Cell is checked with a regex checking for capital letters followed by 2 digits. 
// If it is a reference to another cell, we get the value by calling getCellIndices() re
// We check for circular references by incorporating a set as a set can only have unique values.
// If it is a circular reference, we return #ERR.
// If not, we recursively call evaluateCell() on the referenced cell
// We perform basic checks on valid row and columns everytime they are passed.
// If not, we change the value to #ERR and log it on the console.
// If cell is a number, we just incorporate it by summing it up.
// The integer sum is returned.
function evaluateCell(cell, initialCells, visitedCells, numRows, numCols) {
    const cellRefRegex = /^[A-Z]+\d{1,2}( [A-Z]+\d{1,2})*$/;
    let tokens;
    if (!(cell === undefined)) {
        tokens = cell.split(' ');
    }
    else {
        console.error("Empty cell value found. Defaulting to #ERR");
        return "#ERR";
    }
    let sum = 0;
    let referencedCell = null;

    for (const token of tokens) {
        if (token.trim() === "") {
            console.error("Empty token found. Defaulting to #ERR");
            return "#ERR";
        }
        if (cellRefRegex.test(token)) {
            const [referencedCellRow, referencedCellCol] = getCellIndices(token);

            if (referencedCellRow >= 0 && referencedCellRow < numRows && referencedCellCol >= 0 && referencedCellCol < numCols) {
                referencedCell = initialCells[referencedCellRow][referencedCellCol];

                if (visitedCells.has(referencedCell)) {
                    console.error(`Circular dependence detected in cell '${token}'.Defaulting them to #ERR`);
                    return "#ERR"; // Circular dependency detected
                }

                visitedCells.add(referencedCell); // Mark the cell as visited
                const refValue = evaluateCell(referencedCell, initialCells, visitedCells, numRows, numCols);
                if (refValue === "#ERR") {
                    // If any referenced cell is #ERR, propagate it and stop evaluating
                    return "#ERR";
                }
                sum += refValue;
            }
            else {
                console.error(`Cell references an out of bounds cell ->'${String.fromCharCode('A'.charCodeAt(0) + referencedCellCol)}${referencedCellRow + 1}'.Defaulting cell value to #ERR`);;
                return "#ERR";
            }

            visitedCells.delete(referencedCell); // Remove the cell from visited set

        }

        else if (!isNaN(token)) {
            sum += parseInt(token);
        }

        else {
            console.error(`Invalid cell value format -> '${token}'. Verify. Defaulting to #ERR.`);
            return "#ERR";
        }
    }

    return sum;
}

if (require.main === module) {
    if (process.argv.length < 3) {
        console.error('Please provide the CSV file as a command line argument');
        process.exit(1);
    }

    const csvFile = process.argv[2];
    const csvData = evaluateCSVFile(csvFile);
    processCSV(csvData);
}

// Evaluate and parse the CSV File.
function evaluateCSVFile(csvFile) {

    if (!fs.existsSync(csvFile)) {
        console.error('The CSV file does not exist');
        throw new Error('The CSV file does not exist');
    }

    const csvData = fs.readFileSync(csvFile, 'utf8')

    if (csvData.trim() === '') {
        console.error('The CSV file is empty');
        throw new Error('The CSV file is empty');
    }

    return csvData;
};

// Formatting of the CSV file. 
// Each cell is extracted and passed on to the evaluateCell function.
// Cell values are trimmed and leading and trailing whitespaces are eliminated.
// This function prints out the final csv to stdout.
function processCSV(csvData) {

    const rows = csvData.trim().split('\r\n');
    const numRows = rows.length;
    const numCols = rows[0].split(',').length;
    const initialCells = initializeCells(numRows, numCols);
    const populatedCells = populateCells(rows, numRows, numCols, initialCells);

    const visitedCells = new Set();

    const result = [];

    for (let row = 0; row < numRows; row++) {
        const values = rows[row].split(',');
        if (values.length !== numCols) {
            console.error(`Fix the csv before proceeding.Inconsistent number of columns in row ${row + 1} `);
            throw new Error('Fix the csv before proceeding. Inconsistent number of columns');
        }
        const evaluatedValues = [];

        for (let col = 0; col < numCols; col++) {

            const evaluatedValue = evaluateCell(values[col].trim().replace(/\s+/g, ' '), populatedCells, visitedCells, numRows, numCols);
            evaluatedValues.push(evaluatedValue);
        }

        // finalCells[row] = evaluatedValues;
        result.push(evaluatedValues.join(','));

    }

    console.log(result.join('\n'));

}





