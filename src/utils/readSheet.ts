import fetch from "node-fetch";
import { parse } from "csv-parse/sync";

interface SheetRow {
  [key: string]: string;
}

export async function readSheetCsv(): Promise<SheetRow[]> {
  const url = `https://docs.google.com/spreadsheets/d/1Enx_z8iiLedCwIznJsRNo_RrwbLz4NQhbJSvvcR95_E/export?format=csv&gid=762103111`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: HTTP status ${response.status}`);
    }

    const csvText = await response.text();

    const rows: SheetRow[] = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
    });

    return rows;
  } catch (error) {
    console.error("An error occurred while reading the sheet CSV:", error);
    return [];
  }
}