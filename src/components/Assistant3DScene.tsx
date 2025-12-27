import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, Float, ContactShadows } from '@react-three/drei';
import { Zap } from 'lucide-react';

function Model(props: any) {
  // Using the path relative to the public folder
  const { scene } = useGLTF('/assets/Akito3DModel.glb');

  // Clone the scene to avoid issues if used multiple times, though here it's unique
  return <primitive object={scene} {...props} />;
}

// Preload the model
useGLTF.preload('/assets/Akito3DModel.glb');

export default function Assistant3DScene() {
  return (
    <div className="w-full h-[400px] md:h-[500px] relative cursor-grab active:cursor-grabbing">
      <Canvas shadows camera={{ position: [0, 0, 6], fov: 40 }}>
        <ambientLight intensity={0.8} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} shadow-mapSize={2048} castShadow />

        <Suspense fallback={null}>
          <Float
            speed={2}
            rotationIntensity={0.2}
            floatIntensity={0.5}
            floatingRange={[-0.1, 0.1]}
          >
            {/* Subido para que se vea cuerpo entero o más centrado */}
            <Model scale={3.8} position={[0, -0.1, 0]} />
          </Float>
          <Environment preset="city" />
          <ContactShadows position={[0, -1.6, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
        </Suspense>

        <OrbitControls
          enableZoom={false}
          autoRotate
          autoRotateSpeed={2}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.8}
        />
      </Canvas>

      {/* Loading / Error Fallback UI is handled by Suspense or Error Boundary in parent, 
          but we can add a small loader if needed */}
    </div>
  );
}
