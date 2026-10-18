"use client";

import { useEffect, useRef } from "react";

/**
 * Scene3D — the WebGL layer behind the hero.
 *
 *  · ~90 flat-shaded glass shards (saffron / teal / violet) drifting in space
 *  · a soft additive particle field
 *  · a glowing icosahedron "shield core" that hovers beside Dadi
 *  · pointer parallax + scroll-linked rotation; rendering pauses whenever the
 *    hero is off-screen, and static frames under prefers-reduced-motion.
 *
 * Loaded via next/dynamic(() => import("./Scene3D"), { ssr:false }) so the
 * ~150 kB three.js payload never blocks first paint.
 */
export default function Scene3D() {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      if (disposed) return;

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x04070e, 0.05);

      const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
      camera.position.set(0, 0, 9);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      renderer.setClearColor(0x000000, 0);
      host.appendChild(renderer.domElement);

      // ---- lights ----------------------------------------------------------
      scene.add(new THREE.AmbientLight(0x8fa3c8, 0.7));
      const warm = new THREE.DirectionalLight(0xffb35c, 2.2);
      warm.position.set(6, 4, 6);
      scene.add(warm);
      const cool = new THREE.PointLight(0x2dd4bf, 26, 40);
      cool.position.set(-7, -2, 4);
      scene.add(cool);

      // ---- glass shards ----------------------------------------------------
      const palette = [0xf5a623, 0xffc96b, 0x2dd4bf, 0x8b7cf6, 0x4b6cb7];
      const shardGroup = new THREE.Group();
      scene.add(shardGroup);
      const shardGeometries = [
        new THREE.TetrahedronGeometry(1, 0),
        new THREE.OctahedronGeometry(1, 0),
        new THREE.IcosahedronGeometry(1, 0),
      ];
      const shards = [];
      for (let i = 0; i < 90; i++) {
        const size = 0.14 + Math.random() * 0.5;
        const mat = new THREE.MeshStandardMaterial({
          color: palette[i % palette.length],
          roughness: 0.28,
          metalness: 0.55,
          flatShading: true,
          transparent: true,
          opacity: 0.34 + Math.random() * 0.4,
        });
        const mesh = new THREE.Mesh(shardGeometries[i % shardGeometries.length], mat);
        mesh.scale.setScalar(size);
        mesh.position.set(
          (Math.random() - 0.5) * 18,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 9 - 1.5
        );
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        shardGroup.add(mesh);
        shards.push({
          mesh,
          spin: { x: (Math.random() - 0.5) * 0.008, y: (Math.random() - 0.5) * 0.008, z: (Math.random() - 0.5) * 0.006 },
          phase: Math.random() * Math.PI * 2,
          drift: 0.2 + Math.random() * 0.5,
        });
      }

      // ---- particle dust -----------------------------------------------------
      const particleCount = 420;
      const positions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 22;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 13;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
      }
      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const particleMaterial = new THREE.PointsMaterial({
        color: 0x9fc0ff,
        size: 0.035,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const particles = new THREE.Points(particleGeometry, particleMaterial);
      scene.add(particles);

      // ---- shield core ---------------------------------------------------------
      const core = new THREE.Group();
      const wireGeometry = new THREE.IcosahedronGeometry(1.35, 1);
      const wire = new THREE.LineSegments(
        new THREE.WireframeGeometry(wireGeometry),
        new THREE.LineBasicMaterial({ color: 0xf5a623, transparent: true, opacity: 0.38 })
      );
      const innerGeometry = new THREE.IcosahedronGeometry(0.85, 1);
      const inner = new THREE.Mesh(
        innerGeometry,
        new THREE.MeshStandardMaterial({
          color: 0x0e1a30,
          emissive: 0x2dd4bf,
          emissiveIntensity: 0.85,
          roughness: 0.2,
          metalness: 0.6,
          flatShading: true,
          transparent: true,
          opacity: 0.92,
        })
      );
      core.add(wire, inner);
      core.position.set(3.1, 0.7, -1.2);
      scene.add(core);

      // ---- responsive sizing -----------------------------------------------------
      function resize() {
        const w = host.clientWidth || 1;
        const h = host.clientHeight || 1;
        renderer.setSize(w, h, false);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        const mobile = w < 900;
        core.position.set(mobile ? 0 : 3.1, mobile ? 1.6 : 0.7, -1.2);
        core.scale.setScalar(mobile ? 0.72 : 1);
      }
      resize();
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);

      // ---- interaction state -------------------------------------------------------
      const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
      function onPointerMove(e) {
        pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
      }
      window.addEventListener("pointermove", onPointerMove, { passive: true });

      let visible = true;
      const visibilityObserver = new IntersectionObserver((entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      }, { threshold: 0.02 });
      visibilityObserver.observe(host);

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      let raf = 0;
      let running = true;
      const clock = new THREE.Clock();

      function render() {
        const t = clock.getElapsedTime();
        pointer.x += (pointer.tx - pointer.x) * 0.045;
        pointer.y += (pointer.ty - pointer.y) * 0.045;

        // scroll progress through the hero (0 at top → 1 one viewport down)
        const scrollP = Math.min(1.3, window.scrollY / Math.max(1, window.innerHeight));

        shardGroup.rotation.y = t * 0.03 + pointer.x * 0.22 + scrollP * 0.55;
        shardGroup.rotation.x = pointer.y * 0.12;

        for (const s of shards) {
          s.mesh.rotation.x += s.spin.x;
          s.mesh.rotation.y += s.spin.y;
          s.mesh.position.y += Math.sin(t * s.drift + s.phase) * 0.0016;
        }

        particles.rotation.y = t * 0.012 + pointer.x * 0.06;

        core.rotation.y = -t * 0.16 + pointer.x * 0.3;
        core.rotation.x = Math.sin(t * 0.4) * 0.12;
        core.position.y = (window.innerWidth < 900 ? 1.6 : 0.7) + Math.sin(t * 0.9) * 0.16 - scrollP * 0.6;
        inner.rotation.y = t * 0.3;
        const pulse = 1 + Math.sin(t * 2.1) * 0.045;
        inner.scale.setScalar(pulse);

        camera.position.x = pointer.x * 0.5;
        camera.position.y = -pointer.y * 0.35;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
        if (running && !reduced) raf = requestAnimationFrame(render);
      }

      // reduced motion: draw one calm frame
      if (reduced) {
        renderer.render(scene, camera);
      } else {
        raf = requestAnimationFrame(render);
      }

      cleanup = () => {
        running = false;
        cancelAnimationFrame(raf);
        visibilityObserver.disconnect();
        resizeObserver.disconnect();
        window.removeEventListener("pointermove", onPointerMove);
        renderer.dispose();
        shardGeometries.forEach((g) => g.dispose());
        wireGeometry.dispose();
        innerGeometry.dispose();
        particleGeometry.dispose();
        if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <div ref={hostRef} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden="true" />;
}
