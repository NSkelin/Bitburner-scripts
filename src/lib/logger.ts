import {NS} from "@ns";

/** ASCII Lines
 * Convienent access to all the ASCII lines I need when making tables.
 *
 * Straight lines
 * │  - Vertical
 * ─  - Horizontal
 *
 * Corners
 * ┌  - Top left
 * ┐  - Top right
 * └  - Bottom left
 * ┘  - Bottom right
 *
 * Tee shapes
 * ┬  - Top tee
 * ├  - Left tee
 * ┼  - Middle tee
 * ┤  - Right tee
 * ┴  - Bottom tee
 */

/** Combines a columns data with its length into an array, with arr[0] being the data and arr[1] being the length [string, number].
 *
 * The column data and column lengths should use matching indexes to line up properly.
 * For example, columnLength[0] is the length for columnData[0].
 *
 * @param columnData
 * @param columnLengths
 * @returns The formatted data array.
 */
function createRowFormat(columnData: string[], columnLengths: number[]) {
  if (columnLengths.length !== columnData.length) {
    throw new Error("Arrays must have the same length");
  }

  return columnData.map<[string, number]>((value, index) => [value, columnLengths[index]]);
}

type SideTypes = "t" | "top" | "b" | "bot" | "bottom";
type Side<T extends string> = Lowercase<T> extends SideTypes ? T : SideTypes;
/** Creates the start or end cap of a border box.
 *
 * @param columnWidths Determines how long the cap is. If there are multiple values, a separator will be placed between each column.
 * @param side The side of the border that will be capped, TOP or Bottom.
 * @returns The completed border cap: └───────┘ / └───────┴───────┘ / ┌───────┐ /...
 */
function createBorderCap<T extends string>(columnWidths: number[], side: Side<T> = "bottom") {
  const sideMapKey = side.toLowerCase();
  const sideMap = {
    b: ["└", "┴", "┘"],
    bot: ["└", "┴", "┘"],
    bottom: ["└", "┴", "┘"],
    t: ["┌", "┬", "┐"],
    top: ["┌", "┬", "┐"],
  };
  // side parameter is not a valid a SideType
  if (Object.keys(sideMap).includes(sideMapKey) === false) throw new Error("Parameter side is an invalid key: " + sideMapKey);

  const [lCap, mCap, rCap] = sideMap[sideMapKey as SideTypes];

  // Create the capRow
  // └─
  let row = lCap + "─";

  for (const [i, length] of columnWidths.entries()) {
    // └─ + ───── = └──────
    row += "─".repeat(length);

    if (i < columnWidths.length - 1) {
      // └────── + ─┴─ = └───────┴─
      row += `─${mCap}─`;
    }
  }

  // └────── + ─┘ = └───────┘
  row += "─" + rCap;

  // └───────┴───────┘
  return row + "\n";
}

/** Creates a formatted string representing a single table row.
 * @param columns A 2 dimensional array with the outer array being the row's columns and the inner array being that column's data and length.
 * @returns The row: │ column 1      │ column 2 │ column 3            |...
 */
function createRow(columns: [string, number][]) {
  let row = "│";

  for (const column of columns) {
    row += ` ${column[0].padEnd(column[1], " ")} │`;
  }
  return row + "\n";
}

/** Creates a formatted string representing a tables rows.
 *
 * The column data and column lengths should use matching indexes to line up properly.
 * For example, row1 = data[0]; column1 = row1[0]; columnLength[0] is the length for column1.
 *
 * @param data A 2 dimensional array of rows and columns with the outer array being rows and the inner array being that row's columns.
 * @param columnWidths The lengths for each column.
 * @example
 * │ column 1 │ column 2 │ column 3   |...
 * │ column 1 │ column 2 │ column 3   |...
 * │ column 1 │ column 2 │ column 3   |...
 */
function createRows(data: string[][], columnWidths: number[]) {
  let rows = "";
  for (const rowData of data) {
    const rowFormat = createRowFormat(rowData, columnWidths);
    const row = createRow(rowFormat);
    rows += row;
  }
  return rows;
}

/** Creates a formatted string representing the headers for a table.
 *
 * The headers and column lengths should use matching indexes to line up properly.
 * For example, columnLength[0] is the length for header[0].
 *
 * @param headers The titles for each header.
 * @param columnWidths The length for each header column.
 * @example
 * createHeaders(ns, ["Header 1", "Header 2"], [8, 8]);
 * // will return
 * ┌──────────┬──────────┐
 * │ Header 1 │ Header 2 │
 * └──────────┴──────────┘
 */
function createHeaders(headers: string[], columnWidths: number[]) {
  const rowFormat = createRowFormat(headers, columnWidths);

  const row1 = createBorderCap(columnWidths, "top");
  const row2 = createRow(rowFormat);
  const row3 = createBorderCap(columnWidths);

  return row1 + row2 + row3;
}

/** Calculates the width of each column by finding the longest string in that column.
 *
 * @param rowsColumns A 2 dimensional array representing a tables row and columns, with the outer array being the rows and the inner array being the columns.
 * @returns The width for each column matching that columns longest piece of data.
 */
function getColumnWidths(rowsColumns: string[][]) {
  const columnWidths: number[] = [...Array(rowsColumns[0].length)].map(() => 0);
  for (const row of rowsColumns) {
    for (const [i, column] of row.entries()) {
      if (columnWidths[i] < column.length) columnWidths[i] = column.length;
    }
  }
  return columnWidths;
}

/** Creates a formatted string representing a table for displaying data.
 *
 * @param rowsColumns A 2 dimensional array of rows and columns with the outer array being rows and the inner array being that row's columns.
 * @param firstRowHeaders If true, uses the first row in the array as the table headers. Otherwise it creates a table without headers.
 * @example
 * ┌──────────┬──────────┐
 * │ Header 1 │ Header 2 │
 * └──────────┴──────────┘
 * │ column 1 │ column 2 │
 * │ column 1 │ column 2 │
 * │ column 1 │ column 2 │
 * └──────────┴──────────┘
 */
export function createTable(rowsColumns: string[][], firstRowHeaders = true) {
  const columnWidths = getColumnWidths(rowsColumns);

  // Create either the table headers, or the border cap if there are no headers.
  let topSection = "";
  if (firstRowHeaders) {
    const headers = rowsColumns.shift() as string[];
    topSection += createHeaders(headers, columnWidths);
  } else {
    topSection += createBorderCap(columnWidths, "Top");
  }

  const rows = createRows(rowsColumns, columnWidths);
  const bottomCap = createBorderCap(columnWidths);

  return topSection + rows + bottomCap;
}

/** Prints the result of createTable(). */
export function printTable(ns: NS, rowsColumns: string[][], firstRowHeaders = true) {
  ns.print(createTable(rowsColumns, firstRowHeaders));
}

/** A function to test the table creates and formats correctly. */
function testTable(ns: NS) {
  const dummyData = [
    ["Header 1", "Header 2"],
    ["row1-1", "row1-2"],
    ["row2-1", "row2-2"],
    ["row3-1", "row3-2"],
    ["row4-1", "row4-2"],
    ["row5-1", "row5-2"],
  ];
  printTable(ns, dummyData, true);
}

export async function main(ns: NS) {
  testTable(ns);
}
