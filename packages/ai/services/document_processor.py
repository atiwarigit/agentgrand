import io
import pandas as pd
import PyPDF2
from typing import List, Dict, Any
import logging
import re

logger = logging.getLogger(__name__)

class DocumentProcessor:
    def __init__(self):
        self._ready = True
    
    def is_ready(self) -> bool:
        return self._ready
    
    async def process_pdf(self, content: bytes) -> str:
        """Extract text from PDF"""
        try:
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
            text = ""
            
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            
            return self._clean_text(text)
        except Exception as e:
            logger.error(f"Error processing PDF: {str(e)}")
            raise
    
    async def process_csv(self, content: bytes) -> str:
        """Extract text from CSV"""
        try:
            df = pd.read_csv(io.BytesIO(content))
            
            # Convert DataFrame to readable text format
            text = f"CSV Data Summary:\n"
            text += f"Columns: {', '.join(df.columns.tolist())}\n"
            text += f"Rows: {len(df)}\n\n"
            
            # Add column descriptions if available
            for col in df.columns:
                text += f"{col}:\n"
                
                # Show data types and sample values
                dtype = str(df[col].dtype)
                text += f"  Data type: {dtype}\n"
                
                if df[col].dtype == 'object':
                    unique_values = df[col].dropna().unique()[:10]
                    text += f"  Sample values: {', '.join(map(str, unique_values))}\n"
                else:
                    stats = df[col].describe()
                    text += f"  Range: {stats['min']} to {stats['max']}\n"
                    text += f"  Mean: {stats['mean']:.2f}\n"
                
                text += "\n"
            
            # Add first few rows as context
            text += "Sample data:\n"
            text += df.head(5).to_string(index=False)
            
            return text
        except Exception as e:
            logger.error(f"Error processing CSV: {str(e)}")
            raise
    
    async def process_xlsx(self, content: bytes) -> str:
        """Extract text from Excel file"""
        try:
            # Read all sheets
            excel_file = pd.ExcelFile(io.BytesIO(content))
            text = f"Excel File with {len(excel_file.sheet_names)} sheets:\n\n"
            
            for sheet_name in excel_file.sheet_names:
                df = pd.read_excel(excel_file, sheet_name=sheet_name)
                
                text += f"Sheet: {sheet_name}\n"
                text += f"Columns: {', '.join(df.columns.tolist())}\n"
                text += f"Rows: {len(df)}\n\n"
                
                # Add column descriptions
                for col in df.columns:
                    if df[col].dtype == 'object':
                        unique_values = df[col].dropna().unique()[:5]
                        text += f"  {col}: {', '.join(map(str, unique_values))}\n"
                    else:
                        try:
                            stats = df[col].describe()
                            text += f"  {col}: {stats['min']:.2f} to {stats['max']:.2f}\n"
                        except:
                            pass
                
                # Add sample data
                text += f"\nSample data from {sheet_name}:\n"
                text += df.head(3).to_string(index=False)
                text += "\n\n"
            
            return text
        except Exception as e:
            logger.error(f"Error processing Excel: {str(e)}")
            raise
    
    async def chunk_document(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[Dict[str, Any]]:
        """Split document into chunks with overlap"""
        try:
            # Clean and prepare text
            text = self._clean_text(text)
            
            # Split by paragraphs first
            paragraphs = re.split(r'\n\s*\n', text)
            
            chunks = []
            current_chunk = ""
            chunk_index = 0
            
            for paragraph in paragraphs:
                # If adding this paragraph would exceed chunk size
                if len(current_chunk) + len(paragraph) > chunk_size and current_chunk:
                    # Create chunk
                    chunks.append({
                        "content": current_chunk.strip(),
                        "metadata": {
                            "chunk_index": chunk_index,
                            "char_count": len(current_chunk),
                            "word_count": len(current_chunk.split())
                        }
                    })
                    
                    # Start new chunk with overlap
                    overlap_text = self._get_overlap_text(current_chunk, overlap)
                    current_chunk = overlap_text + "\n" + paragraph
                    chunk_index += 1
                else:
                    # Add paragraph to current chunk
                    if current_chunk:
                        current_chunk += "\n\n" + paragraph
                    else:
                        current_chunk = paragraph
            
            # Add final chunk if it has content
            if current_chunk.strip():
                chunks.append({
                    "content": current_chunk.strip(),
                    "metadata": {
                        "chunk_index": chunk_index,
                        "char_count": len(current_chunk),
                        "word_count": len(current_chunk.split())
                    }
                })
            
            return chunks
        except Exception as e:
            logger.error(f"Error chunking document: {str(e)}")
            raise
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove special characters but keep punctuation
        text = re.sub(r'[^\w\s\.\,\!\?\;\:\-\(\)\[\]\"\'\/]', '', text)
        
        # Fix common PDF extraction issues
        text = text.replace('\n', ' ')
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()
    
    def _get_overlap_text(self, text: str, max_chars: int) -> str:
        """Get overlap text from the end of current chunk"""
        if len(text) <= max_chars:
            return text
        
        # Try to break at sentence boundary
        sentences = re.split(r'[.!?]+', text)
        if len(sentences) > 1:
            # Start from the end and work backwards
            overlap = ""
            for sentence in reversed(sentences[:-1]):  # Exclude last (empty) split
                if len(overlap) + len(sentence) + 1 <= max_chars:
                    overlap = sentence + ". " + overlap
                else:
                    break
            if overlap:
                return overlap.strip()
        
        # Fallback to character limit
        return text[-max_chars:].strip()