// @ts-ignore
import { Document, Packer, Paragraph, HeadingLevel, TextRun, Table, TableCell, TableRow } from 'docx';
// @ts-ignore
import jsPDF from 'jspdf';
// @ts-ignore
import html2canvas from 'html2canvas';
import { GrantProposalData, GrantInputData } from '../types/grantProposalDataSchema.js';

export class ExportService {
  static async exportToWord(data: GrantProposalData, inputData: GrantInputData): Promise<void> {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // Title
            new Paragraph({
              text: inputData.grantTitle || 'Grant Proposal',
              heading: HeadingLevel.TITLE,
            }),
            
            // Overall Summary
            new Paragraph({
              text: 'Executive Summary',
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              children: [new TextRun(data.overallSummary)],
            }),
            
            // RFP Snapshot
            new Paragraph({
              text: 'RFP Analysis',
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              children: [new TextRun(`Submission Deadline: ${data.rfpSnapshot.submissionDeadline}`)],
            }),
            new Paragraph({
              children: [new TextRun(`Clarification Deadline: ${data.rfpSnapshot.clarificationDeadline}`)],
            }),
            
            // Eligibility Rules
            new Paragraph({
              text: 'Eligibility Requirements',
              heading: HeadingLevel.HEADING_2,
            }),
            ...data.rfpSnapshot.eligibilityRules.map(rule => 
              new Paragraph({
                children: [new TextRun(`• ${rule}`)],
              })
            ),
            
            // Draft Sections
            new Paragraph({
              text: 'Proposal Sections',
              heading: HeadingLevel.HEADING_1,
            }),
            ...data.draftSections.flatMap(section => [
              new Paragraph({
                text: section.title,
                heading: HeadingLevel.HEADING_2,
              }),
              new Paragraph({
                children: [new TextRun(section.content)],
              }),
            ]),
            
            // KPIs
            new Paragraph({
              text: 'Key Performance Indicators',
              heading: HeadingLevel.HEADING_1,
            }),
            ...data.kpis.map(kpi => 
              new Paragraph({
                children: [new TextRun(`${kpi.metric}: ${kpi.value} (Source: ${kpi.source})`)],
              })
            ),
            
            // Compliance Checklist
            new Paragraph({
              text: 'Compliance Checklist',
              heading: HeadingLevel.HEADING_1,
            }),
            ...data.complianceChecklist.map(item => 
              new Paragraph({
                children: [new TextRun(`${item.status === 'ok' ? '✓' : item.status === 'needs-attention' ? '⚠️' : '○'} ${item.requirement}`)],
              })
            ),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${inputData.grantTitle || 'grant-proposal'}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static async exportToPDF(data: GrantProposalData, inputData: GrantInputData, elementId?: string): Promise<void> {
    if (elementId) {
      // Export specific element as PDF
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error(`Element with id ${elementId} not found`);
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${inputData.grantTitle || 'grant-proposal'}.pdf`);
    } else {
      // Generate PDF from data
      const pdf = new jsPDF();
      let yPosition = 20;
      
      // Title
      pdf.setFontSize(20);
      pdf.text(inputData.grantTitle || 'Grant Proposal', 20, yPosition);
      yPosition += 20;
      
      // Executive Summary
      pdf.setFontSize(16);
      pdf.text('Executive Summary', 20, yPosition);
      yPosition += 10;
      pdf.setFontSize(12);
      const summaryLines = pdf.splitTextToSize(data.overallSummary, 170);
      pdf.text(summaryLines, 20, yPosition);
      yPosition += summaryLines.length * 5 + 10;
      
      // Check if we need a new page
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }
      
      // RFP Analysis
      pdf.setFontSize(16);
      pdf.text('RFP Analysis', 20, yPosition);
      yPosition += 10;
      pdf.setFontSize(12);
      pdf.text(`Submission Deadline: ${data.rfpSnapshot.submissionDeadline}`, 20, yPosition);
      yPosition += 7;
      pdf.text(`Clarification Deadline: ${data.rfpSnapshot.clarificationDeadline}`, 20, yPosition);
      yPosition += 15;
      
      // Add more sections as needed...
      
      pdf.save(`${inputData.grantTitle || 'grant-proposal'}.pdf`);
    }
  }

  static exportToJSON(data: GrantProposalData, inputData: GrantInputData): void {
    const exportData = {
      timestamp: new Date().toISOString(),
      inputData,
      proposalData: data,
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${inputData.grantTitle || 'grant-proposal'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}