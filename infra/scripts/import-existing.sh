#!/usr/bin/env bash
# Import existing AWS resources into Terraform state.
# Run once after initial `terraform init`.
# Usage: bash infra/scripts/import-existing.sh
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Read region from terraform.tfvars to avoid AWS CLI default region mismatch
REGION=$(grep 'aws_region' terraform.tfvars 2>/dev/null | sed 's/.*"\(.*\)".*/\1/' || echo "eu-west-1")
AWS="aws --region ${REGION}"
ACCOUNT_ID=$($AWS sts get-caller-identity --query Account --output text)

echo "=== Importing existing AWS resources into Terraform ==="
echo "    Region: ${REGION} | Account: ${ACCOUNT_ID}"
echo ""

# ── DynamoDB Tables ──
echo "[1/9] DynamoDB tables..."
terraform import aws_dynamodb_table.sessions sessions 2>/dev/null || echo "  sessions: already imported or not found"
terraform import aws_dynamodb_table.canvas_pixels canvas_pixels 2>/dev/null || echo "  canvas_pixels: already imported or not found"
terraform import aws_dynamodb_table.rate_limits rate_limits 2>/dev/null || echo "  rate_limits: already imported or not found"
terraform import aws_dynamodb_table.ws_connections ws_connections 2>/dev/null || echo "  ws_connections: already imported or not found"

# ── S3 Bucket ──
echo "[2/9] S3 bucket..."
BUCKET_NAME="pixel-canvas-${ACCOUNT_ID}-${REGION}-snapshots"
terraform import aws_s3_bucket.snapshots "$BUCKET_NAME" 2>/dev/null || echo "  snapshots bucket: already imported or not found"
terraform import aws_s3_bucket_public_access_block.snapshots "$BUCKET_NAME" 2>/dev/null || echo "  snapshots public access block: already imported or not found"

# ── IAM Roles ──
echo "[3/9] IAM roles..."
ROLES=(
  "lambda_main:pixel-canvas-lambda-main-role"
  "lambda_draw:pixel-canvas-lambda-draw-role"
  "lambda_canvas:pixel-canvas-lambda-canvas-role"
  "lambda_session:pixel-canvas-lambda-session-role"
  "lambda_snapshot:pixel-canvas-lambda-snapshot-role"
  "lambda_ws:pixel-canvas-lambda-ws-role"
  "lambda_broadcast:pixel-canvas-lambda-broadcast-role"
)
for entry in "${ROLES[@]}"; do
  tf_name="${entry%%:*}"
  aws_name="${entry##*:}"
  terraform import "aws_iam_role.${tf_name}" "$aws_name" 2>/dev/null || echo "  ${aws_name}: already imported or not found"
done

# ── Lambda Functions ──
echo "[4/9] Lambda functions..."
LAMBDAS=(main draw canvas session snapshot ws-connect ws-disconnect broadcast)
for lambda in "${LAMBDAS[@]}"; do
  terraform import "aws_lambda_function.this[\"${lambda}\"]" "pixel-canvas-${lambda}" 2>/dev/null || echo "  pixel-canvas-${lambda}: already imported or not found"
done

# ── API Gateway HTTP ──
echo "[5/9] HTTP API Gateway..."
HTTP_API_ID=$($AWS apigatewayv2 get-apis --query "Items[?Name=='pixel-canvas-discord-http'].ApiId | [0]" --output text 2>/dev/null || echo "")
if [ -n "$HTTP_API_ID" ] && [ "$HTTP_API_ID" != "None" ]; then
  terraform import aws_apigatewayv2_api.http "$HTTP_API_ID" 2>/dev/null || echo "  HTTP API: already imported"
  terraform import aws_apigatewayv2_stage.http "${HTTP_API_ID}/prod" 2>/dev/null || echo "  HTTP stage: already imported"

  INTEGRATION_ID=$($AWS apigatewayv2 get-integrations --api-id "$HTTP_API_ID" --query "Items[0].IntegrationId" --output text 2>/dev/null || echo "")
  if [ -n "$INTEGRATION_ID" ] && [ "$INTEGRATION_ID" != "None" ]; then
    terraform import aws_apigatewayv2_integration.main "${HTTP_API_ID}/${INTEGRATION_ID}" 2>/dev/null || echo "  HTTP integration: already imported"
  fi

  ROUTE_ID=$($AWS apigatewayv2 get-routes --api-id "$HTTP_API_ID" --query "Items[?RouteKey=='POST /discord/interactions'].RouteId | [0]" --output text 2>/dev/null || echo "")
  if [ -n "$ROUTE_ID" ] && [ "$ROUTE_ID" != "None" ]; then
    terraform import aws_apigatewayv2_route.discord_interactions "${HTTP_API_ID}/${ROUTE_ID}" 2>/dev/null || echo "  HTTP route: already imported"
  fi
else
  echo "  HTTP API not found — will be created by Terraform"
fi

# ── API Gateway WebSocket ──
echo "[6/9] WebSocket API Gateway..."
WS_API_ID=$($AWS apigatewayv2 get-apis --query "Items[?Name=='pixel-canvas-realtime-ws'].ApiId | [0]" --output text 2>/dev/null || echo "")
if [ -n "$WS_API_ID" ] && [ "$WS_API_ID" != "None" ]; then
  terraform import aws_apigatewayv2_api.ws "$WS_API_ID" 2>/dev/null || echo "  WS API: already imported"
  terraform import aws_apigatewayv2_stage.ws "${WS_API_ID}/prod" 2>/dev/null || echo "  WS stage: already imported"

  ROUTES=$($AWS apigatewayv2 get-routes --api-id "$WS_API_ID" --output json 2>/dev/null || echo '{"Items":[]}')

  CONNECT_ROUTE_ID=$(echo "$ROUTES" | python3 -c "import sys,json; items=json.load(sys.stdin).get('Items',[]); print(next((r['RouteId'] for r in items if r.get('RouteKey')=='\$connect'),''))" 2>/dev/null || echo "")
  DISCONNECT_ROUTE_ID=$(echo "$ROUTES" | python3 -c "import sys,json; items=json.load(sys.stdin).get('Items',[]); print(next((r['RouteId'] for r in items if r.get('RouteKey')=='\$disconnect'),''))" 2>/dev/null || echo "")

  if [ -n "$CONNECT_ROUTE_ID" ]; then
    terraform import aws_apigatewayv2_route.ws_connect "${WS_API_ID}/${CONNECT_ROUTE_ID}" 2>/dev/null || echo "  WS connect route: already imported"
    CONNECT_TARGET=$(echo "$ROUTES" | python3 -c "import sys,json; items=json.load(sys.stdin).get('Items',[]); r=next((r for r in items if r.get('RouteKey')=='\$connect'),{}); t=r.get('Target',''); print(t.split('/')[-1] if '/' in t else '')" 2>/dev/null || echo "")
    if [ -n "$CONNECT_TARGET" ]; then
      terraform import aws_apigatewayv2_integration.ws_connect "${WS_API_ID}/${CONNECT_TARGET}" 2>/dev/null || echo "  WS connect integration: already imported"
    fi
  fi

  if [ -n "$DISCONNECT_ROUTE_ID" ]; then
    terraform import aws_apigatewayv2_route.ws_disconnect "${WS_API_ID}/${DISCONNECT_ROUTE_ID}" 2>/dev/null || echo "  WS disconnect route: already imported"
    DISCONNECT_TARGET=$(echo "$ROUTES" | python3 -c "import sys,json; items=json.load(sys.stdin).get('Items',[]); r=next((r for r in items if r.get('RouteKey')=='\$disconnect'),{}); t=r.get('Target',''); print(t.split('/')[-1] if '/' in t else '')" 2>/dev/null || echo "")
    if [ -n "$DISCONNECT_TARGET" ]; then
      terraform import aws_apigatewayv2_integration.ws_disconnect "${WS_API_ID}/${DISCONNECT_TARGET}" 2>/dev/null || echo "  WS disconnect integration: already imported"
    fi
  fi
else
  echo "  WebSocket API not found — will be created by Terraform"
fi

# ── Event Source Mappings ──
echo "[7/9] Event source mappings..."
MAPPINGS=$($AWS lambda list-event-source-mappings --function-name pixel-canvas-broadcast --output json 2>/dev/null || echo '{"EventSourceMappings":[]}')

SESSIONS_UUID=$(echo "$MAPPINGS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for m in data.get('EventSourceMappings', []):
    arn = m.get('EventSourceArn', '')
    if 'sessions' in arn and 'canvas_pixels' not in arn:
        print(m['UUID'])
        break
" 2>/dev/null || echo "")

PIXELS_UUID=$(echo "$MAPPINGS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for m in data.get('EventSourceMappings', []):
    if 'canvas_pixels' in m.get('EventSourceArn', ''):
        print(m['UUID'])
        break
" 2>/dev/null || echo "")

if [ -n "$SESSIONS_UUID" ]; then
  terraform import aws_lambda_event_source_mapping.broadcast_sessions "$SESSIONS_UUID" 2>/dev/null || echo "  sessions stream mapping: already imported"
else
  echo "  sessions stream mapping: not found — will be created"
fi

if [ -n "$PIXELS_UUID" ]; then
  terraform import aws_lambda_event_source_mapping.broadcast_canvas_pixels "$PIXELS_UUID" 2>/dev/null || echo "  canvas_pixels stream mapping: already imported"
else
  echo "  canvas_pixels stream mapping: not found — will be created"
fi

# ── Amplify ──
echo "[8/9] Amplify app and branch..."
AMPLIFY_APP_ID=$($AWS amplify list-apps --query "apps[?name=='pixel-canvas-frontend'].appId | [0]" --output text 2>/dev/null || echo "")
if [ -n "$AMPLIFY_APP_ID" ] && [ "$AMPLIFY_APP_ID" != "None" ]; then
  terraform import aws_amplify_app.frontend "$AMPLIFY_APP_ID" 2>/dev/null || echo "  amplify app: already imported"
  terraform import aws_amplify_branch.main "${AMPLIFY_APP_ID}/main" 2>/dev/null || echo "  amplify branch: already imported"
else
  # Try with known app ID
  terraform import aws_amplify_app.frontend d337wblskladqk 2>/dev/null || echo "  amplify app: already imported or not found"
  terraform import aws_amplify_branch.main d337wblskladqk/main 2>/dev/null || echo "  amplify branch: already imported or not found"
fi

# ── Amplify IAM ──
echo "[9/9] Amplify compute role..."
terraform import aws_iam_role.amplify_compute pixel-canvas-amplify-compute-role 2>/dev/null || echo "  amplify compute role: already imported or not found"

echo ""
echo "=== Import complete ==="
echo "Run 'make plan' to check for drift."
