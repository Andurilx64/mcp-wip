"""Utility functions for dumping json manifests into a common directory"""

import json
import os
from typing import List, Tuple

from core.mcp_server.models import WidgetManifest


def write_manifest_to_json(
    manifest: WidgetManifest, path: str
) -> Tuple[WidgetManifest, str]:
    """
    Writes the given WidgetManifest as a JSON file to the specified path.

    Args:
        manifest: The WidgetManifest instance to write.
        name: The file name to write the JSON to.

    Returns:
        A tuple of (WidgetManifest, path).
    """

    with open(path, "w", encoding="utf-8") as f:
        # WidgetManifest is assumed to be a pydantic model or similar
        json.dump(manifest.model_dump(), f, indent=2, ensure_ascii=False)
    return manifest, path


def write_manifests_to_json(
    manifests_and_paths: List[Tuple[WidgetManifest, str]], input_dir: str
) -> List[Tuple[WidgetManifest, str]]:
    """
    Writes multiple WidgetManifests to their corresponding JSON files.

    Args:
        manifests_and_paths: A list of (WidgetManifest, path) tuples.

    Returns:
        A list of (WidgetManifest, path) for each written manifest.
    """

    results = []
    for manifest, name in manifests_and_paths:
        full_path = os.path.join(input_dir, name + ".json")
        path = full_path
        with open(path, "w", encoding="utf-8") as f:
            json.dump(manifest.model_dump(), f, indent=2, ensure_ascii=False)
        results.append((manifest, path))
    return results
