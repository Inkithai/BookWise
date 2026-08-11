import { jsPDF } from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import { format } from 'date-fns';
import { formatCurrency } from './utils';
import { Invoice } from './types';
import { COMPANY, companyContactLine, companyLegalLine } from '@/lib/company';

export const generatePdf = async (invoice: Invoice, asBuffer = false): Promise<ArrayBuffer | void> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const tableWidth = pageWidth * 0.8;
  const tableMargin = (pageWidth - tableWidth) / 2;

  // Add black banner (80% width, centered)
  doc.setFillColor(0, 0, 0);
  doc.rect((pageWidth * 0.1), 10, (pageWidth * 0.8), 20, 'F');
  
  // Add centered logo on the banner
  try {
    const logoUrl = '/logo.png';
    const logoResponse = await fetch(logoUrl);
    const logoBlob = await logoResponse.blob();
    const logoDataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(logoBlob);
    });
    
    const logoWidth = 30;
    const logoX = (pageWidth - logoWidth) / 2;
    doc.addImage(logoDataUrl, 'PNG', logoX, 13, logoWidth, 15);
  } catch (error) {
    console.error('Error loading logo:', error);
  }

  // Add property info (more compact)
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`PROPERTY LEDGER - ${format(invoice.date, 'MMMM yyyy')}`, pageWidth / 2, 38, { align: 'center' });
  doc.setFontSize(11);
  doc.text(invoice.propertyName, pageWidth / 2, 43, { align: 'center' });

  // Define proper type for table rows
  type TableCell = string | { content: string; styles?: Record<string, unknown> };
  type TableRow = TableCell[];

  // Prepare table data with proper typing
  const tableData: RowInput[] = [
    // Header row - using dark gray background with white text
    [
      { 
        content: 'DESCRIPTION', 
        styles: { 
          fillColor: [64, 64, 64], 
          textColor: 255, 
          fontStyle: 'bold',
          fontSize: 11,
          cellPadding: { top: 4, right: 6, bottom: 4, left: 6 }
        } 
      }, 
      { 
        content: 'AMOUNT', 
        styles: { 
          fillColor: [64, 64, 64], 
          textColor: 255, 
          fontStyle: 'bold', 
          halign: 'right',
          fontSize: 11,
          cellPadding: { top: 4, right: 6, bottom: 4, left: 6 }
        } 
      }
    ],
    // Items rows with alternating background
    ...invoice.items.map<TableRow>((item, index) => [
      { 
        content: item.name || item.type || '',
        styles: { 
          fillColor: index % 2 === 0 ? [248, 248, 248] : [255, 255, 255],
          cellPadding: { top: 3, right: 6, bottom: 3, left: 6 }
        }
      },
      { 
        content: formatCurrency(item.amount), 
        styles: { 
          halign: 'right',
          fillColor: index % 2 === 0 ? [248, 248, 248] : [255, 255, 255],
          cellPadding: { top: 3, right: 6, bottom: 3, left: 6 }
        } 
      }
    ]),
    // Separator row with light gray background
    [
      { content: '', styles: { fillColor: [224, 224, 224], minCellHeight: 3 } },
      { content: '', styles: { fillColor: [224, 224, 224], minCellHeight: 3 } }
    ],
    // Totals rows with enhanced styling
    [
      { 
        content: 'TOTAL EXPENSE:', 
        styles: { 
          fontStyle: 'bold', 
          fontSize: 11,
          fillColor: [240, 240, 240],
          cellPadding: { top: 4, right: 6, bottom: 4, left: 6 }
        } 
      },
      { 
        content: formatCurrency(invoice.totalExpense), 
        styles: { 
          halign: 'right', 
          textColor: [200, 0, 0],
          fontStyle: 'bold',
          fontSize: 11,
          fillColor: [240, 240, 240],
          cellPadding: { top: 4, right: 6, bottom: 4, left: 6 }
        } 
      }
    ],
    [
      { 
        content: 'TOTAL INCOME:', 
        styles: { 
          fontStyle: 'bold', 
          fontSize: 11,
          fillColor: [240, 240, 240],
          cellPadding: { top: 4, right: 6, bottom: 4, left: 6 }
        } 
      },
      { 
        content: formatCurrency(invoice.totalIncome), 
        styles: { 
          halign: 'right', 
          textColor: [0, 150, 0],
          fontStyle: 'bold',
          fontSize: 11,
          fillColor: [240, 240, 240],
          cellPadding: { top: 4, right: 6, bottom: 4, left: 6 }
        } 
      }
    ],
    [
      { 
        content: 'NET PROFIT:', 
        styles: { 
          fontStyle: 'bold', 
          fontSize: 13,
          fillColor: [32, 32, 32],
          textColor: 255,
          cellPadding: { top: 5, right: 6, bottom: 5, left: 6 }
        } 
      },
      { 
        content: formatCurrency(invoice.profit), 
        styles: { 
          halign: 'right', 
          fontStyle: 'bold', 
          fontSize: 13,
          fillColor: [32, 32, 32],
          textColor: invoice.profit >= 0 ? [100, 255, 100] : [255, 100, 100],
          cellPadding: { top: 5, right: 6, bottom: 5, left: 6 }
        } 
      }
    ]
  ];

  // Calculate space needed for footer
  const footerHeight = 20;
  const tableStartY = 48;

  autoTable(doc, {
    startY: tableStartY,
    body: tableData,
    columnStyles: {
      0: { 
        cellWidth: tableWidth * 0.65
      },
      1: { 
        cellWidth: tableWidth * 0.35,
        halign: 'right' 
      }
    },
    margin: { 
      left: tableMargin,
      right: tableMargin,
      top: tableStartY,
      bottom: footerHeight
    },
    styles: {
      fontSize: 10,
      lineColor: [200, 200, 200],
      lineWidth: 0.3,
      minCellHeight: 8,
      textColor: [32, 32, 32],
      font: 'helvetica'
    },
    tableWidth: tableWidth,
    theme: 'plain',
    didDrawCell: (data) => {
      // Add subtle shadow effect to the final profit row
      if (data.row.index === invoice.items.length + 3) {
        doc.setDrawColor(128, 128, 128);
        doc.setLineWidth(0.5);
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'S');
      }
      // Remove border from separator row
      if (data.row.index === invoice.items.length + 1) {
        doc.setDrawColor(224, 224, 224);
        doc.setLineWidth(0.1);
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'S');
      }
    }
  });

  // Add footer at the bottom
  const footerY = pageHeight - footerHeight;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128); // Gray text for footer
  doc.text('- THANK YOU FOR YOUR BUSINESS -', pageWidth / 2, footerY + 5, { align: 'center' });
  
  doc.setFontSize(6);
  doc.text(companyLegalLine(), 
    pageWidth / 2, footerY + 10, { align: 'center' });
  doc.text(COMPANY.address, 
    pageWidth / 2, footerY + 13, { align: 'center' });
  doc.text(companyContactLine(), 
    pageWidth / 2, footerY + 16, { align: 'center' });

  if (asBuffer) {
    return doc.output('arraybuffer');
  }
  
  doc.save(`property-ledger-${invoice.propertyName}-${format(invoice.date, 'yyyy-MM')}.pdf`);
};