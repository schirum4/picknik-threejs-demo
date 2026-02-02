import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three-stdlib";

type StreamSample = {
  t: number;
  x: number;
  y: number;
  z: number;
  rotY: number;
};

export default function ThreeViewer() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1020);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.set(2.5, 1.8, 3.5);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(4, 6, 3);
    scene.add(dir);

    // Helpers
    const grid = new THREE.GridHelper(10, 20, 0x3355aa, 0x223366);
    grid.position.y = -0.5;
    scene.add(grid);

    const axes = new THREE.AxesHelper(1.2);
    scene.add(axes);

    // Demo object ("robot end-effector" proxy)
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshStandardMaterial({
      color: 0x4ade80,
      metalness: 0.25,
      roughness: 0.35,
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(0, 0, 0);
    scene.add(cube);

    // Controls (interactive)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;

    // --- Real-time stream simulation (replaceable with WebSocket) ---
    // This simulates a live pose stream (like robotics telemetry).
    const stream: StreamSample[] = [];
    let streamT = 0;

    const streamInterval = window.setInterval(() => {
      streamT += 0.06;
      stream.push({
        t: streamT,
        x: Math.sin(streamT) * 0.9,
        y: Math.cos(streamT * 0.7) * 0.2,
        z: Math.cos(streamT) * 0.9,
        rotY: streamT,
      });
      // Keep recent samples only
      if (stream.length > 120) stream.shift();
    }, 60);

    // Optional: draw the recent path
    const pathMat = new THREE.LineBasicMaterial({ color: 0x60a5fa });
    const pathGeom = new THREE.BufferGeometry();
    const pathLine = new THREE.Line(pathGeom, pathMat);
    scene.add(pathLine);

    const updatePath = () => {
      const points = stream.map((s) => new THREE.Vector3(s.x, s.y, s.z));
      pathGeom.setFromPoints(points);
      pathGeom.computeBoundingSphere();
    };

    // Animation loop
    let raf = 0;
    const animate = () => {
      raf = window.requestAnimationFrame(animate);

      // Apply latest streamed pose to the cube (real-time update)
      const latest = stream[stream.length - 1];
      if (latest) {
        cube.position.set(latest.x, latest.y, latest.z);
        cube.rotation.y = latest.rotY;
        updatePath();
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize handling
    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearInterval(streamInterval);
      window.cancelAnimationFrame(raf);

      controls.dispose();
      geometry.dispose();
      material.dispose();
      pathGeom.dispose();
      pathMat.dispose();

      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        width: "100%",
        height: "70vh",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.12)",
      }}
    />
  );
}
