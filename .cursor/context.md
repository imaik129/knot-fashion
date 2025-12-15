# 📌 `.cursor/context.md`

### **Knot Fashion – AI Body Scanning + Pattern Fitting Platform**

## ✅ **Project Summary**

Knot Fashion is a full-stack platform that takes **monocular video** from users and converts it into a **3D SMPL body mesh** using AI.

The mesh is used for:

* Precise body measurements
* Automatic pattern grading
* Virtual try-on
* Clothing personalization

The system uses a **Next.js frontend** and a **Python FastAPI backend** running a model such as **ROMP / simple_romp** for SMPL mesh reconstruction.

---

## 📁 **Folder Structure**

```
knot-fashion/
  .cursor/context.md   <-- THIS file
  knot-frontend/        <-- Next.js 14+ (App Router, Tailwind, React Compiler)
    src/
      app/
        scan/page.tsx
        api/upload-scan/route.ts
  knot-backend/         <-- Python FastAPI (runs on GPU server)
    main.py
    smpl_model_data/    <-- SMPL files for ROMP
```

---

## 🎯 **Core Objectives**

### **1. Frontend (Next.js / Vercel)**

* Provide a clean UI to upload a body-scan video (`/scan`)
* Send video to backend via `/api/upload-scan`
* Show backend processing result
* Eventually render 3D mesh using `three.js` or `react-three-fiber`

### **2. Backend (FastAPI)**

* Accept uploaded video (`/process-scan`)
* Save video temporarily
* Extract video frames (OpenCV)
* Run **ROMP** / **simple_romp** on sampled frames
* Produce:

  * SMPL mesh
  * body shape parameters β
  * pose parameters θ
  * joint locations
  * derived measurements

* Return JSON back to frontend

### **3. AI Model**

Using **ROMP / simple_romp**:

* Takes RGB frame
* Outputs SMPL mesh + joints
* Requires SMPL model conversion using `romp.prepare_smpl`
* Output will be formatted into a JSON response

---

## 🔌 **API Contract**

### **Frontend → Next.js API**

`POST /api/upload-scan`

FormData:

```
video: File
```

Response:

```
{ status, result-from-backend }
```

### **Next.js API → Backend**

`POST http://localhost:8000/process-scan`

FormData:

```
video: File
```

Response (v0.1):

```
{
  message: "Video received",
  saved_to: "/tmp/knot_input.mp4"
}
```

Later (v1.0 expected):

```
{
  smpl_vertices: [...],
  smpl_faces: [...],
  body_shape_params: [...],   # beta
  pose_params: [...],         # theta
  measurements: {
    chest: ...,
    waist: ...,
    hips: ...
  }
}
```

---

## 🧠 **Cursor Should Assist With**

* Producing clean TypeScript components
* Writing backend FastAPI handlers
* Integrating ROMP inference into Python
* Converting meshes to `.obj` or `.glb`
* Adding frame extraction + smoothing
* Building 3D viewer components in React
* Pattern grading logic using SMPL measurements
* Ensuring correct typing + error handling

---

## 🧩 **Tech Stack Overview**

### **Frontend**

* Next.js 14+
* App Router
* TailwindCSS
* React Compiler
* Route Handlers
* Vercel deployment eventually

### **Backend**

* Python 3.10+
* FastAPI
* Uvicorn
* OpenCV
* torch
* simple_romp
* GPU execution (Runpod / Modal / AWS)

### **Model**

* ROMP / simple_romp
* SMPL model files required
* SMPL mesh extraction
* Measurement extraction per-slice (“cylinder segmentation”)

---

## 🚧 **Immediate Tasks**

Cursor should consider your next tasks include:

1. Finalize working pipeline:

   * Upload UI
   * Next.js → FastAPI → returns response

2. Add ROMP integration:

   * Load model
   * Run inference on frames

3. Return usable mesh + measurement data
4. Build early 3D viewer
5. Add pattern grading logic later

---

## 🏁 **Definition of “Done”**

* User uploads a video
* Backend processes frames with ROMP
* Backend returns:

  * SMPL mesh
  * Body measurements
  * JSON summary

* Frontend shows the results in UI
* Project compiles without errors

---


