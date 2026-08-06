import os
import sys
from pathlib import Path

# Add the 'ai' directory to the python path so imports resolve correctly
current_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(current_dir / "ai"))

import gradio as gr
from ai.main import app as fastapi_app

# Create a minimal Gradio UI to serve as a nice status landing page
with gr.Blocks(title="FinMate AI Platform") as demo:
    gr.Markdown("# 🚀 FinMate AI Platform Service")
    gr.Markdown("This Hugging Face Space hosts the background AI inference engine for transaction categorization, anomaly detection, and forecasting.")
    gr.Markdown("### Status: `Online`")
    gr.Markdown("The REST API is fully accessible at the root of this URL.")

# Mount our FastAPI app as the main app, placing the Gradio status UI at /ui
app = gr.mount_gradio_app(fastapi_app, demo, path="/ui")
