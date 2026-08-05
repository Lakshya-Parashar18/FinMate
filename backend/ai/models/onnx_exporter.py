"""
Onnx_exporter.py
Exports trained scikit-learn/PyTorch models to ONNX format for accelerated inference.
"""

from pathlib import Path
from typing import Optional, Any
from ai_utils.logger import logger

try:
    from skl2onnx import convert_sklearn
    from skl2onnx.common.data_types import FloatTensorType
    SKL2ONNX_AVAILABLE = True
except ImportError:
    SKL2ONNX_AVAILABLE = False


class ONNXExporter:
    """Exports machine learning model instances to ONNX format."""

    @staticmethod
    def export_to_onnx(model: Any, input_dim: int, output_path: Path) -> Optional[Path]:
        """Converts scikit-learn model to ONNX format and saves to output_path."""
        if not SKL2ONNX_AVAILABLE:
            logger.info("skl2onnx package not installed. Skipping ONNX export (Native joblib fallback active).")
            return None

        try:
            initial_type = [("float_input", FloatTensorType([None, input_dim]))]
            onx = convert_sklearn(model, initial_types=initial_type)
            with open(output_path, "wb") as f:
                f.write(onx.SerializeToString())
            logger.info(f"Successfully exported ONNX model to {output_path}")
            return output_path
        except Exception as e:
            logger.warning(f"Could not export model to ONNX: {e}")
            return None


onnx_exporter = ONNXExporter()
