"""
Abstract Memory class implementation, for custom support of any custom implementation.
A simple FIFO syle message queue is also provided for easy adoption.
"""

from collections import defaultdict, deque
from typing import List, Dict, Any
from abc import ABC, abstractmethod


class Memory(ABC):
    """Abstract base class for conversational memory."""

    @abstractmethod
    def add_message(self, session_id: str, message: dict) -> None:
        """Add a message to memory.

        Args:
            session_id (str): session id as key for session history retriving
            message (dict): opeanai style message to add to memory
        """

    @abstractmethod
    def get_context(self, session_id: str) -> List[Dict[str, Any]]:
        """Retrieve conversation context for a given session.

        Args:
            session_id (str): session id as key for session history retriving
        """

    @abstractmethod
    def clear(self, session_id: str) -> None:
        """Clear memory for a given session.

        Args:
            session_id (str): session id as key for session history retriving
        """

    @abstractmethod
    def reinsert_system(self, session_id: str, system: dict) -> None:
        """Inserts system prompt at the beginning of the history.

        Args:
            session_id (str): session id as key for session history retriving
            system (dict): openai style system prompt
        """


class LastKMemory(Memory):
    """
    A simple example implementation of conversational memory using an in-memory queue.

    This memory class stores the last K messages per session in a fixed-length queue (FIFO), keeping
    only the most recent interactions in memory. Useful for prototyping or single-process
    deployments where persistence and concurrency are not required.
    """

    def __init__(self, k: int = 10):
        """
        Args:
            k (int): the max length of a message queue for each session_id
        """
        self.k = k
        self.sessions = defaultdict(lambda: deque(maxlen=k))

    def add_message(self, session_id: str, message: dict) -> None:
        self.sessions[session_id].append(message)

    def get_context(self, session_id: str) -> List[Dict[str, Any]]:
        return list(self.sessions[session_id])

    def clear(self, session_id: str) -> None:
        self.sessions.pop(session_id, None)

    def reinsert_system(self, session_id: str, system: dict) -> None:
        session = self.sessions[session_id]
        if session and len(session) == session.maxlen:
            session.popleft()
        session.appendleft(system)
