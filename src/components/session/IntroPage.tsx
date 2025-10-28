'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';

// File: exsense/src/components/session/IntroPage.tsx



// --- GLSL SHADER CODE (UNCHANGED) ---
const snoise = `vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; } vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; } vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); } vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; } float snoise(vec3 v) { const vec2  C = vec2(1.0/6.0, 1.0/3.0) ; const vec4  D = vec4(0.0, 0.5, 1.0, 2.0); vec3 i  = floor(v + dot(v, C.yyy) ); vec3 x0 = v - i + dot(i, C.xxx) ; vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g; vec3 i1 = min( g.xyz, l.zxy ); vec3 i2 = max( g.xyz, l.zxy ); vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + C.yyy; vec3 x3 = x0 - D.yyy; i = mod289(i); vec4 p = permute( permute( permute( i.z + vec4(0.0, i1.z, i2.z, 1.0 )) + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) + i.x + vec4(0.0, i1.x, i2.x, 1.0 )); float n_ = 0.142857142857; vec3  ns = n_ * D.wyz - D.xzx; vec4 j = p - 49.0 * floor(p * ns.z * ns.z); vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_ ); vec4 x = x_ *ns.x + ns.yyyy; vec4 y = y_ *ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y); vec4 b0 = vec4( x.xy, y.xy ); vec4 b1 = vec4( x.zw, y.zw ); vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0; vec4 sh = -step(h, vec4(0.0)); vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ; vec3 p0 = vec3(a0.xy,h.x); vec3 p1 = vec3(a0.zw,h.y); vec3 p2 = vec3(a1.xy,h.z); vec3 p3 = vec3(a1.zw,h.w); vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3))); p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w; vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0); m = m * m; return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) ); }`;
const coreVertexShader = `varying vec3 vPosition; varying vec3 vNormal; void main() { vPosition = position; vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const coreFragmentShader = `uniform vec3 u_top_color; uniform vec3 u_bottom_color; uniform vec3 u_pink_color; uniform float u_patch1_percentage; uniform float u_patch2_percentage; uniform float u_patch3_percentage; uniform float u_glow_power; varying vec3 vPosition; varying vec3 vNormal; void main() { vec3 p1 = normalize(vec3(1.0, 1.0, 1.0)); vec3 p2 = normalize(vec3(-1.0, -1.0, 1.0)); vec3 p3 = normalize(vec3(1.0, -1.0, -1.0)); vec3 surface_pos = normalize(vPosition); float d1 = distance(surface_pos, p1); float d2 = distance(surface_pos, p2); float d3 = distance(surface_pos, p3); float influence1 = u_patch1_percentage / (d1 * d1 + 0.001); float influence2 = u_patch2_percentage / (d2 * d2 + 0.001); float influence3 = u_patch3_percentage / (d3 * d3 + 0.001); float total_influence = influence1 + influence2 + influence3; float weight1 = influence1 / total_influence; float weight2 = influence2 / total_influence; float weight3 = influence3 / total_influence; vec3 color = u_top_color * weight1 + u_bottom_color * weight2 + u_pink_color * weight3; float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0); vec3 glow = vec3(fresnel) * u_glow_power; float alpha = smoothstep(0.0, 1.5, total_influence); gl_FragColor = vec4(color + glow, alpha); }`;
const shellVertexShader = `uniform float u_time; uniform float u_frequency; uniform float u_amplitude; uniform vec3 u_tide_direction; varying vec3 v_normal; varying vec3 v_view_direction; varying vec3 v_world_position; ${snoise} void main() { float tide_influence = dot(normalize(position), u_tide_direction); float tide_multiplier = (tide_influence * 0.5) + 0.5; float modulated_amplitude = u_amplitude * pow(tide_multiplier, 5.0); float displacement = snoise(position * u_frequency + u_time) * modulated_amplitude; vec3 newPosition = position + normal * displacement; vec4 worldPosition = modelMatrix * vec4(newPosition, 1.0); v_world_position = worldPosition.xyz; v_normal = normalize(mat3(modelMatrix) * normal); v_view_direction = normalize(cameraPosition - worldPosition.xyz); gl_Position = projectionMatrix * viewMatrix * worldPosition; }`;
const shellFragmentShader = `uniform sampler2D u_scene_texture; uniform float u_refraction_strength; uniform float u_shell_opacity; uniform float u_rim_power; uniform vec3 u_rim_color; uniform float u_shininess; uniform vec3 u_light_direction; varying vec3 v_normal; varying vec3 v_view_direction; void main() { vec4 scene_uv = gl_FragCoord / gl_FragCoord.w; vec2 distortion = v_normal.xy * u_refraction_strength; vec3 refracted_color = texture2D(u_scene_texture, scene_uv.xy + distortion).rgb; float rim = 1.0 - dot(v_normal, v_view_direction); float rim_amount = pow(rim, u_rim_power); vec3 rim_color = u_rim_color * rim_amount; vec3 light_dir = normalize(u_light_direction); vec3 reflect_dir = reflect(-light_dir, v_normal); float specular_amount = max(dot(reflect_dir, v_view_direction), 0.0); specular_amount = pow(specular_amount, u_shininess); vec3 specular_color = vec3(1.0) * specular_amount; vec3 final_color = refracted_color + rim_color + specular_color; float alpha = u_shell_opacity + rim_amount; gl_FragColor = vec4(final_color, alpha); }`;


// --- SPHERE COMPONENT (HELPER) ---
interface SphereProps {
    className?: string;
}

const SphereComponent: React.FC<SphereProps> = ({ className }) => {
    const mountRef = useRef<HTMLDivElement>(null);

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
        currentMount.appendChild(renderer.domElement);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true; controls.dampingFactor = 0.05; controls.enablePan = false; controls.enableZoom = false; controls.autoRotate = true; controls.autoRotateSpeed = 0.5;
        const blobGroup = new THREE.Group();
        scene.add(blobGroup);
        const coreGeometry = new THREE.SphereGeometry(1, 128, 128);
        const coreMaterial = new THREE.ShaderMaterial({ vertexShader: coreVertexShader, fragmentShader: coreFragmentShader, uniforms: { u_top_color: { value: new THREE.Color('#ff8c66') }, u_bottom_color: { value: new THREE.Color('#7ab8f5') }, u_pink_color: { value: new THREE.Color('#ff8cae') }, u_patch1_percentage: { value: 0.6 }, u_patch2_percentage: { value: 0.6 }, u_patch3_percentage: { value: 0.6 }, u_glow_power: { value: 0.7 } }, transparent: true });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        blobGroup.add(core);
        const renderTargetForShell = new THREE.WebGLRenderTarget(currentMount.clientWidth, currentMount.clientHeight);
        const shellGeometry = new THREE.SphereGeometry(1.5, 128, 128);
        const shellMaterial = new THREE.ShaderMaterial({ vertexShader: shellVertexShader, fragmentShader: shellFragmentShader, uniforms: { u_time: { value: 0 }, u_frequency: { value: 2.5 }, u_amplitude: { value: 0.5 }, u_scene_texture: { value: renderTargetForShell.texture }, u_refraction_strength: { value: 0.1 }, u_shell_opacity: { value: 0.2 }, u_rim_power: { value: 2.5 }, u_rim_color: { value: new THREE.Color('#566FE9') }, u_shininess: { value: 60.0 }, u_light_direction: { value: directionalLight.position }, u_tide_direction: { value: new THREE.Vector3(1, 0, 0) } }, transparent: true });
        const shell = new THREE.Mesh(shellGeometry, shellMaterial);
        blobGroup.add(shell);
        blobGroup.scale.set(2.4, 2.4, 2.4);
        const refractionTextureBackground = new THREE.Color('#e0e5f0');
        const clock = new THREE.Clock();

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const elapsedTime = clock.getElapsedTime();
            shellMaterial.uniforms.u_time.value = elapsedTime * 0.3;
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
        
        const handleResize = () => { if (currentMount) { const width = currentMount.clientWidth; const height = currentMount.clientHeight; camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height); renderTargetForShell.setSize(width, height); } };
        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize); cancelAnimationFrame(animationFrameId); scene.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); const material = object.material as any; if (Array.isArray(material)) { material.forEach(mat => mat.dispose()); } else { material.dispose(); } } }); renderTargetForShell.dispose(); controls.dispose(); renderer.dispose(); if (currentMount && renderer.domElement) { currentMount.removeChild(renderer.domElement); }
        };
    }, []);

    return <div ref={mountRef} className={className} />;
};

// --- INTRO PAGE COMPONENT (MAIN EXPORT) ---
// *** MODIFICATION HERE: Added onAnimationComplete prop ***
interface IntroPageProps {
  onAnimationComplete?: () => void;
}

export default function IntroPage({ onAnimationComplete = () => {} }: IntroPageProps) {
    const [isIntroAnimating, setIsIntroAnimating] = useState(true);
    const sphereContainerRef = useRef<HTMLDivElement>(null);
    const targetRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const introTimer = setTimeout(() => setIsIntroAnimating(false), 500);
        return () => clearTimeout(introTimer);
    }, []);
    
    useEffect(() => {
        if (!isIntroAnimating && sphereContainerRef.current && targetRef.current) {
            
            const finalBlobSizeInPx = window.innerWidth * 0.11;
            const initialBlobSizeInPx = sphereContainerRef.current.offsetWidth;
            const finalScale = finalBlobSizeInPx / initialBlobSizeInPx;
            const targetRect = targetRef.current.getBoundingClientRect();
            const finalCenterX = targetRect.left + (targetRect.width / 2);
            const finalCenterY = targetRect.top - (finalBlobSizeInPx / 2) * 0.02;
            const initialCenterX = window.innerWidth / 2;
            const initialCenterY = window.innerHeight / 2;
            const finalYPosition = finalCenterY - initialCenterY;
            const finalXPosition = finalCenterX - initialCenterX ;
            
            gsap.to(sphereContainerRef.current, { 
                duration: 3.5, 
                ease: 'power3.inOut',
                x: finalXPosition,
                y: finalYPosition,
                scale: finalScale,
                // *** MODIFICATION HERE: Call the callback on completion ***
                onComplete: onAnimationComplete
            });
        }
    }, [isIntroAnimating, onAnimationComplete]);

    return (
        <div className="pointer-events-none m-0 overflow-hidden w-screen h-screen fixed top-0 left-0 flex items-center justify-center">
            {/* The following two divs have had their background styles removed to make them transparent. */}
            <div className="bottom-0 left-0 w-[60%] aspect-square absolute translate-x-[-50%] translate-y-[50%] after:content-[''] after:absolute after:inset-0 rounded-full -z-10" />
            <div className="top-0 right-0 w-[70%] aspect-square absolute translate-x-[60%] translate-y-[-55%] rounded-full after:content-[''] after:absolute after:inset-0 -z-10" />

            <div className="w-screen h-screen flex flex-col items-center justify-start -z-[1]">
                 {/* The background, shadow, and blur styles have been removed from the following two divs to make them transparent while preserving the layout for the animation. */}
                <div className="w-[97%] h-[85%] rounded-2xl mt-4" />
                <div ref={targetRef} className="w-[12%] aspect-[2/1] rounded-b-full" />
            </div>
            
            <div ref={sphereContainerRef} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[26rem] h-[26rem] z-10">
                <SphereComponent className="w-full h-full" />
            </div>
        </div>
    );
}
