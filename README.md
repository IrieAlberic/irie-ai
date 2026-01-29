# IRIE | Knowledge Operating System

![Status](https://img.shields.io/badge/Status-Beta-blue) ![Privacy](https://img.shields.io/badge/Privacy-Local--First-green) ![Stack](https://img.shields.io/badge/Tech-React%20%7C%20TypeScript%20%7C%20Gemini-orange)

**IRIE** is a secure, local-first **Knowledge Operating System**. Unlike traditional chatbots, IRIE acts as a workspace that indexes your documents (PDF, TXT, MD, CSV) directly in your browser using IndexedDB and Vectors, allowing for secure Retrieval-Augmented Generation (RAG) without your data simply vanishing into the cloud.

It features a **Spatial Canvas** for thinking with your data, a **Data Extraction** engine for structured intelligence, and supports multiple AI providers (Gemini, OpenAI, Ollama).

---

## System Architecture

IRIE runs primarily in the browser. It uses `Transformers.js` for local embeddings (optional) or Gemini for cloud embeddings, `Dexie.js` for persistent local storage, and `PDF.js` for parsing.

```mermaid
graph TD
    subgraph Browser ["Client-Side Application (Browser)"]
        UI[("User Interface")]
        
        subgraph Core ["Core Services"]
            DP[("Document Processor")]
            AI_SVC[("AI Service")]
            DB_SVC[("Database Service")]
        end
        
        subgraph Local_Compute ["On-Device Compute"]
            TF[("Transformers.js<br/>(Local Embeddings)")]
            PDF[("PDF.js<br/>(Extraction)")]
        end
        
        subgraph Storage ["IndexedDB (Dexie)"]
            Store_Files[("Files & Vectors")]
            Store_Chat[("Chat History")]
            Store_Spatial[("Spatial Layout")]
        end
    end

    subgraph External ["AI Providers"]
        Gemini[("Google Gemini")]
        OpenAI[("OpenAI")]
        Ollama[("Ollama (Localhost)")]
    end

    %% Data Flow
    UI --> |Upload File| DP
    DP --> |Extract Text| PDF
    DP --> |Chunk Text| DP
    DP --> |Vectorize| TF
    DP --> |Vectorize| Gemini
    DP --> |Persist| DB_SVC
    
    DB_SVC --> Store_Files
    DB_SVC --> Store_Chat
    
    UI --> |Query| AI_SVC
    AI_SVC --> |RAG Retrieval (Top-K)| DB_SVC
    AI_SVC --> |Generate Response| Gemini
    AI_SVC --> |Generate Response| OpenAI
    AI_SVC --> |Generate Response| Ollama
```

---

## Key Features

### 1. Local-First RAG Pipeline
- **Smart Indexing**: Uploads are chunked semantically and stored locally.
- **Hybrid Embeddings**: Choose between purely local embeddings (running in-browser via Transformers.js) or high-quality Cloud embeddings.
- **Zero-Latency Context**: Context is retrieved from IndexedDB instantly.

### 2. Spatial Canvas
- **Mind-Map Interface**: Drag and drop your files and chat messages onto an infinite canvas.
- **Visual Organization**: Group related concepts spatially.
- **Persistence**: Your layout is saved automatically.

### 3. Structured Data Extraction
- **Unstructured to JSON**: Automatically convert raw text documents into structured entities (People, Locations, Concepts, Metrics).
- **Table View**: Exportable and sortable data view.

### 4. Multi-Model Support
- **Google Gemini**: Optimized for long-context and speed (Default).
- **Ollama**: Connect to your local LLM (e.g., Llama 3) for 100% offline reasoning.
- **OpenAI**: Support for GPT-4o models.

---

## Tech Stack

*   **Frontend**: React 18, TypeScript, TailwindCSS
*   **State/Storage**: Dexie.js (IndexedDB wrapper)
*   **AI/ML**: 
    *   `@google/genai` (Gemini SDK)
    *   `@xenova/transformers` (In-browser Inference)
    *   `pdfjs-dist` (PDF Parsing)
*   **Icons**: Lucide React

---

## Getting Started

### Prerequisites
*   Node.js (v18+)
*   A Google Gemini API Key (recommended for best performance)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/IrieAlberic/irie-ai.git
    cd irie-ai
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Set up environment variables (Optional):
    Create a `.env` file:
    ```env
    API_KEY=your_gemini_api_key_here
    ```

4.  Start the development server:
    ```bash
    npm start
    ```

---

## Configuration

### Setting up Ollama (Local LLM)
To use IRIE completely offline with Ollama:
1.  Install [Ollama](https://ollama.com).
2.  Pull a model: `ollama run llama3`.
3.  **Important**: You must enable CORS in Ollama to allow the browser to talk to it.
    *   **Mac/Linux**: `OLLAMA_ORIGINS="*" ollama serve`
    *   **Windows**: Set the environment variable `OLLAMA_ORIGINS` to `*`.
4.  In IRIE Settings, select **Ollama** provider.

---

## Roadmap

*   [ ] **Podcast Mode**: Generate audio conversations from documents (Coming Soon).
*   [ ] **Web Search Grounding**: Connect Gemini Search tools.
*   [ ] **Graph View**: Force-directed graph visualization of knowledge nodes.

---

*Built for the future of Personal Knowledge Management.*
