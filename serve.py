#!/usr/bin/env python3
"""Tiny static server for this page.

Always sends no-store headers so the preview never shows a stale copy after an
edit. Usage: python3 serve.py [port]
"""
import http.server
import json
import os
import socketserver
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 3000

# only things the page can actually load should trigger a reload; screenshots
# written into artifacts/ (or a node_modules install) must not reload the page
WATCHED = {".html", ".css", ".js", ".svg", ".png", ".jpg", ".jpeg", ".webp",
           ".gif", ".mp3", ".wav", ".ogg", ".m4a", ".woff", ".woff2", ".json"}
IGNORED_DIRS = {"artifacts", "node_modules", "__pycache__", ".git", ".cache"}


def build_stamp():
    """Newest mtime of everything the page can load."""
    newest = 0.0
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [
            d for d in dirnames if d not in IGNORED_DIRS and not d.startswith(".")
        ]
        for name in filenames:
            if os.path.splitext(name)[1].lower() not in WATCHED:
                continue
            try:
                newest = max(newest, os.path.getmtime(os.path.join(dirpath, name)))
            except OSError:
                pass
    return newest


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        # dev-only endpoint: lets the open preview reload itself after an edit
        if self.path.split("?")[0] == "/__build":
            body = json.dumps({"mtime": build_stamp()}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        print("%s - %s" % (self.address_string(), fmt % args), flush=True)


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    os.chdir(ROOT)
    with Server(("0.0.0.0", PORT), Handler) as httpd:
        print("serving %s on 0.0.0.0:%d (no-cache)" % (ROOT, PORT), flush=True)
        httpd.serve_forever()
