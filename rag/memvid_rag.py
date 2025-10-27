"""Implementation of Memvid RAG."""

from typing import Any, Dict, List, Optional
from memvid import MemvidRetriever, MemvidEncoder


from .base import BaseRAG


class MemvidExecption(Exception):
    """Custom exception for MemvidRAG related errors."""


class MemvidRAG(BaseRAG):
    """
    MemvidRAG implements a Retrieval-Augmented Generation (RAG) interface
    backed by the Memvid system for storing, indexing, and retrieving
    video-encoded embeddings. This class allows semantic search using
    video-based storage and offers integration with external chunk
    data sources.

    Attributes:
        retriver (MemvidRetriever): The internal MemvidRetriever instance used for search.
        retriever_path (str): Filesystem path to the memvid video file (storage).
        index_path (str): Filesystem path to the memvid index file (metadata).
        config (dict): Optional configuration dictionary for Memvid retriever/encoder.
    """

    retriver: MemvidRetriever = None

    def __init__(
        self,
        retriever_path: str = "resources/store/memvid.mp4",
        index_path: str = "resources/indexes/memvid.json",
        memvid_config: Dict[str, Any] = None,
        **kwargs,
    ):
        """
        Initialize a MemvidRAG instance.

        Args:
            retriever_path (str): Path to store or retrieve the memvid video archive.
            index_path (str): Path to store or retrieve the memvid index json file.
            memvid_config (dict, optional): Additional configuration options for Memvid.
            **kwargs: Additional keyword arguments to pass to BaseRAG.
        """
        super().__init__(
            **kwargs,
        )
        self.config = memvid_config
        self.retriever_path = retriever_path
        self.index_path = index_path
        try:
            self.set_retriver()
        except Exception:
            pass

    def create_rag(
        self,
        chuncks: List[Any],
    ):
        """
        Encodes a list of input chunks with MemvidEncoder, builds a new Memvid video archive,
        and (re)initializes the memvid retriever for future semantic search.

        Args:
            chuncks (List[Any]): List of document or data chunks to encode and store in Memvid.
        """
        encoder = MemvidEncoder(self.config, enable_docker=False)
        encoder.add_chunks(chuncks)
        encoder.build_video(self.retriever_path, self.index_path)
        self.set_retriver()

    def set_retriver(self):
        """
        Instantiate and set the MemvidRetriever for this RAG instance.
        Uses the current config, retriever_path, and index_path.
        """
        self.retriver = MemvidRetriever(
            self.retriever_path, self.index_path, self.config
        )

    def search(self, query: str, top_k: Optional[int] = 5, **kwargs) -> List[Any]:
        """
        Perform semantic retrieval from the Memvid archive given an input query.

        Args:
            query (str): Search query in natural language.
            top_k (int, optional): Number of most relevant results to return. Default is 5.
            **kwargs: Additional keyword arguments for future use.

        Returns:
            List[Any]: List of relevant retrieved document chunks or metadata.

        Raises:
            MemvidExecption: If retriever is not properly initialized.
        """
        if not self.retriever_path:
            raise MemvidExecption("retriver not defined")
        results = self.retriver.search(query, top_k=top_k)
        return results

    def hybrid_search(
        self, query: str, top_k: Optional[int] = 5, **kwargs
    ) -> List[Any]:
        """
        Not implemented.

        Args:
            query (str): Search query.
            top_k (int, optional): Number of results.
            **kwargs: For future expansion.

        Raises:
            NotImplementedError: This method is not implemented yet.
        """
        raise NotImplementedError()
