# 🤖 Neural Engine - AI Influencer Studio

Welcome to the **Neural Engine AI Influencer Studio**! This is a professional-grade creative automation platform designed as an Airtable Extension, powered by a high-performance FastAPI backend. 

It allows you to generate high-end AI content (Images and Videos) using state-of-the-art models like **LTX Video**, **Flux**, and **Stable Diffusion**, directly from your Airtable base.

---

## 🏗️ Architecture

The project is split into two main components:
1.  **Frontend (Airtable Extension)**: A React-based interface with a visual workflow engine (React Flow).
2.  **Backend (FastAPI)**: A Python service that orchestrates AI generation, handles cloud storage (S3/Cloudinary), and manages custom API bridges (RunPod, Modal, Ollama).

---

## 🚀 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Python 3.10+](https://www.python.org/)
- [Airtable CLI](https://airtable.com/developers/extensions/guides/cli-install) (`npm install -g @airtable/blocks-cli`)

---

## 🔧 Backend Setup (Local Development)

1.  **Clone the Backend Repository**:
    ```bash
    git clone https://github.com/anaisblendy-collab/Backend_fastapi1.git
    cd Backend_fastapi1
    ```

2.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

3.  **Configure Environment**:
    Create a `.env` file based on `.env.example`:
    ```env
    AIRTABLE_API_KEY=your_key
    LTX_RUNPOD_URL=your_url
    # Add other provider keys (HuggingFace, Fal, etc.)
    ```

4.  **Run the Server**:
    ```bash
    uvicorn main:app --reload --port 8000
    ```

---

## 🎨 Frontend Setup (Airtable Extension)

1.  **Clone this Repository**:
    ```bash
    git clone https://github.com/anaisblendy-collab/my-ai-influencer-studio_airtable.git
    cd my-ai-influencer-studio_airtable
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Initialize Airtable Block**:
    You need to create a "Custom Extension" in your Airtable base to get a `blockId`.
    ```bash
    block init
    ```
    *Paste your block ID when prompted.*

4.  **Run Locally**:
    ```bash
    block run
    ```
    *Airtable will provide a URL to view your extension in development mode.*

5.  **Release to Production**:
    ```bash
    block release
    ```

---

## 📊 Airtable Base Schema

To use this studio, your Airtable base should have the following tables:
- **Influencer Profiles**: Columns: `Name`, `Age`, `Gender`, `Niche`, `Style`.
- **Contenu (Production Queue)**: Columns: `Name`, `Status`, `Prompt`, `Media` (Attachment), `Model`, `Provider`.
- **Prompts**: Library of text prompts for generation.

---

## 🤝 Contributing

We love contributions! Here is how you can help:
1.  **Fork** the repository.
2.  Create a new **branch** (`git checkout -b feature/amazing-feature`).
3.  **Commit** your changes (`git commit -m 'Add some amazing feature'`).
4.  **Push** to the branch (`git push origin feature/amazing-feature`).
5.  Open a **Pull Request**.

---

## 💰 Monetization & Whitelabel

This project is built with a "Whitelabel" philosophy. You can host your own GPU workers (via RunPod) and provide a premium experience to your clients without requiring them to have their own API keys.

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
