"""
Source Adapters for SIGNAL Ingestion Engine.
Isolated adapters for RemoteOK, Jobicy, and Remotive with unified interface:
- fetch(client)
- normalize(raw_item)
- validate(normalized_item)
- name & health status
"""
from __future__ import annotations

import abc
import re
from typing import Any

import httpx

INDIA_KEYWORDS = {
    "india", "bengaluru", "bangalore", "mumbai", "delhi", "ncr", "hyderabad",
    "pune", "chennai", "gurugram", "gurgaon", "noida", "kolkata", "ahmedabad",
    "jaipur", "kochi", "trivandrum", "thiruvananthapuram", "indore", "coimbatore",
    "surat", "vadodara", "nagpur", "jamnagar", "lucknow", "chandigarh",
    "bhubaneswar", "visakhapatnam", "vizag", "mysore", "mysuru", "karnataka",
    "maharashtra", "tamil", "nadu", "telangana", "kerala", "gujarat"
}

SKILL_PATTERNS = [
    # Languages
    (r"\b(c\+\+|cpp)\b", "C++"),
    (r"\b(c#|csharp|\.net|dotnet)\b", "C#"),
    (r"\bJava(?!Script)\b", "Java"),
    (r"\bpython\b", "Python"),
    (r"\b(javascript|js)\b", "JavaScript"),
    (r"\b(typescript|ts)\b", "TypeScript"),
    (r"\b(golang)\b", "Go"),
    (r"\brust\b", "Rust"),
    (r"\bruby\b", "Ruby"),
    (r"\bphp\b", "PHP"),
    (r"\bscala\b", "Scala"),
    (r"\bkotlin\b", "Kotlin"),
    (r"\bswift\b", "Swift"),
    (r"\bsql\b", "SQL"),
    (r"\bhtml\b", "HTML"),
    (r"\bcss\b", "CSS"),

    # Frontend
    (r"\b(react|reactjs|react\.js)\b", "React"),
    (r"\b(angular|angularjs)\b", "Angular"),
    (r"\b(vue|vuejs|vue\.js)\b", "Vue.js"),
    (r"\b(next\.js|nextjs)\b", "Next.js"),
    (r"\b(tailwind|tailwindcss)\b", "Tailwind CSS"),
    (r"\bbootstrap\b", "Bootstrap"),
    (r"\bredux\b", "Redux"),

    # Backend
    (r"\b(node|nodejs|node\.js)\b", "Node.js"),
    (r"\b(express\.js|expressjs)\b", "Express.js"),
    (r"\bfastapi\b", "FastAPI"),
    (r"\bdjango\b", "Django"),
    (r"\bflask\b", "Flask"),
    (r"\b(spring boot|spring framework)\b", "Spring Boot"),
    (r"\b(rails|ruby on rails)\b", "Ruby on Rails"),
    (r"\bgraphql\b", "GraphQL"),
    (r"\b(rest api|restful|rest apis)\b", "REST API"),

    # Database
    (r"\b(postgresql|postgres)\b", "PostgreSQL"),
    (r"\bmysql\b", "MySQL"),
    (r"\b(mongodb|mongo)\b", "MongoDB"),
    (r"\bredis\b", "Redis"),
    (r"\bdynamodb\b", "DynamoDB"),
    (r"\bsnowflake\b", "Snowflake"),
    (r"\belasticsearch\b", "Elasticsearch"),

    # Cloud & DevOps
    (r"\b(aws|amazon web services)\b", "AWS"),
    (r"\bazure\b", "Azure"),
    (r"\b(gcp|google cloud)\b", "GCP"),
    (r"\bdocker\b", "Docker"),
    (r"\b(kubernetes|k8s)\b", "Kubernetes"),
    (r"\bterraform\b", "Terraform"),
    (r"\bansible\b", "Ansible"),
    (r"\bjenkins\b", "Jenkins"),
    (r"\b(ci/cd|cicd)\b", "CI/CD"),
    (r"\blinux\b", "Linux"),
    (r"\b(git|github|gitlab)\b", "Git"),

    # Data & AI
    (r"\bpandas\b", "Pandas"),
    (r"\bnumpy\b", "NumPy"),
    (r"\b(power bi|powerbi)\b", "Power BI"),
    (r"\btableau\b", "Tableau"),
    (r"\b(data analysis|data analytics)\b", "Data Analysis"),
    (r"\b(machine learning)\b", "Machine Learning"),
    (r"\b(deep learning)\b", "Deep Learning"),
    (r"\btensorflow\b", "TensorFlow"),
    (r"\bpytorch\b", "PyTorch"),
    (r"\b(nlp|natural language processing)\b", "NLP"),
    (r"\b(computer vision)\b", "Computer Vision"),

    # Security & QA
    (r"\b(cybersecurity|network security|infosec)\b", "Cybersecurity"),
    (r"\bsiem\b", "SIEM"),
    (r"\bsoc\b", "SOC"),
    (r"\b(penetration testing|pentesting)\b", "Penetration Testing"),
    (r"\bselenium\b", "Selenium"),
    (r"\bcypress\b", "Cypress"),
    (r"\bjest\b", "Jest"),
    (r"\bpytest\b", "PyTest"),
    (r"\bunit testing\b", "Unit Testing"),
    (r"\b(qa|quality assurance)\b", "QA"),

    # Business & Design
    (r"\bsalesforce\b", "Salesforce"),
    (r"\bcrm\b", "CRM"),
    (r"\b(marketing automation|hubspot)\b", "Marketing Automation"),
    (r"\bseo\b", "SEO"),
    (r"\b(google analytics|ga4)\b", "Google Analytics"),
    (r"\bfigma\b", "Figma"),
    (r"\b(ui/ux|ux design|ui design)\b", "UI/UX"),
    (r"\bcopywriting\b", "Copywriting"),
    (r"\bproject management\b", "Project Management"),
    (r"\bproduct management\b", "Product Management"),
]


def clean_html(raw_html: str) -> str:
    if not raw_html:
        return ""
    clean = re.sub(r"<[^>]+>", " ", raw_html)
    return " ".join(clean.split())


def is_india_job(location: str, title: str = "") -> bool:
    text = f"{location or ''} {title or ''}".lower()
    tokens = set(re.findall(r"\b\w+\b", text))
    return bool(INDIA_KEYWORDS & tokens)


def is_remote_job(location: str, default: bool = True) -> bool:
    loc = (location or "").lower()
    if any(k in loc for k in ["onsite", "in-office", "on-site"]):
        return False
    if any(k in loc for k in ["remote", "worldwide", "anywhere", "work from home", "wfh", "global"]):
        return True
    return default


def classify_category(category_raw: str, title: str, description: str) -> str:
    title_lower = title.lower()
    cat_lower = (category_raw or "").lower()
    title_cat = f"{title_lower} {cat_lower}"

    if any(k in title_cat for k in ["devops", "cloud", "kubernetes", "terraform", "aws", "docker", "sysadmin", "infrastructure", "sre"]):
        return "DevOps / Cloud"
    if any(k in title_cat for k in ["security", "cybersecurity", "infosec", "penetration"]):
        return "Security"
    if any(k in title_cat for k in ["data engineer", "data science", "data analyst", "analytics", "machine learning", "ai engineer", "power bi"]):
        return "Data"
    if any(k in title_cat for k in ["product manager", "product owner", "scrum master"]):
        return "Product"
    if any(k in title_cat for k in ["design", "ui/ux", "ux designer", "graphic", "figma", "animator"]):
        return "Design"
    if any(k in title_cat for k in ["marketing", "seo", "growth", "content", "copywriter", "social media", "brand"]):
        return "Marketing"
    if any(k in title_cat for k in ["sales", "account executive", "business development", "sdr", "account manager"]):
        return "Sales"
    if any(k in title_cat for k in ["support", "customer service", "helpdesk", "patient care", "client success"]):
        return "Support"
    if any(k in title_cat for k in ["finance", "accounting", "bookkeeper", "payroll", "financial"]):
        return "Finance"
    if any(k in title_cat for k in ["engineer", "developer", "software", "frontend", "backend", "fullstack", "qa", "programmer", "react", "python", "java", "node"]):
        return "Engineering"

    desc_lower = (description or "")[:300].lower()
    if any(k in desc_lower for k in ["software engineer", "full stack", "frontend developer", "backend developer", "python developer"]):
        return "Engineering"

    return "Other"


def extract_skills(raw_tags: list, title: str, description: str) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []

    # Priority 1: Explicit tags
    for tag in raw_tags:
        clean = str(tag).strip().lower()
        for pattern, canonical in SKILL_PATTERNS:
            if re.search(pattern, clean, re.IGNORECASE):
                if canonical.lower() not in seen:
                    seen.add(canonical.lower())
                    result.append(canonical)

    # Priority 2: Job description
    if description:
        for pattern, canonical in SKILL_PATTERNS:
            if len(result) >= 8:
                break
            if canonical.lower() in seen:
                continue
            if re.search(pattern, description, re.IGNORECASE):
                seen.add(canonical.lower())
                result.append(canonical)

    # Priority 3: Job title
    if title and len(result) < 8:
        for pattern, canonical in SKILL_PATTERNS:
            if len(result) >= 8:
                break
            if canonical.lower() in seen:
                continue
            if re.search(pattern, title, re.IGNORECASE):
                seen.add(canonical.lower())
                result.append(canonical)

    return result[:8]


class BaseSourceAdapter(abc.ABC):
    """Abstract base class for all job source adapters."""

    def __init__(self, name: str, url: str) -> None:
        self.name = name
        self.url = url

    @abc.abstractmethod
    async def fetch_raw(self, client: httpx.AsyncClient, headers: dict[str, str]) -> list[dict[str, Any]]:
        """Fetch raw JSON payload from source API."""
        pass

    @abc.abstractmethod
    def normalize_item(self, raw_item: dict[str, Any]) -> dict[str, Any] | None:
        """Normalize raw provider record into standard Job schema."""
        pass

    def validate_item(self, item: dict[str, Any] | None) -> bool:
        """Validate required fields on normalized item."""
        if not item or not isinstance(item, dict):
            return False
        required_fields = ["id", "title", "company", "url", "source"]
        for field in required_fields:
            if not item.get(field) or not str(item[field]).strip():
                return False
        return True


class RemoteOKAdapter(BaseSourceAdapter):
    def __init__(self, url: str = "https://remoteok.com/api") -> None:
        super().__init__("RemoteOK", url)

    async def fetch_raw(self, client: httpx.AsyncClient, headers: dict[str, str]) -> list[dict[str, Any]]:
        res = await client.get(self.url, headers=headers)
        res.raise_for_status()
        payload = res.json()
        if isinstance(payload, list):
            return payload[1:]
        elif isinstance(payload, dict):
            return payload.get("jobs", [])
        return []

    def normalize_item(self, raw: dict[str, Any]) -> dict[str, Any] | None:
        job_id = str(raw.get("id") or "").strip()
        title = (raw.get("position") or "").strip()
        company = (raw.get("company") or "").strip()
        url = (raw.get("url") or raw.get("apply_url") or "").strip()
        if not job_id or not title or not company or not url:
            return None

        location = (raw.get("location") or "Remote").strip()
        salary_min = raw.get("salary_min")
        salary_max = raw.get("salary_max")
        salary = ""
        if salary_min and salary_max:
            salary = f"${int(salary_min):,} - ${int(salary_max):,}"
        elif raw.get("salary"):
            salary = str(raw.get("salary")).strip()

        raw_tags = [str(x) for x in (raw.get("tags") or []) if str(x).strip()]
        description = clean_html(raw.get("description") or "")
        skills = extract_skills(raw_tags, title, description)
        category = classify_category("", title, description)

        return {
            "id": f"remoteok-{job_id}",
            "source": self.name,
            "title": title,
            "company": company,
            "location": location or "Remote",
            "remote": is_remote_job(location),
            "is_india": is_india_job(location, title),
            "category": category,
            "employment_type": "Full-time",
            "skills": skills,
            "tags": skills,
            "url": url,
            "logo": raw.get("company_logo") or raw.get("logo") or "",
            "salary": salary,
            "posted": raw.get("date") or "",
            "description": description,
        }


class JobicyAdapter(BaseSourceAdapter):
    def __init__(self, url: str = "https://jobicy.com/api/v2/remote-jobs?count=100") -> None:
        super().__init__("Jobicy", url)

    async def fetch_raw(self, client: httpx.AsyncClient, headers: dict[str, str]) -> list[dict[str, Any]]:
        res = await client.get(self.url, headers=headers)
        res.raise_for_status()
        payload = res.json()
        if isinstance(payload, dict):
            return payload.get("jobs", [])
        return []

    def normalize_item(self, raw: dict[str, Any]) -> dict[str, Any] | None:
        job_id = str(raw.get("id") or "").strip()
        title = (raw.get("jobTitle") or "").strip()
        company = (raw.get("companyName") or "").strip()
        url = (raw.get("url") or "").strip()
        if not job_id or not title or not company or not url:
            return None

        location = (raw.get("jobGeo") or "Remote").strip()
        salary_min = raw.get("salaryMin") or raw.get("annualSalaryMin")
        salary_max = raw.get("salaryMax") or raw.get("annualSalaryMax")
        currency = raw.get("salaryCurrency") or "USD"
        salary = ""
        if salary_min and salary_max:
            salary = f"{currency} {int(salary_min):,} - {int(salary_max):,}"
        elif salary_min:
            salary = f"{currency} {int(salary_min):,}"

        industry_list = raw.get("jobIndustry") or []
        if isinstance(industry_list, str):
            industry_list = [industry_list]
        raw_cat = industry_list[0] if industry_list else ""

        type_list = raw.get("jobType") or []
        if isinstance(type_list, str):
            type_list = [type_list]
        raw_type = type_list[0] if type_list else "Full-Time"

        description = clean_html(raw.get("jobExcerpt") or raw.get("jobDescription") or "")
        skills = extract_skills([], title, description)
        category = classify_category(str(raw_cat), title, description)

        return {
            "id": f"jobicy-{job_id}",
            "source": self.name,
            "title": title,
            "company": company,
            "location": location or "Remote",
            "remote": is_remote_job(location),
            "is_india": is_india_job(location, title),
            "category": category,
            "employment_type": str(raw_type).strip().title() if raw_type else "Full-time",
            "skills": skills,
            "tags": skills,
            "url": url,
            "logo": raw.get("companyLogo") or "",
            "salary": salary,
            "posted": raw.get("pubDate") or "",
            "description": description,
        }


class RemotiveAdapter(BaseSourceAdapter):
    def __init__(self, url: str = "https://remotive.com/api/remote-jobs") -> None:
        super().__init__("Remotive", url)

    async def fetch_raw(self, client: httpx.AsyncClient, headers: dict[str, str]) -> list[dict[str, Any]]:
        res = await client.get(self.url, headers=headers)
        res.raise_for_status()
        payload = res.json()
        if isinstance(payload, dict):
            return payload.get("jobs", [])
        return []

    def normalize_item(self, raw: dict[str, Any]) -> dict[str, Any] | None:
        job_id = str(raw.get("id") or "").strip()
        title = (raw.get("title") or "").strip()
        company = (raw.get("company_name") or "").strip()
        url = (raw.get("url") or "").strip()
        if not job_id or not title or not company or not url:
            return None

        location = (raw.get("candidate_required_location") or "Worldwide").strip()
        salary = (raw.get("salary") or "").strip()

        raw_cat = raw.get("category") or ""
        raw_tags = raw.get("tags") or []
        if isinstance(raw_tags, str):
            raw_tags = [raw_tags]

        description = clean_html(raw.get("description") or "")
        skills = extract_skills(raw_tags, title, description)
        category = classify_category(str(raw_cat), title, description)
        raw_type = raw.get("job_type") or "full_time"

        return {
            "id": f"remotive-{job_id}",
            "source": self.name,
            "title": title,
            "company": company,
            "location": location or "Worldwide",
            "remote": is_remote_job(location),
            "is_india": is_india_job(location, title),
            "category": category,
            "employment_type": str(raw_type).replace("_", "-").title(),
            "skills": skills,
            "tags": skills,
            "url": url,
            "logo": raw.get("company_logo") or "",
            "salary": salary,
            "posted": raw.get("publication_date") or "",
            "description": description,
        }
