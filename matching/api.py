"""Servicio HTTP de match-candidates (pasos 7-10) para que Lovable lo llame. Python porque las edge functions
de Supabase solo ejecutan Deno.

    pip install -r matching/requirements.txt
    $env:SUPABASE_URL = "https://<ref>.supabase.co"; $env:SUPABASE_KEY = "<anon o service_role>"   # nunca en el repo
    uvicorn matching.api:app --port 8000

POST /match         {"project_id": "<uuid>", "options": {...}}   lee project_requirements + candidatos_proyecto + perfiles
POST /match/direct  {"requirements": {...}, "candidates_by_role": {...}, "options": {...}}   sin base de datos
`options` = argumentos con nombre de run_matching (top, min_score, sort_by, team_filters, rate_per_hour…).
"""
from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from typing import Any, Callable

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .contract import candidates_from_rpc
from .pipeline import run_matching

OPTIONS = {"weights", "ref_year", "strict", "min_eligible_score", "top", "min_score", "pool_size", "beam", "max_exhaustive",
           "hours_per_person", "rate_per_hour", "rolloff_days", "sort_by", "team_filters", "top_n_teams"}


def supabase_fetch(path: str, body: dict | None = None) -> Any:
    """GET (body None) o POST a la API REST de Supabase. Credenciales solo desde el entorno."""
    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY")
    if not url or not key:
        raise HTTPException(500, "Faltan SUPABASE_URL / SUPABASE_KEY en el entorno")
    req = urllib.request.Request(f"{url.rstrip('/')}/rest/v1/{path}", method="POST" if body is not None else "GET",
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def match_project(project_id: str, options: dict, fetch: Callable[[str, dict | None], Any] = supabase_fetch) -> dict:
    rows = fetch(f"project_requirements?id=eq.{urllib.parse.quote(project_id)}&select=*", None)
    if not rows:
        raise HTTPException(404, f"project_requirements {project_id} no existe")
    rpc = fetch("rpc/candidatos_proyecto", {"p_project_id": project_id})
    ids = sorted({c["employee_id"] for r in rpc for c in r["candidates"]})
    profiles = fetch("rpc/perfiles", {"p_ids": ids}) if ids else []
    out = run_matching(rows[0], candidates_from_rpc(rpc, profiles), **_opts(options))
    out["n_filtrados"] = {r["title"]: r.get("n_filtrados") for r in rpc}
    return out


def _opts(options: dict | None) -> dict:
    bad = set(options or {}) - OPTIONS
    if bad:
        raise HTTPException(422, f"Opciones desconocidas: {sorted(bad)}")
    return options or {}


class MatchRequest(BaseModel):
    project_id: str
    options: dict = {}


class DirectRequest(BaseModel):
    requirements: dict
    candidates_by_role: dict[str, list[dict]]
    options: dict = {}


app = FastAPI(title="ORBIT AI · match-candidates")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])  # demo sin login


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/match")
def match(req: MatchRequest):
    return match_project(req.project_id, req.options)


@app.post("/match/direct")
def match_direct(req: DirectRequest):
    return run_matching(req.requirements, req.candidates_by_role, **_opts(req.options))
