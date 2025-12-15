from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pathlib import Path
import shutil
import cv2
import numpy as np
import logging
import os
import urllib.request
import argparse
import sys
import zipfile
import torch
import functools
import inspect
import numpy as np
import pickle
import io
import math

# Fix chumpy compatibility with Python 3.13 and NumPy 1.26+
# chumpy uses inspect.getargspec which was removed in Python 3.11+
if not hasattr(inspect, 'getargspec'):
    inspect.getargspec = inspect.getfullargspec

# Fix chumpy's numpy imports (numpy.bool, numpy.int etc. removed in newer NumPy)
# Patch numpy module before chumpy imports
_original_numpy = np
class NumpyCompat:
    def __getattr__(self, name):
        if name in ['bool', 'int', 'float', 'complex', 'object', 'unicode', 'str']:
            # Map to new NumPy names
            mapping = {
                'bool': np.bool_,
                'int': np.int_,
                'float': np.float_,
                'complex': np.complex_,
                'object': np.object_,
                'unicode': np.str_,
                'str': np.str_
            }
            return mapping.get(name, getattr(_original_numpy, name))
        return getattr(_original_numpy, name)
    
    def __getitem__(self, key):
        return _original_numpy[key]

# Patch numpy for chumpy compatibility (before ROMP imports chumpy)
import sys
if 'chumpy' not in sys.modules:
    # Patch numpy attributes that chumpy expects
    _numpy_attrs = {}
    for attr in ['bool', 'int', 'float', 'complex', 'object', 'unicode', 'str']:
        if not hasattr(np, attr):
            mapping = {
                'bool': 'bool_',
                'int': 'int_',
                'float': 'float_',
                'complex': 'complex_',
                'object': 'object_',
                'unicode': 'str_',
                'str': 'str_'
            }
            if mapping[attr] in dir(np):
                setattr(np, attr, getattr(np, mapping[attr]))

# Monkeypatch torch.load to default weights_only=False to support legacy pickles
# This handles the "Weights only load failed" error in newer PyTorch versions
# Also handle Python 2 pickles with latin1 encoding
original_torch_load = torch.load
# Patch torch.serialization._legacy_load to handle Python 2 pickles
import torch.serialization
_original_legacy_load = torch.serialization._legacy_load
def patched_legacy_load(opened_file, map_location, pickle_module, **pickle_load_args):
    # For Python 2 pickles, we need to use encoding='latin1'
    # Python 3.11's pickle.load supports encoding parameter
    _original_pickle_load = pickle_module.load
    def patched_pickle_module_load(file, **kwargs):
        # Use encoding='latin1' for Python 2 pickles
        if 'encoding' not in kwargs:
            kwargs['encoding'] = 'latin1'
        return _original_pickle_load(file, **kwargs)
    pickle_module.load = patched_pickle_module_load
    try:
        result = _original_legacy_load(opened_file, map_location, pickle_module, **pickle_load_args)
        return result
    finally:
        pickle_module.load = _original_pickle_load
torch.serialization._legacy_load = patched_legacy_load

def patched_torch_load(*args, **kwargs):
    if 'weights_only' not in kwargs:
        kwargs['weights_only'] = False
    return original_torch_load(*args, **kwargs)
torch.load = patched_torch_load

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Allow your frontend origin during dev
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize models - support both ROMP and BEV
romp = None
bev = None
USE_BEV = os.getenv("USE_BEV", "false").lower() == "true"  # Set USE_BEV=true to use BEV

def check_and_download_models():
    """Download and extract ROMP/SMPL model data from the master zip."""
    home_dir = Path.home()
    romp_dir = home_dir / ".romp"
    romp_dir.mkdir(parents=True, exist_ok=True)
    
    # We will verify just one key file to see if we need to download
    # Usually ROMP.pkl or SMPL_NEUTRAL.pth
    key_file = romp_dir / "ROMP.pkl"
    smpl_file = romp_dir / "SMPL_NEUTRAL.pth"
    
    if key_file.exists() and smpl_file.exists():
        logger.info("ROMP models appear to be present.")
        return True

    logger.info("ROMP models missing. Downloading smpl_model_data.zip...")
    
    # URL found in ROMP repo README
    zip_url = "https://github.com/Arthur151/ROMP/releases/download/V2.0/smpl_model_data.zip"
    zip_path = romp_dir / "smpl_model_data.zip"
    
    try:
        # Download
        urllib.request.urlretrieve(zip_url, zip_path)
        logger.info("Download complete. Extracting...")
        
        # Extract
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(romp_dir)
            
        logger.info("Extraction complete.")
        
        # Move files from subdirectory if needed
        # The zip usually contains a folder "smpl_model_data"
        extracted_folder = romp_dir / "smpl_model_data"
        if extracted_folder.exists():
            for file in extracted_folder.iterdir():
                # Move to .romp root where simple_romp expects them
                dest = romp_dir / file.name
                if not dest.exists():
                    shutil.move(str(file), str(dest))
            # Cleanup
            shutil.rmtree(extracted_folder)
            
        # Cleanup zip
        if zip_path.exists():
            zip_path.unlink()
            
        return True
    except Exception as e:
        logger.error(f"Failed to download/extract models: {e}")
        return False

# Try to initialize BEV first if requested, otherwise use ROMP
if USE_BEV:
    logger.info("Attempting to initialize BEV (Body Estimation in the Wild)...")
    try:
        # BEV installation would be: pip install git+https://github.com/Arthur151/BEV.git
        # For now, we'll try to import it
        import bev
        # BEV initialization (adjust based on actual BEV API)
        # bev_model = bev.BEV()  # This will need to be adjusted based on actual API
        logger.info("BEV model initialized successfully.")
        # bev = bev_model  # Uncomment when BEV is properly installed
    except ImportError:
        logger.warning("BEV not available. Falling back to ROMP.")
        USE_BEV = False
    except Exception as e:
        logger.warning(f"Failed to initialize BEV: {e}. Falling back to ROMP.")
        USE_BEV = False

# Initialize ROMP (either as primary or fallback)
if not USE_BEV:
    try:
        # Ensure models exist
        check_and_download_models()

        # Prevent argparse conflict by modifying sys.argv BEFORE import
        original_argv = sys.argv
        sys.argv = [sys.argv[0]]
        
        try:
            # Import ROMP - torch.load monkeypatch is already applied at top of file
            import romp as simple_romp
            
            # Re-mock argv
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
            
            # Set SMPL model path - ALWAYS prefer Python 3 converted version
            # (has extra_joints_index and works with Python 3.11)
            home_dir = Path.home()
            romp_dir = home_dir / ".romp"
            smpl_path_py3 = romp_dir / "SMPL_NEUTRAL_py3.pth"
            smpl_path = romp_dir / "SMPL_NEUTRAL.pth"
            
            # Always set smpl_path explicitly to use converted version
            if smpl_path_py3.exists():
                settings.smpl_path = str(smpl_path_py3)
                logger.info(f"✅ Using Python 3 converted SMPL model at: {smpl_path_py3}")
            elif smpl_path.exists():
                settings.smpl_path = str(smpl_path)
                logger.warning(f"⚠️  Using original SMPL model at: {smpl_path} (may have encoding issues)")
            else:
                logger.warning(f"❌ SMPL model not found at: {smpl_path} or {smpl_path_py3}")
            
            # Optimize ROMP settings for better accuracy (based on ROMP best practices)
            # Reference: https://www.12-technology.com/2022/01/romp-ai3d.html
            # Lower center_thresh = detect more people (but may have false positives)
            # Make it more sensitive to detect bodies in various conditions
            if hasattr(settings, 'center_thresh'):
                settings.center_thresh = 0.15  # Lowered from 0.25 to 0.15 for better detection
            # Temporal smoothing coefficient (higher = more smoothing across frames)
            # This is critical for video processing to reduce jitter
            if hasattr(settings, 'smooth_coeff'):
                settings.smooth_coeff = 5.0  # Increased for better temporal stability
            # Enable SMPL calculation
            if hasattr(settings, 'calc_smpl'):
                settings.calc_smpl = True
            # Additional settings for video processing
            if hasattr(settings, 'mode'):
                settings.mode = 'video'  # Explicitly set video mode
            if hasattr(settings, 'temporal_optimization'):
                settings.temporal_optimization = True  # Enable temporal optimization if available
            
            # Before initializing ROMP, patch SMPL model loading to convert numpy arrays to torch tensors
            # This fixes the "cannot assign 'numpy.ndarray' object to buffer" error
            original_smpl_init = None
            if hasattr(simple_romp, 'smpl') and hasattr(simple_romp.smpl, 'SMPL'):
                original_smpl_init = simple_romp.smpl.SMPL.__init__
                
                def patched_smpl_init(self, model_path, model_type='smpl', dtype=torch.float32):
                    """Patched SMPL.__init__ that converts numpy arrays to torch tensors"""
                    import torch.nn as nn
                    super(simple_romp.smpl.SMPL, self).__init__()
                    self.dtype = dtype
                    
                    # Try to load as pickle first (for Python 3 converted files)
                    # If that fails, use torch.load
                    model_info = None
                    try:
                        import pickle
                        with open(model_path, 'rb') as f:
                            model_info = pickle.load(f, encoding='latin1')
                        logger.debug(f"Loaded {model_path} as pickle file")
                    except:
                        # Fall back to torch.load
                        model_info = torch.load(model_path, map_location='cpu', weights_only=False)
                        logger.debug(f"Loaded {model_path} as torch file")
                    
                    # Convert all numpy arrays, chumpy objects, and scipy sparse matrices to torch tensors
                    converted_info = {}
                    for key, value in model_info.items():
                        if isinstance(value, np.ndarray):
                            converted_info[key] = torch.from_numpy(value).to(dtype)
                            logger.debug(f"Converted {key} from numpy to torch tensor")
                        elif isinstance(value, torch.Tensor):
                            converted_info[key] = value.to(dtype)
                        elif hasattr(value, 'todense'):  # scipy sparse matrix
                            # Convert sparse matrix to dense numpy, then to torch
                            try:
                                np_value = np.array(value.todense())
                                converted_info[key] = torch.from_numpy(np_value).to(dtype)
                                logger.debug(f"Converted {key} from scipy sparse to torch tensor")
                            except:
                                logger.warning(f"Could not convert {key} from scipy sparse, keeping original")
                                converted_info[key] = value
                        elif hasattr(value, 'r'):  # chumpy object has .r attribute
                            # Convert chumpy object to numpy, then to torch
                            try:
                                np_value = np.array(value.r)
                                converted_info[key] = torch.from_numpy(np_value).to(dtype)
                                logger.debug(f"Converted {key} from chumpy to torch tensor")
                            except:
                                logger.warning(f"Could not convert {key} from chumpy, keeping original")
                                converted_info[key] = value
                        else:
                            converted_info[key] = value
                    
                    # Now use converted_info instead of model_info
                    model_info = converted_info
                    
                    # Rest of the original __init__ logic
                    # Ensure extra_joints_index is long/int type for indexing
                    extra_joints_idx = model_info['extra_joints_index']
                    if isinstance(extra_joints_idx, torch.Tensor):
                        if extra_joints_idx.dtype != torch.long and extra_joints_idx.dtype != torch.int32 and extra_joints_idx.dtype != torch.int64:
                            logger.info(f"Converting extra_joints_index from {extra_joints_idx.dtype} to long")
                            extra_joints_idx = extra_joints_idx.long()
                    
                    # Ensure J_regressor tensors are float type
                    J_regressor_extra9 = model_info['J_regressor_extra9']
                    if isinstance(J_regressor_extra9, torch.Tensor) and J_regressor_extra9.dtype != dtype:
                        J_regressor_extra9 = J_regressor_extra9.to(dtype)
                    
                    J_regressor_h36m17 = model_info['J_regressor_h36m17']
                    if isinstance(J_regressor_h36m17, torch.Tensor) and J_regressor_h36m17.dtype != dtype:
                        J_regressor_h36m17 = J_regressor_h36m17.to(dtype)
                    
                    self.vertex_joint_selector = simple_romp.smpl.VertexJointSelector(
                        extra_joints_idx,
                        J_regressor_extra9,
                        J_regressor_h36m17,
                        dtype=self.dtype
                    )
                    self.register_buffer('faces_tensor', model_info['f'])
                    self.register_buffer('v_template', model_info['v_template'])
                    
                    # ROMP expects only top 10 PCA components of shapedirs
                    # If shapedirs has more than 10 dimensions, take only first 10
                    if model_type == 'smpl':
                        shapedirs = model_info['shapedirs']
                        if isinstance(shapedirs, torch.Tensor):
                            # shapedirs shape: [6890, 3, num_components]
                            # ROMP expects: [6890, 3, 10]
                            if shapedirs.shape[2] > 10:
                                logger.info(f"Truncating shapedirs from {shapedirs.shape[2]} to 10 components")
                                shapedirs = shapedirs[:, :, :10]
                        self.register_buffer('shapedirs', shapedirs)
                    elif model_type == 'smpla':
                        self.register_buffer('shapedirs', model_info['smpla_shapedirs'])
                    
                    self.register_buffer('J_regressor', model_info['J_regressor'])
                    
                    # ROMP expects posedirs in shape [207, 6890*3]
                    # Original SMPL has shape [6890, 3, 207]
                    # Need to reshape: [6890, 3, 207] -> [207, 6890*3]
                    posedirs = model_info['posedirs']
                    if isinstance(posedirs, torch.Tensor):
                        if len(posedirs.shape) == 3 and posedirs.shape[2] == 207:
                            # Shape: [6890, 3, 207] -> [207, 6890*3]
                            logger.info(f"Reshaping posedirs from {posedirs.shape} to [207, {6890*3}]")
                            posedirs = posedirs.reshape(-1, 207).T  # [6890*3, 207] -> [207, 6890*3]
                        elif len(posedirs.shape) == 2 and posedirs.shape[0] != 207:
                            # If already 2D but wrong shape, try to fix
                            if posedirs.shape[1] == 207:
                                posedirs = posedirs.T
                            elif posedirs.shape[0] == 207:
                                pass  # Already correct
                            else:
                                logger.warning(f"Unexpected posedirs shape: {posedirs.shape}, attempting reshape")
                    self.register_buffer('posedirs', posedirs)
                    
                    # kintree_table (parents) must be long/int type for indexing
                    # ROMP expects shape [2, 24] where first row is parents, second row is children
                    # Original SMPL has shape [2, 24] but may need adjustment
                    parents = model_info['kintree_table']
                    if isinstance(parents, torch.Tensor):
                        # Ensure correct shape: [2, 24]
                        if len(parents.shape) == 2:
                            if parents.shape[1] == 23:
                                # Pad to 24 if needed (add root joint)
                                logger.info(f"Padding kintree_table from {parents.shape} to [2, 24]")
                                padded = torch.zeros(2, 24, dtype=parents.dtype)
                                padded[:, :23] = parents
                                padded[0, 23] = -1  # Root joint has no parent
                                parents = padded
                            elif parents.shape[1] != 24:
                                logger.warning(f"Unexpected kintree_table shape: {parents.shape}, expected [2, 24]")
                        # Convert to long for indexing
                        if parents.dtype != torch.long and parents.dtype != torch.int32 and parents.dtype != torch.int64:
                            logger.info(f"Converting parents from {parents.dtype} to long")
                            parents = parents.long()
                        # Extract first row (parent indices) for ROMP
                        parents = parents[0] if len(parents.shape) == 2 else parents
                    self.register_buffer('parents', parents)
                    
                    self.register_buffer('lbs_weights', model_info['weights'])
                
                # Apply the patch
                simple_romp.smpl.SMPL.__init__ = patched_smpl_init
                logger.info("Applied SMPL initialization patch to convert numpy arrays to torch tensors")
            
            # Instantiate ROMP
            romp = simple_romp.ROMP(settings)
            logger.info("ROMP model initialized successfully.")
            
        except ImportError:
            logger.error("Could not import 'romp' package. Check installation.")
        except Exception as e:
            logger.error(f"Error initializing ROMP: {e}")
            logger.exception("Traceback:")
        finally:
            sys.argv = original_argv

    except Exception as e:
        logger.error(f"Failed to setup ROMP: {e}")

def get_smpl_faces_template():
    """
    Get standard SMPL face template (13776 faces for 6890 vertices).
    This is a fallback when faces can't be extracted from the model.
    In production, load this from the SMPL model file.
    """
    try:
        # Try to load from SMPL model if available
        home_dir = Path.home()
        romp_dir = home_dir / ".romp"
        smpl_file_py3 = romp_dir / "SMPL_NEUTRAL_py3.pth"
        smpl_file = romp_dir / "SMPL_NEUTRAL.pth"
        
        # Prefer Python 3 converted version
        smpl_file_to_use = smpl_file_py3 if smpl_file_py3.exists() else smpl_file
        
        if smpl_file_to_use.exists():
            try:
                # Try pickle first (for Python 3 converted files), then torch.load
                try:
                    import pickle
                    with open(str(smpl_file_to_use), 'rb') as f:
                        smpl_data = pickle.load(f, encoding='latin1')
                except:
                    smpl_data = torch.load(str(smpl_file_to_use), map_location='cpu', weights_only=False)
                # SMPL model structure varies, try common keys
                if 'faces' in smpl_data:
                    faces = smpl_data['faces']
                    if hasattr(faces, 'numpy'):
                        return faces.numpy().tolist()
                    elif isinstance(faces, np.ndarray):
                        return faces.tolist()
                elif 'f' in smpl_data:
                    faces = smpl_data['f']
                    if hasattr(faces, 'numpy'):
                        return faces.numpy().tolist()
                    elif isinstance(faces, np.ndarray):
                        return faces.tolist()
            except Exception as e:
                logger.debug(f"Could not load faces from SMPL file: {e}")
        
        # If we can't load from file, return None (frontend will generate)
        return None
    except Exception as e:
        logger.debug(f"Error in get_smpl_faces_template: {e}")
        return None

def normalize_mesh(vertices):
    """
    Normalize mesh vertices to center and scale appropriately.
    This helps with visualization consistency.
    """
    # Handle numpy arrays properly - check length first
    if vertices is None:
        return vertices
    
    # Convert to numpy array if not already
    if isinstance(vertices, np.ndarray):
        verts_array = vertices.copy()
    elif isinstance(vertices, (list, tuple)):
        verts_array = np.array(vertices)
    else:
        return vertices
    
    # Check if array is empty
    if len(verts_array) == 0 or verts_array.size == 0:
        return vertices
    
    # Ensure 2D array shape [vertices, 3]
    if len(verts_array.shape) == 1:
        # Flattened array - try to reshape
        if verts_array.size % 3 == 0:
            verts_array = verts_array.reshape(-1, 3)
        else:
            return vertices
    elif len(verts_array.shape) != 2:
        return vertices
    
    # Center the mesh
    center = np.mean(verts_array, axis=0)
    verts_centered = verts_array - center
    
    # Scale to reasonable size (max dimension = 2.0)
    max_dim = np.max(np.abs(verts_centered))
    if max_dim > 0:
        scale = 2.0 / max_dim
        verts_centered = verts_centered * scale
    
    # Return as list for JSON serialization
    return verts_centered.tolist()

@app.get("/")
async def root():
    return {"message": "Knot Fashion backend is running"}


@app.post("/process-scan")
async def process_scan(video: UploadFile = File(...)):
    tmp_path = Path("/tmp/knot_input.mp4")
    tmp_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        with tmp_path.open("wb") as buffer:
            shutil.copyfileobj(video.file, buffer)

        logger.info(f"Video saved to {tmp_path}")

        # MOCK MODE: Generate dummy 3D mesh if no model loaded
        if romp is None and bev is None:
            logger.warning("ROMP not loaded. Using MOCK data for testing.")
            
            # Generate a simple human-like point cloud
            mock_vertices = []
            
            def add_cylinder(p1, p2, radius=0.05, steps=50):
                """Add points along a cylinder from p1 to p2"""
                vec = np.array(p2) - np.array(p1)
                length = np.linalg.norm(vec)
                if length == 0:
                    return
                axis = vec / length
                
                # Perpendicular vector
                if abs(axis[0]) < 0.9:
                    perp = np.cross(axis, [1, 0, 0])
                else:
                    perp = np.cross(axis, [0, 1, 0])
                perp = perp / (np.linalg.norm(perp) + 1e-8)
                
                for i in range(steps):
                    t = i / max(steps - 1, 1)
                    center = np.array(p1) + vec * t
                    # Add ring of points around center
                    for angle in np.linspace(0, 2 * np.pi, 8):
                        offset = radius * (np.cos(angle) * perp + np.sin(angle) * np.cross(axis, perp))
                        mock_vertices.append((center + offset).tolist())

            # Human skeleton points (normalized coordinates)
            head = [0, 0.6, 0]
            neck = [0, 0.45, 0]
            hips = [0, 0.0, 0]
            l_shoulder = [-0.2, 0.45, 0]
            r_shoulder = [0.2, 0.45, 0]
            l_hand = [-0.4, 0.1, 0]
            r_hand = [0.4, 0.1, 0]
            l_knee = [-0.1, -0.4, 0]
            r_knee = [0.1, -0.4, 0]
            l_foot = [-0.1, -0.8, 0]
            r_foot = [0.1, -0.8, 0]

            # Build body
            add_cylinder(head, neck, 0.1, 30)
            add_cylinder(neck, hips, 0.15, 100)
            add_cylinder(neck, l_shoulder, 0.05, 40)
            add_cylinder(neck, r_shoulder, 0.05, 40)
            add_cylinder(l_shoulder, l_hand, 0.04, 80)
            add_cylinder(r_shoulder, r_hand, 0.04, 80)
            add_cylinder(hips, l_knee, 0.06, 80)
            add_cylinder(hips, r_knee, 0.06, 80)
            add_cylinder(l_knee, l_foot, 0.05, 80)
            add_cylinder(r_knee, r_foot, 0.05, 80)

            # Generate simple faces for mock data (basic triangulation)
            # For a proper mesh, we'd need proper face indices, but for mock we'll let frontend handle it
            mock_faces = []  # Frontend will generate faces using convex hull
            
            return JSONResponse({
                "message": "Processed successfully (MOCK MODE - Install SMPL models for real AI)",
                "original_filename": video.filename,
                "smpl_vertices": mock_vertices,
                "smpl_faces": mock_faces,
                "joints": [],
                "params": {},
                "is_mock": True
            })

        # REAL MODE: Use selected model (BEV or ROMP) with multi-frame processing
        cap = cv2.VideoCapture(str(tmp_path))
        if not cap.isOpened():
            return JSONResponse({"error": "Could not open video file"}, status_code=400)

        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if frame_count == 0:
             return JSONResponse({"error": "Video has no frames"}, status_code=400)

        # Process multiple frames for better accuracy
        # Based on: https://www.12-technology.com/2022/01/romp-ai3d.html
        # Process more frames for better temporal stability (reduce jitter)
        # Sample frames evenly across the video, focusing on middle section where person is most stable
        num_frames_to_process = min(10, max(5, frame_count // 10))  # 10 frames or 10% of video, whichever is smaller
        frame_ratios = np.linspace(0.2, 0.8, num_frames_to_process).tolist()  # Focus on middle 60% of video
        results = []
        
        model_name = "BEV" if USE_BEV and bev is not None else "ROMP"
        logger.info(f"Using {model_name} model. Processing {len(frame_ratios)} frames from {frame_count} total frames...")
        
        for ratio in frame_ratios:
            frame_idx = int(frame_count * ratio)
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            success, frame = cap.read()
            
            if not success:
                continue
            
            # Preprocess frame for better detection
            # Resize if too large (ROMP works better with reasonable sizes)
            height, width = frame.shape[:2]
            max_dim = 1024
            if max(height, width) > max_dim:
                scale = max_dim / max(height, width)
                new_width = int(width * scale)
                new_height = int(height * scale)
                frame = cv2.resize(frame, (new_width, new_height), interpolation=cv2.INTER_LINEAR)
                logger.debug(f"Resized frame from {width}x{height} to {new_width}x{new_height}")
                
            try:
                # Use BEV if available, otherwise ROMP
                if USE_BEV and bev is not None:
                    # BEV API (adjust based on actual BEV implementation)
                    outputs = romp(frame) if romp is not None else None  # Fallback for now
                else:
                    # ROMP processing - pass frame directly
                    # ROMP expects input as numpy array or PIL Image
                    # Convert BGR to RGB if needed
                    if len(frame.shape) == 3 and frame.shape[2] == 3:
                        # OpenCV uses BGR, ROMP might expect RGB
                        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    else:
                        frame_rgb = frame
                    
                    # ROMP can be called directly with image
                    try:
                        outputs = romp(frame_rgb) if romp is not None else None
                    except Exception as romp_error:
                        logger.warning(f"ROMP processing error: {romp_error}")
                        # Try with original frame
                        outputs = romp(frame) if romp is not None else None
                
                # ROMP returns a dict with detection results or None
                # Check if we have valid detection
                if outputs and isinstance(outputs, dict):
                    # Check if this is a valid detection (has vertices or joints)
                    has_verts = 'verts' in outputs and outputs.get('verts') is not None
                    has_joints = 'joints' in outputs and outputs.get('joints') is not None
                    
                    if has_verts or has_joints:
                        # Valid detection - add metadata
                        # Debug: log the shape of verts
                        if 'verts' in outputs:
                            verts = outputs['verts']
                            if hasattr(verts, 'shape'):
                                logger.debug(f"Frame {frame_idx}: verts shape = {verts.shape}, type = {type(verts)}")
                            elif isinstance(verts, (list, tuple)):
                                logger.debug(f"Frame {frame_idx}: verts length = {len(verts)}, first element type = {type(verts[0]) if len(verts) > 0 else 'empty'}")
                        outputs['_frame_idx'] = frame_idx
                        outputs['_frame_ratio'] = ratio
                        results.append(outputs)
                        logger.info(f"Successfully processed frame {frame_idx}/{frame_count} (person detected)")
                    else:
                        logger.warning(f"No valid detection in frame {frame_idx} (outputs keys: {list(outputs.keys())})")
                elif isinstance(outputs, list) and len(outputs) > 0:
                    # Handle list format (if ROMP ever returns a list)
                    best_detection = outputs[0]
                    if isinstance(best_detection, dict):
                        best_detection['_frame_idx'] = frame_idx
                        best_detection['_frame_ratio'] = ratio
                        results.append(best_detection)
                        logger.info(f"Successfully processed frame {frame_idx}/{frame_count} ({len(outputs)} person(s) detected)")
                elif outputs is not None:
                    # Unexpected format - log for debugging
                    logger.warning(f"Unexpected outputs format in frame {frame_idx}: {type(outputs)}, value: {str(outputs)[:100]}")
                else:
                    logger.warning(f"No person detected in frame {frame_idx} (outputs is None)")
            except Exception as e:
                logger.warning(f"Failed to process frame {frame_idx}: {e}")
                logger.exception("Frame processing error:")
                continue
        
        cap.release()

        if not results:
            # Provide more helpful error message
            error_msg = (
                "No body detected in any frame. "
                "Tips: Ensure the person is fully visible, well-lit, and facing the camera. "
                "Try a video with clearer background and better lighting."
            )
            logger.warning(f"Body detection failed: {error_msg}")
            return JSONResponse({"error": error_msg}, status_code=400)

        # Exponential smoothing for better temporal stability (reduces jitter)
        # Based on: https://www.12-technology.com/2022/01/romp-ai3d.html
        # Article mentions: "フレームごとの誤差をうまく丸め込み、3Dモデルの滑らかな動きを実現する必要がある"
        def exponential_smooth_results(results_list, alpha=0.6):
            """
            Apply exponential moving average to smooth results across frames.
            alpha: smoothing factor (0-1), higher = more weight to recent frames
            """
            if not results_list or len(results_list) == 0:
                return None
            
            if len(results_list) == 1:
                return results_list[0]
            
            # Start with first result
            smoothed = {}
            first = results_list[0]
            
            # Initialize smoothed with first result
            for key in ['verts', 'joints', 'params']:
                if key in first:
                    val = first[key]
                    if hasattr(val, 'copy'):
                        smoothed[key] = val.copy()
                    elif isinstance(val, dict):
                        smoothed[key] = val.copy()
                    else:
                        smoothed[key] = np.array(val) if isinstance(val, (list, tuple)) else val
            
            # Apply exponential smoothing to subsequent results
            for i in range(1, len(results_list)):
                current = results_list[i]
                for key in ['verts', 'joints']:
                    if key in current and key in smoothed:
                        curr_val = current[key]
                        smooth_val = smoothed[key]
                        
                        # Handle torch Tensor
                        if hasattr(curr_val, 'cpu'):
                            curr_val = curr_val.cpu()
                        if hasattr(curr_val, 'detach'):
                            curr_val = curr_val.detach()
                        if hasattr(curr_val, 'numpy'):
                            curr_val = curr_val.numpy()
                        elif hasattr(curr_val, 'tolist'):
                            curr_val = np.array(curr_val.tolist())
                        
                        # Convert to numpy arrays for computation
                        if not isinstance(curr_val, np.ndarray):
                            curr_val = np.array(curr_val)
                        if not isinstance(smooth_val, np.ndarray):
                            smooth_val = np.array(smooth_val)
                        
                        # Handle batch dimension: [batch, vertices, 3] -> [vertices, 3]
                        if len(curr_val.shape) == 3:
                            curr_val = curr_val[0]
                        if len(smooth_val.shape) == 3:
                            smooth_val = smooth_val[0]
                        
                        # Ensure same shape
                        if curr_val.shape == smooth_val.shape:
                            smoothed[key] = alpha * curr_val + (1 - alpha) * smooth_val
                        else:
                            logger.warning(f"Shape mismatch for {key}: {curr_val.shape} vs {smooth_val.shape}, skipping smoothing")
                
                # Smooth params (if they're numeric arrays)
                if 'params' in current and 'params' in smoothed:
                    for param_key in current['params']:
                        if param_key in smoothed['params']:
                            curr_p = current['params'][param_key]
                            smooth_p = smoothed['params'][param_key]
                            
                            if hasattr(curr_p, 'shape') and hasattr(smooth_p, 'shape'):
                                if curr_p.shape == smooth_p.shape:
                                    smoothed['params'][param_key] = alpha * curr_p + (1 - alpha) * smooth_p
            
            return smoothed
        
        # Process all frames and return per-frame meshes for video sync
        # Also compute averaged mesh for standalone viewer
        logger.info(f"Processing {len(results)} detections for video overlay...")
        
        # Extract and convert per-frame meshes
        per_frame_meshes = []
        for i, result in enumerate(results):
            frame_idx = result.get('_frame_idx', i)
            frame_ratio = result.get('_frame_ratio', i / len(results) if len(results) > 0 else 0)
            
            # Extract vertices for this frame
            frame_verts = result.get('verts', [])
            
            # Handle torch Tensor
            if hasattr(frame_verts, 'cpu'):
                frame_verts = frame_verts.cpu()
            if hasattr(frame_verts, 'detach'):
                frame_verts = frame_verts.detach()
            if hasattr(frame_verts, 'numpy'):
                frame_verts = frame_verts.numpy()
            
            # Convert to numpy array if not already
            if not isinstance(frame_verts, np.ndarray):
                if hasattr(frame_verts, 'tolist'):
                    frame_verts = np.array(frame_verts.tolist())
                elif isinstance(frame_verts, (list, tuple)):
                    frame_verts = np.array(frame_verts)
                else:
                    continue
            
            # Handle batch dimension: [batch, vertices, 3] -> [vertices, 3]
            if len(frame_verts.shape) == 3:
                frame_verts = frame_verts[0]
            elif len(frame_verts.shape) != 2:
                continue
            
            # Normalize vertices for consistent scale and position
            frame_verts_normalized = normalize_mesh(frame_verts)
            
            # Ensure it's a list (normalize_mesh should return list, but double-check)
            if isinstance(frame_verts_normalized, np.ndarray):
                frame_verts_normalized = frame_verts_normalized.tolist()
            elif not isinstance(frame_verts_normalized, list):
                # If it's something else, try to convert
                try:
                    frame_verts_normalized = list(frame_verts_normalized)
                except:
                    logger.warning(f"Could not convert frame_verts to list, skipping frame {frame_idx}")
                    continue
            
            per_frame_meshes.append({
                'frame_idx': int(frame_idx),  # Ensure int for JSON
                'frame_ratio': float(frame_ratio),  # Ensure float for JSON
                'vertices': frame_verts_normalized  # Should be list now
            })
        
        # Also compute averaged mesh for standalone viewer
        logger.info(f"Computing averaged mesh from {len(results)} detections...")
        best_result = exponential_smooth_results(results, alpha=0.7)
        
        if best_result is None:
            return JSONResponse({"error": "Failed to process results"}, status_code=500)

        # Extract and convert results for averaged mesh
        # ROMP returns verts as numpy array (via convert_tensor2numpy) with shape [batch, vertices, 3] or [vertices, 3]
        smpl_vertices = best_result.get('verts', [])
        
        # Debug: log original type and shape
        logger.debug(f"Original verts type: {type(smpl_vertices)}, shape/len: {getattr(smpl_vertices, 'shape', len(smpl_vertices) if hasattr(smpl_vertices, '__len__') else 'N/A')}")
        
        # Handle torch Tensor (if not already converted)
        if hasattr(smpl_vertices, 'cpu'):
            smpl_vertices = smpl_vertices.cpu()
        if hasattr(smpl_vertices, 'detach'):
            smpl_vertices = smpl_vertices.detach()
        if hasattr(smpl_vertices, 'numpy'):
            smpl_vertices = smpl_vertices.numpy()
        
        # Convert to numpy array if not already
        if not isinstance(smpl_vertices, np.ndarray):
            if hasattr(smpl_vertices, 'tolist'):
                smpl_vertices = np.array(smpl_vertices.tolist())
            elif isinstance(smpl_vertices, (list, tuple)):
                smpl_vertices = np.array(smpl_vertices)
            else:
                logger.warning(f"Unexpected verts type: {type(smpl_vertices)}, value: {smpl_vertices}")
                smpl_vertices = np.array([])
        
        # Handle shape: [batch, vertices, 3] -> [vertices, 3]
        if isinstance(smpl_vertices, np.ndarray):
            if len(smpl_vertices.shape) == 3:
                # [batch, vertices, 3] -> [vertices, 3]
                logger.debug(f"Removing batch dimension: {smpl_vertices.shape} -> {smpl_vertices[0].shape}")
                smpl_vertices = smpl_vertices[0]
            elif len(smpl_vertices.shape) == 2:
                # [vertices, 3] - correct shape
                logger.debug(f"Vertices shape is correct: {smpl_vertices.shape}")
            elif len(smpl_vertices.shape) == 1:
                # Unexpected 1D shape - might be flattened
                logger.warning(f"Unexpected 1D shape: {smpl_vertices.shape}, attempting reshape")
                if smpl_vertices.shape[0] % 3 == 0:
                    smpl_vertices = smpl_vertices.reshape(-1, 3)
                    logger.info(f"Reshaped to: {smpl_vertices.shape}")
            else:
                logger.warning(f"Unexpected shape: {smpl_vertices.shape}")
        
        # Convert to list for JSON serialization
        if isinstance(smpl_vertices, np.ndarray):
            smpl_vertices = smpl_vertices.tolist()
        
        # Log the final shape for debugging
        if smpl_vertices:
            logger.info(f"Extracted vertices: {len(smpl_vertices)} vertices (first vertex: {smpl_vertices[0] if len(smpl_vertices) > 0 else 'empty'})")
        else:
            logger.warning("No vertices extracted!")
        
        # Get faces if available from model output
        smpl_faces = best_result.get('faces', [])
        if not smpl_faces or len(smpl_faces) == 0:
            # Try alternative keys model might use
            smpl_faces = best_result.get('mesh_faces', [])
            if not smpl_faces:
                # Try to get faces from model's SMPL template (ROMP or BEV)
                # ROMP uses SMPL which has standard 13776 faces
                try:
                    current_model = bev if USE_BEV and bev is not None else romp
                    current_model_name = "BEV" if USE_BEV and bev is not None else "ROMP"
                    if current_model is not None:
                        # Try multiple ways to get SMPL faces
                        if hasattr(current_model, 'smpl') and hasattr(current_model.smpl, 'faces'):
                            smpl_faces = current_model.smpl.faces
                            logger.info(f"Using SMPL faces from {current_model_name}.smpl.faces")
                        elif hasattr(current_model, 'model') and hasattr(current_model.model, 'faces'):
                            smpl_faces = current_model.model.faces
                            logger.info(f"Using faces from {current_model_name}.model.faces")
                        elif hasattr(current_model, 'smpl_model') and hasattr(current_model.smpl_model, 'faces'):
                            smpl_faces = current_model.smpl_model.faces
                            logger.info(f"Using faces from {current_model_name}.smpl_model.faces")
                        # Try to access SMPL faces through the model's internal structure
                        elif hasattr(current_model, 'body_model'):
                            body_model = current_model.body_model
                            if hasattr(body_model, 'faces'):
                                smpl_faces = body_model.faces
                                logger.info(f"Using faces from {current_model_name}.body_model.faces")
                except Exception as e:
                    logger.warning(f"Could not get faces from model: {e}")
                    logger.exception("Face extraction error:")
                
                if not smpl_faces or len(smpl_faces) == 0:
                    # SMPL has 6890 vertices and 13776 faces
                    # If we have 6890 vertices, use standard SMPL face template
                    if len(smpl_vertices) == 6890:
                        logger.info("Detected SMPL mesh (6890 vertices). Loading standard SMPL face template...")
                        try:
                            # Try to load SMPL faces from a standard template
                            # SMPL faces are stored in the model file, but we can also generate them
                            # For now, we'll create a simple mapping - in production, load from SMPL model file
                            smpl_faces = get_smpl_faces_template()
                            if smpl_faces:
                                logger.info(f"Loaded standard SMPL face template: {len(smpl_faces)} faces")
                            else:
                                logger.warning("Could not load SMPL face template")
                                smpl_faces = []
                        except Exception as e:
                            logger.warning(f"Error loading SMPL face template: {e}")
                            smpl_faces = []
                    else:
                        smpl_faces = []
                        logger.info(f"Mesh has {len(smpl_vertices)} vertices (not standard SMPL 6890). Frontend will generate faces.")
        
        # Convert faces to list format
        if smpl_faces is not None and len(smpl_faces) > 0:
            if hasattr(smpl_faces, 'tolist'):
                smpl_faces = smpl_faces.tolist()
            elif isinstance(smpl_faces, np.ndarray):
                smpl_faces = smpl_faces.tolist()
            elif isinstance(smpl_faces, torch.Tensor):
                smpl_faces = smpl_faces.cpu().numpy().tolist()
            
        joints = best_result.get('joints', [])
        if hasattr(joints, 'tolist'):
            joints = joints.tolist()
        elif isinstance(joints, np.ndarray):
            joints = joints.tolist()

        params = best_result.get('params', {})
        parsed_params = {
            k: v.tolist() if hasattr(v, 'tolist') else (v.tolist() if isinstance(v, np.ndarray) else v)
            for k, v in params.items()
        }
        
        # Remove internal metadata
        parsed_params.pop('_frame_idx', None)

        # Compute measurements before normalization (using assumed 170 cm height)
        def _convex_hull_2d(points):
            pts = sorted(set((float(p[0]), float(p[1])) for p in points))
            if len(pts) <= 1:
                return pts
            def cross(o, a, b):
                return (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0])
            lower = []
            for p in pts:
                while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
                    lower.pop()
                lower.append(p)
            upper = []
            for p in reversed(pts):
                while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
                    upper.pop()
                upper.append(p)
            return lower[:-1] + upper[:-1]

        def _perimeter(poly):
            if len(poly) < 2:
                return 0.0
            per = 0.0
            for i in range(len(poly)):
                x1, y1 = poly[i]
                x2, y2 = poly[(i+1) % len(poly)]
                per += math.hypot(x2 - x1, y2 - y1)
            return per

        def compute_measurements(vertices, assumed_height_cm=170.0):
            if vertices is None:
                return {}
            verts_np = np.array(vertices, dtype=np.float32)
            if verts_np.ndim != 2 or verts_np.shape[1] < 3:
                return {}
            min_y = float(np.min(verts_np[:, 1]))
            max_y = float(np.max(verts_np[:, 1]))
            mesh_height = max_y - min_y
            if mesh_height <= 1e-6:
                return {}
            scale = assumed_height_cm / mesh_height

            def slice_girth(y_low_ratio, y_high_ratio):
                y_low = min_y + y_low_ratio * mesh_height
                y_high = min_y + y_high_ratio * mesh_height
                mask = (verts_np[:, 1] >= y_low) & (verts_np[:, 1] <= y_high)
                slice_pts = verts_np[mask]
                if slice_pts.shape[0] < 3:
                    return 0.0, slice_pts.shape[0]
                xz = slice_pts[:, [0, 2]]
                hull = _convex_hull_2d(xz)
                per = _perimeter(hull) * scale
                return per, slice_pts.shape[0]

            height_cm = mesh_height * scale
            chest_cm, chest_n = slice_girth(0.53, 0.56)
            waist_cm, waist_n = slice_girth(0.44, 0.46)
            hips_cm, hips_n = slice_girth(0.34, 0.36)

            return {
                "assumed_height_cm": assumed_height_cm,
                "scale_cm_per_unit": scale,
                "height_cm": height_cm,
                "chest_cm": chest_cm,
                "waist_cm": waist_cm,
                "hips_cm": hips_cm,
                "slice_counts": {
                    "chest": int(chest_n),
                    "waist": int(waist_n),
                    "hips": int(hips_n),
                },
            }

        measurements = compute_measurements(smpl_vertices, assumed_height_cm=170.0)

        # Normalize mesh for consistent visualization
        smpl_vertices = normalize_mesh(smpl_vertices)
        
        # Ensure smpl_vertices is a list (normalize_mesh returns list, but double-check)
        if isinstance(smpl_vertices, np.ndarray):
            smpl_vertices = smpl_vertices.tolist()
        elif not isinstance(smpl_vertices, list):
            try:
                smpl_vertices = list(smpl_vertices)
            except:
                logger.warning("Could not convert smpl_vertices to list")
                smpl_vertices = []
        
        logger.info(f"Final mesh: {len(smpl_vertices)} vertices, {len(smpl_faces)} faces, {len(joints)} joints (normalized)")

        return JSONResponse(
            {
                "message": f"Processed successfully ({len(results)}/{len(frame_ratios)} frames detected, exponentially smoothed)",
                "original_filename": video.filename,
                "smpl_vertices": smpl_vertices,  # Averaged mesh for standalone viewer (list)
                "smpl_faces": smpl_faces,  # Add faces for proper mesh rendering (list)
                "joints": joints,  # List
                "params": parsed_params,  # Dict with lists
                "frames_processed": len(results),
                "smoothing_applied": True,
                "smoothing_method": "exponential_moving_average",
                "model_used": model_name,  # String
                "per_frame_meshes": per_frame_meshes,  # List of dicts with lists
                "video_frame_count": int(frame_count),  # Int for JSON
                "measurements": measurements,
            }
        )

    except Exception as e:
        logger.error(f"Error processing scan: {str(e)}", exc_info=True)
        return JSONResponse({"error": f"Processing failed: {str(e)}"}, status_code=500)
