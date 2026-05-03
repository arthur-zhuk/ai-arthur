"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { audioManager } from "@/lib/audio-manager";

const TRAIL_LENGTH = 22;

const fragmentShader = `
precision mediump float;

const int TRAIL_LENGTH = 22;
const float EPS = 1e-4;
const int ITR = 22;
const float PI = acos(-1.0);

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uPointerTrail[TRAIL_LENGTH];
uniform float uAudioLevel;

varying vec2 vTexCoord;

float rnd3D(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453123);
}

float noise3D(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);

    float a000 = rnd3D(i);
    float a100 = rnd3D(i + vec3(1.0, 0.0, 0.0));
    float a010 = rnd3D(i + vec3(0.0, 1.0, 0.0));
    float a110 = rnd3D(i + vec3(1.0, 1.0, 0.0));
    float a001 = rnd3D(i + vec3(0.0, 0.0, 1.0));
    float a101 = rnd3D(i + vec3(1.0, 0.0, 1.0));
    float a011 = rnd3D(i + vec3(0.0, 1.0, 1.0));
    float a111 = rnd3D(i + vec3(1.0, 1.0, 1.0));

    vec3 u = f * f * (3.0 - 2.0 * f);

    float k0 = a000;
    float k1 = a100 - a000;
    float k2 = a010 - a000;
    float k3 = a001 - a000;
    float k4 = a000 - a100 - a010 + a110;
    float k5 = a000 - a010 - a001 + a011;
    float k6 = a000 - a100 - a001 + a101;
    float k7 = -a000 + a100 + a010 - a110 + a001 - a101 - a011 + a111;

    return k0 + k1 * u.x + k2 * u.y + k3 *u.z + k4 * u.x * u.y + k5 * u.y * u.z + k6 * u.z * u.x + k7 * u.x * u.y * u.z;
}

vec3 origin = vec3(0.0, 0.0, 1.0);
vec3 lookAt = vec3(0.0, 0.0, 0.0);
vec3 cDir = normalize(lookAt - origin);
vec3 cUp = vec3(0.0, 1.0, 0.0);
vec3 cSide = cross(cDir, cUp);

float smoothMin(float d1, float d2, float k) {
    float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
    return mix(d2, d1, h) - k * h * (1.0 - h);
}

vec3 translate(vec3 p, vec3 t) {
    return p - t;
}

float sdSphere(vec3 p, float s)
{
    return length(p) - s;
}

float map(vec3 p) {
    float beat = smoothstep(0.03, 0.38, uAudioLevel);
    float baseRadius = 0.018 * (1.0 + beat * 0.85);
    float radius = baseRadius * float(TRAIL_LENGTH);
    float k = 0.32 + beat * 0.08;
    float d = 1e5;

    float audioWobble = sin(p.x * 13.0 + uTime * 1.7) * sin(p.y * 11.0 - uTime * 1.35) * sin(p.z * 9.0 + uTime * 0.8);
    float displacement = audioWobble * (0.025 + beat * 0.085);

    for (int i = 0; i < TRAIL_LENGTH; i++) {
        float fi = float(i);
        float trailLife = 1.0 - fi / float(TRAIL_LENGTH);
        vec2 pointerTrail = uPointerTrail[i] * uResolution / min(uResolution.x, uResolution.y);

        float sphere = sdSphere(
                translate(p, vec3(pointerTrail, sin(uTime * 0.8 + fi * 0.32) * 0.08)),
                radius * (0.28 + trailLife * 0.72)
            ) + displacement * trailLife;

        d = smoothMin(d, sphere, k);
    }

    vec3 anchorA = vec3(0.78 + sin(uTime * 0.31) * 0.14, -0.28 + cos(uTime * 0.24) * 0.1, 0.02);
    vec3 anchorB = vec3(-0.86 + cos(uTime * 0.23) * 0.18, 0.34 + sin(uTime * 0.29) * 0.12, -0.04);
    vec3 anchorC = vec3(0.12 + sin(uTime * 0.19) * 0.26, 0.82 + cos(uTime * 0.21) * 0.08, 0.03);

    d = smoothMin(d, sdSphere(translate(p, anchorA), 0.56 + beat * 0.12) + displacement * 2.0, k);
    d = smoothMin(d, sdSphere(translate(p, anchorB), 0.34 + beat * 0.08) - displacement, k * 0.82);
    d = smoothMin(d, sdSphere(translate(p, anchorC), 0.24 + beat * 0.06) + displacement * 0.8, k * 0.72);

    return d;
}

vec3 generateNormal(vec3 p) {
    return normalize(vec3(
            map(p + vec3(EPS, 0.0, 0.0)) - map(p + vec3(-EPS, 0.0, 0.0)),
            map(p + vec3(0.0, EPS, 0.0)) - map(p + vec3(0.0, -EPS, 0.0)),
            map(p + vec3(0.0, 0.0, EPS)) - map(p + vec3(0.0, 0.0, -EPS))
        ));
}

vec3 dropletColor(vec3 normal, vec3 rayDir) {
    vec3 reflectDir = reflect(rayDir, normal);

    float noisePosTime = noise3D(reflectDir * 2.8 + uTime * 0.5 + uAudioLevel * 2.0);
    float noiseNegTime = noise3D(reflectDir * 3.5 - uTime * 0.42 - uAudioLevel * 2.0);

    float beat = smoothstep(0.03, 0.38, uAudioLevel);
    float fresnel = pow(1.0 - clamp(dot(normal, -rayDir), 0.0, 1.0), 2.4);
    float spec = pow(max(dot(reflectDir, normalize(vec3(-0.45, 0.72, 0.54))), 0.0), 26.0);

    vec3 amber = vec3(0.82, 0.48, 0.23);
    vec3 sage = vec3(0.38, 0.51, 0.42);
    vec3 pearl = vec3(0.95, 0.86, 0.70);

    vec3 color = amber * (0.2 + noisePosTime * 0.58);
    color += sage * (0.12 + noiseNegTime * 0.42);
    color += pearl * (fresnel * 0.52 + spec * 0.7);
    color *= 0.72 + beat * 0.64;

    return color;
}

void main() {
    vec2 p = (gl_FragCoord.xy * 2.0 - uResolution) / min(uResolution.x, uResolution.y);

    vec3 ray = origin + cSide * p.x + cUp * p.y;
    vec3 rayDirection = cDir;

    float dist = 0.0;
    float glow = 0.0;
    float depth = 0.0;

    for (int i = 0; i < ITR; ++i) {
        dist = map(ray);
        glow += exp(-abs(dist) * 7.5) * 0.028;
        float stepDistance = clamp(dist, 0.012, 0.14);
        ray += rayDirection * stepDistance;
        depth += stepDistance;
        if (dist < EPS) break;
    }

    vec3 vignetteBase = vec3(0.06, 0.055, 0.045);
    float haze = smoothstep(1.65, 0.1, length(p - vec2(0.26, -0.08)));
    vec3 color = vignetteBase + vec3(0.18, 0.11, 0.055) * haze * 0.28;
    color += vec3(0.58, 0.38, 0.19) * glow * (0.65 + uAudioLevel * 1.2);

    if (dist < EPS) {
        vec3 normal = generateNormal(ray);
        float shade = 0.48 + 0.52 * max(dot(normal, normalize(vec3(-0.35, 0.62, 0.58))), 0.0);
        color += dropletColor(normal, rayDirection) * shade;
    }

    float vignette = smoothstep(1.45, 0.25, length(p));
    vec3 finalColor = pow(color * vignette, vec3(0.92));

    gl_FragColor = vec4(finalColor, 1.0);
}
`;

const vertexShader = `
attribute vec3 position;
varying vec2 vTexCoord;

void main() {
    vTexCoord = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position, 1.0);
}
`;

function MetaballPlane() {
  const materialRef = useRef<THREE.RawShaderMaterial>(null);
  const { size } = useThree();
  const pointerHasMovedRef = useRef(false);
  const pointerRef = useRef(new THREE.Vector2(0, 0));
  const pointerTrailRef = useRef(
    Array.from({ length: TRAIL_LENGTH }, () => new THREE.Vector2(0, 0)),
  );

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uPointerTrail: { value: pointerTrailRef.current },
      uAudioLevel: { value: 0 },
    }),
    [size.width, size.height],
  );

  useEffect(() => {
    uniforms.uResolution.value.set(size.width, size.height);
  }, [size.width, size.height, uniforms]);

  useEffect(() => {
    const el = document.querySelector('.chat-panel');
    let rect = el?.getBoundingClientRect();

    const resizeObserver = new ResizeObserver(() => {
      if (el) {
        rect = el.getBoundingClientRect();
      }
    });

    if (el) {
      resizeObserver.observe(el);
    }

    const handleMove = (event: PointerEvent) => {
      pointerHasMovedRef.current = true;
      if (rect) {
        // Calculate pointer relative to the chat panel center
        const localX = event.clientX - (rect.left + rect.width / 2);
        const localY = event.clientY - (rect.top + rect.height / 2);
        const x = localX / (rect.width / 2);
        const y = -(localY / (rect.height / 2));
        pointerRef.current.set(x, y);
      } else {
        // Fallback to window tracking
        const x = (event.clientX / window.innerWidth) * 2 - 1;
        const y = -(event.clientY / window.innerHeight) * 2 + 1;
        pointerRef.current.set(x, y);
      }
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handleMove);
      resizeObserver.disconnect();
    };
  }, []);

  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    const elapsed = clock.elapsedTime;
    materialRef.current.uniforms.uTime.value = elapsed;
    materialRef.current.uniforms.uAudioLevel.value = audioManager.getAverageFrequency();
    if (!pointerHasMovedRef.current) {
      pointerRef.current.set(
        Math.sin(elapsed * 0.34) * 0.58 + Math.sin(elapsed * 0.12) * 0.22,
        Math.cos(elapsed * 0.27) * 0.42 + Math.sin(elapsed * 0.18) * 0.18,
      );
    }
    const trail = pointerTrailRef.current;
    for (let i = TRAIL_LENGTH - 1; i > 0; i -= 1) {
      trail[i].copy(trail[i - 1]);
    }
    trail[0].copy(pointerRef.current);
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <rawShaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        fragmentShader={fragmentShader}
        vertexShader={vertexShader}
        depthTest={false}
      />
    </mesh>
  );
}

export default function MetaballsScene() {
  return (
    <div className="metaballs-stage">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        frameloop="always"
        camera={{ position: [0, 0, 1] }}
        eventSource={typeof window !== 'undefined' ? document.getElementById('root') || document.body : undefined}
        eventPrefix="client"
      >
        <MetaballPlane />
      </Canvas>
      <div className="metaballs-overlay" />
    </div>
  );
}
