#!/bin/bash

# SMPL Model Installation Script for Knot Fashion
# This script helps install the SMPL model file needed for ROMP

echo "🔍 Checking for SMPL model files..."

ROMP_DIR="$HOME/.romp"
SMPL_FILE="$ROMP_DIR/SMPL_NEUTRAL.pth"

if [ -f "$SMPL_FILE" ]; then
    echo "✅ SMPL_NEUTRAL.pth already exists!"
    ls -lh "$SMPL_FILE"
    exit 0
fi

echo "❌ SMPL_NEUTRAL.pth not found in $ROMP_DIR"
echo ""
echo "📥 To install SMPL model:"
echo ""
echo "1. Go to https://smpl.is.tue.mpg.de/"
echo "2. Register/Login (free account)"
echo "3. Download 'SMPL for Python v1.1.0'"
echo "4. Extract the ZIP file"
echo "5. Find the file: basicModel_neutral_lbs_10_207_0_v1.1.0.pkl"
echo ""
echo "Then run these commands:"
echo ""
echo "  mkdir -p ~/.romp"
echo "  cp ~/Downloads/SMPL_python_v.1.1.0/smpl/models/basicModel_neutral_lbs_10_207_0_v1.1.0.pkl ~/.romp/SMPL_NEUTRAL.pth"
echo "  cp ~/.romp/SMPL_NEUTRAL.pth ~/.romp/SMPL_MALE.pth"
echo "  cp ~/.romp/SMPL_NEUTRAL.pth ~/.romp/SMPL_FEMALE.pth"
echo ""
echo "Or if you already downloaded it, just run:"
echo "  cp <path-to-downloaded-file>/basicModel_neutral_lbs_10_207_0_v1.1.0.pkl ~/.romp/SMPL_NEUTRAL.pth"
echo ""
echo "After installation, restart the backend server."


