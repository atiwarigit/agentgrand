import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'
import puppeteer from 'puppeteer'
import { Project } from '../types/project'

export class DocumentGenerator {
  async generateDOCX(project: Project): Promise<Buffer> {
    const grantData = project.grant_data || {}
    const sections = grantData.sections || {}

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title Page
          new Paragraph({
            text: project.name,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          
          new Paragraph({
            text: "",
            spacing: { after: 400 }
          }),

          new Paragraph({
            text: "Grant Proposal",
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),

          new Paragraph({
            text: new Date().toLocaleDateString(),
            alignment: AlignmentType.CENTER,
            spacing: { after: 800 }
          }),

          // Executive Summary
          ...(grantData.summary ? [
            new Paragraph({
              text: "Executive Summary",
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 }
            }),
            new Paragraph({
              text: grantData.summary,
              spacing: { after: 400 }
            })
          ] : []),

          // Statement of Need
          ...(sections.need ? [
            new Paragraph({
              text: "Statement of Need",
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 }
            }),
            ...this.createParagraphsFromText(sections.need)
          ] : []),

          // Project Plan
          ...(sections.projectPlan ? [
            new Paragraph({
              text: "Project Plan",
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 }
            }),
            ...this.createParagraphsFromText(sections.projectPlan)
          ] : []),

          // Budget Narrative
          ...(sections.budgetNarrative ? [
            new Paragraph({
              text: "Budget Narrative",
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 }
            }),
            ...this.createParagraphsFromText(sections.budgetNarrative)
          ] : []),

          // Expected Outcomes
          ...(sections.outcomes ? [
            new Paragraph({
              text: "Expected Outcomes",
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 }
            }),
            ...this.createParagraphsFromText(sections.outcomes)
          ] : []),

          // KPI Table (if available)
          ...(grantData.kpiSuggestions && grantData.kpiSuggestions.length > 0 ? [
            new Paragraph({
              text: "Key Performance Indicators",
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 }
            }),
            ...grantData.kpiSuggestions.map((kpi: any) => 
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${kpi.category}: `,
                    bold: true
                  }),
                  new TextRun({
                    text: `${kpi.metric} - Target: ${kpi.target} (${kpi.measurement})`
                  })
                ],
                spacing: { after: 100 }
              })
            )
          ] : []),

          // Deadlines (if available)
          ...(grantData.deadlines && grantData.deadlines.length > 0 ? [
            new Paragraph({
              text: "Project Timeline",
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 }
            }),
            ...grantData.deadlines.map((deadline: any) => 
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${deadline.date}: `,
                    bold: true
                  }),
                  new TextRun({
                    text: deadline.task
                  })
                ],
                spacing: { after: 100 }
              })
            )
          ] : [])
        ]
      }]
    })

    return await Packer.toBuffer(doc)
  }

  async generatePDF(project: Project): Promise<Buffer> {
    const grantData = project.grant_data || {}
    const sections = grantData.sections || {}

    // Create HTML content
    const htmlContent = this.createHTMLContent(project, grantData, sections)

    // Launch headless browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    try {
      const page = await browser.newPage()
      
      // Set content and wait for any async operations
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0' 
      })

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '1in',
          right: '1in',
          bottom: '1in',
          left: '1in'
        },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center; color: #666;">
            ${project.name}
          </div>
        `,
        footerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center; color: #666;">
            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        `
      })

      return Buffer.from(pdfBuffer)
    } finally {
      await browser.close()
    }
  }

  private createParagraphsFromText(text: string): Paragraph[] {
    return text.split('\n\n').map(paragraphText => 
      new Paragraph({
        text: paragraphText.trim(),
        spacing: { after: 200 }
      })
    )
  }

  private createHTMLContent(project: Project, grantData: any, sections: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${project.name}</title>
        <style>
          body {
            font-family: 'Times New Roman', serif;
            line-height: 1.6;
            color: #333;
            max-width: 8.5in;
            margin: 0 auto;
          }
          
          h1 {
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
            margin-top: 30px;
            margin-bottom: 20px;
          }
          
          h2 {
            color: #34495e;
            margin-top: 25px;
            margin-bottom: 15px;
          }
          
          p {
            margin-bottom: 15px;
            text-align: justify;
          }
          
          .title-page {
            text-align: center;
            margin-bottom: 50px;
          }
          
          .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          
          .subtitle {
            font-size: 18px;
            margin-bottom: 20px;
          }
          
          .date {
            font-size: 14px;
            color: #666;
          }
          
          .kpi-item {
            margin-bottom: 10px;
          }
          
          .kpi-category {
            font-weight: bold;
          }
          
          .deadline-item {
            margin-bottom: 8px;
          }
          
          .deadline-date {
            font-weight: bold;
          }
          
          .page-break {
            page-break-before: always;
          }
        </style>
      </head>
      <body>
        <div class="title-page">
          <div class="title">${project.name}</div>
          <div class="subtitle">Grant Proposal</div>
          <div class="date">${new Date().toLocaleDateString()}</div>
        </div>

        ${grantData.summary ? `
          <h1>Executive Summary</h1>
          <p>${grantData.summary.replace(/\n/g, '</p><p>')}</p>
        ` : ''}

        ${sections.need ? `
          <h1>Statement of Need</h1>
          <p>${sections.need.replace(/\n\n/g, '</p><p>')}</p>
        ` : ''}

        ${sections.projectPlan ? `
          <h1>Project Plan</h1>
          <p>${sections.projectPlan.replace(/\n\n/g, '</p><p>')}</p>
        ` : ''}

        ${sections.budgetNarrative ? `
          <h1>Budget Narrative</h1>
          <p>${sections.budgetNarrative.replace(/\n\n/g, '</p><p>')}</p>
        ` : ''}

        ${sections.outcomes ? `
          <h1>Expected Outcomes</h1>
          <p>${sections.outcomes.replace(/\n\n/g, '</p><p>')}</p>
        ` : ''}

        ${grantData.kpiSuggestions && grantData.kpiSuggestions.length > 0 ? `
          <h1>Key Performance Indicators</h1>
          ${grantData.kpiSuggestions.map((kpi: any) => `
            <div class="kpi-item">
              <span class="kpi-category">${kpi.category}:</span>
              ${kpi.metric} - Target: ${kpi.target} (${kpi.measurement})
            </div>
          `).join('')}
        ` : ''}

        ${grantData.deadlines && grantData.deadlines.length > 0 ? `
          <h1>Project Timeline</h1>
          ${grantData.deadlines.map((deadline: any) => `
            <div class="deadline-item">
              <span class="deadline-date">${deadline.date}:</span>
              ${deadline.task}
            </div>
          `).join('')}
        ` : ''}
      </body>
      </html>
    `
  }
}

export const documentGenerator = new DocumentGenerator()