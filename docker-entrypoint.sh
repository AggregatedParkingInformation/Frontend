#!/bin/sh
set -e

# Generate runtime env for the SPA
cat > /usr/share/nginx/html/env-config.js <<EOF
window.__ENV__ = {
    VITE_API_BASE_URL: "${VITE_API_BASE_URL:-http://localhost:8080}",
    VITE_PARKING_API_URL: "${VITE_PARKING_API_URL:-http://localhost:3000}"
};
EOF

exec "$@"
