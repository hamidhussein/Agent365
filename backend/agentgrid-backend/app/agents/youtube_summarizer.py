import re
from typing import Dict, Any, List
from youtube_transcript_api import YouTubeTranscriptApi
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from app.agents.base import BaseAgent, AgentInput, AgentOutput
from app.agents.registry import register_agent

# Agent ID
YOUTUBE_AGENT_ID = "11111111-1111-1111-1111-111111111111"  # Placeholder UUID

@register_agent(YOUTUBE_AGENT_ID)
class YouTubeSummarizerAgent(BaseAgent):
    @property
    def name(self) -> str:
        return "YouTube Summarizer"

    @property
    def description(self) -> str:
        return "Summarizes YouTube videos from a URL."

    @property
    def inputs(self) -> List[AgentInput]:
        return [
            AgentInput(name="video_url", type="string", description="The YouTube video URL")
        ]

    @property
    def outputs(self) -> List[AgentOutput]:
        return [
            AgentOutput(name="response", type="string", description="The video summary"),
            AgentOutput(name="transcript_snippet", type="string", description="Snippet of transcript")
        ]

    def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        video_url = inputs.get("video_url")
        if not video_url:
            raise ValueError("video_url is required")

        # 1. Extract Video ID
        video_id = self._extract_video_id(video_url)
        if not video_id:
            raise ValueError("Invalid YouTube URL")

        # 2. Get Transcript
        try:
            # Check if get_transcript exists (it might be missing in some versions)
            if hasattr(YouTubeTranscriptApi, 'get_transcript'):
                transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            else:
                # Use list_transcripts (newer API)
                transcript_list_obj = YouTubeTranscriptApi.list_transcripts(video_id)
                
                # Try to find manual English, then auto English, then any
                try:
                    transcript_obj = transcript_list_obj.find_manually_created_transcript(['en'])
                except:
                    try:
                        transcript_obj = transcript_list_obj.find_generated_transcript(['en'])
                    except:
                        # Fallback to the first available transcript
                        transcript_obj = next(iter(transcript_list_obj))
                
                transcript_list = transcript_obj.fetch()

            full_text = " ".join([t['text'] for t in transcript_list])
            
            # Truncate if too long (simple safety, though 128k context helps)
            if len(full_text) > 20000:
                 full_text = full_text[:20000] + "...(truncated)"
                 
        except Exception as e:
            # Catch library specific errors if imported, else generic
            # Common errors: TranscriptsDisabled, NoTranscriptFound
            error_msg = str(e)
            
            if "Subtitles are disabled" in error_msg:
                raise ValueError("YouTube subtitles are disabled for this video. Please try a video that has closed captions.")
            if "NoTranscriptFound" in error_msg:
                raise ValueError("No suitable transcript found for this video.")
            if "VideoUnavailable" in error_msg:
                raise ValueError("The video is unavailable or private.")
            
            raise ValueError(f"Could not retrieve transcript: {error_msg}")

        # 3. Summarize with LLM
        summary = self._summarize_text(full_text)

        return {
            "response": summary,
            "transcript_snippet": full_text[:500] + "..."
        }

    def _extract_video_id(self, url: str) -> str:
        """
        Extracts the video ID from a YouTube URL.
        Supports:
        - https://www.youtube.com/watch?v=VIDEO_ID
        - https://youtu.be/VIDEO_ID
        - https://www.youtube.com/embed/VIDEO_ID
        """
        # Regex patterns for different YouTube URL formats
        patterns = [
            r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',
            r'(?:youtu\.be\/)([0-9A-Za-z_-]{11})',
            r'(?:embed\/)([0-9A-Za-z_-]{11})'
        ]

        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        
        return None

    def _summarize_text(self, text: str) -> str:
        llm = ChatOpenAI(model="gpt-4", temperature=0.5)
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert content summarizer. Your goal is to provide a comprehensive summary of the provided YouTube video transcript."),
            ("user", """
            Please summarize the following YouTube video transcript. 
            
            Structure your response as follows:
            # 📺 Video Summary
            ## 📝 TL;DR
            (A 2-3 sentence overview)
            
            ## 🔑 Key Takeaways
            (Bulleted list of the most important points)
            
            ## 🧠 Detailed Breakdown
            (A structured summary of the content)
            
            ---
            **Transcript:**
            {transcript}
            """)
        ])
        
        chain = prompt | llm
        response = chain.invoke({"transcript": text})
        
        return response.content
