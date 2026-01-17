import re
import time
import uuid
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from app.agents.base import AgentInput, AgentOutput, BaseAgent
from app.agents.registry import register_agent


SEO_AUDITOR_PRO_ID = "3f3b0d3f-3af8-4e4a-9d0e-62be5285bd39"


@dataclass
class ParsedPage:
    url: str
    status: Optional[int] = None
    title: str = ""
    meta_description: str = ""
    meta_description_length: int = 0
    h1_count: int = 0
    word_count: int = 0
    internal_links: int = 0
    external_links: int = 0
    images_without_alt: int = 0
    canonical: Optional[str] = None
    canonical_issues: Optional[str] = None
    response_ms: Optional[float] = None


def _same_domain(base: str, candidate: str) -> bool:
    base_host = urlparse(base).netloc
    candidate_host = urlparse(candidate).netloc
    return base_host == candidate_host


def _normalize_url(base: str, link: str) -> Optional[str]:
    if not link:
        return None
    link = link.strip()
    if link.startswith("#") or link.lower().startswith("javascript:"):
        return None
    abs_url = urljoin(base, link)
    parsed = urlparse(abs_url)
    if not parsed.scheme.startswith("http"):
        return None
    return abs_url.rstrip("/")


def _score_page(page: ParsedPage) -> float:
    score = 100.0
    if not page.title:
        score -= 10
    if not page.meta_description:
        score -= 8
    elif page.meta_description_length < 50 or page.meta_description_length > 180:
        score -= 3
    if page.h1_count == 0:
        score -= 6
    elif page.h1_count > 2:
        score -= 2
    if page.images_without_alt > 3:
        score -= 5
    if page.word_count < 150:
        score -= 5
    elif page.word_count < 300:
        score -= 2
    if page.response_ms and page.response_ms > 2000:
        score -= 8
    if page.canonical_issues:
        score -= 4
    return max(0.0, min(score, 100.0))


def _fetch(session: requests.Session, url: str, timeout: int) -> Optional[requests.Response]:
    try:
        return session.get(url, timeout=timeout, allow_redirects=True)
    except Exception:
        return None


def _parse_with_bs(html: str, base_url: str) -> tuple[ParsedPage, List[str]]:
    soup = BeautifulSoup(html, "html.parser")

    title_el = soup.find("title")
    title = title_el.get_text(strip=True) if title_el else ""

    meta_desc_el = soup.find("meta", attrs={"name": re.compile("^description$", re.I)})
    meta_description = meta_desc_el["content"].strip() if meta_desc_el and meta_desc_el.get("content") else ""

    h1_count = len(soup.find_all("h1"))

    text_content = soup.get_text(" ", strip=True)
    word_count = len(re.findall(r"[A-Za-z0-9'-]+", text_content))

    canonical = None
    canonical_issues = None
    link_rel = soup.find("link", rel=lambda x: x and "canonical" in (x if isinstance(x, list) else [x]))
    if link_rel and link_rel.get("href"):
        canonical = link_rel["href"].strip()
        if not canonical.startswith("http"):
            canonical_issues = "Canonical is relative."
    else:
        canonical_issues = "Canonical tag missing."

    internal_links = 0
    external_links = 0
    images_without_alt = 0
    normalized_links: List[str] = []

    for img in soup.find_all("img"):
        if not img.get("alt"):
            images_without_alt += 1

    for a in soup.find_all("a", href=True):
        normalized = _normalize_url(base_url, a["href"])
        if not normalized:
            continue
        normalized_links.append(normalized)
        if _same_domain(base_url, normalized):
            internal_links += 1
        else:
            external_links += 1

    page = ParsedPage(
        url=base_url,
        title=title,
        meta_description=meta_description,
        meta_description_length=len(meta_description),
        h1_count=h1_count,
        word_count=word_count,
        internal_links=internal_links,
        external_links=external_links,
        images_without_alt=images_without_alt,
        canonical=canonical,
        canonical_issues=canonical_issues,
    )
    return page, normalized_links


@register_agent(SEO_AUDITOR_PRO_ID)
class SEOAuditorPro(BaseAgent):
    @property
    def name(self) -> str:
        return "SEO Auditor Pro"

    @property
    def description(self) -> str:
        return "Lightweight crawler that audits on-page SEO, link health, and performance hints."

    @property
    def inputs(self) -> List[AgentInput]:
        return [
            AgentInput(
                name="url",
                type="string",
                description="Starting URL to audit (include https://)",
                required=True,
                placeholder="https://example.com",
            ),
            AgentInput(
                name="max_pages",
                type="number",
                description="Maximum pages to crawl (default 12)",
                required=False,
            ),
        ]

    @property
    def outputs(self) -> List[AgentOutput]:
        return [
            AgentOutput(name="summary", type="string", description="High-level summary"),
            AgentOutput(name="score", type="number", description="Overall SEO score (0-100)"),
            AgentOutput(name="quick_wins", type="string", description="List of quick fixes"),
            AgentOutput(name="issues", type="string", description="List of detailed issues"),
            AgentOutput(name="pages", type="string", description="Per-page findings"),
        ]

    @property
    def price_per_run(self) -> float:
        return 6.0

    def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        start_url = str(inputs.get("url", "")).strip()
        if not start_url:
            raise ValueError("URL is required.")
        if not start_url.startswith("http"):
            start_url = "https://" + start_url
        max_pages = int(inputs.get("max_pages") or 12)
        max_pages = max(1, min(max_pages, 30))

        session = requests.Session()
        session.headers.update(
            {
                "User-Agent": "Mozilla/5.0 (compatible; AgentGrid-SEO-Auditor/1.0)",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            }
        )

        queue: List[str] = [start_url.rstrip("/")]
        seen: set[str] = set()
        pages: List[ParsedPage] = []

        while queue and len(pages) < max_pages:
            current = queue.pop(0)
            if current in seen:
                continue
            seen.add(current)

            t0 = time.time()
            resp = _fetch(session, current, timeout=10)
            elapsed = (time.time() - t0) * 1000
            if not resp or not resp.ok or "text/html" not in (resp.headers.get("Content-Type") or ""):
                continue

            try:
                page, found_links = _parse_with_bs(resp.text[:500_000], current)
            except Exception:
                continue

            page.status = resp.status_code
            page.response_ms = elapsed
            pages.append(page)

            for link in found_links:
                if _same_domain(start_url, link) and link not in seen:
                    queue.append(link)

        quick_wins: List[str] = []
        issues: List[str] = []

        for p in pages:
            if not p.title:
                quick_wins.append(f"{p.url} is missing a <title> tag.")
            if not p.meta_description:
                quick_wins.append(f"{p.url} is missing a meta description.")
            elif p.meta_description_length < 50 or p.meta_description_length > 180:
                issues.append(f"{p.url} meta description length is {p.meta_description_length} (ideal 50-180).")
            if p.h1_count == 0:
                issues.append(f"{p.url} has no H1 heading.")
            if p.word_count < 150:
                issues.append(f"{p.url} has thin content ({p.word_count} words).")
            if p.images_without_alt > 0:
                issues.append(f"{p.url} has {p.images_without_alt} images without alt text.")
            if p.response_ms and p.response_ms > 2000:
                issues.append(f"{p.url} is slow to respond ({int(p.response_ms)} ms).")
            if p.canonical_issues:
                issues.append(f"{p.url} canonical issue: {p.canonical_issues}")

        overall_score = round(
            sum(_score_page(p) for p in pages) / len(pages), 2
        ) if pages else 0.0

        summary = (
            f"Crawled {len(pages)} pages on {urlparse(start_url).netloc}. "
            f"Average on-page score: {overall_score}/100. "
            f"Top issues: {len(issues)} findings. Quick wins: {len(quick_wins)}."
        )

        pages_payload = [asdict(p) | {"score": _score_page(p)} for p in pages]

        return {
            "summary": summary,
            "score": overall_score,
            "quick_wins": quick_wins,
            "issues": issues,
            "pages": pages_payload,
        }
