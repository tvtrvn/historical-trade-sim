FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY pyproject.toml /app/
RUN pip install --upgrade pip && pip install -e . --no-deps && pip install \
    fastapi==0.115.0 \
    "uvicorn[standard]==0.30.6" \
    sqlalchemy==2.0.35 \
    alembic==1.13.3 \
    asyncpg==0.29.0 \
    psycopg2-binary==2.9.9 \
    aiosqlite==0.20.0 \
    greenlet==3.1.1 \
    pydantic==2.9.2 \
    pydantic-settings==2.5.2 \
    python-dotenv==1.0.1 \
    httpx==0.27.2 \
    orjson==3.10.7

COPY . /app

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && python scripts/seed.py --skip-if-seeded && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
