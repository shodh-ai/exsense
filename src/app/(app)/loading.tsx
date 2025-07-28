'use client';




import React, { useRef, useEffect, useState } from 'react';

import * as THREE from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';




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

    varying vec3 vPosition;

    varying vec3 vNormal;

    void main() {

        vPosition = position;

        vNormal = normalize(normalMatrix * normal);

        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

    }

`;

const coreFragmentShader = `

    uniform vec3 u_top_color;

    uniform vec3 u_bottom_color;

    uniform vec3 u_pink_color;

    uniform float u_patch1_percentage;

    uniform float u_patch2_percentage;

    uniform float u_patch3_percentage;

    uniform float u_glow_power;

    varying vec3 vPosition;

    varying vec3 vNormal;

    void main() {

        vec3 p1 = normalize(vec3(1.0, 1.0, 1.0));

        vec3 p2 = normalize(vec3(-1.0, -1.0, 1.0));

        vec3 p3 = normalize(vec3(1.0, -1.0, -1.0));

        vec3 surface_pos = normalize(vPosition);

        float d1 = distance(surface_pos, p1);

        float d2 = distance(surface_pos, p2);

        float d3 = distance(surface_pos, p3);

        float influence1 = u_patch1_percentage / (d1 * d1 + 0.001);

        float influence2 = u_patch2_percentage / (d2 * d2 + 0.001);

        float influence3 = u_patch3_percentage / (d3 * d3 + 0.001);

        float total_influence = influence1 + influence2 + influence3;

        float weight1 = influence1 / total_influence;

        float weight2 = influence2 / total_influence;

        float weight3 = influence3 / total_influence;

        vec3 color = u_top_color * weight1 + u_bottom_color * weight2 + u_pink_color * weight3;

        float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);

        vec3 glow = vec3(fresnel) * u_glow_power;

        float alpha = smoothstep(0.0, 1.5, total_influence);

        gl_FragColor = vec4(color + glow, alpha);

    }

`;

const shellVertexShader = `

  uniform float u_time;

  uniform float u_frequency;

  uniform float u_amplitude;

  uniform vec3 u_tide_direction;

  varying vec3 v_normal;

  varying vec3 v_view_direction;

  varying vec3 v_world_position;

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

  uniform sampler2D u_scene_texture;

  uniform float u_refraction_strength;

  uniform float u_shell_opacity;

  uniform float u_rim_power;

  uniform vec3  u_rim_color;

  uniform float u_shininess;

  uniform vec3  u_light_direction;

  varying vec3 v_normal;

  varying vec3 v_view_direction;

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







// --- SPHERE COMPONENT ---

interface SphereProps {

    scale?: number;

    className?: string;

}




const SphereComponent: React.FC<SphereProps> = ({ scale = 1.0, className }) => {

    const mountRef = useRef<HTMLDivElement>(null);




    useEffect(() => {

        const currentMount = mountRef.current;

        if (!currentMount) return;




        let animationFrameId: number;




        const scene = new THREE.Scene();

        const camera = new THREE.PerspectiveCamera(50, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);

        // CHANGED: Moved the camera further back to fit the larger blob

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

            vertexShader: coreVertexShader,

            fragmentShader: coreFragmentShader,

            uniforms: {

                u_top_color: { value: new THREE.Color('#ff8c66') },

                u_bottom_color: { value: new THREE.Color('#7ab8f5') },

                u_pink_color: { value: new THREE.Color('#ff8cae') },

                u_patch1_percentage: { value: 0.6 },

                u_patch2_percentage: { value: 0.6 },

                u_patch3_percentage: { value: 0.6 },

                u_glow_power: { value: 0.7 }

            },

            transparent: true,

        });

        const core = new THREE.Mesh(coreGeometry, coreMaterial);

        blobGroup.add(core);




        const renderTargetForShell = new THREE.WebGLRenderTarget(currentMount.clientWidth, currentMount.clientHeight);

        const shellGeometry = new THREE.SphereGeometry(1.5, 128, 128);

        const shellMaterial = new THREE.ShaderMaterial({

            vertexShader: shellVertexShader,

            fragmentShader: shellFragmentShader,

            uniforms: {

                u_time: { value: 0 },

                u_frequency: { value: 2.5 },

                u_amplitude: { value: 0.5 }, 

                u_scene_texture: { value: renderTargetForShell.texture },

                u_refraction_strength: { value: 0.1 },

                u_shell_opacity: { value: 0.2 },

                u_rim_power: { value: 2.5 },

                u_rim_color: { value: new THREE.Color('#566FE9') },

                u_shininess: { value: 60.0 },

                u_light_direction: { value: directionalLight.position },

                u_tide_direction: { value: new THREE.Vector3(1, 0, 0) }

            },

            transparent: true,

        });

        const shell = new THREE.Mesh(shellGeometry, shellMaterial);

        blobGroup.add(shell);




        blobGroup.scale.set(scale, scale, scale);




        const refractionTextureBackground = new THREE.Color('#e0e5f0');




        const clock = new THREE.Clock();

        const animate = () => {

            animationFrameId = requestAnimationFrame(animate);

            const elapsedTime = clock.getElapsedTime();




            const tideSpeed = 0.8;

            shellMaterial.uniforms.u_tide_direction.value.set(

                Math.cos(elapsedTime * tideSpeed),

                Math.sin(elapsedTime * tideSpeed * 0.5),

                Math.sin(elapsedTime * tideSpeed * 0.8)

            ).normalize();




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




        const handleResize = () => {

             if (currentMount) {

                const width = currentMount.clientWidth;

                const height = currentMount.clientHeight;

                camera.aspect = width / height;

                camera.updateProjectionMatrix();

                renderer.setSize(width, height);

                renderTargetForShell.setSize(width, height);

            }

        };

        window.addEventListener('resize', handleResize);




        return () => {

            window.removeEventListener('resize', handleResize);

            cancelAnimationFrame(animationFrameId);

            scene.traverse(object => {

                if (object instanceof THREE.Mesh) {

                    object.geometry.dispose();

                    if (object.material instanceof THREE.Material) {

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

    }, [scale]);




    return <div ref={mountRef} className={className} />;

};







// --- LOADING PAGE COMPONENT ---




const tips = [

  "Tip: Use transition words like 'however' to link ideas.",

  "Tip: Break down large tasks into smaller, manageable steps.",

  "Tip: Read your writing aloud to catch awkward phrasing.",

  "Tip: When stuck, take a short break to refresh your mind.",

  "Tip: Use active voice to make your sentences more direct.",

  "Tip: A simple plan today is better than a perfect plan tomorrow.",

  "Tip: Vary your sentence structure to keep readers engaged.",

  "Tip: Proofread one last time before you submit.",

  "Tip: Don't be afraid to delete a sentence that doesn't add value.",

  "Tip: Stay curious and never stop learning."

];




export default function Loading() {

  const [currentTip, setCurrentTip] = useState("Getting things ready...");

  const [isMounted, setIsMounted] = useState(false);




  useEffect(() => {

    setIsMounted(true);

    const randomIndex = Math.floor(Math.random() * tips.length);

    setCurrentTip(tips[randomIndex]);

  }, []);




  return (

    <div className="flex items-center justify-center w-screen h-screen">

      <div className="flex flex-col items-center gap-8">




        {isMounted ? (

          <SphereComponent scale={2.4} className="w-[26rem] h-[26rem]" />

        ) : (

          <div className="w-[26rem] h-[26rem]" />

        )}




        <p className="max-w-md px-4 text-center opacity-80 font-display-medium font-[number:var(--display-medium-font-weight)] text-[#566fe9] text-[length:var(--display-medium-font-size)] tracking-[var(--display-medium-letter-spacing)] leading-[var(--display-medium-line-height)] [font-style:var(--display-medium-font-style)]">

          {currentTip}

        </p>

      </div>

    </div>

  );

}