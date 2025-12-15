"use client";

import React, { useMemo, useRef, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

interface VideoMeshOverlayProps {
  videoUrl: string | null;
  vertices: number[][];
  faces?: number[][];
  perFrameMeshes?: Array<{
    frame_idx: number;
    frame_ratio: number;
    vertices: number[][];
  }>;
  videoFrameCount?: number;
}

function BodyMesh({ 
  vertices, 
  faces,
  meshRef 
}: { 
  vertices: number[][]; 
  faces?: number[][];
  meshRef?: React.RefObject<THREE.Mesh>;
}) {
  const { geometry, hasFaces } = useMemo(() => {
    if (!vertices || vertices.length === 0) {
      return { geometry: null, hasFaces: false };
    }

    // Convert vertices to Float32Array
    // ROMP/SMPL uses Y-up coordinate system, but video might have Y-down
    // Keep original coordinates - we'll use rotation to fix orientation
    const pos = new Float32Array(vertices.length * 3);
    vertices.forEach((v, i) => {
      // ROMP output: X=right, Y=up, Z=forward (camera space)
      // Keep original coordinates
      pos[i * 3] = v[0];      // X: right
      pos[i * 3 + 1] = v[1];  // Y: up (keep original)
      pos[i * 3 + 2] = v[2];  // Z: forward
    });

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    // Use provided faces if available (SMPL standard faces)
    if (faces && faces.length > 0) {
      const indices: number[] = [];
      
      // Handle different face formats
      faces.forEach((face) => {
        if (Array.isArray(face)) {
          if (face.length === 3) {
            // [i1, i2, i3] format
            indices.push(face[0], face[1], face[2]);
          } else if (face.length > 3) {
            // Polygon - triangulate using fan method
            for (let i = 1; i < face.length - 1; i++) {
              indices.push(face[0], face[i], face[i + 1]);
            }
          }
        } else if (typeof face === 'number') {
          // Flat array format - should be handled by caller
          indices.push(face);
        }
      });
      
      if (indices.length > 0) {
        const indexArray = new Uint32Array(indices);
        geom.setIndex(new THREE.BufferAttribute(indexArray, 1));
        // Compute smooth normals for better appearance
        geom.computeVertexNormals();
        // Smooth the geometry for better appearance
        try {
          // Apply Laplacian smoothing if available
          const positions = geom.attributes.position;
          if (positions) {
            // Simple smoothing pass
            const newPositions = new Float32Array(positions.array.length);
            const count = positions.count;
            
            // Average positions with neighbors (simplified smoothing)
            for (let i = 0; i < count; i++) {
              const x = positions.getX(i);
              const y = positions.getY(i);
              const z = positions.getZ(i);
              newPositions[i * 3] = x;
              newPositions[i * 3 + 1] = y;
              newPositions[i * 3 + 2] = z;
            }
            
            // Apply slight smoothing
            for (let pass = 0; pass < 1; pass++) {
              for (let i = 0; i < count; i++) {
                // This is a placeholder - in production, use proper neighbor averaging
                // For now, just ensure normals are smooth
              }
            }
          }
        } catch (e) {
          console.warn('Smoothing failed:', e);
        }
        
        return { geometry: geom, hasFaces: true };
      }
    }

    // Fallback: return geometry without faces
    return { geometry: geom, hasFaces: false };
  }, [vertices, faces]);

  if (!geometry) return null;

  // Render as smooth, semi-transparent mesh (like reference image)
  if (hasFaces) {
    return (
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          color="#e5e7eb"  // Light grey, matching reference image
          metalness={0.0}
          roughness={0.6}  // Slightly glossy for smoother appearance
          transparent={true}
          opacity={0.75}  // Semi-transparent overlay
          side={THREE.DoubleSide}
          flatShading={false}  // Smooth shading
          depthWrite={false}
          polygonOffset={true}
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
          wireframe={false}
        />
      </mesh>
    );
  }

  // Fallback: point cloud
  return (
    <points geometry={geometry}>
      <pointsMaterial
        color="#d1d5db"
        size={0.03}
        sizeAttenuation={true}
        transparent={true}
        opacity={0.7}
      />
    </points>
  );
}

export default function VideoMeshOverlay({ 
  videoUrl, 
  vertices, 
  faces, 
  perFrameMeshes,
  videoFrameCount 
}: VideoMeshOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentVertices, setCurrentVertices] = useState<number[][]>(vertices);
  const meshRef = useRef<THREE.Mesh>(null);

  // Early return if no video URL or no vertices
  if (!videoUrl || !vertices || vertices.length === 0) {
    return (
      <div className="w-full h-[600px] bg-black rounded-lg flex items-center justify-center text-gray-400">
        {!videoUrl ? "No video available" : "No mesh data available"}
      </div>
    );
  }

  // Sync mesh with video playback if per-frame meshes are available
  useEffect(() => {
    if (!perFrameMeshes || perFrameMeshes.length === 0 || !videoRef.current) {
      return;
    }

    const video = videoRef.current;
    let lastMeshIndex = -1;
    let rafId: number | null = null;
    let isUpdating = false;
    
    const updateMeshForCurrentFrame = () => {
      if (!video || isUpdating) return;
      
      isUpdating = true;
      
      const currentTime = video.currentTime;
      const duration = video.duration;
      
      if (!duration || duration === 0) {
        isUpdating = false;
        return;
      }
      
      // Calculate current frame ratio (0 to 1)
      const currentRatio = Math.max(0, Math.min(1, currentTime / duration));
      
      // Find the closest frame mesh
      let closestMesh = perFrameMeshes[0];
      let closestIndex = 0;
      let minDiff = Math.abs(perFrameMeshes[0].frame_ratio - currentRatio);
      
      for (let i = 0; i < perFrameMeshes.length; i++) {
        const mesh = perFrameMeshes[i];
        const diff = Math.abs(mesh.frame_ratio - currentRatio);
        if (diff < minDiff) {
          minDiff = diff;
          closestMesh = mesh;
          closestIndex = i;
        }
      }
      
      // Only update if we have a different mesh to avoid unnecessary updates
      if (closestIndex !== lastMeshIndex && closestMesh && closestMesh.vertices && closestMesh.vertices.length > 0) {
        lastMeshIndex = closestIndex;
        
        // Use vertices directly (already normalized by backend)
        setCurrentVertices(closestMesh.vertices);
        
        // Update geometry smoothly
        if (meshRef.current && meshRef.current.geometry) {
          const geometry = meshRef.current.geometry;
          const positions = geometry.attributes.position;
          
          if (positions && closestMesh.vertices.length === positions.count) {
            const posArray = new Float32Array(closestMesh.vertices.length * 3);
            closestMesh.vertices.forEach((v, i) => {
              // Apply consistent coordinate transformation
              posArray[i * 3] = v[0];      // X: right
              posArray[i * 3 + 1] = v[1];  // Y: up
              posArray[i * 3 + 2] = v[2];  // Z: forward
            });
            if ("set" in positions && typeof (positions as any).set === "function") {
              (positions as any).set(posArray);
            } else if ("copyArray" in positions && typeof (positions as any).copyArray === "function") {
              (positions as any).copyArray(posArray);
            } else {
              for (let i = 0; i < posArray.length; i++) {
                (positions as any).array[i] = posArray[i];
              }
            }
            positions.needsUpdate = true;
            geometry.computeVertexNormals();
          }
        }
      }
      
      isUpdating = false;
    };

    // Throttled update using requestAnimationFrame
    const throttledUpdate = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(updateMeshForCurrentFrame);
    };
    
    video.addEventListener('timeupdate', throttledUpdate);
    video.addEventListener('seeked', updateMeshForCurrentFrame);
    
    // Initial update
    updateMeshForCurrentFrame();

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      video.removeEventListener('timeupdate', throttledUpdate);
      video.removeEventListener('seeked', updateMeshForCurrentFrame);
    };
  }, [perFrameMeshes, videoUrl]);

  // Use current vertices (from video sync) or fallback to provided vertices
  const displayVertices = perFrameMeshes && perFrameMeshes.length > 0 
    ? currentVertices 
    : vertices;

  return (
    <div ref={containerRef} className="w-full h-[600px] relative bg-black rounded-lg overflow-hidden">
      {/* Video Layer - Full size background */}
      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          className="absolute inset-0 w-full h-full object-contain z-0"
          playsInline
          style={{ 
            objectFit: 'contain',
            pointerEvents: 'auto' // Ensure video controls are clickable
          }}
        />
      )}

      {/* 3D Mesh Overlay Layer - Perfectly aligned on top */}
      {vertices && vertices.length > 0 && (
        <div 
          className="absolute inset-0 z-10 pointer-events-none" 
          style={{ 
            mixBlendMode: 'normal',
            // Ensure perfect alignment with video
            width: '100%',
            height: '100%',
            top: 0,
            left: 0,
            pointerEvents: 'none' // Ensure no pointer events block video controls
          }}
        >
          <Canvas
            gl={{ 
              antialias: true, 
              alpha: true, 
              preserveDrawingBuffer: true,
              premultipliedAlpha: false,
              powerPreference: "high-performance",
              stencil: false,
              depth: true
            }}
            camera={{ position: [0, 0, 2.5], fov: 50 }}
            style={{ 
              background: 'transparent',
              width: '100%',
              height: '100%',
              pointerEvents: 'none' // Critical: allow clicks to pass through to video
            }}
            dpr={[1, 2]}  // Device pixel ratio for better quality
          >
            <PerspectiveCamera makeDefault position={[0, 0, 2.5]} fov={50} />
            
            {/* Enhanced lighting for smooth, realistic mesh appearance */}
            <ambientLight intensity={0.75} />
            <directionalLight position={[5, 5, 5]} intensity={0.7} />
            <directionalLight position={[-5, 5, -5]} intensity={0.4} />
            <directionalLight position={[0, -5, 0]} intensity={0.25} />
            <pointLight position={[0, 5, 0]} intensity={0.3} />
            
            {/* Rotate mesh to match video orientation - consistent across all frames */}
            {/* Fixed rotation: X-axis 180° to flip vertically, Y-axis 180° to flip front/back */}
            <group rotation={[Math.PI, Math.PI, 0]}>
              <BodyMesh 
                vertices={displayVertices} 
                faces={faces}
                meshRef={meshRef}
              />
            </group>
          </Canvas>
        </div>
      )}

      {/* Controls hint */}
      {vertices && vertices.length > 0 && (
        <div 
          className="absolute bottom-4 left-4 text-white text-xs opacity-70 pointer-events-none bg-black/50 px-3 py-2 rounded backdrop-blur-sm z-20"
          style={{ pointerEvents: 'none' }}
        >
          <div>3D Mesh Overlay</div>
        </div>
      )}
      
      {/* Video controls area - ensure it's always clickable */}
      {videoUrl && (
        <div 
          className="absolute bottom-0 left-0 right-0 h-16 z-30 pointer-events-auto"
          style={{ 
            pointerEvents: 'auto',
            // This area allows video controls to be clicked
            background: 'transparent'
          }}
        />
      )}
    </div>
  );
}

