#!/bin/bash

# Restart backend to load SMPL models

echo "🔄 Restarting backend to load SMPL models..."
echo ""
echo "If backend is running, press Ctrl+C to stop it first."
echo ""
echo "Then run:"
echo "  cd knot-backend"
echo "  .venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo "Look for these messages in the logs:"
echo "  ✅ 'ROMP models appear to be present.'"
echo "  ✅ 'ROMP model initialized successfully.'"
echo "  ❌ Should NOT see 'MOCK MODE' warnings"
echo ""


