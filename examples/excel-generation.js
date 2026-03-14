// Step 5: Excel Generation (SheetJS — preferred for large datasets)
// Builds the Excel file directly in the browser, bypassing the
// browser-to-VM data transfer bottleneck (~5KB javascript_tool limit).

// --- Load SheetJS ---
const script = document.createElement('script');
script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
document.head.appendChild(script);
// Wait for it to load, then:

const data = JSON.parse(localStorage.getItem('scraped_enriched'));
const headers = ['No.', 'Company', 'Phone', 'Fax', 'Address', 'Website', 'Products'];
const rows = data.map((c, i) => [i+1, c.name, c.phone, c.fax, c.address, c.website, c.products]);
const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
ws['!cols'] = headers.map((_, i) => ({ wch: [6,30,18,18,40,30,50][i] }));
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Companies');
XLSX.writeFile(wb, 'Directory_Data.xlsx');


// --- Raw JSON backup (safety net for regenerating the spreadsheet later) ---

const blob = new Blob([localStorage.getItem('scraped_enriched')], {type: 'application/json'});
const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
a.download = 'Directory_Data_Backup.json'; a.click();


// --- Alternative: get_page_text bridge (for medium datasets, 50-200 records) ---
// Write scraped data to document.body as plain text for transfer to the VM.
// NOTE: This uses document.body to render OUR OWN scraped data as a transfer
// mechanism, not to display untrusted user content. The data originates from
// localStorage and is pipe-delimited text, not executable HTML.
//
// const data = JSON.parse(localStorage.getItem('scraped_enriched'));
// const lines = data.map(c =>
//   [c.category, c.name, c.phone, c.address, c.website, c.email, c.products].join('|')
// );
// const pre = document.createElement('pre');
// pre.textContent = '===DATA_START===\n' + lines.join('\n') + '\n===DATA_END===';
// document.body.replaceChildren(pre);
// Then call get_page_text to read the full text, save to a file on the VM with Write,
// and use openpyxl to build a formatted spreadsheet.


// --- Alternative: Direct return (for very small datasets, <50 records) ---
// Transfer data directly via javascript_tool return value if it fits within ~5KB.
