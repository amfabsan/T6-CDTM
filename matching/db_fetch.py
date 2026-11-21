"""Acceso directo a Postgres para matching/api.py cuando no hay SUPABASE_URL/SUPABASE_KEY pero sí DATABASE_URL.

Traduce las mismas rutas estilo PostgREST que usa api.py:
  - "<tabla>?col=eq.<v>&select=*&order=<col>.desc&limit=<n>"  → SELECT con filtros de igualdad
  - "rpc/<función>" + body {param: valor}                        → SELECT <función>(param => valor::tipo)
Solo lectura: no ejecuta nada que no sea SELECT.
"""
from __future__ import annotations

import os
import re
import urllib.parse
from functools import lru_cache
from typing import Any

import psycopg
from psycopg import sql
from psycopg.rows import tuple_row
from psycopg.types.json import Jsonb

_IDENT = re.compile(r"^[a-z_][a-z0-9_]*$")


def _conn():
    c = psycopg.connect(os.environ["DATABASE_URL"], autocommit=True, row_factory=tuple_row)
    c.execute("set search_path = public, extensions")
    return c


@lru_cache(maxsize=None)
def _signature(fn: str) -> tuple[bool, dict[str, str]]:
    """(devuelve un conjunto, {parámetro: tipo}) de una función pública."""
    with _conn() as c:
        row = c.execute(
            """select p.proretset, p.proargnames, array(select format_type(t, null) from unnest(p.proargtypes) t)
               from pg_proc p join pg_namespace n on n.oid = p.pronamespace
               where n.nspname = 'public' and p.proname = %s order by p.pronargs desc limit 1""", (fn,)).fetchone()
    if not row:
        raise LookupError(f"función {fn} no existe")
    retset, names, types = row
    return retset, dict(zip(names or [], types))


def db_fetch(path: str, body: dict | None = None) -> Any:
    if path.startswith("rpc/"):
        fn = path[4:]
        if not _IDENT.match(fn):
            raise ValueError(f"función no válida: {fn}")
        retset, params = _signature(fn)
        args, vals = [], []
        for k, v in (body or {}).items():
            if k not in params:
                raise ValueError(f"{fn}: parámetro desconocido {k}")
            args.append(sql.SQL("{} => %s::{}").format(sql.Identifier(k), sql.SQL(params[k])))
            vals.append(Jsonb(v) if params[k] in ("jsonb", "json") else v)
        call = sql.SQL("{}({})").format(sql.Identifier(fn), sql.SQL(", ").join(args))
        q = (sql.SQL("select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from {} r").format(call) if retset
             else sql.SQL("select to_jsonb({})").format(call))
        with _conn() as c:
            return c.execute(q, vals).fetchone()[0]

    table, _, qs = path.partition("?")
    if not _IDENT.match(table):
        raise ValueError(f"tabla no válida: {table}")
    where, vals, order, limit = [], [], None, None
    for key, value in urllib.parse.parse_qsl(qs, keep_blank_values=True):
        if key == "select":
            continue
        if key == "order":
            col, _, direction = value.partition(".")
            order = sql.SQL(" order by {} {}").format(sql.Identifier(col), sql.SQL("desc" if direction == "desc" else "asc"))
        elif key == "limit":
            limit = int(value)
        elif value.startswith("eq."):
            where.append(sql.SQL("{}::text = %s").format(sql.Identifier(key)))
            vals.append(value[3:])
        else:
            raise ValueError(f"filtro no soportado: {key}={value}")
    q = sql.SQL("select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from (select * from {}{}{}{}) t").format(
        sql.Identifier(table),
        sql.SQL(" where ") + sql.SQL(" and ").join(where) if where else sql.SQL(""),
        order or sql.SQL(""),
        sql.SQL(" limit {}").format(sql.Literal(limit)) if limit is not None else sql.SQL(""))
    with _conn() as c:
        return c.execute(q, vals).fetchone()[0]
