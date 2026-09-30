"""The one place a Groq client gets built.

Every agent calls `get_llm()` rather than constructing its own, so the model and sampling
settings are a single config change. Temperature defaults to 0: these agents classify and
summarise, and a run that returns something different each time is harder to evaluate and
harder to demo.
"""

import functools
import os

from dotenv import load_dotenv
from langchain_groq import ChatGroq

load_dotenv()

# Spec §3 names Llama 3.3 70B, which Groq has since removed — see DAY2_PLAN.md. Any chat
# model on the account works; override with GROQ_MODEL rather than editing this.
DEFAULT_MODEL = "openai/gpt-oss-120b"


@functools.lru_cache(maxsize=None)
def get_llm(temperature: float = 0.0, reasoning_effort: str = "low") -> ChatGroq:
    """A cached Groq client. Cached because each agent asks for one per call.

    `reasoning_effort` matters on gpt-oss: it is a reasoning model, and left unbounded it
    spends a wildly variable number of hidden tokens before answering — measured at 0.6s to
    32s on the same classification task. "low" caps that at single-digit reasoning tokens,
    which is right for classifying and summarising. The Investigator may want "medium" when
    it lands; it is a per-call argument for that reason.
    """
    if not os.environ.get("GROQ_API_KEY"):
        raise RuntimeError(
            "GROQ_API_KEY is not set. Copy .env.example to .env and fill it in."
        )
    return ChatGroq(
        model=os.environ.get("GROQ_MODEL", DEFAULT_MODEL),
        temperature=temperature,
        timeout=30,
        max_retries=2,
        reasoning_effort=reasoning_effort,
    )


def model_name() -> str:
    """The model actually in use, for reporting in eval output."""
    return os.environ.get("GROQ_MODEL", DEFAULT_MODEL)
