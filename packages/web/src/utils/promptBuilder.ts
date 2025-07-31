import { GrantInputData } from '../types/grantProposalDataSchema.js';
import { CustomPrompts } from '../components/PromptCustomization.js';

export function buildGrantProposalPrompt(input: GrantInputData, customPrompts?: CustomPrompts): string {
  const programContext = input.targetProgram ? 
    `\n\nTARGET PROGRAM FOCUS: ${input.targetProgram}
Please apply your knowledge of this specific program type to tailor your analysis and recommendations.` : '';

  const customInstructions = customPrompts?.customInstructions ? 
    `\n\nCUSTOM INSTRUCTIONS:
${customPrompts.customInstructions}` : '';

  return `You are an expert grant writer assistant for CityNet. Analyze the provided RFP document and generate a comprehensive grant proposal aid package.

GRANT TITLE: ${input.grantTitle}

RFP DOCUMENT CONTENT:
${input.rfpContent || 'RFP content could not be extracted. Please rely on the grant title and context provided.'}

CITYNET CONTEXT & ORGANIZATIONAL INFORMATION:
${input.citynetContext}${programContext}${customInstructions}

Please generate a JSON response with the following structure:

${customPrompts?.overallSummaryPrompt ? `
OVERALL SUMMARY INSTRUCTIONS: ${customPrompts.overallSummaryPrompt}
` : ''}
{
  "overallSummary": "${customPrompts?.overallSummaryPrompt || 'A concise 2-3 sentence summary of this grant opportunity and its alignment with CityNet\'s mission'}",
  
  "rfpSnapshot": {
    "submissionDeadline": "Extract the submission deadline",
    "clarificationDeadline": "Extract the deadline for questions/clarifications", 
    "eligibilityRules": ["List key eligibility requirements as bullet points"],
    "narrativePrompts": ["List the main narrative sections/prompts required"]
  },
  
${customPrompts?.draftSectionPrompt ? `
DRAFT SECTION INSTRUCTIONS: ${customPrompts.draftSectionPrompt}
` : ''}
  "draftSections": [
    {
      "id": "need-statement",
      "title": "Statement of Need",
      "content": "Draft a compelling statement of need based on the RFP requirements and CityNet context"
    },
    {
      "id": "project-description", 
      "title": "Project Description",
      "content": "Draft a project description that addresses the RFP requirements"
    },
    {
      "id": "goals-objectives",
      "title": "Goals and Objectives", 
      "content": "Draft clear, measurable goals and objectives"
    },
    {
      "id": "implementation-plan",
      "title": "Implementation Plan",
      "content": "Draft a logical implementation timeline and approach"
    },
    {
      "id": "evaluation-plan",
      "title": "Evaluation Plan",
      "content": "Draft an evaluation methodology with metrics and reporting"
    }
  ],
  
${customPrompts?.kpiPrompt ? `
KPI GENERATION INSTRUCTIONS: ${customPrompts.kpiPrompt}
` : ''}
  "kpis": [
    {
      "metric": "Specific measurable indicator relevant to this grant",
      "value": "Realistic value with units",
      "source": "Where this data would come from"
    }
  ],
  
${customPrompts?.compliancePrompt ? `
COMPLIANCE CHECKLIST INSTRUCTIONS: ${customPrompts.compliancePrompt}
` : ''}
  "complianceChecklist": [
    {
      "id": "page-limits",
      "requirement": "Adherence to page limits and formatting requirements",
      "status": "pending",
      "notes": ""
    },
    {
      "id": "required-attachments", 
      "requirement": "All required attachments and supporting documents",
      "status": "pending",
      "notes": ""
    },
    {
      "id": "submission-method",
      "requirement": "Proper submission method and timing",
      "status": "pending", 
      "notes": ""
    }
  ]
}

IMPORTANT: 
- Base all content on the actual RFP requirements and CityNet's provided context
- Make drafts substantive (3-4 paragraphs minimum per section)  
- Include specific, realistic KPIs that align with typical grant reporting
- Ensure compliance items reflect actual RFP requirements
- Use professional grant writing language and tone
- Return ONLY valid JSON, no additional text or formatting`;
}