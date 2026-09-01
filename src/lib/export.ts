export interface CSVColumn {
  header: string;
  key: string;
}

export function exportToCSV(filename: string, columns: CSVColumn[], data: any[]): boolean {
  if (!data || data.length === 0) {
    return false;
  }

  const headers = columns.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(",");
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const val = row[col.key] !== undefined && row[col.key] !== null ? String(row[col.key]) : "";
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  const csvContent = [headers, ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}

export function printReport(
  instituteName: string,
  reportTitle: string,
  filterSummary: string,
  headers: string[],
  rows: (string | number)[][]
): boolean {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    return false;
  }

  const generatedDate = new Date().toLocaleString();

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${reportTitle} - ${instituteName}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #0f172a; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: 800; margin: 0; }
          .subtitle { font-size: 14px; color: #475569; margin-top: 5px; }
          .meta { font-size: 12px; color: #64748b; margin-top: 10px; font-family: monospace; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          th { background: #f8fafc; border-bottom: 2px solid #cbd5e1; text-align: left; padding: 10px; font-weight: 700; text-transform: uppercase; }
          td { border-bottom: 1px solid #e2e8f0; padding: 10px; }
          tr:nth-child(even) { background: #f8fafc; }
          .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; pt: 10px; font-size: 11px; color: #94a3b8; text-align: center; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">${instituteName}</h1>
          <p class="subtitle">${reportTitle}</p>
          <div class="meta">
            <span>Filter: <strong>${filterSummary || "All Data"}</strong></span> • 
            <span>Generated: <strong>${generatedDate}</strong></span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              ${headers.map((h) => `<th>${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${
              rows.length > 0
                ? rows
                    .map(
                      (r) => `
              <tr>
                ${r.map((cell) => `<td>${cell !== null && cell !== undefined ? cell : "—"}</td>`).join("")}
              </tr>
            `
                    )
                    .join("")
                : `<tr><td colspan="${headers.length}" style="text-align: center; color: #94a3b8;">No records available</td></tr>`
            }
          </tbody>
        </table>

        <div class="footer">
          Official System Generated Report • ${instituteName} CRM
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  return true;
}
