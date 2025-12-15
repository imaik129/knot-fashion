#!/usr/bin/env python3
"""
Convert SMPL Python 2 pickle file to Python 3 format.

This script attempts to convert the SMPL_NEUTRAL.pth file from Python 2 format
to Python 3 format so it can be loaded by torch.load() in Python 3.11+.

Usage:
    python convert_smpl_to_py3.py
"""

import sys
import pickle
import torch
from pathlib import Path
import inspect
import numpy

# Fix chumpy compatibility
if not hasattr(inspect, 'getargspec'):
    inspect.getargspec = inspect.getfullargspec

# Patch numpy for chumpy
for attr in ['bool', 'int', 'float', 'complex', 'object', 'unicode', 'str']:
    if not hasattr(numpy, attr):
        mapping = {
            'bool': 'bool_', 'int': 'int_', 'float': 'float_',
            'complex': 'complex_', 'object': 'object_',
            'unicode': 'str_', 'str': 'str_'
        }
        if mapping[attr] in dir(numpy):
            setattr(numpy, attr, getattr(numpy, mapping[attr]))

def convert_smpl_file():
    """Convert SMPL file from Python 2 to Python 3 format."""
    home_dir = Path.home()
    romp_dir = home_dir / ".romp"
    smpl_file = romp_dir / "SMPL_NEUTRAL.pth"
    smpl_file_py3 = romp_dir / "SMPL_NEUTRAL_py3.pth"
    
    if not smpl_file.exists():
        print(f"❌ SMPL file not found: {smpl_file}")
        return False
    
    print(f"📂 Found SMPL file: {smpl_file}")
    print(f"📦 File size: {smpl_file.stat().st_size / (1024*1024):.1f} MB")
    
    # Method 1: Try to load with latin1 encoding and save in Python 3 format
    print("\n🔄 Attempting conversion...")
    
    try:
        # Open file in binary mode
        with open(smpl_file, 'rb') as f:
            # Try to load with latin1 encoding (for Python 2 pickles)
            try:
                # First, try with pickle directly
                data = pickle.load(f, encoding='latin1')
                print("✅ Successfully loaded with pickle.load(encoding='latin1')")
            except Exception as e1:
                print(f"⚠️  pickle.load(encoding='latin1') failed: {e1}")
                # Try without encoding (might work if file is already Python 3)
                f.seek(0)
                try:
                    data = pickle.load(f)
                    print("✅ Successfully loaded with pickle.load() (no encoding)")
                except Exception as e2:
                    print(f"❌ Both methods failed:")
                    print(f"   - With latin1: {e1}")
                    print(f"   - Without encoding: {e2}")
                    return False
        
        # Add extra_joints_index if missing (required by ROMP)
        # ROMP expects torch Tensor, not numpy array
        if 'extra_joints_index' not in data:
            print("   Adding 'extra_joints_index' key (required by ROMP)...")
            import torch
            data['extra_joints_index'] = torch.tensor([], dtype=torch.int32)
        elif isinstance(data['extra_joints_index'], np.ndarray):
            # Convert numpy array to torch tensor
            print("   Converting 'extra_joints_index' from numpy to torch tensor...")
            import torch
            data['extra_joints_index'] = torch.from_numpy(data['extra_joints_index'])
        
        # Save using torch.save() for better compatibility
        print(f"\n💾 Saving as Python 3 format using torch.save() to: {smpl_file_py3}")
        torch.save(data, smpl_file_py3, _use_new_zipfile_serialization=False)
        
        print(f"✅ Conversion successful!")
        print(f"📁 New file: {smpl_file_py3}")
        print(f"📦 New file size: {smpl_file_py3.stat().st_size / (1024*1024):.1f} MB")
        
        # Test loading with torch
        print("\n🧪 Testing with torch.load()...")
        try:
            test_data = torch.load(str(smpl_file_py3), map_location='cpu', weights_only=False)
            print("✅ torch.load() test successful!")
            if isinstance(test_data, dict):
                print(f"📋 Keys found: {list(test_data.keys())[:10]}")
            return True
        except Exception as e:
            print(f"⚠️  torch.load() test failed: {e}")
            # Try with pickle instead
            print("\n🔄 Trying alternative: saving as pickle protocol 4...")
            try:
                with open(smpl_file_py3, 'wb') as f:
                    pickle.dump(data, f, protocol=4)
                print("✅ Saved as pickle protocol 4")
                return True
            except Exception as e2:
                print(f"❌ Pickle save also failed: {e2}")
                return False
            
    except Exception as e:
        print(f"❌ Conversion failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("SMPL File Converter: Python 2 → Python 3")
    print("=" * 60)
    
    success = convert_smpl_file()
    
    if success:
        print("\n" + "=" * 60)
        print("✅ Conversion complete!")
        print("\nNext steps:")
        print("1. Update main.py to use SMPL_NEUTRAL_py3.pth")
        print("2. Restart the backend")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("❌ Conversion failed")
        print("\nAlternative solutions:")
        print("1. Use MOCK MODE (current state)")
        print("2. Try a different SMPL file format")
        print("3. Use Docker with Python 2 environment")
        print("=" * 60)
    
    sys.exit(0 if success else 1)

