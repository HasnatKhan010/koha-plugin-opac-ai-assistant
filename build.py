#!/usr/bin/env python3
"""Build the client KPZ from the self-contained plugin source in src/."""

import hashlib
import json
import re
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "src"
OUTPUT = ROOT / "dist" / "Koha-OPAC-AI-Assistant-1.4.6-portable.kpz"

ASSET_ROOT = SOURCE / "Koha/Plugin/OPACChatBot"


def rebuild_bundle(folder, names, separator):
    content = "".join(
        f"/* === {name} === */\n" + (ASSET_ROOT / folder / name).read_text() + separator
        for name in names
    )
    (ASSET_ROOT / folder / f"bundle.{folder}").write_text(content)


rebuild_bundle(
    "css",
    "variables.css theme.css components.css chatbot.css responsive.css animations.css compare.css".split(),
    "\n",
)
rebuild_bundle(
    "js",
    "icons.js config.js utils.js knowledgeBase.js faq.js intentEngine.js api.js ui.js chatController.js compare.js app.js".split(),
    "\n;\n",
)

metadata = json.loads((SOURCE / "metadata.json").read_text())
assert metadata["canonicalname"] == "Koha::Plugin::OPACChatBot"
assert metadata["version"] == "1.4.6"
required = [
    "metadata.json",
    "Koha/Plugin/OPACChatBot.pm",
    "Koha/Plugin/OPACChatBot/Controller.pm",
    "Koha/Plugin/OPACChatBot/Search.pm",
    "Koha/Plugin/OPACChatBot/Match.pm",
    "Koha/Plugin/OPACChatBot/configure.tt",
    "Koha/Plugin/OPACChatBot/css/bundle.css",
    "Koha/Plugin/OPACChatBot/js/bundle.js",
    "Koha/Plugin/OPACChatBot/images/logo.svg",
    "Koha/Plugin/OPACChatBot/ocr/zxing.min.js",
    "Koha/Plugin/OPACChatBot/ocr/tesseract.min.js",
    "Koha/Plugin/OPACChatBot/ocr/worker.min.js",
    "Koha/Plugin/OPACChatBot/ocr/eng.traineddata.gz",
    "Koha/Plugin/OPACChatBot/ocr/tesseract-core.wasm.js",
    "Koha/Plugin/OPACChatBot/ocr/tesseract-core-simd.wasm.js",
    "Koha/Plugin/OPACChatBot/ocr/tesseract-core-lstm.wasm.js",
    "Koha/Plugin/OPACChatBot/ocr/tesseract-core-simd-lstm.wasm.js",
    "Koha/Plugin/OPACChatBot/import/pdf.mjs",
    "Koha/Plugin/OPACChatBot/import/pdf.worker.mjs",
    "Koha/Plugin/OPACChatBot/import/mammoth.browser.min.js",
    "Koha/Plugin/OPACChatBot/import/xlsx.full.min.js",
]
for name in required:
    assert (SOURCE / name).is_file(), f"Missing {name}"

module = (SOURCE / "Koha/Plugin/OPACChatBot.pm").read_text()
assert re.search(r"our \$VERSION = '1\.4\.6'", module)
for path in SOURCE.rglob("*"):
    if path.is_file():
        data = path.read_bytes()
        if path.suffix in {".pm", ".js", ".css", ".tt", ".json"}:
            assert not any(
                marker in data
                for marker in (b"127.0.0.1:8000", b"localhost:8000", b"/home/hasnat/")
            ), f"Local dependency in {path}"

OUTPUT.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(OUTPUT, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(SOURCE.rglob("*")):
        if path.is_file():
            name = path.relative_to(SOURCE).as_posix()
            entry = zipfile.ZipInfo(name, date_time=(2026, 8, 17, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o644 << 16
            archive.writestr(entry, path.read_bytes())

with zipfile.ZipFile(OUTPUT) as archive:
    assert archive.testzip() is None
    assert set(required).issubset(archive.namelist())

digest = hashlib.sha256(OUTPUT.read_bytes()).hexdigest()
print(f"{OUTPUT}\nSHA256 {digest}")
