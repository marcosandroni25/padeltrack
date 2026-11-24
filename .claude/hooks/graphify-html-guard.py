#!/usr/bin/env python3
"""Extiende el modo estricto de graphify a padeltrack.html.

El guard de graphify solo bloquea lecturas de extensiones de código conocidas
y no tiene en cuenta el `language.html=.jsx` de .graphifyrc. Este hook aplica la
misma regla a los .html del proyecto: la primera lectura de la sesión se bloquea
si no hubo un `graphify query/explain/path` reciente. Comparte el marcador de
sesión de graphify, así que entre ambos hooks hay un solo bloqueo por sesión.
Se desactiva igual que graphify: GRAPHIFY_HOOK_STRICT=0.
"""
import json, os, re, sys, time
from pathlib import Path

def main():
    if os.environ.get("GRAPHIFY_HOOK_STRICT", "1").strip().lower() in ("0", "false", "no", "off"):
        return
    try:
        d = json.load(sys.stdin)
    except Exception:
        return
    if d.get("tool_name") != "Read":
        return
    fp = str((d.get("tool_input") or {}).get("file_path") or "")
    if not fp.lower().endswith(".html"):
        return
    root = Path(os.environ.get("CLAUDE_PROJECT_DIR") or d.get("cwd") or os.getcwd()).resolve()
    out = root / "graphify-out"
    try:
        target = Path(fp) if os.path.isabs(fp) else root / fp
        target.resolve().relative_to(root)
    except (ValueError, OSError):
        return
    if not (out / "graph.json").exists():
        return
    ttl = float(os.environ.get("GRAPHIFY_HOOK_STRICT_TTL", "1800"))
    try:
        if time.time() - (out / "cache" / "last_query_stamp").stat().st_mtime < ttl:
            return
    except OSError:
        pass
    sid = re.sub(r"[^A-Za-z0-9_-]", "_", str(d.get("session_id") or ""))[:64]
    if not sid:
        return
    try:
        markers = out / "cache" / "hook_sessions"
        markers.mkdir(parents=True, exist_ok=True)
        os.close(os.open(str(markers / f"{sid}.denied"), os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644))
    except OSError:
        return
    rel = os.path.relpath(str(target.resolve()), str(root))
    reason = ("graphify strict mode: este proyecto tiene un mapa en graphify-out/graph.json "
              f"que cubre {rel}. Corre primero `graphify query \"<tu pregunta>\"` "
              "(o `graphify explain` / `graphify path`) y vuelve a pedir esta lectura: "
              "se va a permitir. Este bloqueo ocurre una sola vez por sesión.")
    print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse",
          "permissionDecision": "deny", "permissionDecisionReason": reason}}, ensure_ascii=False))

if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass
