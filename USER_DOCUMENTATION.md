# Enterprise RAG Platform - Developer Documentation

Welcome to the Enterprise RAG Platform documentation. This guide will help you integrate production-ready, AI-powered search and chat capabilities into your applications while maintaining strict data sovereignty and enterprise-grade security.

---

## 1. Introduction

### What is this platform?
This is a fully managed, compliance-first **Retrieval-Augmented Generation (RAG) Service**. It allows developers to upload proprietary documents and instantly query them using state-of-the-art Large Language Models (LLMs) like GPT-4 or Gemini, without building complex vector infrastructure from scratch.

### What problem does it solve?
Building a production RAG system is hard. It requires managing vector databases, embedding pipelines, chunking strategies, and context window optimization. We abstract this complexity into a simple API while ensuring:
*   **Data Isolation:** Your data never leaks between tenants.
*   **No Vendor Lock-in:** Bring Your Own (BYO) vector database and LLM keys.
*   **Access Control:** Built-in Role-Based Access Control (RBAC) for teams.

### Who should use it?
*   **SaaS Developers:** Adding "Chat with your Data" features to their apps.
*   **Enterprise IT:** Building internal knowledge bases for employees.
*   **Customer Support:** Automating L1 support with verified documentation.

---

## 2. How It Works (High Level)

We simplify the RAG pipeline into two main phases: **Ingestion** and **Retrieval**.

### Phase 1: Ingestion (Document Upload)
1.  **Upload:** You send a document (PDF, Text, Markdown) to our API.
2.  **Process:** We extract text, clean it, and split it into semantic "chunks".
3.  **Index:** Each chunk is converted into a mathematical vector (embedding) and stored in a secure vector database.

### Phase 2: Retrieval (User Query)
1.  **Ask:** A user asks a question via the API or Chat Widget.
2.  **Search:** We find the most relevant chunks from your uploaded documents.
3.  **Generate:** We send the user's question + the relevant chunks to the LLM.
4.  **Answer:** The LLM generates an accurate answer based *only* on your data.

---

## 3. Data Ownership & Privacy

Trust is our core product feature. We offer two operating modes to satisfy different compliance requirements.

### Managed Mode (Default)
*   **Infrastructure:** Hosted by us.
*   **Data:** Stored in our encrypted, SOC-compliant cloud buckets and vector stores.
*   **Best For:** Startups, Rapid Prototyping.

### Bring Your Own (BYO) Mode
*   **Infrastructure:** Connected to **your** existing accounts.
*   **Data:** Vectors live in **your** Pinecone/Supabase instance. LLM inference happens via **your** OpenAI/Gemini account.
*   **Privacy:** We only orchestrate the pipeline. Raw data remains under your control.
*   **Best For:** Enterprise, Healthcare, Fintech.

**Our Guarantee:** We **NEVER** use your data to train our own models.

---

## 4. Quick Start (5 Minutes)

Follow these steps to deploy your first AI assistant.

### Step 1: Get your API Key
Sign up at the dashboard and navigate to **Settings > API Keys**. Create a new key.
*   *Note: Treat this key like a password. Do not share it.*

### Step 2: Upload a Document
Upload a knowledge source (e.g., your product manual).

```bash
curl -X POST https://api.rag-platform.com/v1/ingest \
  -H "x-api-key: YOUR_API_KEY" \
  -F "file=@./manual.pdf"
```

### Step 3: Ask a Question
Query the document you just uploaded.

```bash
curl -X POST https://api.rag-platform.com/v1/chat \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      { "role": "user", "content": "How do I reset my password?" }
    ]
  }'
```

---

## 5. Integration Methods

We support three primary ways to integrate the platform into your workflow.

### Option A: REST API (Backend)
Best for server-side integrations where you need full control over the UI and logic.
*   **Endpoints:** `/v1/chat`, `/v1/ingest`, `/v1/documents`
*   **Auth:** `x-api-key` header.

### Option B: JavaScript SDK (Frontend)
Best for React/Vue/Next.js applications.

```javascript
import { RAGClient } from '@rag-platform/sdk';

const client = new RAGClient({ apiKey: 'pk_live_...' });

const response = await client.chat({
  messages: [{ role: 'user', content: 'Hello' }]
});
```

### Option C: Chat Widget (No-Code)
Best for static sites or quick internal tools. Add this script tag to your `<body>`:

```html
<script 
  src="https://cdn.rag-platform.com/widget.js" 
  data-api-key="pk_live_..."
  data-company-id="your-company-uuid"
></script>
```

---

## 6. Authentication & API Keys

### API Key Types
1.  **Secret Keys (`sk_live_...`)**
    *   **Permissions:** Full access (Upload, Configure, Chat).
    *   **Usage:** Backend servers only. NEVER expose in frontend code.
2.  **Public Keys (`pk_live_...`)**
    *   **Permissions:** Chat only.
    *   **Usage:** Frontend SDKs and Widgets.

### Best Practices
*   **Rotation:** Rotate keys immediately if a developer leaves your team.
*   **Environment Variables:** Store keys in `.env` files, never in git.

---

## 7. Role-Based Access (For Companies)

If you are using this platform within a company, users are assigned specific roles to ensure safety.

| Role | Can Upload? | Can Configure? | Can Chat? | Ideal For |
| :--- | :---: | :---: | :---: | :--- |
| **Owner** | ✅ | ✅ | ✅ | CTO, VP Engineering |
| **Admin** | ✅ | ✅ | ✅ | Team Leads |
| **Employee** | ❌ | ❌ | ✅ | Support Agents, Staff |

*   **Employees** can safely use the chat interface to query internal knowledge but cannot modify the system or upload unapproved documents.

---

## 8. Uploading & Managing Knowledge

### Supported Formats
*   **PDF:** Text is extracted and page numbers are preserved as metadata.
*   **Text/Markdown:** Best for documentation and technical wikis.

### Ingestion Process
When a file is uploaded:
1.  **Status: Processing:** We parse and chunk the file.
2.  **Status: Indexing:** We generate embeddings.
3.  **Status: Ready:** The file is searchable.

### Re-indexing
If you upload a file with the same name, it is treated as a new version. The old chunks are archived to prevent duplicate answers.

---

## 9. Configuration (Owner-Only)

Owners can customize the AI pipeline in the **Settings** tab. These settings apply globally to the company workspace.

### Vector Provider
Choose where your vectors live:
*   **Platform Managed:** We handle everything.
*   **Pinecone:** Enter your API Key and Environment.
*   **Supabase:** Enter your URL and Service Key.

### LLM Provider
Choose the brain behind the answers:
*   **OpenAI:** GPT-4o, GPT-3.5-Turbo.
*   **Google:** Gemini Pro 1.5.

**Why is this restricted?**
Changing the embedding model requires re-indexing all documents. Only Owners should perform this destructive action.

---

## 10. Asking Questions (Chat API)

The chat endpoint is stateless but supports conversation history.

### Request
```json
POST /v1/chat
{
  "messages": [
    { "role": "system", "content": "You are a helpful support agent." },
    { "role": "user", "content": "What is the return policy?" }
  ],
  "conversation_id": "optional-uuid-for-threading"
}
```

### Response
```json
{
  "response": "You can return items within 30 days...",
  "sources": [
    {
      "document_id": "policy.pdf",
      "content": "Returns are accepted within 30 days of purchase...",
      "score": 0.89
    }
  ]
}
```

---

## 11. Security Best Practices

1.  **Scope your Keys:** Use Public Keys for frontend widgets.
2.  **Monitor Audit Logs:** Regularly check the **Audit** tab in the dashboard to see who uploaded or deleted documents.
3.  **Least Privilege:** Give the "Employee" role to most users. Only promote "Admins" when necessary.

---

## 12. Common Questions (FAQ)

**Q: Do you train on our data?**
A: **No.** Your data is only used to answer your specific queries. It is never used for model training.

**Q: Can employees leak data to other companies?**
A: **No.** Our system uses strict Multi-Tenancy. Data is isolated by `company_id` at the database level. An employee from Company A cannot mathematically access vectors from Company B.

**Q: Can we use our own infrastructure?**
A: **Yes.** Use "BYO Mode" to connect your own Pinecone and OpenAI accounts. We simply act as the orchestration layer.

**Q: What happens if I revoke an API key?**
A: Any active applications using that key will immediately receive `401 Unauthorized` errors.

---

## 13. Limits & Responsibilities

### Platform Guarantees
*   **Uptime:** 99.9% availability.
*   **Security:** Encryption at rest and in transit.
*   **Isolation:** Strict tenant separation.

### User Responsibilities
*   **Content:** You are responsible for the documents you upload.
*   **Keys:** You must keep your Secret Keys secure.
*   **Moderation:** While we provide safety rails, you should verify AI answers for critical use cases.

---

## 14. Glossary

*   **RAG (Retrieval-Augmented Generation):** The process of looking up relevant data before asking an AI to answer a question.
*   **Embeddings:** Converting text into numbers (vectors) so computers can understand similarity.
*   **Vector DB:** A specialized database for storing embeddings.
*   **Namespace:** A way to separate data within a vector database (used for multi-tenancy).
*   **Tenant:** A workspace or company account.
*   **BYO AI:** "Bring Your Own" AI credentials, allowing you to use your own provider accounts.
