import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export class Engine {
  constructor(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 600);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = 1.42;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 220;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.55;
    this._resumeTimer = null;
    this.controls.addEventListener('start', () => {
      this.controls.autoRotate = false;
      if (this._resumeTimer) clearTimeout(this._resumeTimer);
    });
    this.controls.addEventListener('end', () => {
      this._resumeTimer = setTimeout(() => {
        this.controls.autoRotate = true;
      }, 5000);
    });

    const rt = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
      samples: 4,
      type: THREE.HalfFloatType,
    });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.composer.setSize(window.innerWidth, window.innerHeight);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.5, 0.55, 0.85);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());

    this.clock = new THREE.Clock();
    this.updaters = new Set();
    this.controlsActive = true;

    this._onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.composer.setSize(w, h);
    };
    window.addEventListener('resize', this._onResize);
    this._loop = this._loop.bind(this);
  }

  setBloom({ strength, radius, threshold }) {
    if (strength !== undefined) this.bloomPass.strength = strength;
    if (radius !== undefined) this.bloomPass.radius = radius;
    if (threshold !== undefined) this.bloomPass.threshold = threshold;
  }

  setExposure(v) {
    this.renderer.toneMappingExposure = v;
  }

  setControlsActive(v) {
    this.controlsActive = v;
    this.controls.enabled = v;
  }

  frameMaze(extent) {
    this.controls.target.set(0, 0, 0);
    const d = extent * 0.95;
    this.camera.position.set(d * 0.6, d * 0.8, d * 0.8);
    this.controls.update();
  }

  addUpdater(fn) {
    this.updaters.add(fn);
  }

  removeUpdater(fn) {
    this.updaters.delete(fn);
  }

  start() {
    this.renderer.setAnimationLoop(this._loop);
  }

  _loop() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    if (this.controlsActive) this.controls.update();
    for (const fn of this.updaters) fn(dt, t);
    this.composer.render();
  }
}
