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

/** A 2 dimensional array representing a tables rows and columns, with the outer array holding the tables rows and the inner array's holding that rows columns.
 * Each inner array represents a single row, with the values being the data for that column.
 * The outer array holds all the rows.
 *
 * @example
 * // A representation of the table data.
 * [
 *  [ c1, c2, c3, c4 ], // row 1
 *  [ c1, c2, c3, c4 ], // row 2
 *  [ c1, c2, c3, c4 ], // row 3
 *  [ c1, c2, c3, c4 ], // row 4
 * ]
 */
type TableData = string[][];

type SideTypes = "t" | "top" | "b" | "bot" | "bottom";
type Side<T extends string> = Lowercase<T> extends SideTypes ? T : SideTypes;
/** Creates the start or end cap of a border box.
 *
 * @param columnWidths Determines how long the cap is. If there are multiple values, a separator will be placed between each column.
 * @param side The side of the border that will be capped, TOP or Bottom.
 * @param columnPadding A 2 index array that controls the padding for each column with index 0 for the left padding and index 1 for the right padding.
 * The padding is in addition to the column width and goes between the column border and the column width on both sides.
 * @param borderPadding A 2 index array that controls each rows padding. See createRow() for more detail.
 * @returns The completed border cap: └───────┘ / └───────┴───────┘ / ┌───────┐ /...
 */
function createBorderCap<T extends string>(
  columnWidths: number[],
  side: Side<T> = "bottom",
  columnPadding: [number, number] = [1, 1],
  borderPadding: [number, number] = [0, 0]
) {
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
  const colLeftPad = "─".repeat(columnPadding[0]);
  const colRightPad = "─".repeat(columnPadding[1]);
  const borderLeftPad = "─".repeat(borderPadding[0]);
  const borderRightPad = "─".repeat(borderPadding[1]);

  // Create the capRow
  // └─
  let row = lCap + borderLeftPad + colLeftPad;

  for (const [i, columnWidth] of columnWidths.entries()) {
    // └─ + ───── = └──────
    row += "─".repeat(columnWidth);

    if (i < columnWidths.length - 1) {
      // └────── + ─┴─ = └───────┴─
      row += `${colRightPad}${mCap}${colLeftPad}`;
    }
  }

  // └────── + ─┘ = └───────┘
  row += colRightPad + borderRightPad + rCap;

  // └───────┴───────┘
  return row + "\n";
}

/** Creates a formatted string representing a single table row.
 *
 * The width used for each column is the matching index of the columnWidths array. So data[0] uses the width from widths[0], data[3] -> widths[3].
 * If the widths index is invalid or the width is less than the datas length, the width will default to the length of the data. Additionally
 * each column has a 1 space padding on both sides.
 * @param columnData The data or text that will be shown in each column.
 * @param columnWidths The widths used to decide the columns widths.
 * @param columnPadding A 2 index array that controls the padding for each column with index 0 for the left padding and index 1 for the right padding.
 * The padding is in addition to the column width and goes between the column border (|) and the column data on both sides.
 * @param borderPadding A 2 index array that controls the padding for each end of the row with index 0 for the left padding and index 1 for the right padding.
 * The padding goes inside the border (| pad pad columnPad data columnPad pad pad |)
 * @example
 * const columns = ["column1", "column2", "column3"];
 * const widths = [10, 3];
 * createRow(columns, widths);
 * // Returns
 * "│ column 1   │ column 2 │ column 3 |""
 */
function createRow(columnData: string[], columnWidths: number[], columnPadding: [number, number] = [1, 1], borderPadding: [number, number] = [0, 0]) {
  const colLeftPad = " ".repeat(columnPadding[0]);
  const colRightPad = " ".repeat(columnPadding[1]);
  const borderLeftPad = " ".repeat(borderPadding[0]);
  const borderRightPad = " ".repeat(borderPadding[1]);

  let row = "│" + borderLeftPad;

  for (let i = 0; i < columnData.length; i++) {
    const data = columnData[i];
    const width = columnWidths[i] ?? 0;
    row += colLeftPad + data.padEnd(width, " ") + colRightPad + "|";
  }

  // insert padding before the last row border "|"
  row = row.slice(0, -3) + borderRightPad + row.slice(-3);

  return row + "\n";
}

/** Creates a formatted string representing a tables rows.
 *
 * The column data and column lengths should use matching indexes to line up properly.
 * For example, row1 = data[0]; column1 = row1[0]; columnLength[0] is the length for column1.
 *
 * @param data A 2 dimensional array of rows and columns with the outer array being rows and the inner array being that row's columns.
 * @param columnWidths The lengths for each column.
 * @param columnPadding A 2 index array that controls each columns padding. See createRow() for more detail.
 * @param borderPadding A 2 index array that controls each rows padding. See createRow() for more detail.
 * @example
 * │ column 1 │ column 2 │ column 3   |...
 * │ column 1 │ column 2 │ column 3   |...
 * │ column 1 │ column 2 │ column 3   |...
 */
function createRows(data: TableData, columnWidths: number[], columnPadding?: [number, number], borderPadding?: [number, number]) {
  let rows = "";
  for (const columnData of data) {
    const row = createRow(columnData, columnWidths, columnPadding, borderPadding);
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
 * @param columnPadding A 2 index array that controls each columns padding. See createRow() for more detail.
 * @param borderPadding A 2 index array that controls each rows padding. See createRow() for more detail.
 * @example
 * createHeaders(["Header 1", "Header 2"], [8, 8]);
 * // will return
 * ┌──────────┬──────────┐
 * │ Header 1 │ Header 2 │
 * └──────────┴──────────┘
 */
function createHeaders(headers: string[], columnWidths: number[], columnPadding?: [number, number], borderPadding?: [number, number]) {
  const row1 = createBorderCap(columnWidths, "top", columnPadding, borderPadding);
  const row2 = createRow(headers, columnWidths, columnPadding, borderPadding);
  const row3 = createBorderCap(columnWidths, "bot", columnPadding, borderPadding);

  return row1 + row2 + row3;
}

/** Calculates the width of each column by finding the longest string in that column.
 *
 * @param rowsColumns A 2 dimensional array representing a tables row and columns, with the outer array being the rows and the inner array being the columns.
 * @returns The width for each column matching that columns longest piece of data.
 */
function getColumnWidths(rowsColumns: TableData) {
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
 * @param padding A 2 index array that controls each columns padding. See createRow() for more detail.
 * @example
 * ┌──────────┬──────────┐
 * │ Header 1 │ Header 2 │
 * └──────────┴──────────┘
 * │ column 1 │ column 2 │
 * │ column 1 │ column 2 │
 * │ column 1 │ column 2 │
 * └──────────┴──────────┘
 */
export function createTable(rowsColumns: TableData, firstRowHeaders = true, padding?: [number, number]) {
  const columnWidths = getColumnWidths(rowsColumns);

  // Create either the table headers, or the border cap if there are no headers.
  let topSection = "";
  if (firstRowHeaders) {
    const headers = rowsColumns.shift() as string[];
    topSection += createHeaders(headers, columnWidths, padding);
  } else {
    topSection += createBorderCap(columnWidths, "Top", padding);
  }

  const rows = createRows(rowsColumns, columnWidths, padding);
  const bottomCap = createBorderCap(columnWidths, "bot", padding);

  return topSection + rows + bottomCap;
}

/** Prints the result of {@link createTable} to the scripts logs. */
export function printTable(ns: NS, rowsColumns: TableData, firstRowHeaders = true, padding?: [number, number]) {
  ns.print(createTable(rowsColumns, firstRowHeaders, padding));
}

/** Prints the result of {@link createTable} to the terminal. */
export function tprintTable(ns: NS, rowsColumns: TableData, firstRowHeaders = true, padding?: [number, number]) {
  ns.tprint("\n" + createTable(rowsColumns, firstRowHeaders, padding));
}

/** Creates a string formatted as a custom menu for displaying data.
 *
 * @param subtitle A string that can be any custom message for the menu such as the scripts state.
 * @param data A 2 dimensional array representing a tables row and columns, with the outer array being the rows and the inner array being the columns.
 * @example
 * const data = [
 *    ["Servers owned", "20/25"],
 *    ["Server cost", "10.5M / 100.5M"],
 *    ["", ""],
 *    ["Current RAM", "1024 GB /2048 GB"],
 *    ["Ram double cost", "10.5M / 100.5M"],
 *    ["Servers doubled", "20/25"],
 *  ];
 *
 * const menu = createMenu(ns, "buyServers.js", "Purchasing servers...", data);
 * ns.print(menu)
 * // Prints
 * ┌────────────────────────────────────────────┐
 * │  buyServers.js                             |
 * │                                            |
 * │    Purchasing servers...                   |
 * │                                            |
 * │    Servers owned    |  20/25               |
 * │    Server cost      |  10.5M / 100.5M      |
 * │                     |                      |
 * │    Current RAM      |  1024 GB /2048 GB    |
 * │    Ram double cost  |  10.5M / 100.5M      |
 * │    Servers doubled  |  20/25               |
 * └────────────────────────────────────────────┘
 */
export function createMenu(title: string, subtitle: string, data: TableData) {
  // custom settings
  const borderPadding: [number, number] = [2, 2];
  const columnPadding: [number, number] = [2, 2];

  const columnWidths = getColumnWidths(data);
  const columnPaddingWidth = columnPadding.reduce((accumulator, width) => (accumulator += width), 0);
  const borderPaddingWidth = borderPadding.reduce((accumulator, width) => (accumulator += width), 0);
  const totalColumnWidth = columnWidths.reduce((accumulator, width) => (accumulator += width + columnPaddingWidth), 0);

  const columnDividers = data[0].length - 1; // column divider ( |col|col|col|col| = 3 dividers 4 walls)
  const rowWidth = totalColumnWidth + columnDividers - columnPaddingWidth; // remove 1 columnPaddingWidth because each row adds 1

  let row = "";
  row += createBorderCap([rowWidth], "top", columnPadding, borderPadding);
  row += createRow([title], [rowWidth + borderPaddingWidth], columnPadding);
  row += createRow([""], [rowWidth], columnPadding, borderPadding);
  row += createRow([subtitle], [rowWidth], columnPadding, borderPadding);
  row += createRow([""], [rowWidth], columnPadding, borderPadding);

  row += createRows(data, columnWidths, columnPadding, borderPadding);
  row += createBorderCap([rowWidth], "bot", columnPadding, borderPadding);
  return row;
}

/** Prints the result of {@link createMenu} to the scripts logs. */
export function printMenu(ns: NS, title: string, subtitle: string, data: TableData) {
  ns.print(createMenu(title, subtitle, data));
}

/** Prints the result of {@link createMenu} to the terminal. */
export function tprintMenu(ns: NS, title: string, subtitle: string, data: TableData) {
  ns.tprint(createMenu(title, subtitle, data));
}

/** Creates an ascii progress bar.
 * @param fillPercent The percentage of the bar that is filled. The percent must be a number from 0 - 100, with 100 being 100%.
 * @param length The total ascii characters used to make up the progress bar not including the 2 ends.
 * @example
 * const bar = createProgressBar(33, 10);
 * console.log(bar);
 * // [|||-------]
 */
export function createProgressBar(fillPercent: number, length: number = 10) {
  const fillLength = Math.round((fillPercent / 100) * length);

  const fill = "|".repeat(fillLength);
  const empty = "-".repeat(length - fillLength);

  return `[${fill}${empty}]`;
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

function testMenu(ns: NS) {
  const dummyData = [
    ["Servers owned", "20/25"],
    ["Server cost", "10.5M / 100.5M"],
    ["", ""],
    ["Current RAM", "1024 GB /2048 GB"],
    ["Ram double cost", "10.5M / 100.5M"],
    ["Servers doubled", "20/25"],
  ];
  printMenu(ns, "buyServers.js", "Purchasing servers...", dummyData);
}

export async function main(ns: NS) {
  testTable(ns);
  testMenu(ns);
}
