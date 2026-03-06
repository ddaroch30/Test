# QA Accelerator Prototype (Jira + Zephyr)

This is a static frontend prototype with two pages:

- `index.html` — connection setup (Jira + Zephyr)
- `release.html` — release requirement selection, test-case generation/review, and prototype push

## Quick Preview

From the project root:

```bash
cd /workspace/Test
python3 -m http.server 8000
```

Then open:

- http://127.0.0.1:8000/index.html
- http://127.0.0.1:8000/release.html

## Why you might see “Not Found” in a screenshot

Common causes:

1. Server is not running.
2. Server is started from a different directory than `/workspace/Test`.
3. Screenshot/playwright uses the wrong route (for example `/` on a different host/port).

## Sanity Check Commands

Use these from `/workspace/Test` while the server is running:

```bash
curl -i http://127.0.0.1:8000/
curl -i http://127.0.0.1:8000/index.html
curl -i http://127.0.0.1:8000/release.html
```

Expected: all should return `HTTP/1.0 200 OK`.
