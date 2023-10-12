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
 * @param padding A 2 index array that controls the padding for each column with index 0 for the left padding and index 1 for the right padding.
 * The padding is in addition to the column width and goes between the column border and the column width on both sides.
 * @returns The completed border cap: └───────┘ / └───────┴───────┘ / ┌───────┐ /...
 */
function createBorderCap<T extends string>(columnWidths: number[], side: Side<T> = "bottom", padding: [number, number] = [1, 1]) {
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
  const leftPad = "─".repeat(padding[0]);
  const rightPad = "─".repeat(padding[1]);

  // Create the capRow
  // └─
  let row = lCap + leftPad;

  for (const [i, columnWidth] of columnWidths.entries()) {
    // └─ + ───── = └──────
    row += "─".repeat(columnWidth);

    if (i < columnWidths.length - 1) {
      // └────── + ─┴─ = └───────┴─
      row += `${rightPad}${mCap}${leftPad}`;
    }
  }

  // └────── + ─┘ = └───────┘
  row += rightPad + rCap;

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
 * @param padding A 2 index array that controls the padding for each column with index 0 for the left padding and index 1 for the right padding.
 * The padding is in addition to the column width and goes between the column border (|) and the column data on both sides.
 * @example
 * const columns = ["column1", "column2", "column3"];
 * const widths = [10, 3];
 * createRow(columns, widths);
 * // Returns
 * "│ column 1   │ column 2 │ column 3 |""
 */
function createRow(columnData: string[], columnWidths: number[], padding: [number, number] = [1, 1]) {
  const leftPad = " ".repeat(padding[0]);
  const rightPad = " ".repeat(padding[1]);
  let row = "│";

  for (let i = 0; i < columnData.length; i++) {
    const data = columnData[i];
    const width = columnWidths[i] ?? 0;
    row += leftPad + data.padEnd(width, " ") + rightPad + "|";
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
 * @param padding A 2 index array that controls each columns padding. See createRow() for more detail.
 * @example
 * │ column 1 │ column 2 │ column 3   |...
 * │ column 1 │ column 2 │ column 3   |...
 * │ column 1 │ column 2 │ column 3   |...
 */
function createRows(data: TableData, columnWidths: number[], padding?: [number, number]) {
  let rows = "";
  for (const columnData of data) {
    const row = createRow(columnData, columnWidths, padding);
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
 * @param padding A 2 index array that controls each columns padding. See createRow() for more detail.
 * @example
 * createHeaders(ns, ["Header 1", "Header 2"], [8, 8]);
 * // will return
 * ┌──────────┬──────────┐
 * │ Header 1 │ Header 2 │
 * └──────────┴──────────┘
 */
function createHeaders(headers: string[], columnWidths: number[], padding?: [number, number]) {
  const row1 = createBorderCap(columnWidths, "top", padding);
  const row2 = createRow(headers, columnWidths, padding);
  const row3 = createBorderCap(columnWidths, "bot", padding);

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

/** Prints the result of createTable() to the scripts logs. */
export function printTable(ns: NS, rowsColumns: TableData, firstRowHeaders = true, padding?: [number, number]) {
  ns.print(createTable(rowsColumns, firstRowHeaders, padding));
}

/** Prints the result of createTable() to the terminal. */
export function tprintTable(ns: NS, rowsColumns: TableData, firstRowHeaders = true, padding?: [number, number]) {
  ns.tprint("\n" + createTable(rowsColumns, firstRowHeaders, padding));
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
