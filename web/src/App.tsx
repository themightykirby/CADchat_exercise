import { ContactShadows, Environment, Grid, Lightformer, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useReducer } from 'react'
import { closedOverlayState, overlayReducer } from './review/overlayReducer'
import { ReviewCube } from './scene/ReviewCube'

const CUBE_ID = 'cube-1'

function App() {
  const [overlayState, dispatch] = useReducer(overlayReducer, closedOverlayState)

  return (
    <div className="h-dvh w-full">
      <Canvas camera={{ position: [3, 3, 3] }} onPointerMissed={() => dispatch({ type: 'closed' })}>
        <color attach="background" args={['#0f172a']} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={1.5} />
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={2} position={[0, 5, -3]} scale={[10, 3, 1]} />
          <Lightformer form="rect" intensity={1} position={[-5, 1, 2]} scale={[3, 6, 1]} />
          <Lightformer form="ring" intensity={1.5} position={[4, 2, 3]} scale={3} />
        </Environment>
        <ContactShadows position={[0, -1, 0]} opacity={0.5} scale={8} blur={2.5} far={3} />
        <Grid
          position={[0, -1.01, 0]}
          args={[10, 10]}
          cellSize={0.5}
          sectionSize={2.5}
          cellColor="#cbd5e1"
          sectionColor="#e2e8f0"
          cellThickness={0.6}
          sectionThickness={1}
          fadeDistance={20}
          fadeStrength={1.5}
          infiniteGrid
        />
        <ReviewCube
          cubeId={CUBE_ID}
          overlayState={overlayState}
          dispatch={dispatch}
          onClose={() => dispatch({ type: 'closed' })}
        />
        <OrbitControls makeDefault enableZoom={overlayState.kind === 'closed'} />
      </Canvas>
    </div>
  )
}

export default App
