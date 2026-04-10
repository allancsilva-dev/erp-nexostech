import PDFDocument from 'pdfkit';

const MARGIN = 40;
const PAGE_BREAK_Y = 750;

export function formatCurrency(value: string): string {
  const num = Number(value);
  if (Number.isNaN(num)) return value;

  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function csvEscape(value: string | null | undefined): string {
  const v = String(value ?? '');
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return `"${v.replace(/"/g, '""')}"`;
  }

  return v;
}

export function buildSimplePdf(
  title: string,
  lines: string[],
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('Helvetica');

    for (const line of lines) {
      if (doc.y > PAGE_BREAK_Y) {
        doc.addPage();
      }

      doc.text(line);
    }

    doc.end();
  });
}

export function formatTableRow(
  cols: Array<{ value: string; width: number }>,
): string {
  return cols
    .map(({ value, width }) => value.substring(0, width).padEnd(width))
    .join(' ');
}
