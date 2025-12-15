#!/usr/bin/env python3
"""Test ROMP initialization with SMPL model"""

import sys
import argparse
from pathlib import Path
import inspect
import numpy

# Fix chumpy compatibility with Python 3.13 and NumPy 1.26+
if not hasattr(inspect, 'getargspec'):
    inspect.getargspec = inspect.getfullargspec

# Patch numpy for chumpy compatibility
for attr in ['bool', 'int', 'float', 'complex', 'object', 'unicode', 'str']:
    if not hasattr(numpy, attr):
        mapping = {
            'bool': 'bool_',
            'int': 'int_',
            'float': 'float_',
            'complex': 'complex_',
            'object': 'object_',
            'unicode': 'str_',
            'str': 'str_'
        }
        if mapping[attr] in dir(numpy):
            setattr(numpy, attr, getattr(numpy, mapping[attr]))

# Apply monkeypatch before importing ROMP
import torch
import functools
import pickle

# Patch torch.serialization._legacy_load to handle Python 2 pickles
import torch.serialization
_original_legacy_load = torch.serialization._legacy_load
def patched_legacy_load(opened_file, map_location, pickle_module, **pickle_load_args):
    # Replace pickle_module.load with a version that uses latin1 encoding
    _original_pickle_load = pickle_module.load
    def patched_pickle_module_load(file, **kwargs):
        # Create Unpickler with latin1 encoding
        unpickler = pickle.Unpickler(file, encoding='latin1')
        return unpickler.load()
    pickle_module.load = patched_pickle_module_load
    try:
        result = _original_legacy_load(opened_file, map_location, pickle_module, **pickle_load_args)
        return result
    finally:
        # Restore original
        pickle_module.load = _original_pickle_load
torch.serialization._legacy_load = patched_legacy_load

original_torch_load = torch.load
def patched_torch_load(*args, **kwargs):
    if 'weights_only' not in kwargs:
        kwargs['weights_only'] = False
    return original_torch_load(*args, **kwargs)
torch.load = patched_torch_load

# Prevent argparse conflict
original_argv = sys.argv
sys.argv = [sys.argv[0]]

try:
    import romp as simple_romp
    sys.argv = [sys.argv[0]]
    
    if hasattr(simple_romp, 'romp_settings'):
        settings = simple_romp.romp_settings()
    else:
        settings = argparse.Namespace()
        settings.mode = 'video'
        settings.calc_smpl = True
        settings.render_mesh = False
        settings.show_largest = True
        settings.save_video = False
        settings.show = False
    
    # Set SMPL path
    home_dir = Path.home()
    romp_dir = home_dir / ".romp"
    smpl_path = romp_dir / "SMPL_NEUTRAL.pth"
    if smpl_path.exists():
        settings.smpl_path = str(smpl_path)
        print(f"✅ Using SMPL model at: {smpl_path}")
    else:
        print(f"❌ SMPL model not found at: {smpl_path}")
        sys.exit(1)
    
    # Initialize ROMP
    print("🔄 Initializing ROMP...")
    romp = simple_romp.ROMP(settings)
    print("✅ ROMP model initialized successfully!")
    
except ImportError as e:
    print(f"❌ Could not import 'romp' package: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error initializing ROMP: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    sys.argv = original_argv

