import openai
from typing import List, Dict, Any
import logging
import json
from datetime import datetime, timedelta
from config.settings import Settings

logger = logging.getLogger(__name__)

class DraftGenerator:
    def __init__(self):
        self.settings = Settings()
        self.client = openai.AsyncOpenAI(api_key=self.settings.openai_api_key)
        self.model = self.settings.openai_model
        self._ready = bool(self.settings.openai_api_key)
    
    def is_ready(self) -> bool:
        return self._ready
    
    async def generate_initial_draft(
        self, 
        project_id: str, 
        chunks: List[Dict[str, Any]], 
        db_conn
    ) -> Dict[str, Any]:
        """Generate initial grant proposal draft"""
        try:
            # Combine relevant chunks into context
            context = self._build_context(chunks)
            
            # Generate each section
            sections = {}
            
            # Generate Need section
            sections["need"] = await self._generate_section(
                "need", 
                context, 
                "Generate a compelling 'Statement of Need' section that explains the problem this grant will address."
            )
            
            # Generate Project Plan section
            sections["projectPlan"] = await self._generate_section(
                "projectPlan", 
                context, 
                "Generate a detailed 'Project Plan' section outlining objectives, activities, timeline, and methodology."
            )
            
            # Generate Budget Narrative section
            sections["budgetNarrative"] = await self._generate_section(
                "budgetNarrative", 
                context, 
                "Generate a comprehensive 'Budget Narrative' section explaining how funds will be used."
            )
            
            # Generate Outcomes section
            sections["outcomes"] = await self._generate_section(
                "outcomes", 
                context, 
                "Generate an 'Expected Outcomes' section detailing measurable results and impact."
            )
            
            # Generate summary
            summary = await self._generate_summary(sections, context)
            
            # Generate deadlines and eligibility
            deadlines = self._generate_deadlines()
            eligibility = await self._generate_eligibility(context)
            
            # Generate KPI suggestions
            kpi_suggestions = await self._generate_kpi_suggestions(sections, context)
            
            return {
                "summary": summary,
                "deadlines": deadlines,
                "eligibility": eligibility,
                "sections": sections,
                "kpiSuggestions": kpi_suggestions,
                "generatedAt": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating initial draft: {str(e)}")
            raise
    
    async def regenerate_section(
        self, 
        section: str, 
        chunks: List[Dict[str, Any]], 
        custom_prompt: str = None,
        existing_data: Dict[str, Any] = {}
    ) -> str:
        """Regenerate a specific section"""
        try:
            context = self._build_context(chunks)
            
            # Build section-specific prompt
            section_prompts = {
                "need": "Generate a compelling 'Statement of Need' section that explains the problem this grant will address. Focus on data, evidence, and urgency.",
                "projectPlan": "Generate a detailed 'Project Plan' section outlining objectives, activities, timeline, and methodology. Be specific and actionable.",
                "budgetNarrative": "Generate a comprehensive 'Budget Narrative' section explaining how funds will be used. Include cost justifications.",
                "outcomes": "Generate an 'Expected Outcomes' section detailing measurable results and impact. Include specific metrics and evaluation methods."
            }
            
            base_prompt = section_prompts.get(section, f"Generate the {section} section of the grant proposal.")
            
            if custom_prompt:
                base_prompt += f"\n\nAdditional requirements: {custom_prompt}"
            
            # Add context about other sections for consistency
            if existing_data.get("sections"):
                other_sections = {k: v for k, v in existing_data["sections"].items() if k != section}
                if other_sections:
                    base_prompt += f"\n\nFor context, here are the other sections already written:\n{json.dumps(other_sections, indent=2)}"
            
            return await self._generate_section(section, context, base_prompt)
            
        except Exception as e:
            logger.error(f"Error regenerating section {section}: {str(e)}")
            raise
    
    async def _generate_section(self, section_type: str, context: str, prompt: str) -> str:
        """Generate a specific section using OpenAI"""
        try:
            system_prompt = f"""You are an expert grant writer with extensive experience in writing successful grant proposals. 
            You have access to the organization's documents and data to create a compelling and accurate proposal.
            
            Guidelines:
            - Write in a professional, persuasive tone
            - Use specific data and evidence from the provided context
            - Make the content compelling and fundable
            - Follow standard grant writing best practices
            - Keep sections focused and well-structured
            - Include specific metrics and measurable outcomes where appropriate
            - Target length: 500-1500 words depending on section
            """
            
            user_prompt = f"""Based on the following organizational context and documents, {prompt}
            
            Context and Documents:
            {context}
            
            Please generate a high-quality {section_type} section that would be suitable for a professional grant proposal."""
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Error generating section {section_type}: {str(e)}")
            raise
    
    async def _generate_summary(self, sections: Dict[str, str], context: str) -> str:
        """Generate executive summary"""
        try:
            combined_sections = "\n\n".join([f"{k.upper()}:\n{v}" for k, v in sections.items()])
            
            prompt = f"""Based on the following grant proposal sections and organizational context, 
            generate a compelling executive summary (200-300 words) that captures the essence of the proposal:
            
            SECTIONS:
            {combined_sections}
            
            CONTEXT:
            {context[:1000]}...  
            
            The summary should be compelling, concise, and highlight the key points that would interest funders."""
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert grant writer creating executive summaries."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=400
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Error generating summary: {str(e)}")
            return "Executive summary will be generated based on your proposal sections."
    
    async def _generate_eligibility(self, context: str) -> List[Dict[str, Any]]:
        """Generate eligibility requirements analysis"""
        try:
            prompt = f"""Based on the following organizational context, identify potential eligibility requirements 
            and assess the organization's status for each:
            
            {context[:1000]}...
            
            Return a JSON array of eligibility items with this format:
            [{{"requirement": "description", "status": "met|not_met|pending", "notes": "explanation"}}]
            
            Focus on common grant eligibility criteria like:
            - 501(c)(3) status
            - Years in operation
            - Geographic location
            - Target population served
            - Financial capacity
            - Experience in relevant areas
            """
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a grant compliance expert. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=800
            )
            
            try:
                return json.loads(response.choices[0].message.content.strip())
            except json.JSONDecodeError:
                return self._default_eligibility()
                
        except Exception as e:
            logger.error(f"Error generating eligibility: {str(e)}")
            return self._default_eligibility()
    
    async def _generate_kpi_suggestions(self, sections: Dict[str, str], context: str) -> List[Dict[str, str]]:
        """Generate KPI suggestions based on the proposal"""
        try:
            outcomes_section = sections.get("outcomes", "")
            project_plan = sections.get("projectPlan", "")
            
            prompt = f"""Based on the following project plan and outcomes section, suggest specific, measurable KPIs:
            
            PROJECT PLAN:
            {project_plan[:800]}
            
            OUTCOMES:
            {outcomes_section[:800]}
            
            Return a JSON array of KPI suggestions with this format:
            [{{"category": "category_name", "metric": "specific_metric", "target": "target_value", "measurement": "how_to_measure"}}]
            
            Focus on SMART goals that are Specific, Measurable, Achievable, Relevant, and Time-bound.
            """
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a program evaluation expert. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=1000
            )
            
            try:
                return json.loads(response.choices[0].message.content.strip())
            except json.JSONDecodeError:
                return self._default_kpis()
                
        except Exception as e:
            logger.error(f"Error generating KPIs: {str(e)}")
            return self._default_kpis()
    
    def _build_context(self, chunks: List[Dict[str, Any]], max_chars: int = 8000) -> str:
        """Build context from document chunks"""
        context = ""
        for chunk in chunks[:10]:  # Limit to first 10 chunks
            if len(context) + len(chunk["content"]) > max_chars:
                break
            context += chunk["content"] + "\n\n"
        return context.strip()
    
    def _generate_deadlines(self) -> List[Dict[str, Any]]:
        """Generate sample deadlines"""
        base_date = datetime.now()
        return [
            {
                "task": "Submit Letter of Intent",
                "date": (base_date + timedelta(days=30)).strftime("%Y-%m-%d"),
                "completed": False
            },
            {
                "task": "Gather Required Documents", 
                "date": (base_date + timedelta(days=45)).strftime("%Y-%m-%d"),
                "completed": False
            },
            {
                "task": "Complete Budget Worksheets",
                "date": (base_date + timedelta(days=60)).strftime("%Y-%m-%d"),
                "completed": False
            },
            {
                "task": "Submit Full Proposal",
                "date": (base_date + timedelta(days=90)).strftime("%Y-%m-%d"),
                "completed": False
            }
        ]
    
    def _default_eligibility(self) -> List[Dict[str, Any]]:
        """Default eligibility requirements"""
        return [
            {"requirement": "501(c)(3) nonprofit status", "status": "pending", "notes": "Please verify tax-exempt status"},
            {"requirement": "Minimum 3 years in operation", "status": "pending", "notes": "Please confirm organization age"},
            {"requirement": "Financial audit available", "status": "pending", "notes": "Recent audit may be required"},
            {"requirement": "Experience in relevant program area", "status": "pending", "notes": "Document relevant experience"}
        ]
    
    def _default_kpis(self) -> List[Dict[str, str]]:
        """Default KPI suggestions"""
        return [
            {"category": "Outreach", "metric": "Number of participants served", "target": "TBD", "measurement": "Program enrollment records"},
            {"category": "Outcomes", "metric": "Percentage achieving program goals", "target": "80%", "measurement": "Pre/post assessments"},
            {"category": "Efficiency", "metric": "Cost per participant", "target": "TBD", "measurement": "Budget divided by enrollment"},
            {"category": "Satisfaction", "metric": "Participant satisfaction rate", "target": "90%", "measurement": "Exit surveys"}
        ]