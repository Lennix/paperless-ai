# Paperless-AI (Lennix Fork)

A security-hardened fork of [Walchshofer/paperless-ai](https://github.com/Walchshofer/paperless-ai), which builds on [clusterzx/paperless-ai](https://github.com/clusterzx/paperless-ai).

**Paperless-AI** is an AI-powered extension for [Paperless-ngx](https://github.com/paperless-ngx/paperless-ngx) that brings automatic document classification, smart tagging, and semantic search using OpenAI-compatible APIs and Ollama.

---

## Fork Lineage

```
clusterzx/paperless-ai (upstream)
    └── Walchshofer/paperless-ai (Visual RAG, Expert Pipeline, Bridge v4.0)
            └── Lennix/paperless-ai (this fork - security fixes + document type enforcement)
```

---

## What This Fork Adds

### Security Fixes

| Fix | Description |
|-----|-------------|
| **SEC-001: SSRF Prevention** | Blocks requests to private IPs, localhost, and cloud metadata endpoints |
| **SEC-001: Code Injection Fix** | Removed `new Function()` from external API transform (replaced with safe JSON path extraction) |
| **SEC-002: urllib3 CVE-2026-21441** | Updated to urllib3>=2.6.3 to fix decompression bomb vulnerability |
| **Dependency Updates** | jsonwebtoken ^9.0.3 (fixes HMAC signature verification) |

### Bug Fixes

| Fix | Description |
|-----|-------------|
| **RESTRICT_TO_EXISTING_DOCUMENT_TYPES** | Now properly enforced - AI suggestions that don't match existing types are skipped instead of creating new ones |
| **Merge Conflict Cleanup** | Resolved leftover conflict markers in ExpertPipelineExecutor.js and PromptRegistry.js |

---

## Features (from Walchshofer fork)

- **Visual Signal Analyzer** - Multimodal document analysis with vision models
- **Expert Pipeline** - Domain-specific extraction (Financial, Legal, Medical)
- **Bridge v4.0** - Async-native MCP bridge with pipelined concurrency
- **Enhanced Paperless API** - Document download, merge, rotate, reprocess
- **RAG-Based Chat** - Semantic document search and Q&A

---

## Installation

### Docker (Recommended)

```yaml
paperless-ai:
  image: paperless-ai:lennix
  pull_policy: never
  environment:
    - PAPERLESS_API_URL=http://your-paperless:8000/api
    - PAPERLESS_API_TOKEN=your-token
    - AI_PROVIDER=ollama
    - OLLAMA_API_URL=http://your-ollama:11434
    - OLLAMA_MODEL=qwen3:4b
    - RESTRICT_TO_EXISTING_TAGS=yes
    - RESTRICT_TO_EXISTING_CORRESPONDENTS=yes
    - RESTRICT_TO_EXISTING_DOCUMENT_TYPES=yes
    # PostgreSQL (required for pgvector/RAG features)
    - POSTGRES_HOST=your-postgres-host
    - POSTGRES_USER=paperless
    - POSTGRES_PASSWORD=your-password
    - POSTGRES_DB=paperless
  volumes:
    - ./paperless-ai-data:/app/data
  ports:
    - "3000:3000"
```

### Build from Source

```bash
git clone https://github.com/Lennix/paperless-ai.git
cd paperless-ai
git checkout feature/security-and-enum-fixes
docker build -t paperless-ai:lennix .
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RESTRICT_TO_EXISTING_DOCUMENT_TYPES` | `no` | When `yes`, only use existing document types |
| `RESTRICT_TO_EXISTING_TAGS` | `no` | When `yes`, only use existing tags |
| `RESTRICT_TO_EXISTING_CORRESPONDENTS` | `no` | When `yes`, only use existing correspondents |
| `DISABLE_URL_VALIDATION` | `no` | Set to `yes` to disable SSRF protection (not recommended) |
| `DISABLE_EXTERNAL_API_URL_VALIDATION` | `no` | Set to `yes` to allow external API calls to private IPs |

### External API Transform

The external API transform now uses safe JSON path extraction instead of code execution:

```env
# Old (insecure): EXTERNAL_API_TRANSFORM=return data.results[0]
# New (safe): EXTERNAL_API_TRANSFORM=results.0
```

Supported path syntax:
- `data.results` - Access nested properties
- `items.0` - Access array index
- `response.data.items.0.value` - Chained access

---

## Credits

- [clusterzx](https://github.com/clusterzx) - Original Paperless-AI
- [Walchshofer](https://github.com/Walchshofer) - Visual RAG, Expert Pipeline, extensive refactoring
- [mKenfenheuer](https://github.com/mKenfenheuer) - Document type enum fix inspiration
- [admonstrator](https://github.com/admonstrator) - Security fixes (SEC-001, SEC-002, SEC-003)

---

## License

MIT License - See [LICENSE](LICENSE) for details.
