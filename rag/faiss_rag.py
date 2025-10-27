"""Example implementation of a FAISS indexing for RAG"""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from sentence_transformers import SentenceTransformer
from pydantic import Field, ConfigDict
import numpy as np
import faiss
from .base import BaseRAG


class FaissRAG(BaseRAG):
    """
    FAISS-based RAG implementation optimized for JSON manifests.
    Uses sentence transformers for embeddings and FAISS for fast similarity search.
    """

    model_name: str = Field(default="all-MiniLM-L6-v2")
    index: Optional[Any] = Field(default=None, exclude=True)
    embedding_model: Optional[SentenceTransformer] = Field(default=None, exclude=True)
    documents: List[Dict[str, Any]] = Field(default_factory=list)
    embeddings: Optional[np.ndarray] = Field(default=None, exclude=True)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    normalize_embeddings: bool = Field(default=True)

    model_config = ConfigDict(extra="allow", arbitrary_types_allowed=True)

    def __init__(self, **data):
        super().__init__(**data)
        # Initialize the embedding model
        self.embedding_model = SentenceTransformer(self.model_name)

        # Initialize metadata with versioning info
        if not self.metadata:
            self.metadata = {
                "model_name": self.model_name,
                "model_version": self._get_model_version(),
                "embedding_dimension": self.embedding_model.get_sentence_embedding_dimension(),
                "normalize_embeddings": self.normalize_embeddings,
                "created_at": datetime.now().isoformat(),
                "last_updated": datetime.now().isoformat(),
                "total_documents": 0,
            }

    def _get_model_version(self) -> str:
        """Get the version of the sentence transformer model."""
        try:
            # Try to get model info from the transformer
            return str(getattr(self.embedding_model, "__version__", "unknown"))
        except Exception:
            return "unknown"

    def _normalize_vector(self, vector: np.ndarray) -> np.ndarray:
        """Normalize a vector to unit length for cosine similarity."""
        norm = np.linalg.norm(vector)
        if norm == 0:
            return vector
        return vector / norm

    def build_index(self, json_documents: List[Dict[str, Any]]) -> None:
        """
        Build the FAISS index from JSON documents.

        Args:
            json_documents: List of JSON manifest documents
        """
        if not json_documents:
            raise ValueError("Cannot build index with empty document list")

        # Store original documents
        self.documents = json_documents

        # Convert JSON documents to text
        texts = self.documents

        # Generate embeddings
        print(f"Generating embeddings for {len(texts)} documents...")
        embeddings = self.embedding_model.encode(
            texts, show_progress_bar=True, convert_to_numpy=True
        )

        # Normalize embeddings if required
        if self.normalize_embeddings:
            embeddings = np.array([self._normalize_vector(emb) for emb in embeddings])

        self.embeddings = embeddings.astype("float32")

        # Build FAISS index
        dimension = self.embeddings.shape[1]

        # Use IndexFlatIP for inner product(equivalent to cosine similarity with normalized vectors)
        # or IndexFlatL2 for L2 distance
        if self.normalize_embeddings:
            # Inner product with normalized vectors = cosine similarity
            self.index = faiss.IndexFlatIP(dimension)
        else:
            # L2 distance
            self.index = faiss.IndexFlatL2(dimension)

        # Add vectors to index
        self.index.add(self.embeddings)

        # Update metadata
        self.metadata.update(
            {
                "total_documents": len(json_documents),
                "last_updated": datetime.utcnow().isoformat(),
                "index_type": (
                    "IndexFlatIP" if self.normalize_embeddings else "IndexFlatL2"
                ),
            }
        )

        print(f"Index built successfully with {self.index.ntotal} documents")

    def add_documents(self, json_documents: List[Dict[str, Any]]) -> None:
        """
        Add new documents to the existing index.

        Args:
            json_documents: List of JSON manifest documents to add
        """
        if not json_documents:
            return

        # Convert new documents to text
        texts = [self._json_to_text(doc) for doc in json_documents]

        # Generate embeddings
        new_embeddings = self.embedding_model.encode(
            texts, show_progress_bar=False, convert_to_numpy=True
        )

        # Normalize if required
        if self.normalize_embeddings:
            new_embeddings = np.array(
                [self._normalize_vector(emb) for emb in new_embeddings]
            )

        new_embeddings = new_embeddings.astype("float32")

        # Add to index
        if self.index is None:
            self.build_index(json_documents)
        else:
            self.index.add(new_embeddings)
            self.documents.extend(json_documents)

            if self.embeddings is not None:
                self.embeddings = np.vstack([self.embeddings, new_embeddings])
            else:
                self.embeddings = new_embeddings

            # Update metadata
            self.metadata.update(
                {
                    "total_documents": len(self.documents),
                    "last_updated": datetime.utcnow().isoformat(),
                }
            )

    def search(
        self,
        query: Union[str, Dict[str, Any]],
        top_k: Optional[int] = 5,
        return_scores: bool = True,
        **kwargs,
    ) -> List[Dict[str, Any]]:
        """
        Perform semantic search using FAISS.

        Args:
            query: Search query as string or JSON dict
            top_k: Number of top results to return
            return_scores: Whether to include similarity scores

        Returns:
            List of dictionaries containing documents and optionally scores
        """
        if self.index is None or self.index.ntotal == 0:
            raise ValueError(
                "Index is empty. Please build the index first using build_index()"
            )

        # Generate query embedding
        query_embedding = self.embedding_model.encode([query], convert_to_numpy=True)

        # Normalize query if required
        if self.normalize_embeddings:
            query_embedding = self._normalize_vector(query_embedding[0]).reshape(1, -1)

        query_embedding = query_embedding.astype("float32")

        # Search in FAISS
        top_k = min(top_k, self.index.ntotal)
        distances, indices = self.index.search(query_embedding, top_k)

        # Prepare results
        results = []
        for idx, (distance, doc_idx) in enumerate(zip(distances[0], indices[0])):
            result = {
                "rank": idx + 1,
                "document": self.documents[doc_idx],
            }

            if return_scores:
                # Convert distance to similarity score
                if self.normalize_embeddings:
                    # Inner product is already similarity (higher is better)
                    similarity = float(distance)
                else:
                    # L2 distance: convert to similarity (lower distance = higher similarity)
                    similarity = 1.0 / (1.0 + float(distance))

                result["score"] = similarity

            results.append(result)

        return results

    def hybrid_search(
        self,
        query: Union[str, Dict[str, Any]],
        top_k: Optional[int] = 5,
        keyword_weight: float = 0.3,
        semantic_weight: float = 0.7,
        **kwargs,
    ) -> List[Dict[str, Any]]:
        """
        Perform hybrid search combining keyword matching and semantic search.

        Args:
            query: Search query as string or JSON dict
            top_k: Number of top results to return
            keyword_weight: Weight for keyword matching (0-1)
            semantic_weight: Weight for semantic similarity (0-1)

        Returns:
            List of dictionaries containing documents and combined scores
        """
        raise NotImplementedError("Hybrid search not yet supported")

    def get_metadata(self) -> Dict[str, Any]:
        """Return metadata about the index and model."""
        return self.metadata.copy()

    def save_index(self, index_path: str, metadata_path: Optional[str] = None) -> None:
        """
        Save the FAISS index and metadata to disk.

        Args:
            index_path: Path to save the FAISS index
            metadata_path: Path to save metadata (optional)
        """
        if self.index is None:
            raise ValueError("No index to save")

        # Save FAISS index
        faiss.write_index(self.index, index_path)

        # Save metadata and documents
        if metadata_path is None:
            metadata_path = index_path.replace(".index", "_metadata.json")

        save_data = {
            "metadata": self.metadata,
            "documents": self.documents,
            "model_name": self.model_name,
            "normalize_embeddings": self.normalize_embeddings,
        }

        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(save_data, f, indent=2)

        print(f"Index saved to {index_path}")
        print(f"Metadata saved to {metadata_path}")

    def load_index(self, index_path: str, metadata_path: Optional[str] = None) -> None:
        """
        Load a FAISS index and metadata from disk.

        Args:
            index_path: Path to the FAISS index
            metadata_path: Path to metadata file (optional)
        """
        # Load FAISS index
        self.index = faiss.read_index(index_path)

        # Load metadata and documents
        if metadata_path is None:
            metadata_path = index_path.replace(".index", "_metadata.json")

        with open(metadata_path, "r", encoding="utf-8") as f:
            load_data = json.load(f)

        self.metadata = load_data["metadata"]
        self.documents = load_data["documents"]
        self.model_name = load_data.get("model_name", self.model_name)
        self.normalize_embeddings = load_data.get("normalize_embeddings", True)

        # Verify model compatibility
        if self.embedding_model is None or self.model_name != load_data["model_name"]:
            self.embedding_model = SentenceTransformer(self.model_name)

        print(f"Index loaded from {index_path}")
        print(f"Total documents: {self.metadata['total_documents']}")
