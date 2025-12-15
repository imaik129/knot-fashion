"use client";

import React, { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Center, PerspectiveCamera, Environment } from "@react-three/drei";
import * as THREE from "three";

interface ThreeViewerProps {
  vertices: number[][]; // List of [x, y, z]
  faces?: number[][]; // List of [i1, i2, i3] face indices
  joints?: number[][];
}

function BodyMesh({ vertices, faces, wireframe, opacity }: { vertices: number[][]; faces?: number[][]; wireframe?: boolean; opacity?: number }) {
  // Normalize for display: center to origin and scale to height ~2 units
  const normalizedVerts = useMemo(() => {
    if (!vertices || vertices.length === 0) return [];
    let minY = Infinity, maxY = -Infinity;
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    vertices.forEach((v) => {
      minY = Math.min(minY, v[1]);
      maxY = Math.max(maxY, v[1]);
      minX = Math.min(minX, v[0]);
      maxX = Math.max(maxX, v[0]);
      minZ = Math.min(minZ, v[2]);
      maxZ = Math.max(maxZ, v[2]);
    });
    const height = Math.max(1e-6, maxY - minY);
    const scale = 2 / height; // target height ~2
    const center = [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];
    return vertices.map((v) => [
      (v[0] - center[0]) * scale,
      (v[1] - center[1]) * scale,
      (v[2] - center[2]) * scale,
    ]);
  }, [vertices]);

  const { geometry, hasFaces } = useMemo(() => {
    // Convert vertices to Float32Array
    const verts = normalizedVerts.length > 0 ? normalizedVerts : vertices;
    // ROMP/SMPL uses Y-up coordinate system; we already flipped Y in earlier fix, keep that
    const pos = new Float32Array(verts.length * 3);
    verts.forEach((v, i) => {
      pos[i * 3] = v[0];       // X: right
      pos[i * 3 + 1] = -v[1];  // Y: flip to correct upside-down orientation
      pos[i * 3 + 2] = v[2];   // Z: forward
    });

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    // If we have faces from ROMP, use them directly
    if (faces && faces.length > 0) {
      // Use provided faces (SMPL standard faces)
      const indices = new Uint32Array(faces.length * 3);
      faces.forEach((face, i) => {
        indices[i * 3] = face[0];
        indices[i * 3 + 1] = face[1];
        indices[i * 3 + 2] = face[2];
      });
      geom.setIndex(new THREE.BufferAttribute(indices, 1));
      // Compute smooth normals for better appearance
      geom.computeVertexNormals();
      // Ensure smooth shading
      return { geometry: geom, hasFaces: true };
    } else {
      // Generate faces using a simple approach for body-like shapes
      // Since ConvexHull isn't available, we'll use a sphere-based mesh generation
      // This creates a smooth, body-like appearance
      try {
        // For SMPL-like models, we can create a mesh by grouping vertices by height
        // and connecting them in a cylindrical fashion
        const indices: number[] = [];
        
        // Group vertices by Y position (height) to create body segments
        const segments: { y: number; indices: number[] }[] = [];
        const yGroups: { [key: string]: number[] } = {};
        
        vertices.forEach((v, idx) => {
          // Round Y to nearest 0.05 to group into segments
          const yKey = Math.round(v[1] * 20) / 20;
          const key = yKey.toFixed(2);
          if (!yGroups[key]) {
            yGroups[key] = [];
          }
          yGroups[key].push(idx);
        });
        
        // Sort segments by Y
        const sortedKeys = Object.keys(yGroups)
          .map(k => ({ y: parseFloat(k), indices: yGroups[k] }))
          .sort((a, b) => a.y - b.y);
        
        // Connect adjacent segments to form a mesh
        for (let i = 0; i < sortedKeys.length - 1; i++) {
          const currSeg = sortedKeys[i].indices;
          const nextSeg = sortedKeys[i + 1].indices;
          
          // Create triangles between segments
          // Use a simple approach: connect each point to nearest points in next segment
          for (let j = 0; j < currSeg.length; j++) {
            const currIdx = currSeg[j];
            const nextIdx1 = nextSeg[j % nextSeg.length];
            const nextIdx2 = nextSeg[(j + 1) % nextSeg.length];
            
            indices.push(currIdx, nextIdx1, nextIdx2);
            
            // Also create triangle with next point in current segment
            if (j < currSeg.length - 1) {
              const currNextIdx = currSeg[j + 1];
              indices.push(currIdx, nextIdx2, currNextIdx);
            }
          }
        }
        
        if (indices.length > 0) {
          const indexArray = new Uint32Array(indices);
          geom.setIndex(new THREE.BufferAttribute(indexArray, 1));
          geom.computeVertexNormals();
          return { geometry: geom, hasFaces: true };
        }
      } catch (e) {
        console.warn('Mesh generation failed, using enhanced point cloud:', e);
      }
      
      // Fallback: return enhanced point cloud geometry
      return { geometry: geom, hasFaces: false };
    }
  }, [vertices, faces]);

  // Render as smooth, semi-transparent mesh (like in the reference image)
  if (hasFaces) {
    return (
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#e5e7eb"  // Light grey, like in the reference image
          metalness={0.0}
          roughness={0.6}  // Slightly more glossy for smoother appearance
          transparent={true}
          opacity={opacity ?? 0.75}  // Semi-transparent like the overlay in the image
          side={THREE.DoubleSide}
          flatShading={false}  // Smooth shading
          depthWrite={false}  // Better transparency rendering
          wireframe={wireframe}
        />
      </mesh>
    );
  }

  // Enhanced point cloud as fallback (creates a smooth appearance)
  return (
    <points geometry={geometry}>
      <pointsMaterial
        color="#e5e7eb"
        size={0.04}
        sizeAttenuation={true}
        transparent={true}
        opacity={0.75}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function ThreeViewer({ vertices, faces }: ThreeViewerProps) {
  const [wireframe, setWireframe] = useState(false);
  const [opacity, setOpacity] = useState(0.75);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  if (!vertices || vertices.length === 0) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center bg-gray-100 text-gray-400 rounded-lg">
        No 3D data to display
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] bg-white rounded-lg overflow-hidden relative shadow-lg border border-gray-200">
      {/* Controls */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 shadow-sm">
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="checkbox" checked={autoRotate} onChange={(e) => setAutoRotate(e.target.checked)} />
          Auto-rotate
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="checkbox" checked={wireframe} onChange={(e) => setWireframe(e.target.checked)} />
          Wireframe
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
          Grid
        </label>
        <div className="flex items-center gap-1">
          Opacity
          <input
            type="range"
            min="0.2"
            max="1"
            step="0.05"
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
          />
        </div>
      </div>

      <Canvas
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        camera={{ position: [0, 0, 3.2], fov: 50 }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 3.2]} />
        
        {/* Soft, even lighting for semi-transparent body mesh */}
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 5, 5]} intensity={0.6} />
        <directionalLight position={[-5, 5, -5]} intensity={0.3} />
        <directionalLight position={[0, -5, 0]} intensity={0.2} />
        
        {/* Subtle grid (like in reference image) */}
        {showGrid && <gridHelper args={[10, 10, '#d1d5db', '#f3f4f6']} />}
        
        <Center>
          <BodyMesh vertices={vertices} faces={faces} wireframe={wireframe} opacity={opacity} />
        </Center>
        
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.05}
          minDistance={1}
          maxDistance={10}
          autoRotate={autoRotate}
        />
        
        {/* Neutral environment for clean look */}
        <Environment preset="sunset" />
      </Canvas>
      
      <div className="absolute bottom-4 left-4 text-gray-600 text-xs opacity-60 pointer-events-none bg-white/80 px-3 py-2 rounded backdrop-blur-sm border border-gray-200">
        <div>🖱️ Rotate • Pan • Zoom</div>
      </div>
    </div>
  );
}
