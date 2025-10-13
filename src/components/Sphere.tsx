"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { micEventEmitter } from '@/lib/MicEventEmitter';
import { musicEventEmitter } from '@/lib/MusicEventEmitter';
import { useSessionStore } from '@/lib/store';

// =================================================================
// --- GLSL & SHADERS
// =================================================================

const snoise = `vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; } vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; } vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); } vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; } float snoise(vec3 v) { const vec2  C = vec2(1.0/6.0, 1.0/3.0) ; const vec4  D = vec4(0.0, 0.5, 1.0, 2.0); vec3 i  = floor(v + dot(v, C.yyy) ); vec3 x0 = v - i + dot(i, C.xxx) ; vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g; vec3 i1 = min( g.xyz, l.zxy ); vec3 i2 = max( g.xyz, l.zxy ); vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + C.yyy; vec3 x3 = x0 - D.yyy; i = mod289(i); vec4 p = permute( permute( permute( i.z + vec4(0.0, i1.z, i2.z, 1.0 )) + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) + i.x + vec4(0.0, i1.x, i2.x, 1.0 )); float n_ = 0.142857142857; vec3  ns = n_ * D.wyz - D.xzx; vec4 j = p - 49.0 * floor(p * ns.z * ns.z); vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_ ); vec4 x = x_ *ns.x + ns.yyyy; vec4 y = y_ *ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y); vec4 b0 = vec4( x.xy, y.xy ); vec4 b1 = vec4( x.zw, y.zw ); vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0; vec4 sh = -step(h, vec4(0.0)); vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ; vec3 p0 = vec3(a0.xy,h.x); vec3 p1 = vec3(a0.zw,h.y); vec3 p2 = vec3(a1.xy,h.z); vec3 p3 = vec3(a1.zw,h.w); vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3))); p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w; vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0); m = m * m; return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) ); }`;
const coreVertexShader = `varying vec3 vPosition; varying vec3 vNormal; void main() { vPosition = position; vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const coreFragmentShader = `uniform vec3 u_top_color; uniform vec3 u_bottom_color; uniform vec3 u_pink_color; uniform float u_patch1_percentage; uniform float u_patch2_percentage; uniform float u_patch3_percentage; uniform float u_glow_power; varying vec3 vPosition; varying vec3 vNormal; void main() { vec3 p1 = normalize(vec3(1.0, 1.0, 1.0)); vec3 p2 = normalize(vec3(-1.0, -1.0, 1.0)); vec3 p3 = normalize(vec3(1.0, -1.0, -1.0)); vec3 surface_pos = normalize(vPosition); float d1 = distance(surface_pos, p1); float d2 = distance(surface_pos, p2); float d3 = distance(surface_pos, p3); float i1 = u_patch1_percentage / (d1 * d1 + 0.001); float i2 = u_patch2_percentage / (d2 * d2 + 0.001); float i3 = u_patch3_percentage / (d3 * d3 + 0.001); float total_influence = i1 + i2 + i3; float w1 = i1 / total_influence; float w2 = i2 / total_influence; float w3 = i3 / total_influence; vec3 color = u_top_color * w1 + u_bottom_color * w2 + u_pink_color * w3; float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0); vec3 glow = vec3(fresnel) * u_glow_power; float alpha = smoothstep(0.0, 1.5, total_influence); gl_FragColor = vec4(color + glow, alpha); }`;
const shellVertexShader = `uniform float u_time; uniform float u_frequency; uniform float u_amplitude; uniform vec3 u_tide_direction; varying vec3 v_normal; varying vec3 v_view_direction; varying vec3 v_world_position; ${snoise} void main() { float tide_influence = dot(normalize(position), u_tide_direction); float tide_multiplier = (tide_influence * 0.5) + 0.5; float modulated_amplitude = u_amplitude * pow(tide_multiplier, 5.0); float displacement = snoise(position * u_frequency + u_time) * modulated_amplitude; vec3 newPosition = position + normal * displacement; vec4 worldPosition = modelMatrix * vec4(newPosition, 1.0); v_world_position = worldPosition.xyz; v_normal = normalize(mat3(modelMatrix) * normal); v_view_direction = normalize(cameraPosition - worldPosition.xyz); gl_Position = projectionMatrix * viewMatrix * worldPosition; }`;
const shellFragmentShader = `uniform sampler2D u_scene_texture; uniform float u_refraction_strength; uniform float u_shell_opacity; uniform float u_rim_power; uniform vec3  u_rim_color; uniform float u_shininess; uniform vec3  u_light_direction; varying vec3 v_normal; varying vec3 v_view_direction; varying vec3 v_world_position; void main() { vec4 scene_uv = gl_FragCoord / gl_FragCoord.w; vec2 d = v_normal.xy * u_refraction_strength; vec3 refracted_color = texture2D(u_scene_texture, scene_uv.xy + d).rgb; float rim = 1.0 - dot(v_normal, v_view_direction); float rim_amount = pow(rim, u_rim_power); vec3 rim_color = u_rim_color * rim_amount; vec3 light_dir = normalize(u_light_direction); vec3 reflect_dir = reflect(-light_dir, v_normal); float specular_amount = max(dot(reflect_dir, v_view_direction), 0.0); specular_amount = pow(specular_amount, u_shininess); vec3 specular_color = vec3(1.0) * specular_amount; vec3 final_color = refracted_color + rim_color + specular_color; float alpha = u_shell_opacity + rim_amount; gl_FragColor = vec4(final_color, alpha); }`;

// =================================================================
// --- CONSTANTS & CONFIGURATION
// =================================================================

const BLOB_SIZE_PERCENTAGE = 0.17;
const BLOB_BOTTOM_PADDING_PIXELS = 40;
const FFT_SIZE = 32;
const AUDIO_ANALYSIS_BINS = 5;
const VOLUME_TO_REACH_MAX_SCALE = 15;
const BREATHING_SMOOTHING_UP = 0.3;
const BREATHING_SMOOTHING_DOWN = 0.1;
const MIN_BREATHING_SCALE = 0.95;
const MAX_BREATHING_SCALE = 0.964;
const BACKGROUND_MUSIC_VOLUME = 0.003;

// =================================================================
// --- EMOTION DEFINITIONS
// =================================================================

type Emotion = 'default' | 'happy' | 'sad' | 'angry' | 'calm';

type EmotionProfile = {
    coreColorTop: THREE.Color;
    coreColorBottom: THREE.Color;
    coreColorAccent: THREE.Color;
    shellFrequency: number;
    shellAmplitude: number;
    shellRimColor: THREE.Color;
    shellRimPower: number;
    rotationSpeed: number;
    breathingSpeed: number;
    breathingMagnitude: number;
};

const getDefaultEmotion = (): EmotionProfile => ({ coreColorTop: new THREE.Color('#ff8c66'), coreColorBottom: new THREE.Color('#7ab8f5'), coreColorAccent: new THREE.Color('#ff8cae'), shellFrequency: 2.5, shellAmplitude: 0.3, shellRimColor: new THREE.Color('#566FE9'), shellRimPower: 2.5, rotationSpeed: 0.5, breathingSpeed: 1.0, breathingMagnitude: 0.02, });
const getHappyEmotion = (): EmotionProfile => ({ coreColorTop: new THREE.Color('#FFD700'), coreColorBottom: new THREE.Color('#87CEEB'), coreColorAccent: new THREE.Color('#FFB6C1'), shellFrequency: 4.0, shellAmplitude: 0.35, shellRimColor: new THREE.Color('#FFFFFF'), shellRimPower: 2.0, rotationSpeed: 2.0, breathingSpeed: 2.5, breathingMagnitude: 0.035, });
const getSadEmotion = (): EmotionProfile => ({ coreColorTop: new THREE.Color('#465069'), coreColorBottom: new THREE.Color('#708090'), coreColorAccent: new THREE.Color('#414852'), shellFrequency: 1.0, shellAmplitude: 0.05, shellRimColor: new THREE.Color('#333344'), shellRimPower: 4.0, rotationSpeed: 0.1, breathingSpeed: 0.2, breathingMagnitude: 0.015, });
const getAngryEmotion = (): EmotionProfile => ({ coreColorTop: new THREE.Color('#B22222'), coreColorBottom: new THREE.Color('#8B0000'), coreColorAccent: new THREE.Color('#FF4500'), shellFrequency: 8.0, shellAmplitude: 0.4, shellRimColor: new THREE.Color('#FF6347'), shellRimPower: 5.0, rotationSpeed: 4.0, breathingSpeed: 0.5, breathingMagnitude: 0.05, });
const getCalmEmotion = (): EmotionProfile => ({ coreColorTop: new THREE.Color('#98FB98'), coreColorBottom: new THREE.Color('#ADD8E6'), coreColorAccent: new THREE.Color('#F5F5DC'), shellFrequency: 1.5, shellAmplitude: 0.1, shellRimColor: new THREE.Color('#B0C4DE'), shellRimPower: 1.5, rotationSpeed: 0.2, breathingSpeed: 0.3, breathingMagnitude: 0.008, });

const emotionProfileMap: Record<Emotion, EmotionProfile> = { default: getDefaultEmotion(), happy: getHappyEmotion(), sad: getSadEmotion(), angry: getAngryEmotion(), calm: getCalmEmotion(), };
const emotionMusicMap: Record<Emotion, string | null> = { default: null, happy: 'https://www.bensound.com/bensound-music/bensound-happyrock.mp3', sad: 'https://www.bensound.com/bensound-music/bensound-slowmotion.mp3', angry: 'https://www.bensound.com/bensound-music/bensound-actionable.mp3', calm: 'https://www.bensound.com/bensound-music/bensound-sunny.mp3', };

// =================================================================
// --- COMPONENT
// =================================================================

interface SphereProps {
    transcript?: string;
}

const Sphere: React.FC<SphereProps> = ({ transcript: transcriptProp = "" }) => {
    // --- STATE & REFS ---
    const mountRef = useRef<HTMLDivElement>(null);
    const bubbleRef = useRef<HTMLDivElement>(null);
    const [isAudioActive, setIsAudioActive] = useState(false);
    const [currentEmotion, setCurrentEmotion] = useState<Emotion>('default');
    const [isMusicExplicitlyPaused, setIsMusicExplicitlyPaused] = useState(false);
    // Use transcript from props instead of local state
    const transcript = transcriptProp;

    // --- Refs for values that don't trigger re-renders ---
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null>(null);
    const audioEleRef = useRef<HTMLAudioElement | null>(null);
    const musicAudioRef = useRef<HTMLAudioElement | null>(null);
    const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const baseScaleRef = useRef(1);
    const currentScaleRef = useRef(1);
    const isAudioActiveRef = useRef(isAudioActive);
    const transcriptRef = useRef(transcript);

    // --- ZUSTAND STORE ---
    const { isMusicButtonPlaying, setIsMusicButtonPlaying, isMicEnabled } = useSessionStore();

    // --- Sync state to refs to avoid stale closures in callbacks ---
    useEffect(() => { isAudioActiveRef.current = isAudioActive; }, [isAudioActive]);
    useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

    // --- DEVELOPMENT HELPERS ---
    useEffect(() => {
        if (process.env.NODE_ENV !== 'production') {
            console.log("Sphere is mounted. Transcript is now received via props from useLiveKitSession hook.");
        }
    }, []);

    // --- AUDIO INITIALIZATION & CONTROL ---
    const initializeAudio = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = FFT_SIZE;
            const bufferLength = analyserRef.current.frequencyBinCount;
            // Create Uint8Array with an explicit ArrayBuffer to satisfy TS's Uint8Array<ArrayBuffer> expectation
            const arrayBuffer = new ArrayBuffer(bufferLength);
            dataArrayRef.current = new Uint8Array(arrayBuffer);
        }
    }, []);

    const handleStartListen = useCallback((stream: MediaStream | null) => {
        if (isAudioActiveRef.current || !stream) return;
        initializeAudio();
        sourceNodeRef.current = audioContextRef.current!.createMediaStreamSource(stream);
        sourceNodeRef.current.connect(analyserRef.current!);
        setIsAudioActive(true);
    }, [initializeAudio]);

    const handleStopListen = useCallback(() => {
        if (!isAudioActiveRef.current) return;
        sourceNodeRef.current?.disconnect();
        sourceNodeRef.current = null;
        setIsAudioActive(false);
    }, []);

    const handleSpeak = useCallback(() => {
        if (isAudioActive) return;
        initializeAudio();
        const audioUrl = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/85817/River_Sounds_-_Sound_Bible.com_-_1423354734.mp3';
        audioEleRef.current = new Audio(audioUrl);
        audioEleRef.current.crossOrigin = "anonymous";
        sourceNodeRef.current = audioContextRef.current!.createMediaElementSource(audioEleRef.current);
        sourceNodeRef.current.connect(analyserRef.current!);
        analyserRef.current!.connect(audioContextRef.current!.destination);
        audioEleRef.current.play();
        setIsAudioActive(true);
        audioEleRef.current.onended = () => {
            sourceNodeRef.current?.disconnect();
            sourceNodeRef.current = null;
            audioEleRef.current = null;
            setIsAudioActive(false);
        };
    }, [isAudioActive, initializeAudio]);

    // --- EVENT EMITTER SUBSCRIPTIONS ---
    // Transcript now comes from props, no need to subscribe to emitter

    useEffect(() => {
        micEventEmitter.subscribe(handleStartListen);
        return () => micEventEmitter.unsubscribe(handleStartListen);
    }, [handleStartListen]);

    useEffect(() => {
        const handleTogglePlayback = () => setIsMusicExplicitlyPaused(prev => !prev);
        musicEventEmitter.subscribe(handleTogglePlayback);
        return () => musicEventEmitter.unsubscribe(handleTogglePlayback);
    }, []);

    // --- BACKGROUND MUSIC HANDLER ---
    useEffect(() => {
        if (!musicAudioRef.current) {
            musicAudioRef.current = new Audio();
            musicAudioRef.current.loop = true;
            musicAudioRef.current.volume = 0;
        }
        const audio = musicAudioRef.current;
        const newMusicUrl = emotionMusicMap[currentEmotion];
        const FADE_TIME = 1000;
        const MAX_VOLUME = BACKGROUND_MUSIC_VOLUME;

        const fadeIn = () => {
            if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
            if (!newMusicUrl || isMusicExplicitlyPaused) {
                audio.src = '';
                audio.pause();
                audio.volume = 0;
                return;
            }
            if (audio.src !== newMusicUrl) {
                audio.src = newMusicUrl;
            }
            audio.play().catch(e => console.error("BG Music play failed. User may need to interact with the page first.", e));
            const fadeInStep = MAX_VOLUME / (FADE_TIME / 50);
            fadeIntervalRef.current = setInterval(() => {
                const newVolume = audio.volume + fadeInStep;
                if (newVolume >= MAX_VOLUME) {
                    audio.volume = MAX_VOLUME;
                    clearInterval(fadeIntervalRef.current!);
                    fadeIntervalRef.current = null;
                } else {
                    audio.volume = newVolume;
                }
            }, 50);
        };

        const fadeOutAndSwitch = () => {
            if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
            if (isMusicExplicitlyPaused) {
                audio.pause();
                audio.volume = 0;
                audio.src = '';
                return;
            }
            if (audio.paused || audio.volume === 0) {
                fadeIn();
                return;
            }
            const fadeOutStep = audio.volume / (FADE_TIME / 50);
            fadeIntervalRef.current = setInterval(() => {
                const newVolume = audio.volume - fadeOutStep;
                if (newVolume <= 0) {
                    audio.volume = 0;
                    audio.pause();
                    clearInterval(fadeIntervalRef.current!);
                    fadeIntervalRef.current = null;
                    fadeIn();
                } else {
                    audio.volume = newVolume;
                }
            }, 50);
        };

        if (isMicEnabled || isMusicExplicitlyPaused) {
            if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
            if (audio.src) {
                audio.pause();
                audio.volume = 0;
                audio.src = '';
            }
        } else {
            fadeOutAndSwitch();
        }

        return () => {
            if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        };
    }, [currentEmotion, isMusicExplicitlyPaused, isMicEnabled]);


    // =================================================================
    // --- CORE THREE.JS RENDER LOGIC ---
    // =================================================================
    useEffect(() => {
        const currentMount = mountRef.current;
        if (!currentMount) return;
        let animationFrameId: number;

        // --- 1. SCENE SETUP ---
        const scene = new THREE.Scene();
        scene.background = null;
        const camera = new THREE.PerspectiveCamera(50, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
        camera.position.set(0, 0, 5);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        currentMount.appendChild(renderer.domElement);
        const clock = new THREE.Clock();
        const refractionTextureBackground = new THREE.Color('#e0e5f0');


        // --- 2. LIGHTS & CONTROLS ---
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enablePan = false;
        controls.enableZoom = false;
        controls.autoRotate = true;

        // --- 3. OBJECT CREATION ---
        const blobGroup = new THREE.Group();
        scene.add(blobGroup);

        // Core (inner sphere)
        const coreGeometry = new THREE.SphereGeometry(1.3, 128, 128);
        const coreMaterial = new THREE.ShaderMaterial({ vertexShader: coreVertexShader, fragmentShader: coreFragmentShader, uniforms: { u_top_color: { value: new THREE.Color() }, u_bottom_color: { value: new THREE.Color() }, u_pink_color: { value: new THREE.Color() }, u_patch1_percentage: { value: 0.6 }, u_patch2_percentage: { value: 0.6 }, u_patch3_percentage: { value: 0.6 }, u_glow_power: { value: 0.7 } }, transparent: true, blending: THREE.NormalBlending, });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        blobGroup.add(core);

        // Shell (outer sphere)
        const renderTargetForShell = new THREE.WebGLRenderTarget(currentMount.clientWidth, currentMount.clientHeight);
        const shellGeometry = new THREE.SphereGeometry(2.2, 128, 128);
        const shellMaterial = new THREE.ShaderMaterial({ vertexShader: shellVertexShader, fragmentShader: shellFragmentShader, uniforms: { u_time: { value: 0 }, u_frequency: { value: 0 }, u_amplitude: { value: 0 }, u_tide_direction: { value: new THREE.Vector3(1, 0, 0) }, u_scene_texture: { value: renderTargetForShell.texture }, u_refraction_strength: { value: 0.1 }, u_shell_opacity: { value: 0.2 }, u_rim_power: { value: 0 }, u_rim_color: { value: new THREE.Color() }, u_shininess: { value: 60.0 }, u_light_direction: { value: directionalLight.position }, }, transparent: true, });
        const shell = new THREE.Mesh(shellGeometry, shellMaterial);
        blobGroup.add(shell);


        // --- 4. SIZING AND POSITIONING ---
        const setBlobSizeAndPosition = () => {
            if (!currentMount) return;

            const canvasWidth = currentMount.clientWidth;
            const canvasHeight = currentMount.clientHeight;
            const aspect = canvasWidth / canvasHeight;

            const distance = camera.position.distanceTo(controls.target);
            const vFov = THREE.MathUtils.degToRad(camera.fov);

            // Calculate the visible height and width at the distance of the object
            const visibleHeightAtDistance = 2 * Math.tan(vFov / 2) * distance;
            const visibleWidthAtDistance = visibleHeightAtDistance * aspect;

            // Determine the required diameter based on the smaller viewport dimension
            const requiredWorldDimension = Math.min(visibleWidthAtDistance, visibleHeightAtDistance) * BLOB_SIZE_PERCENTAGE;

            const unscaledBlobDiameter = shellGeometry.parameters.radius * 2;
            const newScale = requiredWorldDimension / unscaledBlobDiameter;

            baseScaleRef.current = newScale;
            if (currentScaleRef.current === 1) { // Initialize scale
                currentScaleRef.current = newScale;
                blobGroup.scale.set(newScale, newScale, newScale);
            }

            const scaledIdleRadius = (shellGeometry.parameters.radius + shellMaterial.uniforms.u_amplitude.value) * newScale;
            const bottomPaddingInWorldUnits = (BLOB_BOTTOM_PADDING_PIXELS / canvasHeight) * visibleHeightAtDistance;
            const horizontalShift = 0.4;

            blobGroup.position.x = horizontalShift;
            blobGroup.position.y = -visibleHeightAtDistance / 2 + scaledIdleRadius + bottomPaddingInWorldUnits;
            controls.target.set(horizontalShift, 0, 0);
        };
        setBlobSizeAndPosition();

        // --- 5. ANIMATION LOOP ---
        const initialProfile = emotionProfileMap[currentEmotion];
        const activeProfile = { ...initialProfile, coreColorTop: initialProfile.coreColorTop.clone(), coreColorBottom: initialProfile.coreColorBottom.clone(), coreColorAccent: initialProfile.coreColorAccent.clone(), shellRimColor: initialProfile.shellRimColor.clone(), };

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const elapsedTime = clock.getElapsedTime();
            const targetProfile = emotionProfileMap[currentEmotion];
            const lerpFactor = 0.05;

            // Interpolate active profile values towards the target emotion's profile
            activeProfile.rotationSpeed = THREE.MathUtils.lerp(activeProfile.rotationSpeed, targetProfile.rotationSpeed, lerpFactor);
            activeProfile.breathingSpeed = THREE.MathUtils.lerp(activeProfile.breathingSpeed, targetProfile.breathingSpeed, lerpFactor);
            activeProfile.breathingMagnitude = THREE.MathUtils.lerp(activeProfile.breathingMagnitude, targetProfile.breathingMagnitude, lerpFactor);
            activeProfile.shellFrequency = THREE.MathUtils.lerp(activeProfile.shellFrequency, targetProfile.shellFrequency, lerpFactor);
            activeProfile.shellAmplitude = THREE.MathUtils.lerp(activeProfile.shellAmplitude, targetProfile.shellAmplitude, lerpFactor);
            activeProfile.shellRimPower = THREE.MathUtils.lerp(activeProfile.shellRimPower, targetProfile.shellRimPower, lerpFactor);
            activeProfile.coreColorTop.lerp(targetProfile.coreColorTop, lerpFactor);
            activeProfile.coreColorBottom.lerp(targetProfile.coreColorBottom, lerpFactor);
            activeProfile.coreColorAccent.lerp(targetProfile.coreColorAccent, lerpFactor);
            activeProfile.shellRimColor.lerp(targetProfile.shellRimColor, lerpFactor);

            // Update uniforms and controls with interpolated values
            controls.autoRotateSpeed = activeProfile.rotationSpeed;
            shellMaterial.uniforms.u_frequency.value = activeProfile.shellFrequency;
            shellMaterial.uniforms.u_amplitude.value = activeProfile.shellAmplitude;
            shellMaterial.uniforms.u_rim_power.value = activeProfile.shellRimPower;
            shellMaterial.uniforms.u_rim_color.value.copy(activeProfile.shellRimColor);
            coreMaterial.uniforms.u_top_color.value.copy(activeProfile.coreColorTop);
            coreMaterial.uniforms.u_bottom_color.value.copy(activeProfile.coreColorBottom);
            coreMaterial.uniforms.u_pink_color.value.copy(activeProfile.coreColorAccent);
            shellMaterial.uniforms.u_tide_direction.value.set(Math.cos(elapsedTime * 0.8), Math.sin(elapsedTime * 0.5), Math.sin(elapsedTime * 0.8)).normalize();
            shellMaterial.uniforms.u_time.value = elapsedTime * 0.3;

            // Calculate blob scale based on audio input or idle breathing
            let targetScale: number;
            if (isAudioActiveRef.current && analyserRef.current && dataArrayRef.current) {
                analyserRef.current.getByteFrequencyData(dataArrayRef.current);
                let sum = 0;
                for (let i = 0; i < AUDIO_ANALYSIS_BINS; i++) { sum += dataArrayRef.current[i]; }
                const averageVolume = sum / AUDIO_ANALYSIS_BINS;
                const scaleMultiplier = THREE.MathUtils.mapLinear(averageVolume, 0, VOLUME_TO_REACH_MAX_SCALE, MIN_BREATHING_SCALE, MAX_BREATHING_SCALE);
                targetScale = baseScaleRef.current * scaleMultiplier;
            } else {
                const idleBreath = Math.sin(elapsedTime * activeProfile.breathingSpeed) * activeProfile.breathingMagnitude;
                targetScale = baseScaleRef.current * (1.0 + idleBreath);
            }
            const smoothingFactor = targetScale > currentScaleRef.current ? BREATHING_SMOOTHING_UP : BREATHING_SMOOTHING_DOWN;
            currentScaleRef.current = THREE.MathUtils.lerp(currentScaleRef.current, targetScale, smoothingFactor);
            blobGroup.scale.set(currentScaleRef.current, currentScaleRef.current, currentScaleRef.current);

            // Position transcript bubble
            if (bubbleRef.current) {
                if (transcriptRef.current) {
                    const blobTopOffset = shellGeometry.parameters.radius * currentScaleRef.current;
                    const blobTopPosition = new THREE.Vector3(blobGroup.position.x, blobGroup.position.y + blobTopOffset, blobGroup.position.z);
                    blobTopPosition.project(camera);
                    const screenX = (blobTopPosition.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
                    const screenY = (-blobTopPosition.y * 0.5 + 0.5) * renderer.domElement.clientHeight;
                    const bubbleWidth = bubbleRef.current.offsetWidth;
                    const bubbleHeight = bubbleRef.current.offsetHeight;
                    const style = bubbleRef.current.style;
                    const padding = 8; // viewport padding to avoid clipping at edges
                    // Desired centered position over the blob top
                    let left = screenX - bubbleWidth / 2;
                    // Clamp within the viewport width
                    left = Math.max(padding, Math.min(renderer.domElement.clientWidth - bubbleWidth - padding, left));
                    // Prefer above the blob; if not enough space, place below
                    let top = screenY - bubbleHeight - 15;
                    if (top < padding) {
                        top = screenY + 15; // place below if above would clip
                    }
                    // Prevent bottom overflow
                    const maxTop = renderer.domElement.clientHeight - bubbleHeight - padding;
                    if (top > maxTop) top = maxTop;
                    style.left = `${left}px`;
                    style.top = `${top}px`;
                    style.transform = 'none';
                    style.opacity = '1';
                } else {
                    bubbleRef.current.style.opacity = '0';
                }
            }

            // Render passes for refraction effect
            shell.visible = false;
            core.visible = true;
            scene.background = refractionTextureBackground;
            renderer.setRenderTarget(renderTargetForShell);
            renderer.render(scene, camera);
            renderer.setRenderTarget(null);
            scene.background = null;
            shell.visible = true;
            renderer.render(scene, camera);
            controls.update();
        };

        animate();

        // --- 6. EVENT LISTENERS & CLEANUP ---
        const handleResize = () => {
            if (currentMount) {
                const width = currentMount.clientWidth;
                const height = currentMount.clientHeight;
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                renderer.setSize(width, height);
                renderTargetForShell.setSize(width, height);
                setBlobSizeAndPosition();
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);

            // Dispose of audio resources
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') { audioContextRef.current.close(); }
            if (musicAudioRef.current) { musicAudioRef.current.pause(); musicAudioRef.current.src = ''; }
            if (fadeIntervalRef.current) { clearInterval(fadeIntervalRef.current); }

            // Dispose of Three.js resources
            scene.traverse(object => {
                if (object instanceof THREE.Mesh) {
                    object.geometry.dispose();
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else if (object.material.dispose) {
                        object.material.dispose();
                    }
                }
            });
            renderTargetForShell.dispose();
            controls.dispose();
            renderer.dispose();

            // Clean up DOM
            if (currentMount && renderer.domElement) {
                currentMount.removeChild(renderer.domElement);
            }
        };
    }, [currentEmotion, isMusicExplicitlyPaused]); // Dependencies for re-running the setup effect

    // =================================================================
    // --- JSX RENDERING ---
    // =================================================================
    return (
        <div className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none">
            {transcript && (
                <div
                    ref={bubbleRef}
                    className="absolute w-auto px-6 py-3 rounded-full pointer-events-auto text-center"
                    style={{
                        opacity: 0,
                        top: 0,
                        left: 0,
                        transform: 'translateX(-50%)',
                        transition: 'opacity 0.3s ease-in-out',
                        willChange: 'top, left, opacity',
                        backgroundColor: 'rgba(246, 246, 254, 0.9)',
                        fontFamily: 'var(--font-plus-jakarta-sans), Plus Jakarta Sans, ui-sans-serif, system-ui, -apple-system, sans-serif',
                        fontWeight: 600,
                        fontSize: '16px',
                        lineHeight: '20px',
                        letterSpacing: '0',
                        textAlign: 'center',
                        color: '#394169',
                        maxWidth: '75vw',
                        overflowWrap: 'break-word',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                    }}
                >
                    <p>{transcript}</p>
                </div>
            )}
            <div ref={mountRef} className="w-full h-full" />
        </div>
    );
};

export default Sphere;