# syntax=docker/dockerfile:1

FROM --platform=$BUILDPLATFORM node:24-slim AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json frontend/.npmrc ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.13-slim AS builder
COPY --from=ghcr.io/astral-sh/uv:0.13.1 /uv /bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=0
WORKDIR /app
COPY pyproject.toml uv.lock .python-version ./
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev --no-install-project
COPY README.md LICENSE ./
COPY src/ src/
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev --no-editable

FROM python:3.13-slim
RUN useradd --system --uid 10001 --no-create-home app
WORKDIR /app
COPY --from=builder /app/.venv /app/.venv
COPY --from=frontend /frontend/dist /app/static
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    OPAPRIKKIE_HOST=0.0.0.0 \
    OPAPRIKKIE_STATIC_DIR=/app/static
USER app
EXPOSE 8000
ARG VERSION COMMIT
LABEL org.opencontainers.image.source="https://github.com/RamsesKools/opaprikkie-simulator" \
      org.opencontainers.image.version="$VERSION" \
      org.opencontainers.image.revision="$COMMIT"
CMD ["opaprikkie", "serve"]
