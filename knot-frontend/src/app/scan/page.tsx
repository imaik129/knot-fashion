"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";

// Dynamically import components to avoid SSR issues with canvas
const VideoMeshOverlay = dynamic(() => import("@/components/VideoMeshOverlay"), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full bg-gradient-to-br from-gray-50 to-gray-100 animate-pulse rounded-lg border border-gray-200 flex items-center justify-center">
      <div className="text-gray-400 text-sm">Loading 3D overlay...</div>
    </div>
  ),
});

const ThreeViewer = dynamic(() => import("@/components/ThreeViewer"), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full bg-gradient-to-br from-gray-50 to-gray-100 animate-pulse rounded-lg border border-gray-200 flex items-center justify-center">
      <div className="text-gray-400 text-sm">Loading 3D viewer...</div>
    </div>
  ),
});

type Status = "idle" | "uploading" | "processing" | "done" | "error";

export default function ScanPage() {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [heightCm, setHeightCm] = useState<string>("170");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup video URL on unmount
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] ?? null;
    setFile(selectedFile);
    setResult(null);
    setErrorMessage(null);
    setStatus("idle");
    
    // Create preview URL for video
    if (selectedFile) {
      // Cleanup old URL if exists
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      const url = URL.createObjectURL(selectedFile);
      setVideoUrl(url);
    } else {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      setVideoUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus("uploading");
    setUploadProgress(0);
    setErrorMessage(null);
    setResult(null);

    const formData = new FormData();
    formData.append("video", file);
    if (heightCm) {
      formData.append("height_cm", heightCm);
    }

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      setStatus("processing");
      
      const res = await fetch("/api/upload-scan", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.error || `Upload failed (${res.status})`);
        setStatus("error");
        return;
      }

      const json = await res.json();
      setResult(json);
      setStatus("done");
    } catch (e: any) {
      console.error("Upload error:", e);
      setErrorMessage(e?.message || "Network error. Please check if backend is running.");
      setStatus("error");
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setErrorMessage(null);
    setStatus("idle");
    setUploadProgress(0);
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Inline-first styling to ensure the page renders beautifully even if Tailwind is not applied
  const colors = {
    text: "#0f172a",
    muted: "#475569",
    border: "#e2e8f0",
    card: "rgba(255,255,255,0.9)",
    accent: "#111827",
  };

  const mainStyle: React.CSSProperties = {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 15% 20%, rgba(99,102,241,0.08), transparent 32%), radial-gradient(circle at 80% 10%, rgba(236,72,153,0.08), transparent 28%), linear-gradient(135deg, #f8fafc 0%, #ffffff 45%, #eef2ff 100%)",
    padding: "20px 12px 72px",
    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: colors.text,
  };

  const shellStyle: React.CSSProperties = {
    maxWidth: 1200,
    margin: "0 auto",
    display: "grid",
    gap: 16,
  };

  const cardStyle: React.CSSProperties = {
    background: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 18,
    boxShadow: "0 24px 80px -52px rgba(15,23,42,0.45)",
    padding: 16,
    backdropFilter: "blur(10px)",
  };

  const buttonPrimary: React.CSSProperties = {
    flex: 1,
    minWidth: 220,
    borderRadius: 14,
    padding: "12px 16px",
    background: "linear-gradient(90deg,#111827,#0b132b)",
    color: "#fff",
    fontWeight: 800,
    border: "none",
    letterSpacing: "-0.01em",
    boxShadow: "0 14px 36px -26px rgba(0,0,0,0.7)",
    cursor: status === "uploading" || status === "processing" ? "not-allowed" : "pointer",
    opacity: status === "uploading" || status === "processing" ? 0.65 : 1,
  };

  const buttonGhost: React.CSSProperties = {
    padding: "13px 16px",
    borderRadius: 14,
    border: "1.4px solid #cbd5e1",
    background: "#ffffff",
    fontWeight: 700,
    color: colors.text,
    cursor: status === "uploading" || status === "processing" ? "not-allowed" : "pointer",
    opacity: status === "uploading" || status === "processing" ? 0.55 : 1,
  };

  const pill: React.CSSProperties = {
    display: "inline-block",
    padding: "7px 12px",
    borderRadius: 9999,
    background: "#0f172a",
    color: "#fff",
    fontWeight: 700,
    letterSpacing: "-0.01em",
    fontSize: 13,
  };

  const coerceVertices = (verts: any): number[][] => {
    if (!verts) return [];
    if (Array.isArray(verts) && Array.isArray(verts[0]) && verts[0].length >= 3) {
      return verts.map((v: any) => [Number(v[0]), Number(v[1]), Number(v[2])]);
    }
    if (ArrayBuffer.isView(verts) && (verts as any).length % 3 === 0) {
      const arr = Array.from(verts as any);
      const out: number[][] = [];
      for (let i = 0; i < arr.length; i += 3) {
        out.push([arr[i], arr[i + 1], arr[i + 2]]);
      }
      return out;
    }
    return [];
  };

  const derivedVertices = useMemo(() => {
    // Prefer averaged mesh
    if (result?.smpl_vertices && result.smpl_vertices.length > 0) {
      return coerceVertices(result.smpl_vertices);
    }
    // Else aggregate per-frame
    if (result?.per_frame_meshes && result.per_frame_meshes.length > 0) {
      const validMeshes = result.per_frame_meshes
        .map((m: any) => ({ ...m, vertices: coerceVertices(m.vertices) }))
        .filter((m: any) => m.vertices && m.vertices.length > 0 && Array.isArray(m.vertices[0]));

      const vCount = validMeshes[0]?.vertices?.length || 0;
      if (validMeshes.length > 0 && vCount > 0) {
        const sums = Array.from({ length: vCount }, () => [0, 0, 0]);
        validMeshes.forEach((m: any) => {
          m.vertices.forEach((v: number[], i: number) => {
            if (i < vCount && v.length >= 3) {
              sums[i][0] += v[0];
              sums[i][1] += v[1];
              sums[i][2] += v[2];
            }
          });
        });
        const avg = sums.map((s) => [s[0] / validMeshes.length, s[1] / validMeshes.length, s[2] / validMeshes.length]);
        if (avg.length > 0) return avg;
      }
      // Mid-frame fallback
      const target = 0.5;
      const best = validMeshes.reduce(
        (acc: any, m: any) => {
          const diff = Math.abs((m.frame_ratio ?? 0) - target);
          if (diff < acc.diff && m.vertices && m.vertices.length > 0) {
            return { diff, vertices: m.vertices };
          }
          return acc;
        },
        { diff: Number.POSITIVE_INFINITY, vertices: null as number[][] | null }
      );
      if (best.vertices) return best.vertices;
      if (validMeshes[0]?.vertices) return validMeshes[0].vertices;
    }
    return [];
  }, [result]);

  // Frame options for manual selection
  const frameOptions = useMemo(() => {
    if (!result?.per_frame_meshes) return [];
    return result.per_frame_meshes
      .map((m: any, idx: number) => ({
        key: `frame-${idx}`,
        label: `Frame ${idx + 1} (${Math.round((m.frame_ratio ?? 0) * 100)}%)`,
        vertices: coerceVertices(m.vertices),
      }))
      .filter((o: any) => o.vertices && o.vertices.length > 0);
  }, [result]);

  const [selectedFrameKey, setSelectedFrameKey] = useState<string>("avg");

  // Cache last non-empty vertices to prevent flicker
  const [cachedVertices, setCachedVertices] = useState<number[][]>([]);
  useEffect(() => {
    if (derivedVertices.length > 0 && cachedVertices.length !== derivedVertices.length) {
      setCachedVertices(derivedVertices);
    }
  }, [derivedVertices.length, cachedVertices.length]);

  // Choose display vertices based on selection
  const selectedFrame = useMemo(() => {
    if (selectedFrameKey === "avg") return null;
    return frameOptions.find((o: any) => o.key === selectedFrameKey) || null;
  }, [selectedFrameKey, frameOptions]);

  const displayVertices =
    selectedFrame?.vertices && selectedFrame.vertices.length > 0
      ? selectedFrame.vertices
      : derivedVertices.length > 0
      ? derivedVertices
      : cachedVertices;

  return (
    <main style={mainStyle}>
      <div style={shellStyle}>
        {/* Header */}
        <header style={{ textAlign: "center", marginBottom: 12 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderRadius: 9999,
              background: "linear-gradient(90deg,#0f172a,#0b132b)",
              color: "#fff",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              fontSize: 15,
              boxShadow: "0 18px 48px -30px rgba(0,0,0,0.6)",
            }}
          >
            <span style={{ width: 30, height: 30, borderRadius: 10, background: "#111827", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>K</span>
            <span>Knot Fashion</span>
          </div>
          <h1
            style={{
              fontSize: "clamp(30px, 4vw, 46px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              margin: "12px 0 6px",
            }}
          >
            AI-Powered 3D Body Scanning
          </h1>
          <p style={{ color: colors.muted, fontSize: 15, lineHeight: 1.6, maxWidth: 720, margin: "0 auto" }}>
            Upload a short full-body video, set your height, then generate mesh and measurements side by side.
          </p>
          <div style={{ marginTop: 12, display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", color: colors.muted, fontSize: 12, fontWeight: 700 }}>
            {["1. Upload", "2. Set height", "3. Generate", "4. Review mesh & measurements"].map((step, idx) => (
              <span key={idx} style={{ padding: "6px 10px", borderRadius: 9999, background: "#f1f5f9", border: `1px solid ${colors.border}` }}>
                {step}
              </span>
            ))}
          </div>
        </header>

        {/* Upload card */}
        <section style={{ ...cardStyle, display: "grid", gap: 12 }}>
          <label
            style={{
              display: "block",
              cursor: "pointer",
              border: "1.5px dashed #cbd5e1",
              borderRadius: 22,
              padding: "28px 16px",
              textAlign: "center",
              background: "#fff",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <div
                style={{
                  width: 86,
                  height: 86,
                  borderRadius: 22,
                  background: "linear-gradient(135deg,#eef2ff,#e0e7ff)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
                }}
              >
                <svg width="32" height="32" fill="none" stroke="#111827" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>
              {file ? file.name : "Click to select video or drag and drop"}
            </div>
            <div
              style={{
                color: colors.muted,
                fontSize: 14,
                fontWeight: 600,
                display: "flex",
                gap: 8,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <span style={{ ...pill, background: "#e2e8f0", color: "#0f172a" }}>MP4</span>
              <span style={{ ...pill, background: "#e2e8f0", color: "#0f172a" }}>MOV</span>
              <span style={{ ...pill, background: "#e2e8f0", color: "#0f172a" }}>AVI</span>
              <span style={{ color: colors.muted, fontWeight: 700 }}>Up to 100MB</span>
            </div>
          </label>

          {file && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", borderRadius: 12, background: "#f8fafc", border: `1px solid ${colors.border}` }}>
                <label style={{ fontSize: 12, color: colors.muted, fontWeight: 600 }}>Height (cm):</label>
                <input
                  type="number"
                  min="120"
                  max="220"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  style={{
                    width: 80,
                    padding: "6px 8px",
                    borderRadius: 10,
                    border: `1px solid ${colors.border}`,
                    fontWeight: 700,
                  }}
                />
                <span style={{ fontSize: 11, color: colors.muted }}>Use your real height for accurate measurements.</span>
              </div>
              <button onClick={handleUpload} disabled={status === "uploading" || status === "processing"} style={buttonPrimary}>
                {status === "uploading" || status === "processing" ? "Processing…" : "Generate 3D Mesh"}
              </button>
              <button onClick={handleReset} disabled={status === "uploading" || status === "processing"} style={buttonGhost}>
                Reset
              </button>
            </div>
          )}

          {(status === "uploading" || status === "processing") && (
            <div style={{ marginTop: 16, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 12, background: "#0f172a0a" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 700, color: colors.text, marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 0 6px rgba(34,197,94,0.12)" }} />
                  <span>Processing video…</span>
                </div>
                <span style={{ color: "#0f172a" }}>{uploadProgress}%</span>
              </div>
              <div style={{ position: "relative", height: 12, background: "#e2e8f0", borderRadius: 9999, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${uploadProgress}%`,
                    background: "linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899)",
                    borderRadius: 9999,
                    boxShadow: "0 6px 14px -10px rgba(99,102,241,0.6)",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0) 100%)",
                      transform: "translateX(-100%)",
                      animation: "shimmerBar 1.6s infinite",
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
            <span style={{ fontWeight: 700, color: colors.muted }}>Status:</span>
            <span
              style={{
                padding: "9px 14px",
                borderRadius: 9999,
                fontWeight: 800,
                background:
                  status === "done"
                    ? "#ecfdf3"
                    : status === "error"
                    ? "#fef2f2"
                    : status === "uploading" || status === "processing"
                    ? "#eff6ff"
                    : "#f8fafc",
                color:
                  status === "done"
                    ? "#166534"
                    : status === "error"
                    ? "#b91c1c"
                    : status === "uploading" || status === "processing"
                    ? "#1d4ed8"
                    : "#475569",
                border:
                  status === "done"
                    ? "1px solid #bbf7d0"
                    : status === "error"
                    ? "1px solid #fecdd3"
                    : status === "uploading" || status === "processing"
                    ? "1px solid #bfdbfe"
                    : "1px solid #e2e8f0",
              }}
            >
              {status === "done" ? "✓ Complete" : status === "error" ? "✗ Error" : status === "uploading" || status === "processing" ? "Processing" : "Ready"}
            </span>
            {file && (
              <span style={{ fontSize: 13, color: colors.muted, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>📄 {file.name}</span>
            )}
          </div>

          {errorMessage && (
            <div style={{ marginTop: 16, padding: 16, borderRadius: 18, background: "#fef2f2", border: "1px solid #fecdd3", color: "#991b1b", fontWeight: 600 }}>
              {errorMessage}
            </div>
          )}
        </section>

        {/* Video with overlay */}
        {(videoUrl || derivedVertices.length > 0) && (
          <section style={{ ...cardStyle, maxWidth: 1100, width: "100%", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>Results</div>
                <div style={{ color: colors.muted, fontSize: 14 }}>Video preview and 3D mesh side by side</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {result?.is_mock && <span style={pill}>Mock Mode</span>}
                {result?.model_used && <span style={pill}>{result.model_used}</span>}
                {frameOptions.length > 0 && (
                  <select
                    value={selectedFrameKey}
                    onChange={(e) => setSelectedFrameKey(e.target.value)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: `1px solid ${colors.border}`,
                      background: "#fff",
                      fontWeight: 700,
                      color: colors.text,
                      fontSize: 13,
                    }}
                  >
                    <option value="avg">Averaged pose</option>
                    {frameOptions.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: derivedVertices.length > 0 ? "repeat(auto-fit, minmax(320px, 1fr))" : "1fr",
                gap: 14,
                alignItems: "stretch",
              }}
            >
              {/* Left: video or placeholder */}
              <div
                style={{
                  width: "100%",
                  borderRadius: 16,
                  overflow: "hidden",
                  border: `1px solid ${colors.border}`,
                  background: "#0f172a",
                  aspectRatio: derivedVertices.length > 0 ? "4 / 3" : "16 / 9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  maxWidth: derivedVertices.length > 0 ? "100%" : 960,
                  margin: derivedVertices.length > 0 ? "0 auto" : "0 auto",
                }}
              >
                {videoUrl ? (
                  <video
                    src={videoUrl}
                    controls
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    playsInline
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#cbd5e1",
                      background: "linear-gradient(135deg,#f8fafc,#f1f5f9)",
                    }}
                  >
                    {status === "uploading" || status === "processing" ? "AI is analyzing your video..." : "Upload a video to see the 3D mesh"}
                  </div>
                )}
              </div>

              {/* Right: 3D viewer (only if we have vertices) */}
              {derivedVertices.length > 0 && (
                <div
                  style={{
                    width: "100%",
                    borderRadius: 16,
                    overflow: "hidden",
                    border: `1px solid ${colors.border}`,
                    background: "#fff",
                  }}
                >
                  <div style={{ padding: "10px 12px", borderBottom: `1px solid ${colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>3D Mesh Viewer</div>
                    <div style={{ color: colors.muted, fontSize: 12 }}>🖱️ Rotate • Pan • Zoom</div>
                  </div>
                  <div style={{ width: "100%", height: 420 }}>
                    <ThreeViewer vertices={derivedVertices} faces={result.smpl_faces} />
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Measurements */}
        {result?.measurements && (
          <section style={{ ...cardStyle, maxWidth: 1100, width: "100%", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>Measurements (assumed height {result.measurements.assumed_height_cm || 170} cm)</div>
              <div style={{ color: colors.muted, fontSize: 12 }}>Scale factor: {result.measurements.scale_cm_per_unit?.toFixed?.(3) ?? "—"} cm/unit</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
              <div style={{ padding: 12, borderRadius: 14, background: "#f8fafc", border: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: 12, color: colors.muted }}>Height (cm)</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{(result.measurements.height_cm ?? 0).toFixed(1)} cm</div>
              </div>
              <div style={{ padding: 12, borderRadius: 14, background: "#f8fafc", border: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: 12, color: colors.muted }}>Chest (cm)</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{(result.measurements.chest_cm ?? 0).toFixed(1)} cm</div>
              </div>
              <div style={{ padding: 12, borderRadius: 14, background: "#f8fafc", border: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: 12, color: colors.muted }}>Waist (cm)</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{(result.measurements.waist_cm ?? 0).toFixed(1)} cm</div>
              </div>
              <div style={{ padding: 12, borderRadius: 14, background: "#f8fafc", border: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: 12, color: colors.muted }}>Hips (cm)</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{(result.measurements.hips_cm ?? 0).toFixed(1)} cm</div>
              </div>
            </div>
            {result.measurements.slice_counts && (
              <div style={{ marginTop: 10, fontSize: 12, color: colors.muted }}>
                Sample counts (chest/waist/hips): {result.measurements.slice_counts.chest ?? 0} / {result.measurements.slice_counts.waist ?? 0} / {result.measurements.slice_counts.hips ?? 0}
              </div>
            )}
            <div style={{ marginTop: 8, fontSize: 11, color: colors.muted }}>
              Accuracy depends on pose/fit; ensure full body in frame, good lighting, arms away.
            </div>
          </section>
        )}

        {/* Tips */}
        <section
          style={{
            ...cardStyle,
            background: "linear-gradient(135deg,#eef2ff,#fdf2ff)",
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 10, color: colors.text }}>Quick tips</div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              "Use A- or T-pose, arms away from torso",
              "Good lighting, plain background",
              "Full body visible, 3–10s video",
            ].map((tip, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  padding: "10px 12px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.75)",
                  border: `1px solid ${colors.border}`,
                }}
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 8,
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 12,
                  }}
                >
                  {idx + 1}
                </span>
                <span style={{ color: colors.text, fontWeight: 700 }}>{tip}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Debug */}
        {result && (
          <section style={cardStyle}>
            <details>
              <summary style={{ fontWeight: 700, color: colors.text, cursor: "pointer" }}>Technical Details</summary>
              <div style={{ marginTop: 12, fontSize: 13, color: colors.muted }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 8, marginBottom: 8 }}>
                  <div>Frames: {result.frames_processed || "N/A"}</div>
                  <div>Vertices: {result.smpl_vertices?.length || 0}</div>
                  <div>Faces: {result.smpl_faces?.length || 0}</div>
                </div>
                <pre
                  style={{
                    marginTop: 8,
                    background: "#0f172a",
                    color: "#e2e8f0",
                    padding: 12,
                    borderRadius: 12,
                    maxHeight: 220,
                    overflow: "auto",
                    fontSize: 12,
                  }}
                >
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </details>
          </section>
        )}
      </div>
    </main>
  );
}
