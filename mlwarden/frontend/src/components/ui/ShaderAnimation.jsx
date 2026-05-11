import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function ShaderAnimation() {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return undefined

    const container = containerRef.current

    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `

    const fragmentShader = `
      precision highp float;

      uniform vec2 resolution;
      uniform float time;

      mat2 rotate2d(float angle) {
        float s = sin(angle);
        float c = cos(angle);
        return mat2(c, -s, s, c);
      }

      float lineField(vec2 uv, float offset, float scale) {
        vec2 p = uv * scale;
        p *= rotate2d(time * 0.035 + offset);
        float wave = sin(p.x * 3.0 + time * 0.18) + cos(p.y * 2.4 - time * 0.12);
        float rings = abs(fract(length(p) * 0.34 - time * 0.025 + offset) - 0.5);
        return 0.006 / (rings + 0.018) + 0.045 * wave;
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
        uv.x += 0.18;

        float fieldA = lineField(uv, 0.0, 2.2);
        float fieldB = lineField(uv + vec2(0.34, -0.18), 1.4, 2.8);
        float fieldC = lineField(uv - vec2(0.26, 0.14), 2.8, 1.9);
        float glow = smoothstep(1.25, 0.05, length(uv - vec2(-0.25, 0.08)));

        vec3 ink = vec3(0.015, 0.025, 0.055);
        vec3 blue = vec3(0.05, 0.32, 0.92);
        vec3 cyan = vec3(0.02, 0.72, 0.78);
        vec3 rose = vec3(0.82, 0.12, 0.28);

        vec3 color = ink;
        color += blue * fieldA * 0.34;
        color += cyan * fieldB * 0.22;
        color += rose * fieldC * 0.16;
        color += vec3(0.18, 0.27, 0.5) * glow * 0.62;

        float vignette = smoothstep(1.35, 0.25, length(uv));
        color *= 0.68 + vignette * 0.7;

        gl_FragColor = vec4(color, 1.0);
      }
    `

    const camera = new THREE.Camera()
    camera.position.z = 1

    const scene = new THREE.Scene()
    const geometry = new THREE.PlaneGeometry(2, 2)
    const uniforms = {
      time: { value: 1 },
      resolution: { value: new THREE.Vector2() },
    }

    const material = new THREE.ShaderMaterial({
      fragmentShader,
      uniforms,
      vertexShader,
    })

    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    function resize() {
      const width = container.clientWidth
      const height = container.clientHeight
      renderer.setSize(width, height, false)
      uniforms.resolution.value.set(renderer.domElement.width, renderer.domElement.height)
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)
    resize()

    function animate() {
      const animationId = requestAnimationFrame(animate)
      uniforms.time.value += 0.05
      renderer.render(scene, camera)

      if (sceneRef.current) {
        sceneRef.current.animationId = animationId
      }
    }

    sceneRef.current = {
      animationId: 0,
      renderer,
    }

    animate()

    return () => {
      resizeObserver.disconnect()

      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId)
      }

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }

      geometry.dispose()
      material.dispose()
      renderer.dispose()
      sceneRef.current = null
    }
  }, [])

  return <div className="shader-animation" ref={containerRef} aria-hidden="true" />
}
