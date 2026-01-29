FROM python:3.11-slim

RUN pip install --no-cache-dir fpdf2 python-docx

RUN useradd -m appuser
WORKDIR /work
RUN chown -R appuser:appuser /work

ENV PYTHONUNBUFFERED=1
USER appuser
