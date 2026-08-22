"""Deterministic candidate ranking kept outside model judgment."""

from agent_runtime.scheduling.models import SchedulingCandidate


def rank_candidates(candidates: list[SchedulingCandidate]) -> list[SchedulingCandidate]:
    return sorted(
        candidates, key=lambda candidate: (-candidate.total_score, candidate.start_at)
    )[:3]
