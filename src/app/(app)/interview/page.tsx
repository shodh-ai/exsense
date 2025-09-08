'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Footer from '@/components/Footer';

// --- GLSL SHADER CODE (Unchanged) ---
const snoise = `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
      const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy) );
      vec3 x0 = v - i + dot(i, C.xxx) ;
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min( g.xyz, l.zxy );
      vec3 i2 = max( g.xyz, l.zxy );
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute( permute( permute(
                  i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
      float n_ = 0.142857142857;
      vec3  ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ );
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4( x.xy, y.xy );
      vec4 b1 = vec4( x.zw, y.zw );
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }
`;
const coreVertexShader = `
    varying vec3 vPosition; varying vec3 vNormal;
    void main() {
        vPosition = position; vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;
const coreFragmentShader = `
    uniform vec3 u_top_color; uniform vec3 u_bottom_color; uniform vec3 u_pink_color;
    uniform float u_patch1_percentage; uniform float u_patch2_percentage; uniform float u_patch3_percentage;
    uniform float u_glow_power;
    varying vec3 vPosition; varying vec3 vNormal;
    void main() {
        vec3 p1 = normalize(vec3(1.0, 1.0, 1.0)); vec3 p2 = normalize(vec3(-1.0, -1.0, 1.0)); vec3 p3 = normalize(vec3(1.0, -1.0, -1.0));
        vec3 surface_pos = normalize(vPosition);
        float d1 = distance(surface_pos, p1); float d2 = distance(surface_pos, p2); float d3 = distance(surface_pos, p3);
        float i1 = u_patch1_percentage / (d1 * d1 + 0.001); float i2 = u_patch2_percentage / (d2 * d2 + 0.001); float i3 = u_patch3_percentage / (d3 * d3 + 0.001);
        float total_influence = i1 + i2 + i3;
        float w1 = i1 / total_influence; float w2 = i2 / total_influence; float w3 = i3 / total_influence;
        vec3 color = u_top_color * w1 + u_bottom_color * w2 + u_pink_color * w3;
        float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
        vec3 glow = vec3(fresnel) * u_glow_power;
        float alpha = smoothstep(0.0, 1.5, total_influence);
        gl_FragColor = vec4(color + glow, alpha);
    }
`;
const shellVertexShader = `
  uniform float u_time; uniform float u_frequency; uniform float u_amplitude;
  uniform vec3 u_tide_direction;
  varying vec3 v_normal; varying vec3 v_view_direction; varying vec3 v_world_position;
  ${snoise}
  void main() {
    float tide_influence = dot(normalize(position), u_tide_direction);
    float tide_multiplier = (tide_influence * 0.5) + 0.5;
    float modulated_amplitude = u_amplitude * pow(tide_multiplier, 5.0);
    float displacement = snoise(position * u_frequency + u_time) * modulated_amplitude;
    vec3 newPosition = position + normal * displacement;
    vec4 worldPosition = modelMatrix * vec4(newPosition, 1.0);
    v_world_position = worldPosition.xyz;
    v_normal = normalize(mat3(modelMatrix) * normal);
    v_view_direction = normalize(cameraPosition - worldPosition.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;
const shellFragmentShader = `
  uniform sampler2D u_scene_texture; uniform float u_refraction_strength; uniform float u_shell_opacity;
  uniform float u_rim_power; uniform vec3  u_rim_color; uniform float u_shininess; uniform vec3  u_light_direction;
  varying vec3 v_normal; varying vec3 v_view_direction;
  void main() {
    vec4 scene_uv = gl_FragCoord / gl_FragCoord.w;
    vec2 distortion = v_normal.xy * u_refraction_strength;
    vec3 refracted_color = texture2D(u_scene_texture, scene_uv.xy + distortion).rgb;
    float rim = 1.0 - dot(v_normal, v_view_direction);
    float rim_amount = pow(rim, u_rim_power);
    vec3 rim_color = u_rim_color * rim_amount;
    vec3 light_dir = normalize(u_light_direction);
    vec3 reflect_dir = reflect(-light_dir, v_normal);
    float specular_amount = max(dot(reflect_dir, v_view_direction), 0.0);
    specular_amount = pow(specular_amount, u_shininess);
    vec3 specular_color = vec3(1.0) * specular_amount;
    vec3 final_color = refracted_color + rim_color + specular_color;
    float alpha = u_shell_opacity + rim_amount;
    gl_FragColor = vec4(final_color, alpha);
  }
`;

// --- CONSTANTS (from reference file) ---
const FFT_SIZE = 32;
const AUDIO_ANALYSIS_BINS = 5;
const VOLUME_TO_REACH_MAX_SCALE = 15;
const BREATHING_SMOOTHING_UP = 0.3;
const BREATHING_SMOOTHING_DOWN = 0.1;
const MIN_BREATHING_SCALE_FACTOR = 0.95; // Renamed to avoid confusion with prop
const MAX_BREATHING_SCALE_FACTOR = 0.98; // Renamed to avoid confusion with prop
const IDLE_BREATHING_SPEED = 1.0;
const IDLE_BREATHING_MAGNITUDE = 0.02;

// --- SPHERE COMPONENT ---
interface SphereProps {
    scale?: number;
    className?: string;
    isMicConnected: boolean;
}

const SphereComponent: React.FC<SphereProps> = ({ scale = 1.0, className, isMicConnected }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    
    // --- Refs for audio processing and animation state ---
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);

    const isAudioActiveRef = useRef(false);
    const baseScaleRef = useRef(scale);
    const currentScaleRef = useRef(scale);

    // --- Audio Initialization and Management ---
    const initializeAudio = useCallback(() => {
        if (!audioContextRef.current) {
            try {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                analyserRef.current = audioContextRef.current.createAnalyser();
                analyserRef.current.fftSize = FFT_SIZE;
                const bufferLength = analyserRef.current.frequencyBinCount;
                // Create Uint8Array with an explicit ArrayBuffer to satisfy TS's Uint8Array<ArrayBuffer> expectation
                const arrayBuffer = new ArrayBuffer(bufferLength);
                dataArrayRef.current = new Uint8Array(arrayBuffer);
            } catch (e) {
                console.error("AudioContext could not be created.", e);
            }
        }
    }, []);

    const startMic = useCallback(async () => {
        if (isAudioActiveRef.current || !navigator.mediaDevices?.getUserMedia) return;
        initializeAudio();
        if (!audioContextRef.current) return;
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(stream);
            sourceNodeRef.current.connect(analyserRef.current!);
            isAudioActiveRef.current = true;
        } catch (err) {
            console.error('Error accessing microphone:', err);
        }
    }, [initializeAudio]);

    const stopMic = useCallback(() => {
        if (!isAudioActiveRef.current) return;
        sourceNodeRef.current?.disconnect();
        sourceNodeRef.current = null;
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
        isAudioActiveRef.current = false;
    }, []);

    // Effect to handle mic connection/disconnection based on prop
    useEffect(() => {
        if (isMicConnected) {
            startMic();
        } else {
            stopMic();
        }
        // Cleanup on unmount
        return () => {
            stopMic();
        };
    }, [isMicConnected, startMic, stopMic]);


    useEffect(() => {
        const currentMount = mountRef.current;
        if (!currentMount) return;

        let animationFrameId: number;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
        camera.position.set(0, 0, 10);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        currentMount.appendChild(renderer.domElement);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enablePan = false;
        controls.enableZoom = false;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.5;

        const blobGroup = new THREE.Group();
        scene.add(blobGroup);

        const coreGeometry = new THREE.SphereGeometry(1, 128, 128);
        const coreMaterial = new THREE.ShaderMaterial({
            vertexShader: coreVertexShader, fragmentShader: coreFragmentShader,
            uniforms: {
                u_top_color: { value: new THREE.Color('#ff8c66') }, u_bottom_color: { value: new THREE.Color('#7ab8f5') },
                u_pink_color: { value: new THREE.Color('#ff8cae') }, u_patch1_percentage: { value: 0.6 },
                u_patch2_percentage: { value: 0.6 }, u_patch3_percentage: { value: 0.6 }, u_glow_power: { value: 0.7 }
            },
            transparent: true,
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        blobGroup.add(core);

        const renderTargetForShell = new THREE.WebGLRenderTarget(currentMount.clientWidth, currentMount.clientHeight);
        const shellGeometry = new THREE.SphereGeometry(1.5, 128, 128);
        const shellMaterial = new THREE.ShaderMaterial({
            vertexShader: shellVertexShader, fragmentShader: shellFragmentShader,
            uniforms: {
                u_time: { value: 0 }, u_frequency: { value: 2.5 }, u_amplitude: { value: 0.5 },
                u_scene_texture: { value: renderTargetForShell.texture }, u_refraction_strength: { value: 0.1 },
                u_shell_opacity: { value: 0.2 }, u_rim_power: { value: 2.5 },
                u_rim_color: { value: new THREE.Color('#566FE9') }, u_shininess: { value: 60.0 },
                u_light_direction: { value: directionalLight.position }, u_tide_direction: { value: new THREE.Vector3(1, 0, 0) }
            },
            transparent: true,
        });
        const shell = new THREE.Mesh(shellGeometry, shellMaterial);
        blobGroup.add(shell);

        baseScaleRef.current = scale;
        currentScaleRef.current = scale;
        blobGroup.scale.set(scale, scale, scale);

        const refractionTextureBackground = new THREE.Color('#e0e5f0');
        const clock = new THREE.Clock();

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const elapsedTime = clock.getElapsedTime();

            // --- Animation Logic ---
            const tideSpeed = 0.8;
            shellMaterial.uniforms.u_tide_direction.value.set(
                Math.cos(elapsedTime * tideSpeed), Math.sin(elapsedTime * tideSpeed * 0.5), Math.sin(elapsedTime * tideSpeed * 0.8)
            ).normalize();
            shellMaterial.uniforms.u_time.value = elapsedTime * 0.3;
            
            // --- DYNAMIC SCALING LOGIC (from reference file) ---
            let targetScale: number;
            if (isAudioActiveRef.current && analyserRef.current && dataArrayRef.current) {
                analyserRef.current.getByteFrequencyData(dataArrayRef.current);
                let sum = 0;
                for (let i = 0; i < AUDIO_ANALYSIS_BINS; i++) { sum += dataArrayRef.current[i]; }
                const averageVolume = sum / AUDIO_ANALYSIS_BINS;
                const scaleMultiplier = THREE.MathUtils.mapLinear(averageVolume, 0, VOLUME_TO_REACH_MAX_SCALE, MIN_BREATHING_SCALE_FACTOR, MAX_BREATHING_SCALE_FACTOR);
                targetScale = baseScaleRef.current * scaleMultiplier;
            } else {
                const idleBreath = Math.sin(elapsedTime * IDLE_BREATHING_SPEED) * IDLE_BREATHING_MAGNITUDE;
                targetScale = baseScaleRef.current * (1.0 + idleBreath);
            }
            
            const smoothingFactor = targetScale > currentScaleRef.current ? BREATHING_SMOOTHING_UP : BREATHING_SMOOTHING_DOWN;
            currentScaleRef.current = THREE.MathUtils.lerp(currentScaleRef.current, targetScale, smoothingFactor);
            blobGroup.scale.set(currentScaleRef.current, currentScaleRef.current, currentScaleRef.current);
            // --- END DYNAMIC SCALING ---

            // --- Rendering Logic ---
            shell.visible = false; core.visible = true;
            scene.background = refractionTextureBackground;
            renderer.setRenderTarget(renderTargetForShell);
            renderer.render(scene, camera);

            renderer.setRenderTarget(null); scene.background = null;
            shell.visible = true;
            renderer.render(scene, camera);

            controls.update();
        };

        animate();

        const handleResize = () => {
             if (currentMount) {
                const width = currentMount.clientWidth; const height = currentMount.clientHeight;
                camera.aspect = width / height; camera.updateProjectionMatrix();
                renderer.setSize(width, height);
                renderTargetForShell.setSize(width, height);
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
            stopMic();
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
            scene.traverse(object => {
                if (object instanceof THREE.Mesh) {
                    object.geometry.dispose();
                    if (Array.isArray(object.material)) {
                        object.material.forEach(mat => mat.dispose());
                    } else if (object.material.dispose) {
                        object.material.dispose();
                    }
                }
            });
            renderTargetForShell.dispose();
            controls.dispose();
            renderer.dispose();
            if (currentMount && renderer.domElement) {
                currentMount.removeChild(renderer.domElement);
            }
        };
    }, [scale, stopMic]); // `scale` is a dependency to reset base scale if it changes

    return <div ref={mountRef} className={className} />;
};

// --- LOADING PAGE COMPONENT ---

export default function Loading() {
  const [isMounted, setIsMounted] = useState(false);
  const [isMicConnected, setIsMicConnected] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleMicToggle = () => {
    setIsMicConnected(prev => !prev);
  }

  return (
    <div className="flex items-center justify-center w-screen h-screen">
      <div className="flex flex-col items-center gap-8">
        {isMounted ? (
          <SphereComponent scale={1.8} className="w-[36rem] h-[36rem]" isMicConnected={isMicConnected} />
        ) : (
          <div className="w-[26rem] h-[26rem]" />
        )}
        
        <button
          onClick={handleMicToggle}
          className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors"
        >
          {isMicConnected ? 'Disconnect Mic' : 'Connect Mic for Reactive Effect'}
        </button>
      </div>
      <Footer />
    </div>
  );
}