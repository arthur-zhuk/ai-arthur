"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { audioManager } from "@/lib/audio-manager";

const TRAIL_LENGTH = 15;

const fragmentShader = `
precision mediump float;

const int TRAIL_LENGTH = 15;
const float EPS = 1e-4;
const int ITR = 16;
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
    float h = exp(-k * d1) + exp(-k * d2);
    return -log(h) / k;
}

vec3 translate(vec3 p, vec3 t) {
    return p - t;
}

float sdSphere(vec3 p, float s)
{
    return length(p) - s;
}

float map(vec3 p) {
    float baseRadius = 8e-3 * (1.0 + uAudioLevel * 2.5);
    float radius = baseRadius * float(TRAIL_LENGTH);
    float k = 7.;
    float d = 1e5;

    float audioWobble = sin(p.x * 20.0 + uTime * 2.0) * sin(p.y * 20.0 + uTime * 2.0) * sin(p.z * 20.0 + uTime * 2.0);
    float displacement = audioWobble * (uAudioLevel * 0.15);

    for (int i = 0; i < TRAIL_LENGTH; i++) {
        float fi = float(i);
        vec2 pointerTrail = uPointerTrail[i] * uResolution / min(uResolution.x, uResolution.y);

        float sphere = sdSphere(
                translate(p, vec3(pointerTrail, .0)),
                radius - baseRadius * fi
            ) + displacement * fi * 0.1;

        d = smoothMin(d, sphere, k);
    }

    float sphere = sdSphere(translate(p, vec3(1.0, -0.25, 0.0)), 0.55 + uAudioLevel * 0.15) + displacement * 5.0;
    d = smoothMin(d, sphere, k);

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

    float noisePosTime = noise3D(reflectDir * 2.0 + uTime + uAudioLevel * 2.0);
    float noiseNegTime = noise3D(reflectDir * 2.0 - uTime - uAudioLevel * 2.0);

    float audioBump = pow(uAudioLevel, 2.0);

    vec3 _color0 = vec3(0.1765 + audioBump * 0.8, 0.1255, 0.2275 + audioBump * 0.5) * noisePosTime;
    vec3 _color1 = vec3(0.4118 - audioBump * 0.2, 0.4118 + audioBump * 0.4, 0.4157 + audioBump * 0.6) * noiseNegTime;

    float intensity = 2.3 + uAudioLevel * 5.0;
    vec3 color = (_color0 + _color1) * intensity;

    return color;
}

void main() {
    vec2 p = (gl_FragCoord.xy * 2.0 - uResolution) / min(uResolution.x, uResolution.y);

    vec3 ray = origin + cSide * p.x + cUp * p.y;
    vec3 rayDirection = cDir;

    float dist = 0.0;

    for (int i = 0; i < ITR; ++i) {
        dist = map(ray);
        ray += rayDirection * dist;
        if (dist < EPS) break;
    }

    vec3 color = vec3(0.0);

    if (dist < EPS) {
        vec3 normal = generateNormal(ray);
        color = dropletColor(normal, rayDirection);
    }

    vec3 finalColor = pow(color, vec3(7.0));

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

  useFrame(({ clock, pointer }) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    materialRef.current.uniforms.uAudioLevel.value = audioManager.getAverageFrequency();
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
