import { NextResponse } from "next/server";

import {
  DEFAULT_LOCAL_JUDGMENTKIT_CHECKOUT_PATH,
  JUDGMENTKIT_REPOSITORY_CLONE_URL,
} from "@/lib/constants";

function createBootstrapScript() {
  return `#!/usr/bin/env bash
set -euo pipefail

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd git
require_cmd node
require_cmd npm

CHECKOUT_PATH="${DEFAULT_LOCAL_JUDGMENTKIT_CHECKOUT_PATH.replace("$HOME", "${HOME}")}"
ARGS=("$@")
FORWARDED_ARGS=()

for ((index = 0; index < \${#ARGS[@]}; index += 1)); do
  if [[ "\${ARGS[$index]}" == "--path" ]]; then
    CHECKOUT_PATH="\${ARGS[$((index + 1))]}"
    index=$((index + 1))
    continue
  fi

  FORWARDED_ARGS+=("\${ARGS[$index]}")
done

if [[ ! -d "$CHECKOUT_PATH/.git" ]]; then
  mkdir -p "$(dirname "$CHECKOUT_PATH")"
  git clone "${JUDGMENTKIT_REPOSITORY_CLONE_URL}" "$CHECKOUT_PATH"
fi

cd "$CHECKOUT_PATH"
npm install
exec node --import tsx ./scripts/install-mcp.ts --path "$CHECKOUT_PATH" "\${FORWARDED_ARGS[@]}"
`;
}

export function GET() {
  return new NextResponse(createBootstrapScript(), {
    headers: {
      "content-type": "text/x-shellscript; charset=utf-8",
    },
  });
}
