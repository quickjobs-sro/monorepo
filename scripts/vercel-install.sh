#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${BITBUCKET_API_JS_USERNAME:-}" || "${BITBUCKET_API_JS_USERNAME:-}" == '""' || "${BITBUCKET_API_JS_USERNAME:-}" == "''" ]]; then
  echo "Missing BITBUCKET_API_JS_USERNAME. Set it to a real Bitbucket username, or x-token-auth for a repository/project/workspace access token." >&2
  exit 1
fi

if [[ -z "${BITBUCKET_API_JS_TOKEN:-}" || "${BITBUCKET_API_JS_TOKEN:-}" == '""' || "${BITBUCKET_API_JS_TOKEN:-}" == "''" ]]; then
  echo "Missing BITBUCKET_API_JS_TOKEN. Set it to a real Bitbucket app password or access token with read access to quickjobs/api-js." >&2
  exit 1
fi

export BITBUCKET_API_JS_USERNAME BITBUCKET_API_JS_TOKEN

printf 'machine bitbucket.org\nlogin %s\npassword %s\n' \
  "$BITBUCKET_API_JS_USERNAME" \
  "$BITBUCKET_API_JS_TOKEN" > "$HOME/.netrc"
chmod 600 "$HOME/.netrc"

git_askpass="$(mktemp)"
cat > "$git_askpass" <<'EOF'
#!/usr/bin/env bash
case "$1" in
  *Username*) printf '%s\n' "$BITBUCKET_API_JS_USERNAME" ;;
  *Password*) printf '%s\n' "$BITBUCKET_API_JS_TOKEN" ;;
  *) printf '\n' ;;
esac
EOF
chmod 700 "$git_askpass"
export GIT_ASKPASS="$git_askpass"
export GIT_TERMINAL_PROMPT=0

git ls-remote --heads https://bitbucket.org/quickjobs/api-js.git >/dev/null
yarn install --frozen-lockfile
