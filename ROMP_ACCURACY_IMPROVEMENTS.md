# 🎯 ROMP Accuracy Improvements - Based on Real Sources

## What You're Using: ROMP (Realtime Online Motion capture for People)

**Source:** [ROMP Technical Blog](https://www.12-technology.com/2022/01/romp-ai3d.html)

### ROMP Characteristics:
- **End-to-End:** Detects people AND generates 3D in one pass (faster than 2-stage methods)
- **Speed:** Real-time on 8GB GPU (GTX 1070Ti)
- **Output:** SMPL body mesh (6890 vertices)
- **Known Issue:** Video can cause jitter/flickering in 3D models

---

## ✅ Already Implemented Improvements

### 1. Multi-Frame Processing
Your backend now processes **5 frames** (20%, 35%, 50%, 65%, 80% through video) and averages them. This:
- Reduces single-frame errors
- Smooths out jitter
- More robust to bad frames

### 2. Frame Averaging
Multiple detections are averaged to get a more stable result.

---

## 🔧 Additional Accuracy Improvements

### 1. Install SMPL Model (CRITICAL - Currently Missing)

**Why:** Without `SMPL_NEUTRAL.pth`, you're in MOCK mode (dummy data).

**Steps:**
1. Go to https://smpl.is.tue.mpg.de/
2. Register (free)
3. Download "SMPL for Python v1.1.0"
4. Extract and find `basicModel_neutral_lbs_10_207_0_v1.1.0.pkl`
5. Copy to `~/.romp/SMPL_NEUTRAL.pth`

```bash
cp ~/Downloads/basicModel_neutral_lbs_10_207_0_v1.1.0.pkl ~/.romp/SMPL_NEUTRAL.pth
cp ~/.romp/SMPL_NEUTRAL.pth ~/.romp/SMPL_MALE.pth
cp ~/.romp/SMPL_NEUTRAL.pth ~/.romp/SMPL_FEMALE.pth
```

### 2. Exponential Smoothing (Better than Simple Average)

Replace simple averaging with exponential moving average for smoother results:

```python
# In main.py, replace averaging with:
def exponential_smooth(results, alpha=0.7):
    """alpha: 0-1, higher = more weight to recent frames"""
    if not results:
        return None
    
    smoothed = results[0].copy()
    for i in range(1, len(results)):
        for key in ['verts', 'joints']:
            if key in results[i] and key in smoothed:
                smoothed[key] = alpha * results[i][key] + (1 - alpha) * smoothed[key]
    return smoothed
```

### 3. ROMP Settings Tuning

According to the [ROMP blog](https://www.12-technology.com/2022/01/romp-ai3d.html), you can tune:

```python
settings = simple_romp.romp_settings()
settings.center_thresh = 0.25  # Lower = detect more people
settings.show_largest = True    # Use largest detected person
settings.smooth_coeff = 3.0      # Higher = more temporal smoothing
```

### 4. Video Quality Requirements

**From ROMP best practices:**
- ✅ **Lighting:** Bright, even (avoid shadows)
- ✅ **Background:** Plain, contrasting
- ✅ **Clothing:** Tight-fitting (activewear)
- ✅ **Pose:** A-pose or T-pose (arms away from body)
- ✅ **Framing:** Full body visible
- ✅ **Stability:** Stable camera (tripod helps)

### 5. Post-Processing Mesh

After ROMP generates mesh, refine it:

```python
# Smooth mesh using Laplacian smoothing
from scipy.spatial import ConvexHull
import trimesh  # pip install trimesh

def refine_mesh(vertices, faces):
    mesh = trimesh.Trimesh(vertices=vertices, faces=faces)
    # Smooth
    mesh = mesh.smoothed()
    # Remove noise
    mesh.remove_duplicate_faces()
    return mesh.vertices, mesh.faces
```

---

## 📊 Accuracy Comparison

| Method | Accuracy | Speed | Setup Difficulty |
|--------|----------|-------|------------------|
| **ROMP** (current) | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| BEV | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| PIXIE | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| MediaPipe | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

**ROMP is a good balance** - fast, accurate enough, and easy to use.

---

## 🚀 Quick Wins (Do These First)

1. **Install SMPL model** - Enables real AI (currently MOCK)
2. **Use good video** - Follow quality tips above
3. **Test with A-pose** - Best detection accuracy
4. **Process multiple frames** - ✅ Already done!

---

## 📚 References

- [ROMP Technical Blog (Japanese)](https://www.12-technology.com/2022/01/romp-ai3d.html)
- [ROMP GitHub](https://github.com/Arthur151/ROMP)
- [SMPL Model Download](https://smpl.is.tue.mpg.de/)

---

## Next Steps

1. **Install SMPL_NEUTRAL.pth** ← Most important!
2. Restart backend
3. Test with a good quality video
4. If still not accurate enough, try BEV or add exponential smoothing


