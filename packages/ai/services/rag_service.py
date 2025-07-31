import openai
from typing import List, Dict, Any, Optional
import logging
from config.settings import Settings

logger = logging.getLogger(__name__)

class RAGService:
    def __init__(self):
        self.settings = Settings()
        self.client = openai.AsyncOpenAI(api_key=self.settings.openai_api_key)
        self.model = self.settings.openai_model
        self._ready = False
    
    async def initialize(self):
        """Initialize the RAG service"""
        try:
            # Simple initialization without API call
            if self.settings.openai_api_key:
                self._ready = True
                logger.info("RAG service initialized successfully")
            else:
                logger.warning("OpenAI API key not provided - service will not be ready")
                self._ready = False
        except Exception as e:
            logger.error(f"Failed to initialize RAG service: {str(e)}")
            self._ready = False
    
    def is_ready(self) -> bool:
        return self._ready
    
    async def generate_response(
        self, 
        query: str, 
        context_chunks: List[Dict[str, Any]],
        system_prompt: Optional[str] = None
    ) -> str:
        """Generate a response using RAG"""
        try:
            # Build context from chunks
            context = self._build_context(context_chunks)
            
            # Default system prompt for RAG
            if not system_prompt:
                system_prompt = """You are an expert grant writing assistant. Use the provided context from organizational documents 
                to answer questions accurately and helpfully. If the context doesn't contain enough information to fully answer 
                a question, say so and provide what information you can based on the available context.
                
                Always base your responses on the provided context and cite specific information when possible."""
            
            # Build user prompt with context
            user_prompt = f"""Context from organizational documents:
            {context}
            
            Question: {query}
            
            Please provide a helpful response based on the context above."""
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Error generating RAG response: {str(e)}")
            raise
    
    async def analyze_documents_for_grant(
        self, 
        context_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze documents to extract grant-relevant information"""
        try:
            context = self._build_context(context_chunks)
            
            analysis_prompt = """Analyze the provided organizational documents and extract key information relevant for grant writing:

            1. Organization Overview:
               - Mission and vision
               - Key programs and services
               - Target populations served
               - Geographic area served
               
            2. Organizational Capacity:
               - Staff size and expertise
               - Budget/financial information
               - Infrastructure and resources
               - Past accomplishments
               
            3. Community Need:
               - Problems or challenges addressed
               - Target population demographics
               - Evidence of need (statistics, data)
               - Gap in current services
               
            4. Potential Grant Focus Areas:
               - Specific programs that could be funded
               - New initiatives or expansions
               - Equipment or infrastructure needs
               - Capacity building opportunities
               
            Please provide a structured analysis in JSON format with the above categories."""
            
            user_prompt = f"""Context from organizational documents:
            {context}
            
            {analysis_prompt}"""
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a grant writing expert analyzing organizational documents. Return structured JSON analysis."},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=2000
            )
            
            try:
                import json
                return json.loads(response.choices[0].message.content.strip())
            except json.JSONDecodeError:
                # Return structured fallback if JSON parsing fails
                return {
                    "organizationOverview": {"analysis": response.choices[0].message.content},
                    "organizationalCapacity": {},
                    "communityNeed": {},
                    "potentialGrantFocus": {}
                }
                
        except Exception as e:
            logger.error(f"Error analyzing documents: {str(e)}")
            raise
    
    async def suggest_improvements(
        self, 
        section_content: str, 
        section_type: str,
        context_chunks: List[Dict[str, Any]]
    ) -> List[str]:
        """Suggest improvements for a grant proposal section"""
        try:
            context = self._build_context(context_chunks, max_chars=2000)
            
            improvement_prompt = f"""Review the following {section_type} section of a grant proposal and suggest specific improvements:

            SECTION CONTENT:
            {section_content}
            
            ORGANIZATIONAL CONTEXT:
            {context}
            
            Please provide 3-5 specific, actionable suggestions to strengthen this section. Focus on:
            - Clarity and persuasiveness
            - Use of data and evidence
            - Alignment with funder priorities
            - Completeness of information
            - Professional presentation
            
            Return suggestions as a JSON array of strings."""
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a senior grant writer providing expert feedback. Return suggestions as JSON array."},
                    {"role": "user", "content": improvement_prompt}
                ],
                temperature=0.4,
                max_tokens=800
            )
            
            try:
                import json
                return json.loads(response.choices[0].message.content.strip())
            except json.JSONDecodeError:
                # Return basic suggestions if JSON parsing fails
                return [
                    "Add more specific data and evidence to support claims",
                    "Strengthen the connection between need and proposed solution", 
                    "Include more details about evaluation and measurement",
                    "Enhance the description of organizational capacity",
                    "Improve clarity and flow of the narrative"
                ]
                
        except Exception as e:
            logger.error(f"Error suggesting improvements: {str(e)}")
            return ["Unable to generate suggestions at this time."]
    
    def _build_context(
        self, 
        chunks: List[Dict[str, Any]], 
        max_chars: int = 6000
    ) -> str:
        """Build context string from chunks"""
        if not chunks:
            return ""
        
        # Sort by similarity if available, otherwise use as provided
        sorted_chunks = sorted(
            chunks, 
            key=lambda x: x.get('similarity', 0), 
            reverse=True
        )
        
        context_parts = []
        current_length = 0
        
        for chunk in sorted_chunks:
            content = chunk.get('content', '')
            if current_length + len(content) > max_chars:
                break
            
            context_parts.append(content)
            current_length += len(content)
        
        return "\n\n".join(context_parts)