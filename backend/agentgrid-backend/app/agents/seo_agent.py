# ============================================================
# SEO AUDIT AGENT — FULLY AGENTGRID COMPLIANT (Option B)
# ============================================================

import requests
import re
import json
import base64
import time
import os
import hashlib
import pandas as pd
from typing import Dict, Any, List
from urllib.parse import urlparse, urljoin
from bs4 import BeautifulSoup
from dataclasses import dataclass, asdict

# AgentGrid imports
from app.agents.base import BaseAgent, AgentInput, AgentOutput
from app.agents.registry import register_agent

# LLM
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

# PDF generation
from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import letter


# ============================================================
# AGENT UUID (INSERT YOUR GENERATED UUID HERE)
# ============================================================
SEO_AGENT_ID = "787b599f-c8b9-42bf-affd-7fbd23a3add3"


# ============================================================
# PAGE DATA MODEL
# ============================================================
@dataclass
class PageResult:
    url: str
    status: int
    title: str
    desc: str
    h1_count: int
    word_count: int
    load_time_ms: float
    images_without_alt: int
    internal_links: int
    external_links: int
    broken_links: int
    seo_score: float


# ============================================================
# MAIN AGENT
# ============================================================
@register_agent(SEO_AGENT_ID)
class SEOAuditAgent(BaseAgent):

    # --------------------------
    # Agent Identity
    # --------------------------
    @property
    def name(self) -> str:
        return "SEO Audit Agent"

    @property
    def description(self) -> str:
        return "Crawls a website, performs SEO analysis, generates LLM summary and recommendations, outputs JSON + optional PDF report."

    # --------------------------
    # AGENT INPUT SCHEMA
    # --------------------------
    @property
    def inputs(self) -> List[AgentInput]:
        return [
            AgentInput(name="url", type="string", description="Website URL to audit"),
            AgentInput(name="max_pages", type="number", description="Maximum pages to crawl"),
            # AgentInput(name="openai_api_key", type="string", description="LLM API key"), # Removed: Using Env Var
            AgentInput(name="generate_pdf", type="boolean", description="Whether to return PDF report")
        ]

    # --------------------------
    # AGENT OUTPUT SCHEMA
    # --------------------------
    @property
    def outputs(self) -> List[AgentOutput]:
        return [
            AgentOutput(name="summary", type="object", description="Summary metrics"),
            AgentOutput(name="recommendations", type="object", description="SEO recommendations"),
            AgentOutput(name="pages", type="array", description="Full page-level SEO results"),
            AgentOutput(name="pdf_base64", type="string", description="Optional PDF report")
        ]


    # ============================================================
    # MAIN EXECUTION ENTRY POINT
    # ============================================================
    def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:

        url = inputs["url"]
        max_pages = int(inputs.get("max_pages", 20))
        # Use Server-Side Env Var
        openai_api_key = os.getenv("OPENAI_API_KEY") 
        if not openai_api_key:
            raise ValueError("Server-side OPENAI_API_KEY is not configured.")
            
        generate_pdf = inputs.get("generate_pdf", False)

        results = self.crawl_website(url, max_pages)
        df = pd.DataFrame([asdict(r) for r in results])

        summary = self.generate_summary(df)
        llm_summary = self.llm_summary(summary, openai_api_key)
        recommendations = self.llm_recommendations(summary, openai_api_key)

        pdf_base64 = ""
        if generate_pdf:
            pdf_base64 = self.generate_pdf_report(url, summary, llm_summary, recommendations)

        return {
            "summary": summary,
            "recommendations": recommendations,
            "pages": [asdict(r) for r in results],
            "pdf_base64": pdf_base64
        }


    # ============================================================
    # STEP 1 — CRAWLER
    # ============================================================
    def crawl_website(self, start_url: str, max_pages: int) -> List[PageResult]:

        visited = set()
        queue = [start_url]
        domain = urlparse(start_url).netloc
        session = requests.Session()

        results = []

        def normalize(base, link):
            return urljoin(base, link).split("#")[0]

        while queue and len(visited) < max_pages:
            url = queue.pop(0)
            if url in visited:
                continue
            visited.add(url)

            try:
                start = time.time()
                r = session.get(url, timeout=10)
                load_ms = round((time.time() - start) * 1000, 2)
            except:
                continue

            soup = BeautifulSoup(r.text, "lxml")

            title = soup.title.get_text(strip=True) if soup.title else ""
            desc = ""
            md = soup.find("meta", {"name": "description"})
            if md:
                desc = md.get("content", "")

            text = soup.get_text(" ", strip=True)
            words = len(text.split())

            h1_count = len(soup.find_all("h1"))
            imgs = soup.find_all("img")
            images_without_alt = sum(1 for i in imgs if not i.get("alt"))

            internal_links = 0
            external_links = 0
            broken_links = 0

            for a in soup.find_all("a", href=True):
                link = normalize(url, a["href"])
                if link.startswith("http"):
                    if urlparse(link).netloc == domain:
                        internal_links += 1
                        queue.append(link)
                    else:
                        external_links += 1

            # compute rough SEO score
            score = 100
            if not title:
                score -= 10
            if not desc:
                score -= 5
            if h1_count == 0:
                score -= 10
            if words < 200:
                score -= 5
            if images_without_alt > 0:
                score -= 5
            if load_ms > 3000:
                score -= 10

            results.append(PageResult(
                url=url,
                status=r.status_code,
                title=title,
                desc=desc,
                h1_count=h1_count,
                word_count=words,
                load_time_ms=load_ms,
                images_without_alt=images_without_alt,
                internal_links=internal_links,
                external_links=external_links,
                broken_links=broken_links,
                seo_score=max(score, 0)
            ))

        return results


    # ============================================================
    # STEP 2 — SUMMARY METRICS
    # ============================================================
    def generate_summary(self, df: pd.DataFrame) -> Dict[str, Any]:

        return {
            "total_pages": len(df),
            "avg_seo_score": float(df["seo_score"].mean()),
            "avg_word_count": float(df["word_count"].mean()),
            "avg_load_time_ms": float(df["load_time_ms"].mean()),
            "missing_titles": int((df["title"] == "").sum()),
            "missing_meta_desc": int((df["desc"] == "").sum()),
            "missing_h1": int((df["h1_count"] == 0).sum()),
            "images_without_alt_total": int(df["images_without_alt"].sum()),
        }


    # ============================================================
    # STEP 3 — LLM SUMMARY
    # ============================================================
    def llm_summary(self, summary: Dict[str, Any], api_key: str) -> str:

        llm = ChatOpenAI(model="gpt-4o-mini", api_key=api_key)
        prompt = ChatPromptTemplate.from_template("""
You are an SEO expert. Given this summary:

{summary}

Write a clear, concise executive summary of the site's SEO health.
""")

        response = llm.invoke(prompt.format(summary=json.dumps(summary)))
        return response.content


    # ============================================================
    # STEP 4 — LLM RECOMMENDATIONS
    # ============================================================
    def llm_recommendations(self, summary: Dict[str, Any], api_key: str) -> List[Dict[str, Any]]:

        llm = ChatOpenAI(model="gpt-4o-mini", api_key=api_key)

        prompt = ChatPromptTemplate.from_template("""
You are an SEO strategist. Based on this summary:

{summary}

Return a JSON array of 10 actionable SEO recommendations.
Each item MUST include:
- priority (High/Medium/Low)
- issue
- recommendation
- expected_impact
Only return JSON.
""")

        response = llm.invoke(prompt.format(summary=json.dumps(summary)))
        try:
            return json.loads(response.content)
        except:
            return []


    # ============================================================
    # STEP 5 — GENERATE PDF (Base64)
    # ============================================================
    def generate_pdf_report(self, url: str, summary: Dict[str, Any], exec_summary: str, recommendations: List[Dict[str, Any]]) -> str:

        filename = "seo_report.pdf"
        styles = getSampleStyleSheet()
        story = []

        story.append(Paragraph(f"<b>SEO Audit Report</b>", styles["Title"]))
        story.append(Paragraph(f"Website: {url}<br/><br/>", styles["Heading2"]))

        story.append(Paragraph("<b>Executive Summary</b>", styles["Heading2"]))
        story.append(Paragraph(exec_summary, styles["BodyText"]))

        story.append(Paragraph("<b>Key Metrics</b>", styles["Heading2"]))
        story.append(Paragraph(json.dumps(summary, indent=2), styles["Code"]))

        story.append(Paragraph("<b>Recommendations</b>", styles["Heading2"]))
        story.append(Paragraph(json.dumps(recommendations, indent=2), styles["Code"]))

        pdf = SimpleDocTemplate(filename, pagesize=letter)
        pdf.build(story)

        with open(filename, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("utf-8")

        return encoded
