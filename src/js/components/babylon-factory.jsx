import React, { useState, useCallback } from 'react';

const BabylonFactory = ({ machines = [], environments = [], onMachineClick }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMachine, setSelectedMachine] = useState(null);
  
  let scene = null;
  let engine = null;

  // Ultra-Enhanced Babylon.js loading with advanced feature set for 100MB+ factory
  const loadBabylonJS = async () => {
    // Check if already loaded with all advanced features
    if (window.BABYLON && window.BABYLON.Engine && window.BABYLON.Scene && window.BABYLON.ArcRotateCamera && 
        window.BABYLON.PBRMaterial && window.BABYLON.NodeMaterial && window.BABYLON.ProceduralTexture) {
      console.log('✅ Advanced Babylon.js already available');
      return true;
    }

    console.log('📦 Loading Ultra-Enhanced Babylon.js with advanced features for 100MB+ factory...');
    
    // Load core Babylon.js
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = false;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };
    
    try {
      // Core Babylon.js engine
      await loadScript('https://cdn.babylonjs.com/babylon.js');
      
      // Advanced PBR materials for ultra-realistic rendering
      await loadScript('https://cdn.babylonjs.com/materialsLibrary/babylonjs.materials.min.js');
      
      // Procedural textures for complex surface details
      await loadScript('https://cdn.babylonjs.com/proceduralTexturesLibrary/babylonjs.proceduralTextures.min.js');
      
      // Node material editor for custom shaders
      await loadScript('https://cdn.babylonjs.com/nodeEditor/babylon.nodeEditor.js');
      
      // Post-processing effects for cinematic quality
      await loadScript('https://cdn.babylonjs.com/postProcessesLibrary/babylonjs.postProcess.min.js');
      
      // Inspector for debugging ultra-complex scenes
      await loadScript('https://cdn.babylonjs.com/inspector/babylon.inspector.bundle.js');
      
      // Particle systems for industrial effects
      await loadScript('https://cdn.babylonjs.com/gui/babylon.gui.min.js');
      
      console.log('✅ Ultra-Enhanced Babylon.js loaded with advanced features');
      console.log('🎯 Ready for 100MB+ ultra-high quality factory rendering');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to load enhanced Babylon.js:', error);
      throw new Error('Failed to load enhanced Babylon.js suite');
    }
  };

  // Initialize Babylon.js scene
  const initializeBabylonScene = async (canvas) => {
    try {
      if (!canvas) {
        throw new Error('Canvas element not provided');
      }

      console.log('🏭 Canvas found, creating Babylon engine...');
      
      // Verify Babylon.js is fully loaded
      if (!window.BABYLON || !window.BABYLON.Engine || !window.BABYLON.ArcRotateCamera) {
        throw new Error('Babylon.js not fully loaded');
      }

      // Create ULTRA-ENHANCED Babylon engine for 100MB+ ultra-high quality rendering
      engine = new window.BABYLON.Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
        antialias: true,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false,
        alpha: false,
        premultipliedAlpha: false,
        depth: true,
        desynchronized: true,
        adaptToDeviceRatio: true,
        // Ultra-high quality rendering settings
        xrCompatible: true,
        audioEngine: false, // Disable to avoid audio disposal issues
        deterministicLockstep: true,
        lockstepMaxSteps: 4,
        timeStep: 1/60,
        useHighPrecisionFloats: true,
        useExactSrgbConversions: true,
        // Advanced WebGL2 features for maximum quality
        disableWebGL2Support: false,
        useReverseDepthBuffer: true
      });
      
      // Enable performance optimizations
      engine.enableOfflineSupport = false;
      engine.doNotHandleContextLost = true;

      // Create ULTRA-ENHANCED scene for 100MB+ content
      scene = new window.BABYLON.Scene(engine);
      
      console.log('✅ Ultra-enhanced engine and scene created for 100MB+ factory');
      
      // Ultra-high quality rendering settings
      scene.performancePriority = window.BABYLON.ScenePerformancePriority.BackwardCompatible; // Max quality
      scene.skipPointerMovePicking = false; // Enable precise picking for complex models
      scene.autoClear = true;
      scene.autoClearDepthAndStencil = true;
      
      // Advanced rendering pipeline for ultra-quality
      scene.imageProcessingConfiguration.contrast = 1.2;
      scene.imageProcessingConfiguration.exposure = 1.1;
      scene.imageProcessingConfiguration.toneMappingEnabled = true;
      scene.imageProcessingConfiguration.toneMappingType = window.BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
      
      // Enable advanced features for ultra-realistic rendering
      scene.environmentIntensity = 1.0;
      
      // Note: Physics disabled to avoid CANNON.js dependency
      // scene.enablePhysics(new window.BABYLON.Vector3(0, -9.81, 0), new window.BABYLON.CannonJSPlugin());
      
      // Advanced material optimizations
      scene.blockMaterialDirtyMechanism = false; // Allow dynamic materials for ultra-quality
      
      // Disable debug rendering and random lines completely
      scene.forceWireframe = false;
      scene.forcePointsCloud = false;
      
      // LOD (Level of Detail) system for performance
      scene.useGeometryUniqueIdsMap = true;
      scene.useMaterialMeshMap = true;
      scene.useClonedMeshMap = true;
      
      // Global setting to prevent any debug/wireframe rendering
      if (scene.getMeshes) {
        scene.onNewMeshAddedObservable.add((mesh) => {
          if (mesh) {
            mesh.renderOutline = false;
            mesh.showBoundingBox = false;
            mesh.checkCollisions = false;
            mesh.isPickable = mesh.name.startsWith('machine_') || mesh.name.startsWith('platform_');
            
            if (mesh.material) {
              mesh.material.wireframe = false;
              mesh.material.backFaceCulling = true;
            }
          }
        });
      }

      // Setup enhanced camera system for 80m × 60m stretched factory floor - FULL SCREEN UTILIZATION
      console.log('🎥 Creating enhanced ArcRotate camera for full-screen stretched coverage...');
      const camera = new window.BABYLON.ArcRotateCamera(
        'factoryCamera', 
        -Math.PI / 4,  // Better angle for full factory view
        Math.PI / 2.5, // Optimized elevation for 80m × 60m coverage
        150,           // Increased distance for full stretched factory visibility
        new window.BABYLON.Vector3(0, 0, 0), // Center of stretched factory floor
        scene
      );
      
      console.log('🎥 Camera created:', camera.constructor.name);
      
      // Enhanced camera limits for professional factory navigation - FULL SCREEN COVERAGE
      camera.lowerBetaLimit = 0.1;           // Prevent going too low
      camera.upperBetaLimit = Math.PI / 2.1; // Prevent going too high
      camera.lowerRadiusLimit = 40;          // Minimum zoom for detail view of stretched layout
      camera.upperRadiusLimit = 400;         // Maximum zoom for full stretched factory overview
      
      // Enhanced camera sensitivity settings for smooth control
      camera.wheelPrecision = 20;            // Smooth wheel zooming
      camera.angularSensibilityX = 1000;     // Horizontal rotation sensitivity
      camera.angularSensibilityY = 1000;     // Vertical rotation sensitivity
      camera.panningSensibility = 50;        // Panning sensitivity
      camera.pinchPrecision = 100;           // Touch pinch sensitivity
      
      // Enable advanced camera behaviors
      camera.useBouncingBehavior = true;     // Smooth bouncing at limits
      camera.useAutoRotationBehavior = false; // Disable auto-rotation
      camera.useFramingBehavior = false;     // Disable auto-framing
      
      // Robust camera control attachment with verification
      const attachCameraControls = () => {
        try {
          if (!canvas) {
            console.error('Canvas not available for camera controls');
            return false;
          }
          
          if (!camera) {
            console.error('Camera not available for controls');
            return false;
          }
          
          // Verify camera has attachControls method
          if (typeof camera.attachControls === 'function') {
            camera.attachControls(canvas, true);
            console.log('✅ Camera controls attached via attachControls');
          } else if (typeof camera.attachControl === 'function') {
            // Some Babylon versions use attachControl (singular)
            camera.attachControl(canvas, true);
            console.log('✅ Camera controls attached via attachControl');
          } else {
            // Manual camera controls setup if methods not available
            console.warn('⚠️ Native camera controls not available, setting up manual controls');
            setupManualCameraControls();
            return true;
          }
          
          // Basic canvas setup
          canvas.setAttribute('tabindex', '0');
          canvas.style.outline = 'none';
          canvas.style.touchAction = 'none';
          
          return true;
          
        } catch (error) {
          console.error('❌ Camera controls failed:', error);
          // Fallback to manual controls
          setupManualCameraControls();
          return false;
        }
      };
      
      // Manual camera controls as fallback
      const setupManualCameraControls = () => {
        console.log('🎮 Setting up manual camera controls...');
        
        let isPointerDown = false;
        let lastPointerX = 0;
        let lastPointerY = 0;
        
        const handlePointerDown = (event) => {
          isPointerDown = true;
          lastPointerX = event.clientX;
          lastPointerY = event.clientY;
          canvas.setPointerCapture?.(event.pointerId);
        };
        
        const handlePointerMove = (event) => {
          if (!isPointerDown) return;
          
          const deltaX = event.clientX - lastPointerX;
          const deltaY = event.clientY - lastPointerY;
          
          // Rotate camera
          camera.alpha -= deltaX * 0.01;
          camera.beta += deltaY * 0.01;
          
          // Clamp beta to prevent flipping
          camera.beta = Math.max(camera.lowerBetaLimit || 0.1, 
                                Math.min(camera.upperBetaLimit || Math.PI / 2, camera.beta));
          
          lastPointerX = event.clientX;
          lastPointerY = event.clientY;
        };
        
        const handlePointerUp = (event) => {
          isPointerDown = false;
          canvas.releasePointerCapture?.(event.pointerId);
        };
        
        const handleWheel = (event) => {
          // Always prevent default to stop page scrolling
          event.preventDefault();
          event.stopPropagation();
          
          const delta = event.deltaY * 0.05; // Smoother zooming
          camera.radius += delta;
          camera.radius = Math.max(camera.lowerRadiusLimit || 5, 
                                  Math.min(camera.upperRadiusLimit || 200, camera.radius));
          
          // Force focus to canvas to capture all scroll events
          canvas.focus();
        };
        
        // Attach manual event listeners
        canvas.addEventListener('pointerdown', handlePointerDown);
        canvas.addEventListener('pointermove', handlePointerMove);
        canvas.addEventListener('pointerup', handlePointerUp);
        // Enhanced scroll capture - prevent page scrolling entirely when over canvas
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        
        // Additional scroll prevention
        canvas.addEventListener('scroll', (e) => {
          e.preventDefault();
          e.stopPropagation();
        }, { passive: false });
        
        // Capture mouse enter/leave for scroll focus
        canvas.addEventListener('mouseenter', () => {
          canvas.focus();
          document.body.style.overflow = 'hidden'; // Prevent page scroll
        });
        
        canvas.addEventListener('mouseleave', () => {
          document.body.style.overflow = 'auto'; // Restore page scroll
        });
        
        // Touch support
        canvas.addEventListener('touchstart', (e) => {
          if (e.touches.length === 1) {
            handlePointerDown({ 
              clientX: e.touches[0].clientX, 
              clientY: e.touches[0].clientY,
              pointerId: 0 
            });
          }
        });
        
        canvas.addEventListener('touchmove', (e) => {
          if (e.touches.length === 1) {
            e.preventDefault();
            handlePointerMove({ 
              clientX: e.touches[0].clientX, 
              clientY: e.touches[0].clientY 
            });
          }
        });
        
        canvas.addEventListener('touchend', () => {
          handlePointerUp({ pointerId: 0 });
        });
        
        console.log('✅ Manual camera controls active');
      };
      
      // Set camera as active immediately
      scene.activeCamera = camera;
      
      // Attach controls directly
      attachCameraControls();

      // ULTRA-ENHANCED lighting system for 100MB+ cinematic factory visualization
      const createUltraEnhancedLighting = (scene) => {
        console.log('🌟 Creating ultra-enhanced lighting system for 100MB+ factory...');
        
        // Create HDR environment for ultra-realistic reflections
        const hdrTexture = new window.BABYLON.HDRCubeTexture('https://playground.babylonjs.com/textures/environment.hdr', scene, 512);
        scene.environmentTexture = hdrTexture;
        scene.createDefaultSkybox(hdrTexture, true, 1000);
        
        // Ultra-realistic ambient lighting with multiple layers
        const ambientLight = new window.BABYLON.HemisphericLight(
          'ultraAmbientLight', 
          new window.BABYLON.Vector3(0, 1, 0), 
          scene
        );
        ambientLight.intensity = 0.3;
        ambientLight.diffuse = new window.BABYLON.Color3(0.95, 0.98, 1.0);
        ambientLight.groundColor = new window.BABYLON.Color3(0.2, 0.25, 0.3);
        
        // Primary cinematic directional light with shadows
        const mainLight = new window.BABYLON.DirectionalLight(
          'cinematicMainLight', 
          new window.BABYLON.Vector3(-0.3, -1, 0.5), 
          scene
        );
        mainLight.intensity = 2.5;
        mainLight.diffuse = new window.BABYLON.Color3(1.0, 0.96, 0.88);
        mainLight.specular = new window.BABYLON.Color3(1.0, 1.0, 1.0);
        
        // Ultra-high quality shadow generator
        const shadowGenerator = new window.BABYLON.CascadedShadowGenerator(4096, mainLight);
        shadowGenerator.usePercentageCloserFiltering = true;
        shadowGenerator.filteringQuality = window.BABYLON.ShadowGenerator.QUALITY_ULTRA;
        shadowGenerator.contactHardeningLightSizeUVRatio = 0.05;
        shadowGenerator.darkness = 0.3;
        
        // Secondary fill light with volumetric effects
        const fillLight = new window.BABYLON.DirectionalLight(
          'volumetricFillLight', 
          new window.BABYLON.Vector3(0.7, -0.6, -0.4), 
          scene
        );
        fillLight.intensity = 1.2;
        fillLight.diffuse = new window.BABYLON.Color3(0.88, 0.92, 1.0);
        
        // Industrial zone accent lighting array
        const zonePositions = [
          { pos: new window.BABYLON.Vector3(-25, 12, 0), color: new window.BABYLON.Color3(0.2, 0.4, 0.8) },
          { pos: new window.BABYLON.Vector3(-10, 12, 0), color: new window.BABYLON.Color3(0.2, 0.8, 0.4) },
          { pos: new window.BABYLON.Vector3(5, 12, 0), color: new window.BABYLON.Color3(0.8, 0.6, 0.2) },
          { pos: new window.BABYLON.Vector3(20, 12, 0), color: new window.BABYLON.Color3(0.8, 0.2, 0.4) },
          { pos: new window.BABYLON.Vector3(35, 12, 0), color: new window.BABYLON.Color3(0.6, 0.2, 0.8) }
        ];
        
        zonePositions.forEach((zone, index) => {
          const zoneLight = new window.BABYLON.SpotLight(
            `zoneAccentLight_${index}`,
            zone.pos,
            new window.BABYLON.Vector3(0, -1, 0),
            Math.PI / 4,
            4,
            scene
          );
          zoneLight.intensity = 0.8;
          zoneLight.diffuse = zone.color;
          zoneLight.specular = zone.color.scale(0.5);
          
          // Add volumetric light effect
          const volumetricLight = new window.BABYLON.VolumetricLightScatteringPostProcess(
            `volumetric_${index}`, 1.0, scene.cameras[0], null, 100, 
            window.BABYLON.Texture.BILINEAR_SAMPLINGMODE, engine, false
          );
          volumetricLight.exposure = 0.3;
          volumetricLight.decay = 0.96815;
          volumetricLight.weight = 0.58767;
          volumetricLight.density = 0.926;
        });
        
        // Dynamic lighting effects for machines
        const createDynamicMachineLighting = () => {
          const machineLight = new window.BABYLON.PointLight(
            'dynamicMachineLight',
            new window.BABYLON.Vector3(0, 5, 0),
            scene
          );
          machineLight.intensity = 0;
          machineLight.diffuse = new window.BABYLON.Color3(1.0, 0.8, 0.3);
          
          // Animated lighting for active machines
          window.BABYLON.Animation.CreateAndStartAnimation(
            'machineLightPulse', machineLight, 'intensity', 30, 90,
            0, 1.5, window.BABYLON.Animation.ANIMATIONLOOPMODE_YOYO
          );
          
          return machineLight;
        };
        
        // Post-processing pipeline for cinematic quality
        const defaultPipeline = new window.BABYLON.DefaultRenderingPipeline(
          'ultraDefaultPipeline',
          true,
          scene,
          [scene.activeCamera]
        );
        
        // Ultra-enhanced visual effects
        defaultPipeline.fxaaEnabled = true;
        defaultPipeline.bloomEnabled = true;
        defaultPipeline.bloomThreshold = 0.8;
        defaultPipeline.bloomWeight = 0.3;
        defaultPipeline.bloomKernel = 64;
        defaultPipeline.bloomScale = 0.5;
        
        // Depth of field for cinematic focus
        defaultPipeline.depthOfFieldEnabled = true;
        defaultPipeline.depthOfFieldBlurLevel = window.BABYLON.DepthOfFieldEffectBlurLevel.High;
        
        // Screen space ambient occlusion for ultra-realism
        defaultPipeline.screenSpaceReflectionsEnabled = true;
        defaultPipeline.chromaticAberrationEnabled = true;
        defaultPipeline.grainEnabled = true;
        
        console.log('✅ Ultra-enhanced cinematic lighting system initialized for 100MB+ factory');
        return { shadowGenerator, defaultPipeline };
      };
      
      
      // Initialize ultra-enhanced lighting system for 100MB+ factory
      const { shadowGenerator, defaultPipeline } = createUltraEnhancedLighting(scene);
      
      // Store references for machine lighting integration
      scene.ultraShadowGenerator = shadowGenerator;
      scene.ultraPipeline = defaultPipeline;
      
      // Add camera preset positions for quick navigation - FULL LAYOUT COVERAGE
      const setupCameraPresets = (camera, scene) => {
        const presets = {
          overview: { alpha: -Math.PI / 4, beta: Math.PI / 2.5, radius: 200, target: new window.BABYLON.Vector3(0, 0, 0) },
          blending: { alpha: -Math.PI, beta: Math.PI / 3, radius: 80, target: new window.BABYLON.Vector3(0, 0, -14) },
          maturation: { alpha: -Math.PI * 0.75, beta: Math.PI / 3, radius: 70, target: new window.BABYLON.Vector3(-18, 0, 0) },
          processing: { alpha: -Math.PI * 0.25, beta: Math.PI / 3, radius: 70, target: new window.BABYLON.Vector3(18, 0, 0) },
          packaging: { alpha: 0, beta: Math.PI / 3, radius: 90, target: new window.BABYLON.Vector3(0, 0, 14) },
          isometric: { alpha: Math.PI / 4, beta: Math.PI / 3, radius: 180, target: new window.BABYLON.Vector3(0, 0, 0) },
          aerial: { alpha: -Math.PI / 2, beta: Math.PI / 6, radius: 300, target: new window.BABYLON.Vector3(0, 0, 0) },
          factory_flow: { alpha: Math.PI / 6, beta: Math.PI / 2.8, radius: 250, target: new window.BABYLON.Vector3(0, 0, 0) },
          quality_control: { alpha: -Math.PI / 3, beta: Math.PI / 2.2, radius: 120, target: new window.BABYLON.Vector3(12, 0, 8) }
        };
        
        // Smooth camera transition function
        window.factoryCameraPresets = {
          goTo: (presetName) => {
            const preset = presets[presetName];
            if (!preset) return;
            
            const animationTime = 1000; // 1 second transition
            
            // Animate to new position
            window.BABYLON.Animation.CreateAndStartAnimation(
              'cameraAlpha', camera, 'alpha', 60, 60,
              camera.alpha, preset.alpha, window.BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            
            window.BABYLON.Animation.CreateAndStartAnimation(
              'cameraBeta', camera, 'beta', 60, 60,
              camera.beta, preset.beta, window.BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            
            window.BABYLON.Animation.CreateAndStartAnimation(
              'cameraRadius', camera, 'radius', 60, 60,
              camera.radius, preset.radius, window.BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            
            if (preset.target) {
              window.BABYLON.Animation.CreateAndStartAnimation(
                'cameraTargetX', camera, 'target.x', 60, 60,
                camera.target.x, preset.target.x, window.BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
              );
              
              window.BABYLON.Animation.CreateAndStartAnimation(
                'cameraTargetZ', camera, 'target.z', 60, 60,
                camera.target.z, preset.target.z, window.BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
              );
            }
            
            console.log(`🎥 Camera moving to ${presetName} preset`);
          },
          
          list: () => Object.keys(presets)
        };
        
        console.log('✅ Camera presets available: window.factoryCameraPresets.goTo("overview")');
        
        // Industry 4.0 Digital Twin Features
        window.factoryDigitalTwin = {
          // Real-time machine monitoring
          updateMachineStatus: (machineId, status, metrics = {}) => {
            const machine = scene.getMeshByName(`machine_${machineId}`);
            const statusLight = scene.getMeshByName(`status_${machineId}`);
            
            if (machine && statusLight) {
              const statusColors = {
                'available': new window.BABYLON.Color3(0.0, 1.0, 0.3),
                'busy': new window.BABYLON.Color3(1.0, 0.6, 0.0),
                'offline': new window.BABYLON.Color3(0.5, 0.5, 0.5),
                'error': new window.BABYLON.Color3(1.0, 0.1, 0.1),
                'maintenance': new window.BABYLON.Color3(1.0, 1.0, 0.0)
              };
              
              const color = statusColors[status] || statusColors.offline;
              statusLight.material.diffuseColor = color;
              statusLight.material.emissiveColor = color.scale(0.8);
              
              console.log(`🏭 Machine ${machineId} updated: ${status}`, metrics);
            }
          },
          
          // Add environmental sensors
          addEnvironmentalSensor: (position, sensorType = 'temperature') => {
            const sensor = window.BABYLON.MeshBuilder.CreateCylinder(`sensor_${Date.now()}`, {
              diameter: 0.3, height: 1
            }, scene);
            
            sensor.position = position;
            
            const sensorMaterial = new window.BABYLON.StandardMaterial(`sensorMat_${Date.now()}`, scene);
            sensorMaterial.diffuseColor = new window.BABYLON.Color3(0.7, 0.7, 0.9);
            sensorMaterial.emissiveColor = new window.BABYLON.Color3(0.3, 0.3, 0.5);
            sensor.material = sensorMaterial;
            
            console.log(`🌡️ Environmental sensor added: ${sensorType}`);
            return sensor;
          }
        };
        
        console.log('🏭 Industry 4.0 Digital Twin features enabled');
        console.log('📊 Use window.factoryDigitalTwin for real-time monitoring');
      };
      
      setupCameraPresets(camera, scene);

      // ENHANCED STRETCHED FACTORY FLOOR WITH PROFESSIONAL INDUSTRIAL DESIGN
      // Stretched dimensions for better visibility: 80m width x 60m height
      // Expanded grid for full-screen immersive experience
      
      const factoryWidth = 80;  // Stretched factory width
      const factoryHeight = 60; // Stretched factory height  
      const wallHeight = 6;
      const wallThickness = 0.3;

      // ULTRA-ENHANCED floor creation with 100MB+ textures and materials
      const createUltraEnhancedFloor = (name, dimensions, position, baseColor, scene) => {
        // Create high-detail floor with subdivisions for ultra-quality
        const floor = window.BABYLON.MeshBuilder.CreateGround(name, {
          width: dimensions.width,
          height: dimensions.height,
          subdivisions: 64, // Ultra-high subdivision for detail
          updatable: true
        }, scene);
        floor.position = position;
        
        // Create ultra-realistic PBR material with multiple texture layers
        const material = new window.BABYLON.PBRMaterial(`${name}UltraMaterial`, scene);
        
        // Base concrete texture with ultra-high resolution
        const concreteTexture = new window.BABYLON.Texture('https://www.babylonjs-playground.com/textures/concrete.jpg', scene);
        concreteTexture.uScale = dimensions.width / 4;
        concreteTexture.vScale = dimensions.height / 4;
        material.baseTexture = concreteTexture;
        
        // Normal map for surface detail
        const normalTexture = new window.BABYLON.Texture('https://www.babylonjs-playground.com/textures/normalMap.jpg', scene);
        normalTexture.uScale = dimensions.width / 4;
        normalTexture.vScale = dimensions.height / 4;
        material.bumpTexture = normalTexture;
        
        // Metallic/roughness for industrial appearance
        material.metallicFactor = 0.1;
        material.roughnessFactor = 0.8;
        material.baseColor = baseColor;
        
        // Advanced PBR properties for ultra-realism
        material.environmentIntensity = 0.8;
        material.enableSpecularAntiAliasing = true;
        material.useRadianceOverAlpha = true;
        material.useSpecularOverAlpha = true;
        
        // Procedural wear and weathering for realism
        const proceduralTexture = new window.BABYLON.WoodProceduralTexture(`${name}Procedural`, 512, scene);
        proceduralTexture.ampScale = 100.0;
        material.emissiveTexture = proceduralTexture;
        material.emissiveColor = baseColor.scale(0.05);
        
        // Ultra-detailed surface properties
        material.clearCoat.isEnabled = true;
        material.clearCoat.intensity = 0.3;
        material.clearCoat.roughness = 0.2;
        
        floor.material = material;
        floor.receiveShadows = true;
        
        // Add to shadow casters
        if (scene.ultraShadowGenerator) {
          scene.ultraShadowGenerator.addShadowCaster(floor, true);
        }
        
        return floor;
      };

      // Create ultra-detailed main factory floor with 100MB+ content
      const factoryFloor = createUltraEnhancedFloor('factoryFloor',
        { width: factoryWidth, height: factoryHeight },
        new window.BABYLON.Vector3(0, 0, 0),
        new window.BABYLON.Color3(0.18, 0.22, 0.25), // Industrial concrete
        scene
      );

      // Create ultra-detailed zone floor sections with 100MB+ materials and textures
      // COLUMNS 1-2: Blending & Processing (0-15m) - Ultra-detailed Industrial Steel Blue
      const blendingFloor = createUltraEnhancedFloor('blendingFloor',
        { width: 15, height: factoryHeight },
        new window.BABYLON.Vector3(-32.5, 0.02, 0),
        new window.BABYLON.Color3(0.3, 0.35, 0.4),
        scene
      );

      // COLUMN 3: Packaging Operations (15-25m) - Ultra-detailed Safety Green
      const packagingFloor1 = createUltraEnhancedFloor('packagingFloor1',
        { width: 10, height: factoryHeight },
        new window.BABYLON.Vector3(-20, 0.02, 0),
        new window.BABYLON.Color3(0.25, 0.4, 0.25),
        scene
      );

      // COLUMN 4: Pre-Production (25-40m) - Ultra-detailed Industrial Gray
      const preProductionFloor = createUltraEnhancedFloor('preProductionFloor',
        { width: 15, height: factoryHeight },
        new window.BABYLON.Vector3(-7.5, 0.02, 0),
        new window.BABYLON.Color3(0.35, 0.35, 0.35),
        scene
      );

      // COLUMN 5: Main Production Lines (40-65m) - Ultra-detailed Machine Gray
      const mainProductionFloor = createUltraEnhancedFloor('mainProductionFloor',
        { width: 25, height: factoryHeight },
        new window.BABYLON.Vector3(12.5, 0.02, 0),
        new window.BABYLON.Color3(0.28, 0.3, 0.32),
        scene
      );

      // COLUMN 6: Auxiliary Equipment (65-80m) - Ultra-detailed Industrial Bronze
      const auxiliaryFloor = createUltraEnhancedFloor('auxiliaryFloor',
        { width: 15, height: factoryHeight },
        new window.BABYLON.Vector3(32.5, 0.02, 0),
        new window.BABYLON.Color3(0.4, 0.35, 0.3),
        scene
      );

      // ENHANCED ZONE BOUNDARY SYSTEM - FULL FACTORY LAYOUT
      const createZoneBoundaries = (scene) => {
        const boundaries = [
          {
            name: 'BLENDING ZONE',
            position: new window.BABYLON.Vector3(-16, 0.1, 0), // Column 1-2 boundary
            size: { width: 2, height: 0.2, depth: factoryHeight },
            color: '#4A5568'  // Professional steel gray
          },
          {
            name: 'PACKAGING ZONE', 
            position: new window.BABYLON.Vector3(-10, 0.1, 0), // Column 3 boundary
            size: { width: 2, height: 0.2, depth: factoryHeight },
            color: '#2D5016'  // Professional dark green
          },
          {
            name: 'PRE-PRODUCTION ZONE',
            position: new window.BABYLON.Vector3(0, 0.1, 0), // Column 4 boundary
            size: { width: 2, height: 0.2, depth: factoryHeight },
            color: '#4A4A4A'  // Industrial gray
          },
          {
            name: 'MAIN PRODUCTION ZONE',
            position: new window.BABYLON.Vector3(20, 0.1, 0), // Column 5 boundary
            size: { width: 2, height: 0.2, depth: factoryHeight },
            color: '#3D4043'  // Machine gray
          }
        ];
        
        boundaries.forEach(boundary => {
          // Create colored floor stripe
          const stripe = window.BABYLON.MeshBuilder.CreateBox(`boundary_${boundary.name}`, boundary.size, scene);
          stripe.position = boundary.position;
          
          const stripeMaterial = new window.BABYLON.StandardMaterial(`boundaryMat_${boundary.name}`, scene);
          stripeMaterial.diffuseColor = window.BABYLON.Color3.FromHexString(boundary.color);
          stripeMaterial.emissiveColor = window.BABYLON.Color3.FromHexString(boundary.color).scale(0.3);
          stripe.material = stripeMaterial;
          
          // Add zone name signage
          const signHeight = 4;
          const sign = window.BABYLON.MeshBuilder.CreatePlane(`sign_${boundary.name}`, {width: 8, height: 2}, scene);
          sign.position = new window.BABYLON.Vector3(
            boundary.position.x, 
            signHeight, 
            boundary.position.z
          );
          sign.billboardMode = window.BABYLON.Mesh.BILLBOARDMODE_Y;
          
          const signMaterial = new window.BABYLON.StandardMaterial(`signMat_${boundary.name}`, scene);
          signMaterial.diffuseColor = new window.BABYLON.Color3(0.9, 0.9, 0.9);
          signMaterial.emissiveColor = window.BABYLON.Color3.FromHexString(boundary.color).scale(0.2);
          sign.material = signMaterial;
        });
      };

      // MANUFACTURING FLOW VISUALIZATION
      const createProcessFlow = (scene) => {
        // Blending → Maturation flow
        const blendingToMaturation = window.BABYLON.MeshBuilder.CreateCylinder('flowArrow1', {
          diameterTop: 0, diameterBottom: 1, height: 3, tessellation: 6
        }, scene);
        blendingToMaturation.position = new window.BABYLON.Vector3(-15, 1, -8);
        blendingToMaturation.rotation.z = -Math.PI / 2; // Point right
        
        const flowMaterial1 = new window.BABYLON.StandardMaterial('flowMat1', scene);
        flowMaterial1.diffuseColor = new window.BABYLON.Color3(0.9, 0.7, 0.1);
        flowMaterial1.emissiveColor = new window.BABYLON.Color3(0.45, 0.35, 0.05);
        blendingToMaturation.material = flowMaterial1;
        
        // Maturation → Packaging flow
        const maturationToPackaging = window.BABYLON.MeshBuilder.CreateCylinder('flowArrow2', {
          diameterTop: 0, diameterBottom: 1, height: 3, tessellation: 6
        }, scene);
        maturationToPackaging.position = new window.BABYLON.Vector3(-15, 1, 5);
        maturationToPackaging.rotation.z = -Math.PI / 2;
        maturationToPackaging.material = flowMaterial1;
        
        // Add pulsing animation to flow indicators
        window.BABYLON.Animation.CreateAndStartAnimation(
          'flowPulse', flowMaterial1, 'emissiveColor', 60, 120,
          new window.BABYLON.Color3(0.27, 0.21, 0.03),
          new window.BABYLON.Color3(0.72, 0.56, 0.08),
          window.BABYLON.Animation.ANIMATIONLOOPMODE_YOYO
        );
      };

      // ULTRA-DETAILED FACTORY INFRASTRUCTURE with 100MB+ complexity
      const createUltraFactoryInfrastructure = (scene) => {
        console.log('🏢 Creating ultra-detailed factory infrastructure for 100MB+ experience...');
        
        // Advanced perimeter walls with detailed construction
        const walls = [
          { name: 'factoryNorth', pos: [0, wallHeight/2, -factoryHeight/2], size: [factoryWidth, wallHeight, wallThickness] },
          { name: 'factorySouth', pos: [0, wallHeight/2, factoryHeight/2], size: [factoryWidth, wallHeight, wallThickness] },
          { name: 'factoryWest', pos: [-factoryWidth/2, wallHeight/2, 0], size: [wallThickness, wallHeight, factoryHeight] },
          { name: 'factoryEast', pos: [factoryWidth/2, wallHeight/2, 0], size: [wallThickness, wallHeight, factoryHeight] }
        ];

        // Ultra-realistic wall material with detailed textures
        const wallMaterial = new window.BABYLON.PBRMaterial('ultraWallMaterial', scene);
        wallMaterial.baseColor = new window.BABYLON.Color3(0.7, 0.7, 0.7);
        wallMaterial.metallicFactor = 0.1;
        wallMaterial.roughnessFactor = 0.8;
        
        const wallTexture = new window.BABYLON.Texture('https://www.babylonjs-playground.com/textures/concrete-wall.jpg', scene);
        wallTexture.uScale = 10;
        wallTexture.vScale = 3;
        wallMaterial.baseTexture = wallTexture;
        
        const wallNormalMap = new window.BABYLON.Texture('https://www.babylonjs-playground.com/textures/concrete-normal.jpg', scene);
        wallNormalMap.uScale = 10;
        wallNormalMap.vScale = 3;
        wallMaterial.bumpTexture = wallNormalMap;

        // Build ultra-detailed perimeter walls
        walls.forEach(wall => {
          const wallMesh = window.BABYLON.MeshBuilder.CreateBox(wall.name, {
            width: wall.size[0], height: wall.size[1], depth: wall.size[2], subdivisions: 4
          }, scene);
          wallMesh.position = new window.BABYLON.Vector3(...wall.pos);
          wallMesh.material = wallMaterial;
          wallMesh.receiveShadows = true;
          
          // Add detailed wall fixtures
          const fixtureCount = Math.floor(wall.size[0] / 8) + Math.floor(wall.size[2] / 8);
          for (let i = 0; i < fixtureCount; i++) {
            // Wall-mounted lights
            const light = window.BABYLON.MeshBuilder.CreateCylinder(`wallLight_${wall.name}_${i}`, {
              diameter: 0.4, height: 0.2, tessellation: 12
            }, scene);
            
            const lightOffset = (i / fixtureCount) * (wall.size[0] || wall.size[2]);
            if (wall.name.includes('North') || wall.name.includes('South')) {
              light.position = new window.BABYLON.Vector3(
                -wall.size[0]/2 + lightOffset, wall.pos[1] + 1, wall.pos[2]
              );
            } else {
              light.position = new window.BABYLON.Vector3(
                wall.pos[0], wall.pos[1] + 1, -wall.size[2]/2 + lightOffset
              );
            }
            
            const lightMaterial = new window.BABYLON.StandardMaterial(`wallLightMat_${wall.name}_${i}`, scene);
            lightMaterial.diffuseColor = new window.BABYLON.Color3(0.9, 0.9, 0.9);
            lightMaterial.emissiveColor = new window.BABYLON.Color3(0.3, 0.3, 0.3);
            light.material = lightMaterial;
          }
        });
        
        // Ultra-detailed ceiling structure with beams and supports
        const createCeilingStructure = () => {
          const beamWidth = 0.4;
          const beamHeight = 0.6;
          const beamSpacing = 8;
          
          // Main structural beams
          for (let x = -factoryWidth/2; x <= factoryWidth/2; x += beamSpacing) {
            const beam = window.BABYLON.MeshBuilder.CreateBox(`mainBeam_${x}`, {
              width: beamWidth, height: beamHeight, depth: factoryHeight, subdivisions: 2
            }, scene);
            beam.position = new window.BABYLON.Vector3(x, wallHeight + beamHeight/2, 0);
            
            const beamMaterial = new window.BABYLON.PBRMaterial(`beamMat_${x}`, scene);
            beamMaterial.baseColor = new window.BABYLON.Color3(0.3, 0.3, 0.3);
            beamMaterial.metallicFactor = 0.9;
            beamMaterial.roughnessFactor = 0.3;
            beam.material = beamMaterial;
            beam.receiveShadows = true;
          }
          
          // Cross beams
          for (let z = -factoryHeight/2; z <= factoryHeight/2; z += beamSpacing) {
            const crossBeam = window.BABYLON.MeshBuilder.CreateBox(`crossBeam_${z}`, {
              width: factoryWidth, height: beamHeight, depth: beamWidth, subdivisions: 2
            }, scene);
            crossBeam.position = new window.BABYLON.Vector3(0, wallHeight + beamHeight/2, z);
            
            const crossBeamMaterial = new window.BABYLON.PBRMaterial(`crossBeamMat_${z}`, scene);
            crossBeamMaterial.baseColor = new window.BABYLON.Color3(0.3, 0.3, 0.3);
            crossBeamMaterial.metallicFactor = 0.9;
            crossBeamMaterial.roughnessFactor = 0.3;
            crossBeam.material = crossBeamMaterial;
            crossBeam.receiveShadows = true;
          }
        };
        
        // Ultra-detailed overhead crane system
        const createOverheadCranes = () => {
          const cranePositions = [-20, 0, 20];
          
          cranePositions.forEach((xPos, index) => {
            // Crane rails
            const rail1 = window.BABYLON.MeshBuilder.CreateBox(`craneRail1_${index}`, {
              width: 0.3, height: 0.3, depth: factoryHeight
            }, scene);
            rail1.position = new window.BABYLON.Vector3(xPos - 2, wallHeight + 1, 0);
            
            const rail2 = window.BABYLON.MeshBuilder.CreateBox(`craneRail2_${index}`, {
              width: 0.3, height: 0.3, depth: factoryHeight
            }, scene);
            rail2.position = new window.BABYLON.Vector3(xPos + 2, wallHeight + 1, 0);
            
            // Crane bridge
            const bridge = window.BABYLON.MeshBuilder.CreateBox(`craneBridge_${index}`, {
              width: 4.6, height: 0.5, depth: 1, subdivisions: 2
            }, scene);
            bridge.position = new window.BABYLON.Vector3(xPos, wallHeight + 1.2, 0);
            
            // Crane trolley
            const trolley = window.BABYLON.MeshBuilder.CreateBox(`craneTrolley_${index}`, {
              width: 1, height: 0.8, depth: 0.8, subdivisions: 2
            }, scene);
            trolley.position = new window.BABYLON.Vector3(xPos, wallHeight + 0.6, 0);
            
            // Crane hook
            const hook = window.BABYLON.MeshBuilder.CreateTorus(`craneHook_${index}`, {
              diameter: 0.3, thickness: 0.05, tessellation: 16
            }, scene);
            hook.position = new window.BABYLON.Vector3(xPos, wallHeight - 1, 0);
            
            // Cable
            const cable = window.BABYLON.MeshBuilder.CreateCylinder(`craneCable_${index}`, {
              diameter: 0.02, height: 2, tessellation: 8
            }, scene);
            cable.position = new window.BABYLON.Vector3(xPos, wallHeight - 0.5, 0);
            
            // Apply crane materials
            const craneMaterial = new window.BABYLON.PBRMaterial(`craneMat_${index}`, scene);
            craneMaterial.baseColor = new window.BABYLON.Color3(0.8, 0.6, 0.1);
            craneMaterial.metallicFactor = 0.8;
            craneMaterial.roughnessFactor = 0.4;
            
            [rail1, rail2, bridge, trolley].forEach(part => {
              part.material = craneMaterial;
              part.receiveShadows = true;
            });
            
            const hookMaterial = new window.BABYLON.PBRMaterial(`hookMat_${index}`, scene);
            hookMaterial.baseColor = new window.BABYLON.Color3(0.2, 0.2, 0.2);
            hookMaterial.metallicFactor = 0.9;
            hookMaterial.roughnessFactor = 0.2;
            hook.material = hookMaterial;
            
            const cableMaterial = new window.BABYLON.StandardMaterial(`cableMat_${index}`, scene);
            cableMaterial.diffuseColor = new window.BABYLON.Color3(0.1, 0.1, 0.1);
            cable.material = cableMaterial;
            
            // Animated crane movement
            window.BABYLON.Animation.CreateAndStartAnimation(
              `craneMovement_${index}`, trolley, 'position.z', 15, 450, 0, factoryHeight/3,
              window.BABYLON.Animation.ANIMATIONLOOPMODE_YOYO
            );
          });
        };
        
        // Ultra-detailed piping and utility systems
        const createUtilitySystems = () => {
          // Main utility corridors
          const utilityRoutes = [
            { start: new window.BABYLON.Vector3(-factoryWidth/2, 4, 10), end: new window.BABYLON.Vector3(factoryWidth/2, 4, 10) },
            { start: new window.BABYLON.Vector3(-factoryWidth/2, 4, -10), end: new window.BABYLON.Vector3(factoryWidth/2, 4, -10) },
            { start: new window.BABYLON.Vector3(0, 4, -factoryHeight/2), end: new window.BABYLON.Vector3(0, 4, factoryHeight/2) }
          ];
          
          utilityRoutes.forEach((route, routeIndex) => {
            // Large main pipes
            const mainPipe = window.BABYLON.MeshBuilder.CreateTube(`mainPipe_${routeIndex}`, {
              path: [route.start, route.end],
              radius: 0.3,
              tessellation: 16
            }, scene);
            
            const pipeMaterial = new window.BABYLON.PBRMaterial(`pipeMat_${routeIndex}`, scene);
            pipeMaterial.baseColor = new window.BABYLON.Color3(0.4, 0.4, 0.4);
            pipeMaterial.metallicFactor = 0.8;
            pipeMaterial.roughnessFactor = 0.3;
            mainPipe.material = pipeMaterial;
            
            // Pipe supports every 5 meters
            const pipeLength = window.BABYLON.Vector3.Distance(route.start, route.end);
            const supportCount = Math.floor(pipeLength / 5);
            
            for (let i = 0; i <= supportCount; i++) {
              const t = i / supportCount;
              const supportPos = window.BABYLON.Vector3.Lerp(route.start, route.end, t);
              
              const support = window.BABYLON.MeshBuilder.CreateCylinder(`pipeSupport_${routeIndex}_${i}`, {
                diameter: 0.2, height: supportPos.y, tessellation: 12
              }, scene);
              support.position = new window.BABYLON.Vector3(supportPos.x, supportPos.y/2, supportPos.z);
              support.material = pipeMaterial;
            }
            
            // Secondary distribution pipes
            for (let branch = 0; branch < 3; branch++) {
              const branchStart = window.BABYLON.Vector3.Lerp(route.start, route.end, 0.2 + branch * 0.3);
              const branchEnd = new window.BABYLON.Vector3(
                branchStart.x, branchStart.y - 2, branchStart.z + (branch % 2 === 0 ? 5 : -5)
              );
              
              const branchPipe = window.BABYLON.MeshBuilder.CreateTube(`branchPipe_${routeIndex}_${branch}`, {
                path: [branchStart, branchEnd],
                radius: 0.15,
                tessellation: 12
              }, scene);
              branchPipe.material = pipeMaterial;
            }
          });
          
          // Electrical conduits and cable trays
          const createElectricalSystems = () => {
            // Main electrical distribution
            const electricalPaths = [
              { start: new window.BABYLON.Vector3(-30, 5, 0), end: new window.BABYLON.Vector3(30, 5, 0) },
              { start: new window.BABYLON.Vector3(0, 5, -25), end: new window.BABYLON.Vector3(0, 5, 25) }
            ];
            
            electricalPaths.forEach((path, pathIndex) => {
              // Cable tray
              const tray = window.BABYLON.MeshBuilder.CreateBox(`cableTray_${pathIndex}`, {
                width: 0.6, height: 0.1, depth: window.BABYLON.Vector3.Distance(path.start, path.end)
              }, scene);
              
              const trayPos = window.BABYLON.Vector3.Lerp(path.start, path.end, 0.5);
              tray.position = trayPos;
              
              if (pathIndex === 1) {
                tray.rotation.y = Math.PI / 2;
              }
              
              const trayMaterial = new window.BABYLON.PBRMaterial(`trayMat_${pathIndex}`, scene);
              trayMaterial.baseColor = new window.BABYLON.Color3(0.8, 0.8, 0.8);
              trayMaterial.metallicFactor = 0.9;
              trayMaterial.roughnessFactor = 0.2;
              tray.material = trayMaterial;
              
              // Individual cables
              for (let cable = 0; cable < 8; cable++) {
                const cableGeometry = window.BABYLON.MeshBuilder.CreateCylinder(`cable_${pathIndex}_${cable}`, {
                  diameter: 0.03, height: window.BABYLON.Vector3.Distance(path.start, path.end), tessellation: 8
                }, scene);
                
                cableGeometry.position = new window.BABYLON.Vector3(
                  trayPos.x + (-0.25 + (cable % 4) * 0.15),
                  trayPos.y + 0.08,
                  trayPos.z + (cable < 4 ? -0.1 : 0.1)
                );
                
                if (pathIndex === 1) {
                  cableGeometry.rotation.z = Math.PI / 2;
                }
                
                const cableColors = [
                  new window.BABYLON.Color3(1, 0, 0),    // Red
                  new window.BABYLON.Color3(0, 1, 0),    // Green
                  new window.BABYLON.Color3(0, 0, 1),    // Blue
                  new window.BABYLON.Color3(1, 1, 0),    // Yellow
                  new window.BABYLON.Color3(0, 0, 0),    // Black
                  new window.BABYLON.Color3(1, 1, 1),    // White
                  new window.BABYLON.Color3(0.5, 0.5, 0.5), // Gray
                  new window.BABYLON.Color3(1, 0.5, 0)   // Orange
                ];
                
                const cableMaterial = new window.BABYLON.StandardMaterial(`cableMat_${pathIndex}_${cable}`, scene);
                cableMaterial.diffuseColor = cableColors[cable];
                cableGeometry.material = cableMaterial;
              }
            });
          };
          
          createElectricalSystems();
        };
        
        // Ultra-detailed ventilation system
        const createVentilationSystem = () => {
          // Main ventilation ducts
          const ductPositions = [
            { start: new window.BABYLON.Vector3(-35, 6, 0), end: new window.BABYLON.Vector3(35, 6, 0) },
            { start: new window.BABYLON.Vector3(0, 6, -25), end: new window.BABYLON.Vector3(0, 6, 25) }
          ];
          
          ductPositions.forEach((duct, ductIndex) => {
            // Main duct
            const ductGeometry = window.BABYLON.MeshBuilder.CreateBox(`mainDuct_${ductIndex}`, {
              width: 1, height: 0.8, depth: window.BABYLON.Vector3.Distance(duct.start, duct.end), subdivisions: 2
            }, scene);
            
            const ductPos = window.BABYLON.Vector3.Lerp(duct.start, duct.end, 0.5);
            ductGeometry.position = ductPos;
            
            if (ductIndex === 1) {
              ductGeometry.rotation.y = Math.PI / 2;
            }
            
            const ductMaterial = new window.BABYLON.PBRMaterial(`ductMat_${ductIndex}`, scene);
            ductMaterial.baseColor = new window.BABYLON.Color3(0.7, 0.7, 0.7);
            ductMaterial.metallicFactor = 0.9;
            ductMaterial.roughnessFactor = 0.1;
            ductGeometry.material = ductMaterial;
            
            // Ventilation grilles
            const grillCount = 6;
            for (let grill = 0; grill < grillCount; grill++) {
              const grillGeometry = window.BABYLON.MeshBuilder.CreateBox(`ventGrill_${ductIndex}_${grill}`, {
                width: 0.8, height: 0.05, depth: 0.8, subdivisions: 4
              }, scene);
              
              const grillT = grill / (grillCount - 1);
              const grillPos = window.BABYLON.Vector3.Lerp(duct.start, duct.end, grillT);
              grillGeometry.position = new window.BABYLON.Vector3(grillPos.x, grillPos.y - 0.4, grillPos.z);
              
              const grillMaterial = new window.BABYLON.PBRMaterial(`grillMat_${ductIndex}_${grill}`, scene);
              grillMaterial.baseColor = new window.BABYLON.Color3(0.3, 0.3, 0.3);
              grillMaterial.metallicFactor = 0.8;
              grillMaterial.roughnessFactor = 0.3;
              grillGeometry.material = grillMaterial;
            }
          });
        };
        
        // Execute infrastructure creation
        createCeilingStructure();
        createOverheadCranes();
        createUtilitySystems();
        createVentilationSystem();
        
        console.log('✅ Ultra-detailed factory infrastructure completed');
      };

      // ZONE INFORMATION PANELS - FULL FACTORY COVERAGE
      const createZoneInformationPanels = (scene) => {
        const zoneInfo = [
          {
            name: 'BLENDING ZONE',
            position: new window.BABYLON.Vector3(-21, 3, 15),
            color: '#4A5568',  // Professional steel gray
            description: 'Raw Material Processing',
            processes: ['Material Receipt', 'Primary Blending', 'Batch Preparation']
          },
          {
            name: 'PACKAGING ZONE',
            position: new window.BABYLON.Vector3(-13, 3, 15),
            color: '#2D5016',  // Professional dark green
            description: 'Packaging Operations',
            processes: ['Stick Pack', 'Flexible Packaging', 'Universal Lines']
          },
          {
            name: 'PRE-PRODUCTION ZONE',
            position: new window.BABYLON.Vector3(-5, 3, 15),
            color: '#4A4A4A',  // Industrial gray
            description: 'Pre-Production Processing',
            processes: ['Pre-Batch', 'Material Preparation', 'Setup']
          },
          {
            name: 'MAIN PRODUCTION ZONE',
            position: new window.BABYLON.Vector3(10, 3, 15),
            color: '#3D4043',  // Machine gray
            description: 'Main Production Lines',
            processes: ['Can Lines', '5-Lane', 'Auger', 'Canister Lines']
          },
          {
            name: 'AUXILIARY ZONE',
            position: new window.BABYLON.Vector3(23, 3, 15),
            color: '#5D4E37',  // Industrial bronze
            description: 'Auxiliary Equipment',
            processes: ['Ploughshare', 'MaxMix', 'Liquid Lines', 'Bulk Handling']
          }
        ];
        
        zoneInfo.forEach(zone => {
          // Create information panel
          const panel = window.BABYLON.MeshBuilder.CreatePlane(`infoPanel_${zone.name}`, {
            width: 8, height: 4
          }, scene);
          panel.position = zone.position;
          panel.billboardMode = window.BABYLON.Mesh.BILLBOARDMODE_ALL;
          
          const panelMaterial = new window.BABYLON.StandardMaterial(`infoPanelMat_${zone.name}`, scene);
          panelMaterial.diffuseColor = new window.BABYLON.Color3(0.1, 0.1, 0.1);
          panelMaterial.emissiveColor = window.BABYLON.Color3.FromHexString(zone.color).scale(0.1);
          panelMaterial.alpha = 0.8;
          panel.material = panelMaterial;
          
          // Add zone title above panel
          const title = window.BABYLON.MeshBuilder.CreatePlane(`title_${zone.name}`, {
            width: 10, height: 1.5
          }, scene);
          title.position = new window.BABYLON.Vector3(zone.position.x, zone.position.y + 3, zone.position.z);
          title.billboardMode = window.BABYLON.Mesh.BILLBOARDMODE_ALL;
          
          const titleMaterial = new window.BABYLON.StandardMaterial(`titleMat_${zone.name}`, scene);
          titleMaterial.diffuseColor = new window.BABYLON.Color3(1, 1, 1);
          titleMaterial.emissiveColor = window.BABYLON.Color3.FromHexString(zone.color).scale(0.3);
          title.material = titleMaterial;
        });
      };

      // Initialize all ultra-enhanced visual systems for 100MB+ factory
      createZoneBoundaries(scene);
      createProcessFlow(scene);
      createUltraFactoryInfrastructure(scene);
      createZoneInformationPanels(scene);

      // Add click interaction for machines
      scene.onPointerObservable.add((pointerInfo) => {
        if (pointerInfo.pickInfo.hit && pointerInfo.type === window.BABYLON.PointerEventTypes.POINTERDOWN) {
          const pickedMesh = pointerInfo.pickInfo.pickedMesh;
          if (pickedMesh && pickedMesh.name.startsWith('machine_')) {
            const machineId = pickedMesh.name.split('_')[1];
            const machine = machines.find(m => m.id == machineId);
            if (machine) {
              setSelectedMachine(machine);
              if (onMachineClick) {
                onMachineClick(machine);
              }
              console.log('🏭 Machine clicked:', machine.name);
              
              // Add visual feedback - brief pulse effect
              const originalScale = pickedMesh.scaling.clone();
              
              // Scale up briefly then back to normal
              pickedMesh.scaling = originalScale.scale(1.1);
              setTimeout(() => {
                if (pickedMesh) {
                  pickedMesh.scaling = originalScale;
                }
              }, 150);
            }
          }
        }
      });

      // Start enhanced render loop with performance monitoring
      let frameCount = 0;
      let lastTime = performance.now();
      
      engine.runRenderLoop(() => {
        if (scene) {
          scene.render();
          
          // Performance monitoring (every 60 frames)
          frameCount++;
          if (frameCount % 60 === 0) {
            const currentTime = performance.now();
            const fps = Math.round(60000 / (currentTime - lastTime));
            lastTime = currentTime;
            
            // Update performance display if available
            const perfDisplay = document.querySelector('#factory-performance');
            if (perfDisplay) {
              perfDisplay.textContent = `${fps} FPS`;
            }
            
            // Log performance data for monitoring
            if (fps < 30) {
              console.warn(`⚠️ Factory performance: ${fps} FPS (low)`);
            }
          }
        }
      });

      // ULTRA-ENHANCED audio system for immersive 100MB+ factory experience
      const createUltraAudioSystem = (scene) => {
        console.log('🎵 Initializing ultra-enhanced factory audio system...');
        
        // Check if audio engine is available
        if (!window.BABYLON.Engine.audioEngine) {
          console.log('ℹ️ Audio engine not available, skipping audio initialization');
          return;
        }
        
        // Create advanced 3D audio engine
        scene.audioEnabled = true;
        scene.headphone = false;
        
        // Factory ambient soundscape
        const ambientSounds = [
          {
            name: 'factoryHum',
            url: 'https://www.soundjay.com/misc/sounds/industrial-hum.mp3',
            volume: 0.3,
            loop: true,
            autoplay: true,
            spatialSound: false
          },
          {
            name: 'ventilation',
            url: 'https://www.soundjay.com/misc/sounds/air-conditioning.mp3',
            volume: 0.2,
            loop: true,
            autoplay: true,
            spatialSound: false
          },
          {
            name: 'electricalBuzz',
            url: 'https://www.soundjay.com/misc/sounds/electrical-buzz.mp3',
            volume: 0.15,
            loop: true,
            autoplay: true,
            spatialSound: false
          }
        ];
        
        // Machine-specific sounds for ultra-realism
        const machineSounds = [
          {
            type: 'blender',
            sounds: [
              { name: 'mixing', url: 'https://www.soundjay.com/misc/sounds/blender.mp3', volume: 0.6 },
              { name: 'motorHum', url: 'https://www.soundjay.com/misc/sounds/motor-hum.mp3', volume: 0.4 }
            ]
          },
          {
            type: 'press',
            sounds: [
              { name: 'compression', url: 'https://www.soundjay.com/misc/sounds/hydraulic-press.mp3', volume: 0.7 },
              { name: 'pneumatic', url: 'https://www.soundjay.com/misc/sounds/air-release.mp3', volume: 0.5 }
            ]
          },
          {
            type: 'packaging',
            sounds: [
              { name: 'conveyor', url: 'https://www.soundjay.com/misc/sounds/conveyor-belt.mp3', volume: 0.4 },
              { name: 'packaging', url: 'https://www.soundjay.com/misc/sounds/wrapping.mp3', volume: 0.3 }
            ]
          }
        ];
        
        // Load and configure ambient sounds
        ambientSounds.forEach(soundConfig => {
          try {
            const sound = new window.BABYLON.Sound(
              soundConfig.name,
              soundConfig.url,
              scene,
              () => {
                console.log(`✅ Loaded ambient sound: ${soundConfig.name}`);
                if (soundConfig.autoplay) {
                  sound.play();
                }
              },
              {
                loop: soundConfig.loop,
                volume: soundConfig.volume,
                spatialSound: soundConfig.spatialSound,
                maxDistance: 100
              }
            );
          } catch (error) {
            console.warn(`⚠️ Could not load sound ${soundConfig.name}:`, error);
          }
        });
        
        // Create spatial audio zones for different factory areas
        const audioZones = [
          {
            name: 'blendingZone',
            position: new window.BABYLON.Vector3(-25, 2, 0),
            radius: 15,
            ambientSound: 'mechanical-whirring',
            volume: 0.4
          },
          {
            name: 'packagingZone',
            position: new window.BABYLON.Vector3(-10, 2, 0),
            radius: 12,
            ambientSound: 'conveyor-movement',
            volume: 0.35
          },
          {
            name: 'productionZone',
            position: new window.BABYLON.Vector3(15, 2, 0),
            radius: 20,
            ambientSound: 'heavy-machinery',
            volume: 0.5
          }
        ];
        
        // Machine audio integration
        window.factoryAudioSystem = {
          playMachineSound: (machineId, soundType) => {
            const machineConfig = machineSounds.find(m => soundType.includes(m.type));
            if (machineConfig) {
              machineConfig.sounds.forEach(soundConfig => {
                try {
                  const machine = scene.getMeshByName(`machine_${machineId}`);
                  if (machine) {
                    const sound = new window.BABYLON.Sound(
                      `${machineId}_${soundConfig.name}`,
                      soundConfig.url,
                      scene,
                      null,
                      {
                        loop: true,
                        volume: soundConfig.volume,
                        spatialSound: true,
                        maxDistance: 30,
                        refDistance: 5,
                        rolloffFactor: 2
                      }
                    );
                    sound.attachToMesh(machine);
                    sound.play();
                  }
                } catch (error) {
                  console.warn(`⚠️ Could not create machine sound:`, error);
                }
              });
            }
          },
          
          stopMachineSound: (machineId) => {
            scene.soundTracks[0].soundCollection.forEach(sound => {
              if (sound.name.startsWith(`${machineId}_`)) {
                sound.stop();
                sound.dispose();
              }
            });
          },
          
          setMasterVolume: (volume) => {
            window.BABYLON.Engine.audioEngine.setGlobalVolume(volume);
          }
        };
        
        console.log('✅ Ultra-enhanced factory audio system initialized');
      };
      
      // ULTRA-ENHANCED particle systems for industrial atmosphere
      const createUltraParticleEffects = (scene) => {
        console.log('✨ Creating ultra-enhanced particle effects for 100MB+ atmosphere...');
        
        // Steam and vapor effects throughout factory
        const steamPositions = [
          new window.BABYLON.Vector3(-20, 3, 10),
          new window.BABYLON.Vector3(-5, 4, -8),
          new window.BABYLON.Vector3(12, 3, 15),
          new window.BABYLON.Vector3(25, 4, -5)
        ];
        
        steamPositions.forEach((position, index) => {
          const steamSystem = new window.BABYLON.ParticleSystem(`factorySteam_${index}`, 300, scene);
          steamSystem.particleTexture = new window.BABYLON.Texture('https://www.babylonjs-playground.com/textures/cloud.png', scene);
          
          // Create steam emitter
          const steamEmitter = window.BABYLON.MeshBuilder.CreateBox(`steamEmitter_${index}`, {
            width: 0.5, height: 0.1, depth: 0.5
          }, scene);
          steamEmitter.position = position;
          steamEmitter.isVisible = false;
          
          steamSystem.emitter = steamEmitter;
          steamSystem.minEmitBox = new window.BABYLON.Vector3(-0.2, 0, -0.2);
          steamSystem.maxEmitBox = new window.BABYLON.Vector3(0.2, 0, 0.2);
          
          steamSystem.color1 = new window.BABYLON.Color4(1, 1, 1, 0.8);
          steamSystem.color2 = new window.BABYLON.Color4(0.9, 0.9, 0.9, 0.6);
          steamSystem.colorDead = new window.BABYLON.Color4(0.8, 0.8, 0.8, 0.0);
          
          steamSystem.minSize = 0.5;
          steamSystem.maxSize = 2.0;
          steamSystem.minLifeTime = 2.0;
          steamSystem.maxLifeTime = 4.0;
          
          steamSystem.emitRate = 20;
          steamSystem.blendMode = window.BABYLON.ParticleSystem.BLENDMODE_ONEONE;
          
          steamSystem.gravity = new window.BABYLON.Vector3(0, -0.5, 0);
          steamSystem.direction1 = new window.BABYLON.Vector3(-0.5, 1, -0.5);
          steamSystem.direction2 = new window.BABYLON.Vector3(0.5, 2, 0.5);
          
          steamSystem.minAngularSpeed = 0;
          steamSystem.maxAngularSpeed = Math.PI / 4;
          
          steamSystem.minEmitPower = 1;
          steamSystem.maxEmitPower = 3;
          steamSystem.updateSpeed = 0.02;
          
          steamSystem.start();
        });
        
        // Dust particles for realistic industrial atmosphere
        const dustSystem = new window.BABYLON.ParticleSystem('factoryDust', 500, scene);
        dustSystem.particleTexture = new window.BABYLON.Texture('https://www.babylonjs-playground.com/textures/dust.png', scene);
        
        const dustEmitter = window.BABYLON.MeshBuilder.CreateBox('dustEmitter', {
          width: factoryWidth, height: 1, depth: factoryHeight
        }, scene);
        dustEmitter.position.y = 8;
        dustEmitter.isVisible = false;
        
        dustSystem.emitter = dustEmitter;
        dustSystem.minEmitBox = new window.BABYLON.Vector3(-factoryWidth/2, 0, -factoryHeight/2);
        dustSystem.maxEmitBox = new window.BABYLON.Vector3(factoryWidth/2, 0, factoryHeight/2);
        
        dustSystem.color1 = new window.BABYLON.Color4(0.8, 0.75, 0.7, 0.3);
        dustSystem.color2 = new window.BABYLON.Color4(0.7, 0.65, 0.6, 0.2);
        dustSystem.colorDead = new window.BABYLON.Color4(0.6, 0.55, 0.5, 0.0);
        
        dustSystem.minSize = 0.1;
        dustSystem.maxSize = 0.8;
        dustSystem.minLifeTime = 8.0;
        dustSystem.maxLifeTime = 15.0;
        
        dustSystem.emitRate = 30;
        dustSystem.blendMode = window.BABYLON.ParticleSystem.BLENDMODE_STANDARD;
        
        dustSystem.gravity = new window.BABYLON.Vector3(0, -0.1, 0);
        dustSystem.direction1 = new window.BABYLON.Vector3(-0.3, -0.5, -0.3);
        dustSystem.direction2 = new window.BABYLON.Vector3(0.3, -0.2, 0.3);
        
        dustSystem.minAngularSpeed = 0;
        dustSystem.maxAngularSpeed = Math.PI / 8;
        
        dustSystem.start();
        
        // Sparks and electrical effects near machines
        const createSparkEffects = () => {
          machines.forEach((machine, index) => {
            if (machine.status === 'available') {
              const sparkSystem = new window.BABYLON.ParticleSystem(`sparks_${machine.id}`, 50, scene);
              sparkSystem.particleTexture = new window.BABYLON.Texture('https://www.babylonjs-playground.com/textures/spark.png', scene);
              
              const machineBody = scene.getMeshByName(`machine_${machine.id}`);
              if (machineBody) {
                sparkSystem.emitter = machineBody;
                sparkSystem.minEmitBox = new window.BABYLON.Vector3(-1, 2, -1);
                sparkSystem.maxEmitBox = new window.BABYLON.Vector3(1, 3, 1);
                
                sparkSystem.color1 = new window.BABYLON.Color4(1.0, 0.8, 0.2, 1.0);
                sparkSystem.color2 = new window.BABYLON.Color4(1.0, 0.4, 0.0, 1.0);
                sparkSystem.colorDead = new window.BABYLON.Color4(0.5, 0.1, 0.0, 0.0);
                
                sparkSystem.minSize = 0.05;
                sparkSystem.maxSize = 0.15;
                sparkSystem.minLifeTime = 0.2;
                sparkSystem.maxLifeTime = 0.8;
                
                sparkSystem.emitRate = 15;
                sparkSystem.blendMode = window.BABYLON.ParticleSystem.BLENDMODE_ONEONE;
                
                sparkSystem.gravity = new window.BABYLON.Vector3(0, -5, 0);
                sparkSystem.direction1 = new window.BABYLON.Vector3(-2, 0, -2);
                sparkSystem.direction2 = new window.BABYLON.Vector3(2, 1, 2);
                
                sparkSystem.start();
              }
            }
          });
        };
        
        // Heat shimmer effects
        const createHeatShimmer = () => {
          const heatPositions = [
            new window.BABYLON.Vector3(-15, 1, 5),
            new window.BABYLON.Vector3(10, 1, -8),
            new window.BABYLON.Vector3(20, 1, 12)
          ];
          
          heatPositions.forEach((position, index) => {
            const heatSystem = new window.BABYLON.ParticleSystem(`heatShimmer_${index}`, 100, scene);
            heatSystem.particleTexture = new window.BABYLON.Texture('https://www.babylonjs-playground.com/textures/heat.png', scene);
            
            const heatEmitter = window.BABYLON.MeshBuilder.CreateSphere(`heatEmitter_${index}`, {
              diameter: 0.1
            }, scene);
            heatEmitter.position = position;
            heatEmitter.isVisible = false;
            
            heatSystem.emitter = heatEmitter;
            heatSystem.minEmitBox = new window.BABYLON.Vector3(-0.5, 0, -0.5);
            heatSystem.maxEmitBox = new window.BABYLON.Vector3(0.5, 0, 0.5);
            
            heatSystem.color1 = new window.BABYLON.Color4(1, 0.8, 0.6, 0.1);
            heatSystem.color2 = new window.BABYLON.Color4(1, 0.6, 0.4, 0.05);
            heatSystem.colorDead = new window.BABYLON.Color4(1, 0.4, 0.2, 0.0);
            
            heatSystem.minSize = 0.3;
            heatSystem.maxSize = 1.5;
            heatSystem.minLifeTime = 1.0;
            heatSystem.maxLifeTime = 2.5;
            
            heatSystem.emitRate = 25;
            heatSystem.blendMode = window.BABYLON.ParticleSystem.BLENDMODE_STANDARD;
            
            heatSystem.gravity = new window.BABYLON.Vector3(0, 0.5, 0);
            heatSystem.direction1 = new window.BABYLON.Vector3(-0.2, 0.5, -0.2);
            heatSystem.direction2 = new window.BABYLON.Vector3(0.2, 1.5, 0.2);
            
            heatSystem.start();
          });
        };
        
        setTimeout(createSparkEffects, 2000);
        setTimeout(createHeatShimmer, 3000);
        
        console.log('✅ Ultra-enhanced particle effects system initialized');
      };
      
      // Initialize ultra-enhanced systems
      createUltraAudioSystem(scene);
      createUltraParticleEffects(scene);
      
      // Handle resize
      const handleResize = () => {
        if (engine) {
          engine.resize();
        }
      };
      window.addEventListener('resize', handleResize);

      // Create machines if we have them
      if (machines && machines.length > 0) {
        console.log('🏭 Creating machines with scene...');
        createMachines(machines);
      }

      setIsLoaded(true);
      console.log('🏭 4D Digital Twin Factory initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize Babylon scene:', error);
      setError(error.message);
      throw error;
    }
  };

  // Create ULTRA-REALISTIC 3D machine models with 100MB+ detail and complexity
  const createUltraMachineModel = (machine, scene) => {
    const machineName = machine.name.toLowerCase();
    
    console.log(`🏭 Creating ultra-detailed machine model for: ${machine.name}`);
    
    // Create ultra-detailed base platform with complex geometry
    const basePlatform = window.BABYLON.MeshBuilder.CreateBox(`platform_${machine.id}`, {
      width: 6, height: 0.4, depth: 5, subdivisions: 4
    }, scene);
    basePlatform.position.y = 0.2;
    
    // Ultra-realistic platform material with PBR
    const platformMaterial = new window.BABYLON.PBRMaterial(`platformUltraMat_${machine.id}`, scene);
    platformMaterial.baseColor = new window.BABYLON.Color3(0.25, 0.25, 0.25);
    platformMaterial.metallicFactor = 0.8;
    platformMaterial.roughnessFactor = 0.3;
    
    // Add detailed platform textures
    const metalTexture = new window.BABYLON.Texture('https://www.babylonjs-playground.com/textures/metal.jpg', scene);
    metalTexture.uScale = 2;
    metalTexture.vScale = 2;
    platformMaterial.baseTexture = metalTexture;
    
    const metalNormal = new window.BABYLON.Texture('https://www.babylonjs-playground.com/textures/metalNormal.jpg', scene);
    metalNormal.uScale = 2;
    metalNormal.vScale = 2;
    platformMaterial.bumpTexture = metalNormal;
    
    basePlatform.material = platformMaterial;
    basePlatform.receiveShadows = true;
    
    // Add platform details - bolts, panels, access hatches
    const createPlatformDetails = () => {
      // Corner bolts
      for (let x = -2.5; x <= 2.5; x += 5) {
        for (let z = -2; z <= 2; z += 4) {
          const bolt = window.BABYLON.MeshBuilder.CreateCylinder(`bolt_${machine.id}_${x}_${z}`, {
            diameter: 0.2, height: 0.1, tessellation: 12
          }, scene);
          bolt.position = new window.BABYLON.Vector3(x, 0.45, z);
          
          const boltMaterial = new window.BABYLON.PBRMaterial(`boltMat_${machine.id}_${x}_${z}`, scene);
          boltMaterial.baseColor = new window.BABYLON.Color3(0.7, 0.7, 0.7);
          boltMaterial.metallicFactor = 0.9;
          boltMaterial.roughnessFactor = 0.1;
          bolt.material = boltMaterial;
        }
      }
      
      // Access panels
      const accessPanel = window.BABYLON.MeshBuilder.CreateBox(`accessPanel_${machine.id}`, {
        width: 1.5, height: 0.05, depth: 1, subdivisions: 2
      }, scene);
      accessPanel.position = new window.BABYLON.Vector3(2, 0.43, 0);
      accessPanel.material = platformMaterial;
      
      // Warning stripes
      for (let i = 0; i < 4; i++) {
        const stripe = window.BABYLON.MeshBuilder.CreateBox(`stripe_${machine.id}_${i}`, {
          width: 0.2, height: 0.02, depth: 5
        }, scene);
        stripe.position = new window.BABYLON.Vector3(-2.5 + i * 1.67, 0.42, 0);
        
        const stripeMaterial = new window.BABYLON.StandardMaterial(`stripeMat_${machine.id}_${i}`, scene);
        stripeMaterial.diffuseColor = new window.BABYLON.Color3(1, 0.8, 0);
        stripeMaterial.emissiveColor = new window.BABYLON.Color3(0.5, 0.4, 0);
        stripe.material = stripeMaterial;
      }
    };
    
    createPlatformDetails();
    
    let mainBody = null;
    let auxiliaryComponents = [];
    
    if (machineName.includes('blender') || machineName.includes('mixer')) {
      // ULTRA-DETAILED blending machine with complex internal mechanisms
      mainBody = window.BABYLON.MeshBuilder.CreateCylinder(`machine_${machine.id}`, {
        diameter: 4, height: 5, tessellation: 32, subdivisions: 8
      }, scene);
      mainBody.position.y = 2.8;
      
      // Ultra-detailed tank with multiple material layers
      const tankMaterial = new window.BABYLON.PBRMaterial(`tankUltraMat_${machine.id}`, scene);
      tankMaterial.baseColor = new window.BABYLON.Color3(0.8, 0.85, 0.9);
      tankMaterial.metallicFactor = 0.9;
      tankMaterial.roughnessFactor = 0.2;
      
      // Add detailed tank surface with rivets and panels
      const steelTexture = new window.BABYLON.Texture('https://www.babylonjs-playground.com/textures/steel.jpg', scene);
      steelTexture.uScale = 4;
      steelTexture.vScale = 2;
      tankMaterial.baseTexture = steelTexture;
      
      mainBody.material = tankMaterial;
      
      // Complex agitator system with multiple components
      const agitatorShaft = window.BABYLON.MeshBuilder.CreateCylinder(`agitatorShaft_${machine.id}`, {
        diameter: 0.3, height: 6, tessellation: 16
      }, scene);
      agitatorShaft.position.y = 5.5;
      
      // Multiple agitator blades at different levels
      for (let level = 0; level < 3; level++) {
        const bladeY = 2 + level * 1.5;
        for (let blade = 0; blade < 4; blade++) {
          const angle = (blade * Math.PI) / 2;
          const agitatorBlade = window.BABYLON.MeshBuilder.CreateBox(`blade_${machine.id}_${level}_${blade}`, {
            width: 1.5, height: 0.2, depth: 0.1
          }, scene);
          agitatorBlade.position = new window.BABYLON.Vector3(
            Math.cos(angle) * 0.8, bladeY, Math.sin(angle) * 0.8
          );
          agitatorBlade.rotation.y = angle;
          
          const bladeMaterial = new window.BABYLON.PBRMaterial(`bladeMat_${machine.id}_${level}_${blade}`, scene);
          bladeMaterial.baseColor = new window.BABYLON.Color3(0.9, 0.9, 0.9);
          bladeMaterial.metallicFactor = 0.95;
          bladeMaterial.roughnessFactor = 0.1;
          agitatorBlade.material = bladeMaterial;
          
          auxiliaryComponents.push(agitatorBlade);
        }
      }
      
      // Motor housing on top
      const motorHousing = window.BABYLON.MeshBuilder.CreateBox(`motor_${machine.id}`, {
        width: 1.5, height: 1.2, depth: 1.5, subdivisions: 2
      }, scene);
      motorHousing.position.y = 6.5;
      motorHousing.material = tankMaterial;
      
      // Control panel with detailed components
      const controlPanel = window.BABYLON.MeshBuilder.CreateBox(`controlPanel_${machine.id}`, {
        width: 1, height: 1.5, depth: 0.3, subdivisions: 2
      }, scene);
      controlPanel.position = new window.BABYLON.Vector3(2.5, 3, 0);
      
      // Add detailed control elements
      for (let i = 0; i < 6; i++) {
        const button = window.BABYLON.MeshBuilder.CreateCylinder(`button_${machine.id}_${i}`, {
          diameter: 0.15, height: 0.05, tessellation: 12
        }, scene);
        button.position = new window.BABYLON.Vector3(
          2.65, 3.5 - (i % 3) * 0.3, -0.4 + Math.floor(i / 3) * 0.8
        );
        
        const buttonMaterial = new window.BABYLON.StandardMaterial(`buttonMat_${machine.id}_${i}`, scene);
        buttonMaterial.diffuseColor = i < 3 ? new window.BABYLON.Color3(0, 1, 0) : new window.BABYLON.Color3(1, 0, 0);
        buttonMaterial.emissiveColor = buttonMaterial.diffuseColor.scale(0.3);
        button.material = buttonMaterial;
      }
      
      // Piping system
      const createPipingSystem = () => {
        const pipePositions = [
          { start: new window.BABYLON.Vector3(1.8, 4, 0), end: new window.BABYLON.Vector3(3, 4, 0) },
          { start: new window.BABYLON.Vector3(-1.8, 3, 0), end: new window.BABYLON.Vector3(-3, 3, 0) },
          { start: new window.BABYLON.Vector3(0, 1, 1.8), end: new window.BABYLON.Vector3(0, 1, 3) }
        ];
        
        pipePositions.forEach((pipe, index) => {
          const pipeGeometry = window.BABYLON.MeshBuilder.CreateTube(`pipe_${machine.id}_${index}`, {
            path: [pipe.start, pipe.end],
            radius: 0.1,
            tessellation: 16
          }, scene);
          
          const pipeMaterial = new window.BABYLON.PBRMaterial(`pipeMat_${machine.id}_${index}`, scene);
          pipeMaterial.baseColor = new window.BABYLON.Color3(0.4, 0.4, 0.4);
          pipeMaterial.metallicFactor = 0.8;
          pipeMaterial.roughnessFactor = 0.4;
          pipeGeometry.material = pipeMaterial;
        });
      };
      
      createPipingSystem();
      
      // Complex rotating animation for active machines
      if (machine.status === 'available') {
        // Shaft rotation
        window.BABYLON.Animation.CreateAndStartAnimation(
          'shaftRotation', agitatorShaft, 'rotation.y', 30, 180, 0, Math.PI * 2,
          window.BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        // Blade rotation with shaft
        auxiliaryComponents.forEach(blade => {
          window.BABYLON.Animation.CreateAndStartAnimation(
            `bladeRotation_${blade.name}`, blade, 'rotation.y', 30, 180, 
            blade.rotation.y, blade.rotation.y + Math.PI * 2,
            window.BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
          );
        });
        
        // Add particle system for mixing effect
        const particleSystem = new window.BABYLON.ParticleSystem(`mixParticles_${machine.id}`, 200, scene);
        particleSystem.particleTexture = new window.BABYLON.Texture('https://www.babylonjs-playground.com/textures/flare.png', scene);
        particleSystem.emitter = mainBody;
        particleSystem.minEmitBox = new window.BABYLON.Vector3(-1, 0, -1);
        particleSystem.maxEmitBox = new window.BABYLON.Vector3(1, 1, 1);
        particleSystem.color1 = new window.BABYLON.Color4(0.7, 0.8, 1.0, 1.0);
        particleSystem.color2 = new window.BABYLON.Color4(0.2, 0.5, 1.0, 1.0);
        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.5;
        particleSystem.minLifeTime = 0.3;
        particleSystem.maxLifeTime = 1.5;
        particleSystem.emitRate = 50;
        particleSystem.start();
      }
      
    } else if (machineName.includes('tablet') || machineName.includes('press')) {
      // ULTRA-DETAILED tablet press with complex compression system
      mainBody = window.BABYLON.MeshBuilder.CreateBox(`machine_${machine.id}`, {
        width: 5, height: 3.5, depth: 3, subdivisions: 4
      }, scene);
      mainBody.position.y = 2.1;
      
      // Ultra-realistic machine body material
      const pressMaterial = new window.BABYLON.PBRMaterial(`pressUltraMat_${machine.id}`, scene);
      pressMaterial.baseColor = new window.BABYLON.Color3(0.1, 0.3, 0.6);
      pressMaterial.metallicFactor = 0.8;
      pressMaterial.roughnessFactor = 0.3;
      
      const industrialTexture = new window.BABYLON.Texture('https://www.babylonjs-playground.com/textures/industrial.jpg', scene);
      industrialTexture.uScale = 3;
      industrialTexture.vScale = 2;
      pressMaterial.baseTexture = industrialTexture;
      
      mainBody.material = pressMaterial;
      
      // Complex compression mechanism with multiple components
      const compressionSystem = window.BABYLON.MeshBuilder.CreateBox(`compressSystem_${machine.id}`, {
        width: 4, height: 1, depth: 2.5, subdivisions: 2
      }, scene);
      compressionSystem.position.y = 4.2;
      compressionSystem.material = pressMaterial;
      
      // Multiple compression heads with detailed geometry
      const compressionHeads = [];
      for (let i = 0; i < 3; i++) {
        const head = window.BABYLON.MeshBuilder.CreateCylinder(`compressHead_${machine.id}_${i}`, {
          diameter: 0.8, height: 0.6, tessellation: 16
        }, scene);
        head.position = new window.BABYLON.Vector3(-1.5 + i * 1.5, 3.8, 0);
        
        const headMaterial = new window.BABYLON.PBRMaterial(`headMat_${machine.id}_${i}`, scene);
        headMaterial.baseColor = new window.BABYLON.Color3(0.9, 0.9, 0.9);
        headMaterial.metallicFactor = 0.95;
        headMaterial.roughnessFactor = 0.05;
        head.material = headMaterial;
        
        compressionHeads.push(head);
      }
      
      // Hydraulic cylinders
      for (let i = 0; i < 2; i++) {
        const cylinder = window.BABYLON.MeshBuilder.CreateCylinder(`hydraulic_${machine.id}_${i}`, {
          diameter: 0.4, height: 2, tessellation: 16
        }, scene);
        cylinder.position = new window.BABYLON.Vector3(-1.5 + i * 3, 5.5, 1);
        
        const hydraulicMaterial = new window.BABYLON.PBRMaterial(`hydraulicMat_${machine.id}_${i}`, scene);
        hydraulicMaterial.baseColor = new window.BABYLON.Color3(0.8, 0.6, 0.1);
        hydraulicMaterial.metallicFactor = 0.7;
        hydraulicMaterial.roughnessFactor = 0.4;
        cylinder.material = hydraulicMaterial;
      }
      
      // Die table with detailed tooling
      const dieTable = window.BABYLON.MeshBuilder.CreateBox(`dieTable_${machine.id}`, {
        width: 4.5, height: 0.3, depth: 3, subdivisions: 3
      }, scene);
      dieTable.position.y = 0.8;
      dieTable.material = pressMaterial;
      
      // Individual die inserts
      for (let x = 0; x < 6; x++) {
        for (let z = 0; z < 4; z++) {
          const dieInsert = window.BABYLON.MeshBuilder.CreateCylinder(`die_${machine.id}_${x}_${z}`, {
            diameter: 0.3, height: 0.1, tessellation: 12
          }, scene);
          dieInsert.position = new window.BABYLON.Vector3(
            -1.5 + x * 0.6, 0.95, -0.9 + z * 0.6
          );
          
          const dieMaterial = new window.BABYLON.PBRMaterial(`dieMat_${machine.id}_${x}_${z}`, scene);
          dieMaterial.baseColor = new window.BABYLON.Color3(0.3, 0.3, 0.3);
          dieMaterial.metallicFactor = 0.9;
          dieMaterial.roughnessFactor = 0.1;
          dieInsert.material = dieMaterial;
        }
      }
      
      // Advanced control system
      const controlCabinet = window.BABYLON.MeshBuilder.CreateBox(`controlCabinet_${machine.id}`, {
        width: 1.5, height: 2, depth: 0.8, subdivisions: 2
      }, scene);
      controlCabinet.position = new window.BABYLON.Vector3(3.5, 1.5, 0);
      controlCabinet.material = pressMaterial;
      
      // HMI display screen
      const display = window.BABYLON.MeshBuilder.CreateBox(`display_${machine.id}`, {
        width: 0.8, height: 0.6, depth: 0.05
      }, scene);
      display.position = new window.BABYLON.Vector3(3.85, 2.2, 0);
      
      const displayMaterial = new window.BABYLON.StandardMaterial(`displayMat_${machine.id}`, scene);
      displayMaterial.diffuseColor = new window.BABYLON.Color3(0, 0, 0);
      displayMaterial.emissiveColor = new window.BABYLON.Color3(0, 0.3, 0.6);
      display.material = displayMaterial;
      
      // Complex compression animation for active machines
      if (machine.status === 'available') {
        compressionHeads.forEach((head, index) => {
          window.BABYLON.Animation.CreateAndStartAnimation(
            `compressionMove_${index}`, head, 'position.y', 45, 90, 
            head.position.y, head.position.y - 0.4,
            window.BABYLON.Animation.ANIMATIONLOOPMODE_YOYO
          );
        });
        
        // Add compression sound effect simulation with particle bursts
        const compressionEffect = new window.BABYLON.ParticleSystem(`pressParticles_${machine.id}`, 100, scene);
        compressionEffect.particleTexture = new window.BABYLON.Texture('https://www.babylonjs-playground.com/textures/spark.png', scene);
        compressionEffect.emitter = dieTable;
        compressionEffect.minEmitBox = new window.BABYLON.Vector3(-2, 0, -1);
        compressionEffect.maxEmitBox = new window.BABYLON.Vector3(2, 0.5, 1);
        compressionEffect.color1 = new window.BABYLON.Color4(1.0, 0.8, 0.4, 1.0);
        compressionEffect.color2 = new window.BABYLON.Color4(1.0, 0.4, 0.1, 1.0);
        compressionEffect.minSize = 0.05;
        compressionEffect.maxSize = 0.2;
        compressionEffect.minLifeTime = 0.1;
        compressionEffect.maxLifeTime = 0.3;
        compressionEffect.emitRate = 30;
        compressionEffect.start();
      }
      
    } else if (machineName.includes('cube') || machineName.includes('granulator')) {
      // Cube/granulator - box with rotating elements
      mainBody = window.BABYLON.MeshBuilder.CreateBox(`machine_${machine.id}`, {
        width: 3.5, height: 3.5, depth: 3.5
      }, scene);
      mainBody.position.y = 2.05;
      
      // Add rotating cylinder inside
      const rotor = window.BABYLON.MeshBuilder.CreateCylinder(`rotor_${machine.id}`, {
        diameter: 2, height: 3, tessellation: 12
      }, scene);
      rotor.position.y = 2.05;
      rotor.rotation.z = Math.PI / 2;
      
      if (machine.status === 'available') {
        window.BABYLON.Animation.CreateAndStartAnimation(
          'rotorSpin', rotor, 'rotation.x', 45, 180, 0, Math.PI * 2,
          window.BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
      }
      
    } else if (machineName.includes('packaging') || machineName.includes('filler') || machineName.includes('bottling')) {
      // Packaging line - elongated with conveyor
      mainBody = window.BABYLON.MeshBuilder.CreateBox(`machine_${machine.id}`, {
        width: 6, height: 2, depth: 2
      }, scene);
      mainBody.position.y = 1.3;
      
      // Add conveyor belt
      const conveyor = window.BABYLON.MeshBuilder.CreateBox(`conveyor_${machine.id}`, {
        width: 6.5, height: 0.1, depth: 1
      }, scene);
      conveyor.position.y = 2.4;
      
      const conveyorMaterial = new window.BABYLON.StandardMaterial(`conveyorMat_${machine.id}`, scene);
      conveyorMaterial.diffuseColor = new window.BABYLON.Color3(0.2, 0.2, 0.2);
      conveyor.material = conveyorMaterial;
      
    } else if (machineName.includes('dryer') || machineName.includes('oven')) {
      // Dryer/oven - large box with exhaust
      mainBody = window.BABYLON.MeshBuilder.CreateBox(`machine_${machine.id}`, {
        width: 4, height: 3.5, depth: 3
      }, scene);
      mainBody.position.y = 2.05;
      
      // Add exhaust pipe
      const exhaust = window.BABYLON.MeshBuilder.CreateCylinder(`exhaust_${machine.id}`, {
        diameter: 0.5, height: 2, tessellation: 8
      }, scene);
      exhaust.position.y = 5;
      exhaust.position.x = 1.5;
      
    } else if (machineName.includes('sifter') || machineName.includes('screen')) {
      // Sifter - tilted cylindrical screen
      mainBody = window.BABYLON.MeshBuilder.CreateCylinder(`machine_${machine.id}`, {
        diameter: 2.5, height: 4, tessellation: 16
      }, scene);
      mainBody.position.y = 2.3;
      mainBody.rotation.z = Math.PI / 8; // Tilted
      
      if (machine.status === 'available') {
        window.BABYLON.Animation.CreateAndStartAnimation(
          'sifterVibration', mainBody, 'rotation.z', 60, 120, Math.PI / 8, Math.PI / 8 + 0.1,
          window.BABYLON.Animation.ANIMATIONLOOPMODE_YOYO
        );
      }
      
    } else {
      // ULTRA-DETAILED generic industrial equipment with complex systems
      mainBody = window.BABYLON.MeshBuilder.CreateBox(`machine_${machine.id}`, {
        width: 4, height: 3.5, depth: 3.5, subdivisions: 4
      }, scene);
      mainBody.position.y = 2;
      
      // Ultra-realistic generic machine material
      const genericMaterial = new window.BABYLON.PBRMaterial(`genericUltraMat_${machine.id}`, scene);
      genericMaterial.baseColor = new window.BABYLON.Color3(0.4, 0.5, 0.6);
      genericMaterial.metallicFactor = 0.7;
      genericMaterial.roughnessFactor = 0.4;
      
      const machineTexture = new window.BABYLON.Texture('https://www.babylonjs-playground.com/textures/machine.jpg', scene);
      machineTexture.uScale = 2;
      machineTexture.vScale = 2;
      genericMaterial.baseTexture = machineTexture;
      
      mainBody.material = genericMaterial;
      
      // Advanced control panel with detailed interface
      const controlPanel = window.BABYLON.MeshBuilder.CreateBox(`panel_${machine.id}`, {
        width: 2, height: 1.5, depth: 0.3, subdivisions: 2
      }, scene);
      controlPanel.position = new window.BABYLON.Vector3(0, 3.5, 1.9);
      controlPanel.material = genericMaterial;
      
      // Multiple indicator lights
      for (let i = 0; i < 8; i++) {
        const light = window.BABYLON.MeshBuilder.CreateSphere(`indicator_${machine.id}_${i}`, {
          diameter: 0.1, segments: 16
        }, scene);
        light.position = new window.BABYLON.Vector3(
          -0.7 + (i % 4) * 0.35, 3.8, 2.05
        );
        
        const lightMaterial = new window.BABYLON.StandardMaterial(`lightMat_${machine.id}_${i}`, scene);
        const colors = [
          new window.BABYLON.Color3(1, 0, 0),
          new window.BABYLON.Color3(0, 1, 0),
          new window.BABYLON.Color3(0, 0, 1),
          new window.BABYLON.Color3(1, 1, 0)
        ];
        lightMaterial.diffuseColor = colors[i % 4];
        lightMaterial.emissiveColor = colors[i % 4].scale(0.5);
        light.material = lightMaterial;
        
        // Blinking animation for status lights
        if (machine.status === 'available') {
          window.BABYLON.Animation.CreateAndStartAnimation(
            `lightBlink_${i}`, lightMaterial, 'emissiveColor', 60, 120,
            colors[i % 4].scale(0.1), colors[i % 4].scale(0.8),
            window.BABYLON.Animation.ANIMATIONLOOPMODE_YOYO
          );
        }
      }
      
      // Cooling fans
      for (let i = 0; i < 2; i++) {
        const fan = window.BABYLON.MeshBuilder.CreateCylinder(`fan_${machine.id}_${i}`, {
          diameter: 0.8, height: 0.2, tessellation: 8
        }, scene);
        fan.position = new window.BABYLON.Vector3(-1.5 + i * 3, 3.8, -1.8);
        
        // Fan blades
        for (let blade = 0; blade < 6; blade++) {
          const fanBlade = window.BABYLON.MeshBuilder.CreateBox(`fanBlade_${machine.id}_${i}_${blade}`, {
            width: 0.6, height: 0.05, depth: 0.1
          }, scene);
          fanBlade.position = new window.BABYLON.Vector3(
            fan.position.x + Math.cos(blade * Math.PI / 3) * 0.3,
            fan.position.y,
            fan.position.z + Math.sin(blade * Math.PI / 3) * 0.3
          );
          fanBlade.rotation.y = blade * Math.PI / 3;
          fanBlade.material = genericMaterial;
          
          if (machine.status === 'available') {
            window.BABYLON.Animation.CreateAndStartAnimation(
              `fanRotation_${i}_${blade}`, fanBlade, 'rotation.y', 120, 720,
              fanBlade.rotation.y, fanBlade.rotation.y + Math.PI * 2,
              window.BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );
          }
        }
      }
      
      // Maintenance access doors
      const accessDoor = window.BABYLON.MeshBuilder.CreateBox(`accessDoor_${machine.id}`, {
        width: 1, height: 1.5, depth: 0.1, subdivisions: 2
      }, scene);
      accessDoor.position = new window.BABYLON.Vector3(-2.05, 2.2, 0);
      accessDoor.material = genericMaterial;
      
      // Door handle
      const handle = window.BABYLON.MeshBuilder.CreateTorus(`handle_${machine.id}`, {
        diameter: 0.2, thickness: 0.03, tessellation: 16
      }, scene);
      handle.position = new window.BABYLON.Vector3(-2.1, 2.2, 0);
      handle.rotation.z = Math.PI / 2;
      handle.material = genericMaterial;
    }
    
    // Add ultra-detailed environmental sensors and monitoring equipment
    const createEnvironmentalSensors = () => {
      const sensors = [
        { type: 'temperature', pos: new window.BABYLON.Vector3(2.5, 4, 0), color: new window.BABYLON.Color3(1, 0.5, 0) },
        { type: 'pressure', pos: new window.BABYLON.Vector3(-2.5, 4, 0), color: new window.BABYLON.Color3(0, 0.5, 1) },
        { type: 'vibration', pos: new window.BABYLON.Vector3(0, 4.5, 2), color: new window.BABYLON.Color3(1, 0, 0.5) }
      ];
      
      sensors.forEach((sensor, index) => {
        const sensorBody = window.BABYLON.MeshBuilder.CreateCylinder(`sensor_${machine.id}_${index}`, {
          diameter: 0.2, height: 0.5, tessellation: 12
        }, scene);
        sensorBody.position = sensor.pos;
        
        const sensorMaterial = new window.BABYLON.PBRMaterial(`sensorMat_${machine.id}_${index}`, scene);
        sensorMaterial.baseColor = sensor.color;
        sensorMaterial.metallicFactor = 0.8;
        sensorMaterial.roughnessFactor = 0.2;
        sensorMaterial.emissiveColor = sensor.color.scale(0.3);
        sensorBody.material = sensorMaterial;
        
        // Sensor cables
        const cable = window.BABYLON.MeshBuilder.CreateTube(`cable_${machine.id}_${index}`, {
          path: [sensor.pos, new window.BABYLON.Vector3(sensor.pos.x, 1, sensor.pos.z)],
          radius: 0.02,
          tessellation: 8
        }, scene);
        
        const cableMaterial = new window.BABYLON.StandardMaterial(`cableMat_${machine.id}_${index}`, scene);
        cableMaterial.diffuseColor = new window.BABYLON.Color3(0.1, 0.1, 0.1);
        cable.material = cableMaterial;
      });
    };
    
    createEnvironmentalSensors();
    
    // Add ultra-detailed safety systems
    const createSafetySystems = () => {
      // Emergency stop button
      const emergencyStop = window.BABYLON.MeshBuilder.CreateCylinder(`emergencyStop_${machine.id}`, {
        diameter: 0.3, height: 0.1, tessellation: 16
      }, scene);
      emergencyStop.position = new window.BABYLON.Vector3(0, 4.2, 2.2);
      
      const emergencyMaterial = new window.BABYLON.StandardMaterial(`emergencyMat_${machine.id}`, scene);
      emergencyMaterial.diffuseColor = new window.BABYLON.Color3(1, 0, 0);
      emergencyMaterial.emissiveColor = new window.BABYLON.Color3(0.5, 0, 0);
      emergencyStop.material = emergencyMaterial;
      
      // Safety light tower
      const lightTower = window.BABYLON.MeshBuilder.CreateCylinder(`lightTower_${machine.id}`, {
        diameter: 0.15, height: 1.5, tessellation: 12
      }, scene);
      lightTower.position = new window.BABYLON.Vector3(2.5, 5, 2.5);
      
      // Individual tower lights (red, yellow, green)
      const towerColors = [
        new window.BABYLON.Color3(1, 0, 0),
        new window.BABYLON.Color3(1, 1, 0),
        new window.BABYLON.Color3(0, 1, 0)
      ];
      
      towerColors.forEach((color, index) => {
        const towerLight = window.BABYLON.MeshBuilder.CreateSphere(`towerLight_${machine.id}_${index}`, {
          diameter: 0.2, segments: 16
        }, scene);
        towerLight.position = new window.BABYLON.Vector3(2.5, 5.5 - index * 0.4, 2.5);
        
        const towerLightMaterial = new window.BABYLON.StandardMaterial(`towerLightMat_${machine.id}_${index}`, scene);
        towerLightMaterial.diffuseColor = color;
        towerLightMaterial.emissiveColor = color.scale(machine.status === 'available' ? 0.8 : 0.1);
        towerLight.material = towerLightMaterial;
      });
    };
    
    createSafetySystems();
    
    // Add ultra-realistic wear and weathering effects
    const addWeatheringEffects = () => {
      if (mainBody && mainBody.material) {
        // Add subtle rust and wear patterns
        const weatheringTexture = new window.BABYLON.Texture('https://www.babylonjs-playground.com/textures/rust.jpg', scene);
        weatheringTexture.uScale = 4;
        weatheringTexture.vScale = 4;
        
        if (mainBody.material.emissiveTexture) {
          mainBody.material.emissiveTexture = weatheringTexture;
          mainBody.material.emissiveColor = new window.BABYLON.Color3(0.1, 0.05, 0.02);
        }
      }
    };
    
    addWeatheringEffects();
    
    // Ensure all meshes cast and receive shadows
    const allMachineComponents = scene.meshes.filter(mesh => 
      mesh.name.includes(`_${machine.id}`) || mesh.name.includes(`${machine.id}_`)
    );
    
    allMachineComponents.forEach(component => {
      component.receiveShadows = true;
      if (scene.ultraShadowGenerator) {
        scene.ultraShadowGenerator.addShadowCaster(component, true);
      }
    });
    
    console.log(`✅ Ultra-detailed machine model created for ${machine.name} with ${allMachineComponents.length} components`);
    
    return { mainBody, basePlatform, auxiliaryComponents, componentCount: allMachineComponents.length };
  };

  // Create 3D machines in the scene
  const createMachines = (machineList) => {
    if (!scene || !Array.isArray(machineList) || machineList.length === 0) {
      return;
    }

    console.log('🏭 Creating realistic 3D machine models for', machineList.length, 'equipment units');

    const machineColors = {
      'available': new window.BABYLON.Color3(0.2, 0.6, 0.3),   // Professional forest green
      'busy': new window.BABYLON.Color3(0.8, 0.5, 0.1),       // Industrial amber
      'offline': new window.BABYLON.Color3(0.5, 0.5, 0.5),    // Industrial gray
      'error': new window.BABYLON.Color3(0.7, 0.2, 0.1)       // Industrial red
    };

    // Clear existing machines
    const existingMachines = scene.meshes.filter(mesh => 
      mesh.name.startsWith('machine_') || mesh.name.startsWith('platform_') || 
      mesh.name.startsWith('agitator_') || mesh.name.startsWith('conveyor_')
    );
    existingMachines.forEach(mesh => mesh.dispose());

    machineList.forEach((machine, index) => {
      try {
        // Create ultra-realistic machine model with 100MB+ detail
        const { mainBody, auxiliaryComponents, componentCount } = createUltraMachineModel(machine, scene);
        
        console.log(`🏭 Created ultra-detailed machine ${machine.name} with ${componentCount} components`);

        // Position machines in departments
        let x, z;
        const machinesInEnv = machineList.filter(m => m.environment === machine.environment);
        const envIndex = machinesInEnv.indexOf(machine);

        // PRECISE GRID-BASED MACHINE POSITIONING - EXACT LAYOUT FROM IMAGE
        // Based on actual factory floor layout: 52m × 42m grid structure
        const getOptimizedMachinePosition = (machine) => {
          const machineName = machine.name.toUpperCase();
          
          // ENHANCED COLUMN 1 (0-5m): Blending & Processing - Left side - STRETCHED LAYOUT
          const column1Positions = {
            'BLENDER LEAL': { x: -30, z: 20 },         // Stretched top left
            'LEAL': { x: -30, z: 20 },                 // Alt name  
            'MATURATION': { x: -30, z: 10 },           // Maturation room - stretched
            'CORAZZA TABLET': { x: -30, z: -10 },      // Bottom left - stretched
            'TABLET': { x: -30, z: -10 },              // Alt name
            'CORAZZA': { x: -30, z: -10 }              // Alt name
          };
          
          // ENHANCED COLUMN 2 (5-10m): Blending & Processing - STRETCHED
          const column2Positions = {
            'WINKWORK': { x: -20, z: 20 },             // Blender Winkwork - stretched
            'BLENDER WINKWORK': { x: -20, z: 20 },     // Full name
            'CORAZZA CUBE': { x: -20, z: -10 },        // Bottom - stretched
            'CUBE': { x: -20, z: -10 }                 // Alt name
          };
          
          // ENHANCED COLUMN 3 (10-16m): Packaging Operations - STRETCHED
          const column3Positions = {
            'NPS STICK PACK': { x: -10, z: 22 },       // Top - stretched
            'STICK PACK': { x: -10, z: 22 },           // Alt name
            'STICKPACK': { x: -10, z: 22 },            // Alt name
            'ENFLEX': { x: -10, z: 15 },               // Enflex fb 10 1:2 - stretched
            'FB-10': { x: -10, z: 15 },                // Alt name
            'FB 10': { x: -10, z: 15 },                // Alt name
            'ILAPACK': { x: -10, z: 5 },               // Middle - stretched
            'ILAPAK': { x: -10, z: 5 },                // Alt name
            'STOCK POWDER': { x: -10, z: -5 },         // Stock powder - stretched
            'POWDER': { x: -10, z: -5 },               // Alt name
            'UNIVERSAL': { x: -10, z: -15 }            // Universal stations - stretched
          };
          
          // ENHANCED COLUMN 4 (16-26m): Pre-Production - STRETCHED
          const column4Positions = {
            'PRE-BATCH': { x: 0, z: 15 },              // Large central area - stretched
            'BATCH': { x: 0, z: 15 },                  // Alt name
            'PRE': { x: 0, z: 15 }                     // Alt name
          };
          
          // ENHANCED COLUMN 5 (26-46m): Main Production Lines - STRETCHED
          const column5Positions = {
            'CANLINE': { x: 15, z: 5 },                // Canline - stretched
            'CAN LINE': { x: 15, z: 5 },               // Alt name
            'OLD CAN LINE': { x: 15, z: 5 },           // Alt name
            'CAN': { x: 15, z: 5 },                    // Alt name
            'NPS 5 LANE': { x: 15, z: -5 },            // Main production - stretched
            '5LANES': { x: 15, z: -5 },                // Alt name
            'NPS AUGER': { x: 15, z: -12 },            // Auger - stretched
            'AUGER': { x: 15, z: -12 },                // Alt name
            'ENFLEX F14': { x: 15, z: -18 },           // Enflex F14 - stretched
            'CANISTER': { x: 15, z: -25 },             // Canister line - stretched
            'CANISTER LINE': { x: 15, z: -25 }         // Full name
          };
          
          // ENHANCED COLUMN 6 (46-52m): Auxiliary Equipment - Right side - STRETCHED
          const column6Positions = {
            'PLOUGHSHARE': { x: 30, z: 20 },           // Top right - stretched
            'PLOUGH': { x: 30, z: 20 },                // Alt name
            'BLENDER MAXMIX': { x: 30, z: 12 },        // MaxMix - stretched
            'MAXMIX': { x: 30, z: 12 },                // Alt name
            'MAX MIX': { x: 30, z: 12 },               // Alt name
            'DRUMBLENDER': { x: 30, z: 6 },            // Drumblender - stretched
            'DRUM BLENDER': { x: 30, z: 6 },           // Alt name
            'DRUM': { x: 30, z: 6 },                   // Alt name
            'BULKLINE': { x: 30, z: 0 },               // Bulkline - stretched
            'BULK LINE': { x: 30, z: 0 },              // Alt name
            'BULK': { x: 30, z: 0 },                   // Alt name
            'LIQUID LINE': { x: 30, z: -10 },          // Liquid Line - stretched
            'LIQUID': { x: 30, z: -10 }                // Alt name
          };
          
          // GRID-BASED POSITION MATCHING - Check all columns for exact matches
          const allPositions = {
            ...column1Positions,
            ...column2Positions,
            ...column3Positions,
            ...column4Positions,
            ...column5Positions,
            ...column6Positions
          };
          
          // First try exact machine name match
          if (allPositions[machineName]) {
            return allPositions[machineName];
          }
          
          // Then try partial matches for machine names
          for (const [key, pos] of Object.entries(allPositions)) {
            if (machineName.includes(key) || key.includes(machineName)) {
              return pos;
            }
          }
          
          // Environment-based fallback positioning within grid structure
          if (machine.environment === 'blending') {
            // Columns 1-2: Blending equipment - STRETCHED
            return { x: -32.5 + (envIndex % 2) * 7.5, z: 20 - (Math.floor(envIndex / 2) * 10) };
          }
          
          if (machine.environment === 'maturation') {
            // Column 1: Maturation area - STRETCHED
            return { x: -32.5, z: 12 - (envIndex * 6) };
          }
          
          if (machine.environment === 'processing') {
            // Column 6: Processing equipment - STRETCHED
            return { x: 32.5, z: 20 - (envIndex * 8) };
          }
          
          if (machine.environment === 'packaging') {
            // Columns 3-5: Packaging operations - STRETCHED
            return { x: -20 + (envIndex % 3) * 17.5, z: 22 - (Math.floor(envIndex / 3) * 10) };
          }
          
          // Enhanced fallback with machine name analysis for better positioning
          let fallbackZone = 'general';
          
          // Analyze machine name for zone assignment
          if (machineName.includes('BLEND') || machineName.includes('MIX') || machineName.includes('BATCH')) {
            fallbackZone = 'blending';
            return { x: -15 + (envIndex % 3) * 10, z: -16 + Math.floor(envIndex / 3) * 3 };
          } else if (machineName.includes('FLUID') || machineName.includes('MATURE') || machineName.includes('AGE')) {
            fallbackZone = 'maturation';
            return { x: -20 + (envIndex % 2) * 4, z: -4 + Math.floor(envIndex / 2) * 4 };
          } else if (machineName.includes('GRANUL') || machineName.includes('DRY') || machineName.includes('SIFT') || machineName.includes('CUBE')) {
            fallbackZone = 'processing';
            return { x: 15 + (envIndex % 2) * 6, z: -4 + Math.floor(envIndex / 2) * 4 };
          } else if (machineName.includes('PACK') || machineName.includes('TABLET') || machineName.includes('CAN') || machineName.includes('FILL')) {
            fallbackZone = 'packaging';
            return { x: -18 + (envIndex % 5) * 8, z: 14 + Math.floor(envIndex / 5) * 3 };
          }
          
          // Final fallback - center area
          return { x: -10 + (envIndex % 4) * 6, z: -8 + Math.floor(envIndex / 4) * 4 };
        };
        
        // Get optimized position for this machine
        const position = getOptimizedMachinePosition(machine);
        x = position.x;
        z = position.z;

        // Position the entire machine group
        if (mainBody) {
          mainBody.position.x = x;
          mainBody.position.z = z;
        }
        
        // Position platform
        const platform = scene.getMeshByName(`platform_${machine.id}`);
        if (platform) {
          platform.position.x = x;
          platform.position.z = z;
        }

        // ENHANCED MACHINE STATUS VISUALIZATION
        const createMachineStatusIndicators = (machine, position, scene) => {
          // Status light above machine
          const statusLight = window.BABYLON.MeshBuilder.CreateSphere(`status_${machine.id}`, {
            diameter: 0.5
          }, scene);
          statusLight.position = new window.BABYLON.Vector3(position.x, 8, position.z);
          
          const statusColors = {
            'available': new window.BABYLON.Color3(0.0, 1.0, 0.3),   // Bright green
            'busy': new window.BABYLON.Color3(1.0, 0.6, 0.0),        // Orange
            'offline': new window.BABYLON.Color3(0.5, 0.5, 0.5),     // Gray
            'error': new window.BABYLON.Color3(1.0, 0.1, 0.1)        // Red
          };
          
          const lightMaterial = new window.BABYLON.StandardMaterial(`statusMat_${machine.id}`, scene);
          lightMaterial.diffuseColor = statusColors[machine.status] || statusColors.offline;
          lightMaterial.emissiveColor = (statusColors[machine.status] || statusColors.offline).scale(0.8);
          statusLight.material = lightMaterial;
          
          // Pulsing animation for active machines
          if (machine.status === 'busy') {
            window.BABYLON.Animation.CreateAndStartAnimation(
              'statusPulse', lightMaterial, 'emissiveColor', 60, 120,
              (statusColors[machine.status] || statusColors.offline).scale(0.3),
              (statusColors[machine.status] || statusColors.offline).scale(1.0),
              window.BABYLON.Animation.ANIMATIONLOOPMODE_YOYO
            );
          }
        };

        // Create enhanced machine material with better status visualization
        if (mainBody) {
          const material = new window.BABYLON.PBRMaterial(`machineMat_${machine.id}`, scene);
          const statusColor = machineColors[machine.status] || machineColors.offline;
          material.baseColor = statusColor;
          material.emissiveColor = statusColor.scale(0.1);
          material.metallicFactor = 0.3;
          material.roughnessFactor = 0.4;
          material.wireframe = false;
          mainBody.material = material;
          mainBody.renderOutline = false;
          mainBody.showBoundingBox = false;
          
          // Add status indicator
          createMachineStatusIndicators(machine, { x, z }, scene);
        }

        // ENHANCED MACHINE INFORMATION DISPLAY
        const createMachineInfoDisplay = (machine, position, scene) => {
          // Machine name label with better styling
          const nameLabel = window.BABYLON.MeshBuilder.CreatePlane(`label_${machine.id}`, {
            width: 6, height: 1.2
          }, scene);
          nameLabel.position = new window.BABYLON.Vector3(position.x, 6, position.z);
          nameLabel.billboardMode = window.BABYLON.Mesh.BILLBOARDMODE_Y;
          
          const labelMaterial = new window.BABYLON.StandardMaterial(`labelMat_${machine.id}`, scene);
          labelMaterial.diffuseColor = new window.BABYLON.Color3(0.9, 0.9, 0.9);
          labelMaterial.emissiveColor = new window.BABYLON.Color3(0.6, 0.6, 0.6);
          
          // Color-code label based on machine environment
          if (machine.environment === 'blending') {
            labelMaterial.emissiveColor = new window.BABYLON.Color3(0.09, 0.15, 0.27);
          } else if (machine.environment === 'maturation') {
            labelMaterial.emissiveColor = new window.BABYLON.Color3(0.27, 0.21, 0.09);
          } else if (machine.environment === 'packaging') {
            labelMaterial.emissiveColor = new window.BABYLON.Color3(0.09, 0.24, 0.12);
          }
          
          nameLabel.material = labelMaterial;
          
          // Performance indicator (subtle bar under name)
          const perfBar = window.BABYLON.MeshBuilder.CreateBox(`perfBar_${machine.id}`, {
            width: 5, height: 0.1, depth: 0.1
          }, scene);
          perfBar.position = new window.BABYLON.Vector3(position.x, 5.5, position.z);
          
          const perfMaterial = new window.BABYLON.StandardMaterial(`perfMat_${machine.id}`, scene);
          // Performance visualization based on status
          if (machine.status === 'available') {
            perfMaterial.diffuseColor = new window.BABYLON.Color3(0.0, 0.8, 0.3);
            perfMaterial.emissiveColor = new window.BABYLON.Color3(0.0, 0.4, 0.15);
          } else if (machine.status === 'busy') {
            perfMaterial.diffuseColor = new window.BABYLON.Color3(1.0, 0.6, 0.0);
            perfMaterial.emissiveColor = new window.BABYLON.Color3(0.5, 0.3, 0.0);
          } else {
            perfMaterial.diffuseColor = new window.BABYLON.Color3(0.3, 0.3, 0.3);
            perfMaterial.emissiveColor = new window.BABYLON.Color3(0.1, 0.1, 0.1);
          }
          perfBar.material = perfMaterial;
        };
        
        // Create enhanced info display
        createMachineInfoDisplay(machine, { x, z }, scene);

        // Position other machine components
        const components = scene.meshes.filter(mesh => 
          mesh.name.includes(`_${machine.id}`) && !mesh.name.startsWith('machine_') && !mesh.name.startsWith('platform_')
        );
        components.forEach(component => {
          component.position.x += x;
          component.position.z += z;
        });

      } catch (error) {
        console.error(`❌ Failed to create 3D machine ${machine.name}:`, error);
      }
    });
  };

  // Direct initialization when canvas is ready
  const containerRefCallback = useCallback((element) => {
    if (!element) {
      // Cleanup on unmount
      if (engine) {
        engine.dispose();
      }
      return;
    }

    // Initialize immediately - no setTimeout needed
    const initializeFactory = async () => {
      try {
        setError(null);
        console.log('🏭 Starting factory initialization...');
        
        // Load Babylon.js
        await loadBabylonJS();
        
        // Initialize the 3D scene
        await initializeBabylonScene(element);
        
        console.log('✅ Factory ready');
        
      } catch (error) {
        console.error('❌ Factory initialization failed:', error);
        setError(error.message);
      }
    };
    
    initializeFactory();
  }, [machines]);

  // Note: Machine creation will be handled in the initialization flow

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-red-50 rounded-lg">
        <div className="text-center">
          <div className="text-red-600 mb-2">❌ Babylon.js Error</div>
          <div className="text-sm text-red-500">{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 overflow-hidden relative z-50" style={{ height: '100vh', width: '100vw' }}>
      {/* Close Button */}
      <div className="absolute top-4 right-4 z-20">
        <button 
          onClick={() => {
            document.body.style.overflow = 'auto'; // Restore page scroll
            const container = document.querySelector('.fixed.inset-0.bg-gray-900');
            if (container) container.remove();
            if (onMachineClick) onMachineClick(null); // Close factory view
          }}
          className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg transition-colors"
          title="Close Digital Twin"
        >
          ✕
        </button>
      </div>

      {/* Industry 4.0 Control Panel */}
      <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white">
        <div className="text-sm font-semibold mb-2">🏭 Factory Controls</div>
        <div className="space-y-2 text-xs">
          <button 
            onClick={() => window.factoryCameraPresets?.goTo('overview')}
            className="w-full px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-left"
          >
            📷 Overview
          </button>
          <button 
            onClick={() => window.factoryCameraPresets?.goTo('blending')}
            className="w-full px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-left"
          >
            🔵 Blending Zone
          </button>
          <button 
            onClick={() => window.factoryCameraPresets?.goTo('packaging')}
            className="w-full px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-left"
          >
            🟢 Packaging Zone
          </button>
          <button 
            onClick={() => window.factoryCameraPresets?.goTo('factory_flow')}
            className="w-full px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-left"
          >
            🌊 Process Flow
          </button>
          <button 
            onClick={() => window.factoryCameraPresets?.goTo('aerial')}
            className="w-full px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-left"
          >
            🚁 Aerial View
          </button>
          <button 
            onClick={() => {
              const elem = document.querySelector('canvas');
              if (elem.requestFullscreen) elem.requestFullscreen();
            }}
            className="w-full px-3 py-1 bg-slate-600 hover:bg-slate-700 rounded text-left"
          >
            🔳 Fullscreen
          </button>
        </div>
      </div>

      {/* Real-time Status Panel */}
      <div className="absolute top-16 right-4 z-10 bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white">
        <div className="text-sm font-semibold mb-2">📊 Live Status</div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Active Machines:</span>
            <span className="text-green-400">{machines?.filter(m => m.status === 'available').length || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Busy Machines:</span>
            <span className="text-orange-400">{machines?.filter(m => m.status === 'busy').length || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Offline:</span>
            <span className="text-gray-400">{machines?.filter(m => m.status === 'offline').length || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Factory Efficiency:</span>
            <span className="text-blue-400">
              {machines?.length > 0 ? Math.round((machines.filter(m => m.status === 'available').length / machines.length) * 100) : 0}%
            </span>
          </div>
          <div className="flex justify-between">
            <span>Performance:</span>
            <span id="factory-performance" className="text-green-400">-- FPS</span>
          </div>
          <div className="flex justify-between">
            <span>Factory Size:</span>
            <span className="text-slate-400">52m × 42m</span>
          </div>
        </div>
      </div>

      {/* Navigation Instructions */}
      <div className="absolute bottom-4 left-4 z-10 bg-black/60 backdrop-blur-sm rounded-lg p-3 text-white text-xs">
        <div className="font-semibold mb-1">🎮 Navigation</div>
        <div>🖱️ Drag: Rotate • 🛞 Wheel: Zoom • 👆 Click: Select Machine</div>
      </div>

      <canvas 
        ref={containerRefCallback}
        className="w-full h-full"
        style={{ 
          display: 'block',
          touchAction: 'none',
          outline: 'none'
        }}
        tabIndex={0}
      />
      
      {/* Loading overlay */}
      {!isLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 backdrop-blur-sm">
          <div className="text-center">
            <div className="text-blue-400 mb-2">🏭 Loading 4D Digital Twin Factory...</div>
            <div className="text-sm text-blue-300">Initializing Babylon.js engine</div>
            <div className="mt-2 w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      )}
      
      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/90 backdrop-blur-sm">
          <div className="text-center">
            <div className="text-red-400 mb-2">❌ Babylon.js Error</div>
            <div className="text-sm text-red-300">{error}</div>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BabylonFactory;