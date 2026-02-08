# Enterprise RAG Platform Technical Documentation

**Version:** 2.0.0  
**Date:** January 30, 2026  
**Status:** Production Ready

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [System Architecture](#2-system-architecture)
3. [Multi-Tenancy & Data Isolation](#3-multi-tenancy--data-isolation)
4. [Security Model](#4-security-model)
5. [Role-Based Access Control (RBAC)](#5-role-based-access-control-rbac)
6. [Configuration & Control Plane](#6-configuration--control-plane)
7. [Data Ingestion & Indexing](#7-data-ingestion--indexing)
8. [RAG Runtime Execution](#8-rag-runtime-execution)
9. [Provider Abstraction Layer](#9-provider-abstraction-layer)
10. [SDK & Widget Integration](#10-sdk--widget-integration)
11. [Audit Logs & Observability](#11-audit-logs--observability)
12. [Scalability & Performance](#12-scalability--performance)
13. [Deployment & Environment Setup](#13-deployment--environment-setup)
14. [Compliance & Enterprise Readiness](#14-compliance--enterprise-readiness)
15. [FAQ & Common Concerns](#15-faq--common-concerns)
16. [Glossary](#16-glossary)

---

## 1. Product Overview

The Enterprise RAG Platform is a specialized infrastructure designed to bridge the gap between generic Large Language Models (LLMs) and proprietary enterprise data. Unlike standard chatbots or "wrapper" applications, this platform is engineered as a **Compliance-First Retrieval-Augmented Generation (RAG) Service**.

### The Problem
Traditional RAG implementations often suffer from:
*   **Data Leakage:** Inadequate isolation between tenants or users.
*   **Vendor Lock-in:** Hard dependency on a single vector database or LLM provider.
*   **Black Box Operations:** Lack of visibility into retrieval logic and prompt construction.
*   **Security Gaps:** Missing encryption, audit trails, or proper RBAC.

### Solution & Differentiators
Our platform solves these issues through a strictly typed, multi-tenant architecture that prioritizes **Data Sovereignty**.

*   **Dual Operating Modes:**
    *   **Managed Mode:** Fully hosted infrastructure for rapid deployment.
    *   **Bring Your Own (BYO) Mode:** Enterprises connect their own Vector DB (Pinecone, Supabase) and LLM credentials (OpenAI, Gemini), ensuring raw data never leaves their controlled perimeter unnecessarily.
*   **Strict Isolation:** Logic-enforced and database-enforced (RLS) multi-tenancy.
*   **Provider Agnostic:** Plug-and-play architecture for swapping underlying AI infrastructure without code changes.

### Target Use Cases
*   **Customer Support Automation:** Auto-resolving L1 inquiries using verified knowledge bases.
*   **Internal Knowledge Search:** Securely querying HR, Legal, or Engineering documentation.
*   **Agentic Workflows:** Providing contextual memory for autonomous AI agents.

---

## 2. System Architecture

The platform follows a **Microservices-ready Monolithic Architecture**, optimized for maintainability and deployment simplicity while retaining separation of concerns.

### High-Level Components

| Component | Responsibility | Technology Stack |
| :--- | :--- | :--- |
| **API Gateway** | Request routing, AuthN/AuthZ, Rate limiting | FastAPI / Uvicorn |
| **Control Plane** | Configuration management, Tenant administration | Supabase / PostgreSQL |
| **Ingestion Engine** | Document parsing, Chunking, Embedding generation | Python / LangChain |
| **Retrieval Engine** | Vector similarity search, Hybrid search, Re-ranking | Pinecone / pgvector |
| **Generation Engine** | Context assembly, LLM orchestration, Streaming | OpenAI / Gemini |
| **Frontend Dashboard** | Tenant management, Analytics, Chat interface | React / Vite / Tailwind |

### Data Flow

1.  **Ingestion Flow:**
    `Admin Upload` -> `API Gateway` -> `Parser` -> `Chunker` -> `Embedding Model` -> `Vector Database` (Scoped by Tenant)

2.  **Retrieval & Generation Flow:**
    `User Query` -> `Auth Middleware` -> `Embedding Model` -> `Vector Search` (Namespace Filtered) -> `LLM` -> `Response`

---

## 3. Multi-Tenancy & Data Isolation

Multi-tenancy is the core invariant of the system. It is enforced at multiple layers to prevent cross-tenant data leakage.

### Tenant Model
Every resource in the system (Document, Chunk, Conversation, API Key) is strictly bound to a `company_id`.

*   **Database Level:** Row-Level Security (RLS) policies in PostgreSQL ensure that a query execution context can only access rows matching the authenticated user's `company_id`.
*   **Application Level:** All service method signatures require `company_id` as a mandatory parameter.
*   **Vector Database Level:**
    *   **Pinecone:** Uses `namespaces` derived from `company_id`.
    *   **Supabase (pgvector):** Uses a `filter` column (`company_id`) in the `match_documents` RPC function.

### Prevention of Leakage
*   **Hard Isolation:** Vectors are logically separated. A query for Company A cannot mathematically compute similarity against Company B's vectors because the search scope is restricted before the nearest-neighbor search begins.
*   **Soft Isolation:** API keys are hashed and scoped. An API key from Tenant A is invalid for any operation involving Tenant B.

---

## 4. Security Model

### Authentication Mechanisms
The platform supports dual authentication strategies depending on the client type:

1.  **Bearer Tokens (JWT):**
    *   **Used By:** Frontend Dashboard, Human Users.
    *   **Mechanism:** Standard Supabase Auth (GoTrue). Tokens are short-lived and refreshed automatically.
    *   **Context:** Provides `user_id` and `role`.

2.  **API Keys (x-api-key):**
    *   **Used By:** SDKs, Chat Widgets, Backend Integrations.
    *   **Mechanism:** Long-lived, opaque string.
    *   **Storage:** Keys are **never stored in plain text**. We store `SHA-256` hashes.
    *   **Context:** Resolves to a `company_id` and a "Service User" context.

### Encryption
*   **At Rest:** All database volumes and vector indices are encrypted by the underlying cloud providers (AWS/GCP).
*   **In Transit:** All traffic is strictly TLS 1.2+ encrypted.
*   **Secrets:** LLM and Vector DB API keys (for BYO mode) are stored encrypted in the `provider_configs` table (implementation detail: requires distinct vault or encryption column).

### Zero-Trust Principles
*   The backend does not trust the frontend to provide `company_id`. It is derived from the authenticated token/key.
*   The LLM is never sent the full database; only the top-K relevant chunks are retrieved.

---

## 5. Role-Based Access Control (RBAC)

RBAC is enforced via middleware and service-layer checks.

### Role Definitions

| Role | Scope | Permissions |
| :--- | :--- | :--- |
| **Owner** | Company | Full access. Can manage billing, delete company, manage API keys. |
| **Admin** | Company | Can manage users, upload documents, configure providers. Cannot delete company. |
| **Employee** | Company | Read-only access to documents. Can chat and generate responses. |

### Enforcement
*   **Middleware:** Parses the JWT/API Key and injects a `UserContext` object into the request scope.
*   **Service Layer:** Checks `UserContext.role` before performing sensitive actions (e.g., `delete_document` requires `Admin` or `Owner`).

---

## 6. Configuration & Control Plane

The platform moves away from hardcoded logic to a **Configuration-Driven Pipeline**.

### Configurable Parameters
Configuration is stored per-tenant in the `provider_settings` or `companies` table.
*   **Vector Provider:** `pinecone` | `supabase`
*   **LLM Provider:** `openai` | `gemini`
*   **Embedding Provider:** `openai` | `gemini`
*   **Model Parameters:** Temperature, Top-P, Chunk Size.

### Validation
Configuration updates are validated to ensure:
*   API Keys are valid (connection check).
*   Selected models are available to the provided key.
*   Fallback defaults are present if optional configs are missing.

---

## 7. Data Ingestion & Indexing

The ingestion pipeline is designed for consistency and retrievability.

### Supported Types
*   **Text Files (.txt, .md)**
*   **PDF Documents (.pdf)**

### Ingestion Workflow
1.  **Upload:** File is streamed to the server.
2.  **Parsing:** Text is extracted. Metadata (page numbers, source) is preserved.
3.  **Chunking:** Text is split using `RecursiveCharacterTextSplitter`.
    *   *Default Chunk Size:* 1000 characters.
    *   *Overlap:* 200 characters (to preserve semantic continuity).
4.  **Embedding:** Chunks are converted to vectors (e.g., 1536 dimensions for OpenAI, 768 for Gemini).
5.  **Upsert:** Vectors are pushed to the configured provider with `company_id` metadata.

### Versioning
Documents track `version` and `updated_at`. Re-uploading a document with the same name triggers a version increment and archival of old chunks (or overwrite, depending on policy).

---

## 8. RAG Runtime Execution

The query lifecycle is optimized for low latency (<2s).

1.  **Query Analysis:** The user's question is received.
2.  **Embedding:** The question is embedded using the *same* model used for ingestion.
3.  **Hybrid Search (Optional):** Keywords + Vector similarity.
4.  **Retrieval:** Top 5-10 chunks are fetched from the Vector DB.
    *   *Filter:* `namespace == company_id`.
5.  **Context Assembly:** Chunks are formatted into a system prompt.
6.  **Generation:** The LLM generates a response based *strictly* on the provided context.
7.  **Citation:** The system returns the `source_id` of chunks used in the answer.

---

## 9. Provider Abstraction Layer

To avoid vendor lock-in, the system uses the `Strategy Pattern`.

### Architecture
*   **Abstract Base Classes:** `VectorProvider`, `LLMProvider`, `EmbeddingProvider`.
*   **Concrete Implementations:**
    *   `PineconeVectorProvider`
    *   `SupabaseVectorProvider`
    *   `OpenAIProvider`
    *   `GeminiProvider`
*   **Factory:** A `ProviderFactory` instantiates the correct class at runtime based on the tenant's configuration.

### BYO Security
When a tenant brings their own key, the system instantiates a transient provider instance using *their* key for that specific request. The platform's global keys are used only for Managed Mode tenants.

---

## 10. SDK & Widget Integration

### SDK Philosophy
The SDK is a thin wrapper around the HTTP API, handling:
*   Authentication (API Key injection).
*   Session management (`conversation_id`).
*   Type safety (TypeScript definitions).

### Widget Flow
1.  Customer embeds `<script>` tag.
2.  Widget initializes with `company_id`.
3.  Widget authenticates via a public API key (restricted scope).
4.  Chat interface renders in an iframe or shadow DOM to prevent style conflicts.

---

## 11. Audit Logs & Observability

Enterprise compliance requires "Who did what, when?"

### Logged Actions
*   `DOCUMENT_UPLOAD`: User X uploaded File Y.
*   `DOCUMENT_DELETE`: User X deleted File Y.
*   `CONFIG_UPDATE`: User X changed provider from OpenAI to Gemini.
*   `API_KEY_CREATE`: User X created a new API key.

### Storage
Audit logs are stored in an immutable `audit_logs` table in PostgreSQL, protected by strict RLS (users can read their company's logs, but never modify/delete).

---

## 12. Scalability & Performance

### Horizontal Scalability
*   **Stateless Backend:** The Python API is stateless. It can be scaled horizontally (Kubernetes replicas) behind a load balancer.
*   **Vector DB:** Offloaded to specialized services (Pinecone/Supabase) which handle sharding and scaling independently.

### Bottlenecks
*   **LLM Latency:** The slowest component. Mitigated via streaming responses.
*   **Embedding Throughput:** Mitigated via async/batch processing during ingestion.

---

## 13. Deployment & Environment Setup

### Required Services
1.  **Application Server:** Python 3.9+ (FastAPI).
2.  **Database:** PostgreSQL 15+ (with `pgvector` extension).
3.  **Auth Service:** Supabase GoTrue or Keycloak.

### Environment Variables
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=ey...
OPENAI_API_KEY=sk-... (Default fallback)
PINECONE_API_KEY=pc-... (Default fallback)
ENV=production
```

---

## 14. Compliance & Enterprise Readiness

### Data Ownership
*   **Vectors:** Owned by the tenant.
*   **Documents:** Stored in tenant-isolated buckets (if using S3/Storage) or database rows.
*   **Export:** Tenants can export their raw text data at any time.

### SOC/ISO Alignment
The system architecture aligns with SOC 2 principles:
*   **Security:** Encryption, WAF, RBAC.
*   **Availability:** Redundant services.
*   **Confidentiality:** Strict data isolation.
*   **Processing Integrity:** Audit logs and validation.

---

## 15. FAQ & Common Concerns

**Q: Do you train on our data?**
A: No. The platform uses pre-trained models (frozen weights). Data is only sent to the LLM for temporary inference (context window) and is not used for model training by default (dependent on provider terms, e.g., OpenAI Enterprise does not train).

**Q: Who owns the embeddings?**
A: The customer owns the vector representations of their data.

**Q: What happens if we rotate an API key?**
A: The old key is immediately invalidated. Active streams may terminate. You must update your applications with the new key.

**Q: Can we run this on-premise?**
A: Yes. The "BYO" architecture allows the backend to be deployed in a VPC, connecting to local LLMs (e.g., Llama 2 via vLLM) and local Postgres.

---

## 16. Glossary

*   **RAG (Retrieval-Augmented Generation):** A technique to optimize LLM output by referencing an authoritative knowledge base outside its training data.
*   **Chunking:** Splitting large documents into smaller, semantic segments for efficient retrieval.
*   **Embedding:** A numerical representation (vector) of text meaning.
*   **Vector DB:** A database optimized for storing and querying high-dimensional vectors.
*   **Namespace:** A logical partition within a vector database used to isolate tenant data.
*   **Tenant:** A single customer organization (Company) within the platform.
