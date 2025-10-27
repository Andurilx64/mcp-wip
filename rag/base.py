"""Abstract base class for Retrieval-Augmented Generation (RAG) systems."""

from typing import Any, Dict, List, Optional, Union
from abc import ABC, abstractmethod
from pydantic import BaseModel, ConfigDict


class BaseRAG(BaseModel, ABC):
    """
    Abstract base class for Retrieval-Augmented Generation (RAG) implementations.

    This class defines the minimum interface required for building RAG systems:
    a `search` method for retrieving information based on a query, and an optional
    `hybrid_search` method for combining different search strategies. By subclassing
    BaseRAG, developers can standardize the way knowledge retrieval and augmentation
    are handled in their application, while leveraging Pydantic-based model validation.

    Key Points:
        - Inherit from this class to build your own RAG components.
        - Implement the abstract `search` method to define how queries are processed
          and relevant information is retrieved.
        - Optionally override `hybrid_search` for more advanced retrieval logic
          (e.g., combining keyword and semantic search).
        - This class is fully compatible with Pydantic validation and serialization.

    Example Usage:
        class MyRAG(BaseRAG):
            def search(self, query: str, top_k: int = 5, **kwargs):
                ... # implement search logic

            def hybrid_search(self, query: str, top_k: int = 5, **kwargs):
                ... # implement hybrid search, if needed
    """

    model_config = ConfigDict(arbitrary_types_allowed=True, extra="allow")

    @abstractmethod
    def search(
        self, query: Union[str, Dict[str, Any]], top_k: Optional[int] = 5, **kwargs
    ) -> List[Any]:
        """
        Perform a retrieval operation given a query.

        This method should be implemented in subclasses to perform either
        semantic/vector, keyword-based, or other types of search. The result should be
        a ranked list of relevant items (such as documents, passages, or knowledge chunks).

        Args:
            query (str | dict): The user input or structured query.
            top_k (int, optional): Number of top relevant results to return. Defaults to 5.
            **kwargs: Additional parameters for specific search backends/strategies.

        Returns:
            List[Any]: A list of retrieved document/snippet objects relevant to the query.
        """
        raise NotImplementedError("search is not implemented for this RAG class.")

    @abstractmethod
    def hybrid_search(
        self, query: Union[str, Dict[str, Any]], top_k: Optional[int] = 5, **kwargs
    ) -> List[Any]:
        """
        Optionally implement a hybrid retrieval operation that combines multiple strategies
        (e.g., keyword matching plus semantic similarity).

        Subclasses may override this method to unify or blend different search techniques.
        By default, this method raises NotImplementedError, indicating that standard
        retrieval does not support hybrid approaches out of the box.

        Args:
            query (str | dict): The user input or structured query.
            top_k (int, optional): Number of top relevant results to return. Defaults to 5.
            **kwargs: Additional parameters for specific hybrid strategies.

        Returns:
            List[Any]: A list of relevant items retrieved by the hybrid strategy.

        Raises:
            NotImplementedError: If hybrid search is not supported for this RAG class.
        """
        raise NotImplementedError(
            "hybrid_search is not implemented for this RAG class."
        )
