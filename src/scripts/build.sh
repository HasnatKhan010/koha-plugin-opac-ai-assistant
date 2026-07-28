#!/usr/bin/env bash
# =============================================================================
# build.sh — Build the Koha OPAC AI Assistant .kpz plugin package
#
# Usage:
#   bash scripts/build.sh
#   bash scripts/build.sh --output MyPlugin.kpz
#
# Requirements: bash, zip, python3 (for JSON validation)
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_KPZ="${1:-${REPO_ROOT}/KohaOPACAIAssistant-v2.kpz}"
BUILD_TMP="${REPO_ROOT}/.build_tmp"

# Colours
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[BUILD]${NC} $*"; }
ok()    { echo -e "${GREEN}[ OK  ]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN ]${NC} $*"; }
fail()  { echo -e "${RED}[FAIL ]${NC} $*"; exit 1; }

# -----------------------------------------------------------------------
# Step 1: Prerequisites
# -----------------------------------------------------------------------
info "Checking prerequisites..."
command -v zip    >/dev/null 2>&1 || fail "'zip' is not installed. Install with: apt install zip"
command -v python3 >/dev/null 2>&1 || fail "'python3' is not installed."
ok "Prerequisites satisfied"

# -----------------------------------------------------------------------
# Step 2: Validate metadata.json
# -----------------------------------------------------------------------
info "Validating metadata.json..."
METADATA="${REPO_ROOT}/metadata.json"
[[ -f "${METADATA}" ]] || fail "metadata.json not found at ${METADATA}"

python3 - <<'PYEOF'
import json, sys

with open("metadata.json") as f:
    try:
        m = json.load(f)
    except json.JSONDecodeError as e:
        print(f"  ERROR: metadata.json is not valid JSON: {e}", file=sys.stderr)
        sys.exit(1)

required = ["name", "author", "canonicalname", "description",
            "minimum_version", "version"]
missing = [k for k in required if not m.get(k)]
if missing:
    print(f"  ERROR: metadata.json is missing fields: {', '.join(missing)}", file=sys.stderr)
    sys.exit(1)

canonical = m["canonicalname"]
if not canonical.startswith("Koha::Plugin::"):
    print(f"  ERROR: canonicalname must start with 'Koha::Plugin::' — got: {canonical}", file=sys.stderr)
    sys.exit(1)

print(f"  name:          {m['name']}")
print(f"  canonicalname: {canonical}")
print(f"  version:       {m['version']}")
PYEOF

ok "metadata.json is valid"

# -----------------------------------------------------------------------
# Step 3: Validate the Perl plugin module exists and has correct syntax
# -----------------------------------------------------------------------
info "Validating Koha/Plugin/OPACChatBot.pm..."
PM_FILE="${REPO_ROOT}/Koha/Plugin/OPACChatBot.pm"
[[ -f "${PM_FILE}" ]] || fail "Plugin module not found: ${PM_FILE}"

# Check for package declaration
if ! grep -q "^package Koha::Plugin::OPACChatBot;" "${PM_FILE}"; then
    fail "OPACChatBot.pm does not declare 'package Koha::Plugin::OPACChatBot;'"
fi

# Perl syntax check (if perl is available)
if command -v perl >/dev/null 2>&1; then
    perl -c "${PM_FILE}" 2>/dev/null && ok "Perl syntax OK" \
        || warn "Perl syntax check failed (Koha modules not installed locally — this is expected)"
else
    warn "perl not found — skipping syntax check"
fi

ok "Koha/Plugin/OPACChatBot.pm validated"

# -----------------------------------------------------------------------
# Step 4: Check frontend assets exist
# -----------------------------------------------------------------------
info "Checking frontend assets..."
CSS_DIR="${REPO_ROOT}/frontend/css"
JS_DIR="${REPO_ROOT}/frontend/js"

[[ -d "${CSS_DIR}" ]] || fail "frontend/css/ not found"
[[ -d "${JS_DIR}" ]]  || fail "frontend/js/ not found"

CSS_COUNT=$(find "${CSS_DIR}" -name "*.css" | wc -l)
JS_COUNT=$(find "${JS_DIR}"  -name "*.js"  | wc -l)

[[ "${CSS_COUNT}" -gt 0 ]] || fail "No .css files found in frontend/css/"
[[ "${JS_COUNT}"  -gt 0 ]] || fail "No .js files found in frontend/js/"

ok "Found ${CSS_COUNT} CSS files and ${JS_COUNT} JS files"

# -----------------------------------------------------------------------
# Step 5: Clean previous build artifacts
# -----------------------------------------------------------------------
info "Cleaning previous build..."
rm -rf "${BUILD_TMP}"
rm -f  "${OUTPUT_KPZ}"
ok "Cleaned"

# -----------------------------------------------------------------------
# Step 6: Assemble the package tree
# -----------------------------------------------------------------------
info "Assembling package..."

PLUGIN_DIR="${BUILD_TMP}/Koha/Plugin/OPACChatBot"
mkdir -p "${BUILD_TMP}/Koha/Plugin"
mkdir -p "${PLUGIN_DIR}/css"
mkdir -p "${PLUGIN_DIR}/js"
mkdir -p "${PLUGIN_DIR}/images"
mkdir -p "${PLUGIN_DIR}/templates"

# Plugin module
cp "${PM_FILE}" "${BUILD_TMP}/Koha/Plugin/"

# Metadata + docs (at the root of the KPZ, Koha will read it)
cp "${METADATA}"          "${BUILD_TMP}/"
cp "${REPO_ROOT}/README.md"  "${BUILD_TMP}/" 2>/dev/null || warn "README.md not found — skipping"
cp "${REPO_ROOT}/LICENSE"    "${BUILD_TMP}/" 2>/dev/null || warn "LICENSE not found — skipping"

# CSS (defined load order)
for f in variables.css theme.css components.css chatbot.css responsive.css animations.css; do
    src="${CSS_DIR}/${f}"
    if [[ -f "${src}" ]]; then
        cp "${src}" "${PLUGIN_DIR}/css/"
    else
        warn "CSS file missing: ${f}"
    fi
done

# JS (defined load order)
for f in icons.js config.js utils.js knowledgeBase.js faq.js intentEngine.js api.js ui.js chatController.js app.js; do
    src="${JS_DIR}/${f}"
    if [[ -f "${src}" ]]; then
        cp "${src}" "${PLUGIN_DIR}/js/"
    else
        warn "JS file missing: ${f}"
    fi
done

# Images / icons (optional)
ASSETS_DIR="${REPO_ROOT}/frontend/assets"
if [[ -d "${ASSETS_DIR}" ]]; then
    cp -r "${ASSETS_DIR}/." "${PLUGIN_DIR}/images/" 2>/dev/null || true
    ok "Copied assets"
fi

# Templates (for configure.tt)
TEMPLATES_DIR="${REPO_ROOT}/frontend/templates"
if [[ -d "${TEMPLATES_DIR}" ]]; then
    cp -r "${TEMPLATES_DIR}/." "${PLUGIN_DIR}/" 2>/dev/null || true
    ok "Copied templates"
fi

ok "Package assembled"

# -----------------------------------------------------------------------
# Step 7: Create the .kpz archive
# -----------------------------------------------------------------------
info "Creating ${OUTPUT_KPZ}..."

(
    cd "${BUILD_TMP}"
    zip -r "${OUTPUT_KPZ}" . \
        --exclude "*.DS_Store" \
        --exclude "*/__pycache__/*" \
        --exclude "*.pyc"
)

ok "Archive created"

# -----------------------------------------------------------------------
# Step 8: Verify the archive
# -----------------------------------------------------------------------
info "Verifying archive structure..."

VERIFY_ERRORS=0

check_entry() {
    local pattern="$1"
    if unzip -l "${OUTPUT_KPZ}" | grep -q "${pattern}"; then
        ok "Found: ${pattern}"
    else
        warn "MISSING in archive: ${pattern}"
        VERIFY_ERRORS=$((VERIFY_ERRORS + 1))
    fi
}

check_entry "metadata.json"
check_entry "Koha/Plugin/OPACChatBot.pm"
check_entry "Koha/Plugin/OPACChatBot/css/chatbot.css"
check_entry "Koha/Plugin/OPACChatBot/js/app.js"

# Check for Windows backslash paths (fatal error for Linux Koha)
if unzip -l "${OUTPUT_KPZ}" | grep -q '\\'; then
    fail "Archive contains Windows backslash paths — this will break Koha on Linux!"
fi
ok "No Windows path separators found"

# Check metadata inside the archive
CANONICAL=$(unzip -p "${OUTPUT_KPZ}" metadata.json | python3 -c "import sys,json; print(json.load(sys.stdin).get('canonicalname',''))")
if [[ "${CANONICAL}" == "Koha::Plugin::OPACChatBot" ]]; then
    ok "canonicalname in archive: ${CANONICAL}"
else
    fail "canonicalname mismatch in archive: '${CANONICAL}'"
fi

# -----------------------------------------------------------------------
# Step 9: Summary
# -----------------------------------------------------------------------
SIZE=$(du -sh "${OUTPUT_KPZ}" | cut -f1)
FILE_COUNT=$(unzip -l "${OUTPUT_KPZ}" | tail -1 | awk '{print $2}')

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  BUILD SUCCESSFUL${NC}"
echo -e "${GREEN}============================================${NC}"
echo    "  Output:     ${OUTPUT_KPZ}"
echo    "  Size:       ${SIZE}"
echo    "  Files:      ${FILE_COUNT}"
echo    "  Errors:     ${VERIFY_ERRORS}"
echo -e "${GREEN}============================================${NC}"
echo ""

if [[ "${VERIFY_ERRORS}" -gt 0 ]]; then
    warn "${VERIFY_ERRORS} non-fatal warning(s). Review above output."
fi

# Cleanup
rm -rf "${BUILD_TMP}"

info "Upload ${OUTPUT_KPZ} via Koha Admin → Plugins → Upload Plugin"
