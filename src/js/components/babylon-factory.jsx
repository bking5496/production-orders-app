import React, { useState, useCallback } from 'react';

const BabylonFactory = ({ machines = [], environments = [], onMachineClick }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMachine, setSelectedMachine] = useState(null);
  
  let scene = null;
  let engine = null;

  // Direct Babylon.js loading - simple and reliable
  const loadBabylonJS = async () => {
    // Check if already loaded
    if (window.BABYLON && window.BABYLON.Engine && window.BABYLON.Scene && window.BABYLON.ArcRotateCamera) {
      console.log('✅ Babylon.js already available');
      return true;
    }

    console.log('📦 Loading Babylon.js from CDN...');
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.babylonjs.com/babylon.js';
      script.async = false; // Load synchronously to avoid race conditions
      
      script.onload = () => {
        // Simple check after load
        if (window.BABYLON && window.BABYLON.Engine) {
          console.log('✅ Babylon.js loaded successfully');
          resolve(true);
        } else {
          reject(new Error('Babylon.js objects not available after load'));
        }
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Babylon.js from CDN'));
      };
      
      document.head.appendChild(script);
    });
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

      // Create optimized Babylon engine for MAXIMUM performance and visual quality
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
        adaptToDeviceRatio: true // Better display scaling for high-DPI screens
      });
      
      // Enable performance optimizations
      engine.enableOfflineSupport = false;
      engine.doNotHandleContextLost = true;

      // Create optimized scene
      scene = new window.BABYLON.Scene(engine);
      
      console.log('✅ Engine and scene created successfully');
      
      // Performance optimizations for smooth 3D interaction
      scene.performancePriority = window.BABYLON.ScenePerformancePriority.Intermediate;
      scene.skipPointerMovePicking = true;
      scene.autoClear = true;
      scene.autoClearDepthAndStencil = true;
      
      // Optimize rendering
      scene.blockMaterialDirtyMechanism = true;
      
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

      // Setup enhanced camera system for 52m × 42m factory floor - FULL CANVAS UTILIZATION
      console.log('🎥 Creating enhanced ArcRotate camera for full canvas coverage...');
      const camera = new window.BABYLON.ArcRotateCamera(
        'factoryCamera', 
        -Math.PI / 4,  // Better angle for full factory view
        Math.PI / 2.5, // Optimized elevation for 52m × 42m coverage
        120,           // Increased distance for full factory visibility
        new window.BABYLON.Vector3(0, 0, 0), // Center of factory floor
        scene
      );
      
      console.log('🎥 Camera created:', camera.constructor.name);
      
      // Enhanced camera limits for professional factory navigation - FULL CANVAS COVERAGE
      camera.lowerBetaLimit = 0.1;           // Prevent going too low
      camera.upperBetaLimit = Math.PI / 2.1; // Prevent going too high
      camera.lowerRadiusLimit = 30;          // Minimum zoom for detail view
      camera.upperRadiusLimit = 350;         // Maximum zoom for full factory overview
      
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
          event.preventDefault();
          const delta = event.deltaY * 0.1;
          camera.radius += delta;
          camera.radius = Math.max(camera.lowerRadiusLimit || 10, 
                                  Math.min(camera.upperRadiusLimit || 500, camera.radius));
        };
        
        // Attach manual event listeners
        canvas.addEventListener('pointerdown', handlePointerDown);
        canvas.addEventListener('pointermove', handlePointerMove);
        canvas.addEventListener('pointerup', handlePointerUp);
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        
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

      // Enhanced lighting system for professional factory visualization
      const createEnhancedLighting = (scene) => {
        // Primary ambient light for overall illumination
        const ambientLight = new window.BABYLON.HemisphericLight(
          'ambientLight', 
          new window.BABYLON.Vector3(0, 1, 0), 
          scene
        );
        ambientLight.intensity = 0.4;
        ambientLight.diffuse = new window.BABYLON.Color3(0.8, 0.9, 1.0);
        
        // Main directional light simulating overhead factory lighting
        const mainLight = new window.BABYLON.DirectionalLight(
          'mainFactoryLight', 
          new window.BABYLON.Vector3(-0.5, -1, 0.3), 
          scene
        );
        mainLight.intensity = 1.2;
        mainLight.diffuse = new window.BABYLON.Color3(1.0, 0.95, 0.9);
        mainLight.specular = new window.BABYLON.Color3(0.8, 0.8, 0.8);
        
        // Secondary fill light for better depth perception
        const fillLight = new window.BABYLON.DirectionalLight(
          'fillLight', 
          new window.BABYLON.Vector3(0.5, -0.8, -0.3), 
          scene
        );
        fillLight.intensity = 0.6;
        fillLight.diffuse = new window.BABYLON.Color3(0.9, 0.95, 1.0);
        
        // Industrial accent lighting for zone highlights
        const accentLight = new window.BABYLON.SpotLight(
          'accentLight',
          new window.BABYLON.Vector3(0, 15, 0),
          new window.BABYLON.Vector3(0, -1, 0),
          Math.PI / 3,
          2,
          scene
        );
        accentLight.intensity = 0.8;
        accentLight.diffuse = new window.BABYLON.Color3(1.0, 0.9, 0.7);
        
        console.log('✅ Enhanced industrial lighting system initialized');
      };
      
      
      // Initialize enhanced lighting system
      createEnhancedLighting(scene);
      
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

      // ENHANCED FACTORY FLOOR WITH PROFESSIONAL INDUSTRIAL DESIGN
      // Factory dimensions from layout: 52m width x 42m height
      // Grid: 5m + 5m + 6m + 10m + 20m + 6m = 52m width
      // Heights: 5m + 6m + 14m + 8m + various = 42m height
      
      const factoryWidth = 52;  // Total factory width
      const factoryHeight = 42; // Total factory height  
      const wallHeight = 6;
      const wallThickness = 0.3;

      // Simple floor creation
      const createSimpleFloor = (name, dimensions, position, color, scene) => {
        const floor = window.BABYLON.MeshBuilder.CreateGround(name, dimensions, scene);
        floor.position = position;
        
        const material = new window.BABYLON.StandardMaterial(`${name}Material`, scene);
        material.diffuseColor = color;
        material.wireframe = false;
        floor.material = material;
        floor.renderOutline = false;
        floor.showBoundingBox = false;
        
        return floor;
      };

      // Create main factory floor
      const factoryFloor = createSimpleFloor('factoryFloor',
        { width: factoryWidth, height: factoryHeight },
        new window.BABYLON.Vector3(0, 0, 0),
        new window.BABYLON.Color3(0.18, 0.22, 0.25), // Industrial concrete
        scene
      );

      // Create zone floor sections based on ACTUAL GRID LAYOUT - PROFESSIONAL INDUSTRIAL COLORS
      // COLUMNS 1-2: Blending & Processing (0-10m) - Industrial Steel Blue
      const blendingFloor = createSimpleFloor('blendingFloor',
        { width: 10, height: factoryHeight }, // Columns 1-2 width
        new window.BABYLON.Vector3(-21, 0.02, 0), // Left side positioning
        new window.BABYLON.Color3(0.3, 0.35, 0.4), // Industrial steel blue
        scene
      );

      // COLUMN 3: Packaging Operations (10-16m) - Safety Green  
      const packagingFloor1 = createSimpleFloor('packagingFloor1',
        { width: 6, height: factoryHeight }, // Column 3 width
        new window.BABYLON.Vector3(-13, 0.02, 0), // Column 3 positioning
        new window.BABYLON.Color3(0.25, 0.4, 0.25), // Professional safety green
        scene
      );

      // COLUMN 4: Pre-Production (16-26m) - Industrial Gray
      const preProductionFloor = createSimpleFloor('preProductionFloor',
        { width: 10, height: factoryHeight }, // Column 4 width
        new window.BABYLON.Vector3(-5, 0.02, 0), // Column 4 positioning
        new window.BABYLON.Color3(0.35, 0.35, 0.35), // Industrial gray
        scene
      );

      // COLUMN 5: Main Production Lines (26-46m) - Machine Gray
      const mainProductionFloor = createSimpleFloor('mainProductionFloor',
        { width: 20, height: factoryHeight }, // Column 5 width
        new window.BABYLON.Vector3(10, 0.02, 0), // Column 5 positioning
        new window.BABYLON.Color3(0.28, 0.3, 0.32), // Professional machine gray
        scene
      );

      // COLUMN 6: Auxiliary Equipment (46-52m) - Industrial Bronze
      const auxiliaryFloor = createSimpleFloor('auxiliaryFloor',
        { width: 6, height: factoryHeight }, // Column 6 width
        new window.BABYLON.Vector3(23, 0.02, 0), // Column 6 positioning
        new window.BABYLON.Color3(0.4, 0.35, 0.3), // Industrial bronze
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

      // FACTORY PERIMETER WALLS (simplified and more subtle)
      const createFactoryWalls = (scene) => {
        const walls = [
          // Factory perimeter walls - more subtle
          { name: 'factoryNorth', pos: [0, wallHeight/2, -factoryHeight/2], size: [factoryWidth, wallHeight, wallThickness] },
          { name: 'factorySouth', pos: [0, wallHeight/2, factoryHeight/2], size: [factoryWidth, wallHeight, wallThickness] },
          { name: 'factoryWest', pos: [-factoryWidth/2, wallHeight/2, 0], size: [wallThickness, wallHeight, factoryHeight] },
          { name: 'factoryEast', pos: [factoryWidth/2, wallHeight/2, 0], size: [wallThickness, wallHeight, factoryHeight] }
        ];

        // Create subtle wall material
        const wallMaterial = new window.BABYLON.StandardMaterial('wallMaterial', scene);
        wallMaterial.diffuseColor = new window.BABYLON.Color3(0.5, 0.5, 0.5);
        wallMaterial.alpha = 0.2; // Very subtle

        // Build perimeter walls
        walls.forEach(wall => {
          const wallMesh = window.BABYLON.MeshBuilder.CreateBox(wall.name, {
            width: wall.size[0], height: wall.size[1], depth: wall.size[2]
          }, scene);
          wallMesh.position = new window.BABYLON.Vector3(...wall.pos);
          wallMesh.material = wallMaterial;
        });
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

      // Initialize all visual enhancements
      createZoneBoundaries(scene);
      createProcessFlow(scene);
      createFactoryWalls(scene);
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

  // Create realistic 3D machine models based on machine names
  const createMachineModel = (machine, scene) => {
    const machineName = machine.name.toLowerCase();
    
    // Create base platform for all machines
    const basePlatform = window.BABYLON.MeshBuilder.CreateBox(`platform_${machine.id}`, {
      width: 5, height: 0.3, depth: 4
    }, scene);
    basePlatform.position.y = 0.15;
    
    const platformMaterial = new window.BABYLON.StandardMaterial(`platformMat_${machine.id}`, scene);
    platformMaterial.diffuseColor = new window.BABYLON.Color3(0.3, 0.3, 0.3);
    basePlatform.material = platformMaterial;
    
    let mainBody = null;
    
    if (machineName.includes('blender') || machineName.includes('mixer')) {
      // Blending machine - cylindrical tank with agitator
      mainBody = window.BABYLON.MeshBuilder.CreateCylinder(`machine_${machine.id}`, {
        diameter: 3, height: 4, tessellation: 16
      }, scene);
      mainBody.position.y = 2.3;
      
      // Add agitator shaft on top
      const agitator = window.BABYLON.MeshBuilder.CreateCylinder(`agitator_${machine.id}`, {
        diameter: 0.2, height: 1, tessellation: 8
      }, scene);
      agitator.position.y = 5;
      
      // Rotating agitator animation for active machines
      if (machine.status === 'available') {
        window.BABYLON.Animation.CreateAndStartAnimation(
          'agitatorRotation', agitator, 'rotation.y', 60, 360, 0, Math.PI * 2,
          window.BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
      }
      
    } else if (machineName.includes('tablet') || machineName.includes('press')) {
      // Tablet press - rectangular with compression mechanism
      mainBody = window.BABYLON.MeshBuilder.CreateBox(`machine_${machine.id}`, {
        width: 4, height: 3, depth: 2.5
      }, scene);
      mainBody.position.y = 1.8;
      
      // Add compression head
      const compressHead = window.BABYLON.MeshBuilder.CreateBox(`compressHead_${machine.id}`, {
        width: 3, height: 0.5, depth: 2
      }, scene);
      compressHead.position.y = 3.5;
      
      // Compression animation for active machines
      if (machine.status === 'available') {
        window.BABYLON.Animation.CreateAndStartAnimation(
          'compressionMove', compressHead, 'position.y', 30, 60, 3.5, 3.2,
          window.BABYLON.Animation.ANIMATIONLOOPMODE_YOYO
        );
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
      // Default machine - generic industrial equipment
      mainBody = window.BABYLON.MeshBuilder.CreateBox(`machine_${machine.id}`, {
        width: 3, height: 2.5, depth: 2.5
      }, scene);
      mainBody.position.y = 1.55;
      
      // Add control panel
      const controlPanel = window.BABYLON.MeshBuilder.CreateBox(`panel_${machine.id}`, {
        width: 1.5, height: 1, depth: 0.2
      }, scene);
      controlPanel.position.y = 3;
      controlPanel.position.z = 1.4;
    }
    
    return { mainBody, basePlatform };
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
        // Create realistic machine model based on name
        const { mainBody } = createMachineModel(machine, scene);

        // Position machines in departments
        let x, z;
        const machinesInEnv = machineList.filter(m => m.environment === machine.environment);
        const envIndex = machinesInEnv.indexOf(machine);

        // PRECISE GRID-BASED MACHINE POSITIONING - EXACT LAYOUT FROM IMAGE
        // Based on actual factory floor layout: 52m × 42m grid structure
        const getOptimizedMachinePosition = (machine) => {
          const machineName = machine.name.toUpperCase();
          
          // COLUMN 1 (0-5m): Blending & Processing - Left side
          const column1Positions = {
            'BLENDER LEAL': { x: -23.5, z: 16.5 },     // Top left (2.5m, 2.5m)
            'LEAL': { x: -23.5, z: 16.5 },             // Alt name
            'MATURATION': { x: -23.5, z: 9 },          // Maturation room (2.5m, 9m)
            'CORAZZA TABLET': { x: -23.5, z: -7 },     // Bottom left (2.5m, -7m)
            'TABLET': { x: -23.5, z: -7 },             // Alt name
            'CORAZZA': { x: -23.5, z: -7 }             // Alt name
          };
          
          // COLUMN 2 (5-10m): Blending & Processing
          const column2Positions = {
            'WINKWORK': { x: -18.5, z: 16.5 },         // Blender Winkwork (7.5m, 2.5m)
            'BLENDER WINKWORK': { x: -18.5, z: 16.5 }, // Full name
            'CORAZZA CUBE': { x: -18.5, z: -7 },       // Bottom (7.5m, -7m)
            'CUBE': { x: -18.5, z: -7 }                // Alt name
          };
          
          // COLUMN 3 (10-16m): Packaging Operations
          const column3Positions = {
            'NPS STICK PACK': { x: -13, z: 16.5 },     // Top (13m, 2.5m)
            'STICK PACK': { x: -13, z: 16.5 },         // Alt name
            'STICKPACK': { x: -13, z: 16.5 },          // Alt name
            'ENFLEX': { x: -13, z: 12 },               // Enflex fb 10 1:2 (13m, 12m)
            'FB-10': { x: -13, z: 12 },                // Alt name
            'FB 10': { x: -13, z: 12 },                // Alt name
            'ILAPACK': { x: -13, z: 2 },               // Middle (13m, 2m)
            'ILAPAK': { x: -13, z: 2 },                // Alt name
            'STOCK POWDER': { x: -13, z: -2 },         // Stock powder (13m, -2m)
            'POWDER': { x: -13, z: -2 },               // Alt name
            'UNIVERSAL': { x: -13, z: -12 }            // Universal stations (13m, -12m)
          };
          
          // COLUMN 4 (16-26m): Pre-Production
          const column4Positions = {
            'PRE-BATCH': { x: -5, z: 12 },             // Large central area (21m, 12m)
            'BATCH': { x: -5, z: 12 },                 // Alt name
            'PRE': { x: -5, z: 12 }                    // Alt name
          };
          
          // COLUMN 5 (26-46m): Main Production Lines
          const column5Positions = {
            'CANLINE': { x: 10, z: 2 },                // Canline (36m, 2m)
            'CAN LINE': { x: 10, z: 2 },               // Alt name
            'OLD CAN LINE': { x: 10, z: 2 },           // Alt name
            'CAN': { x: 10, z: 2 },                    // Alt name
            'NPS 5 LANE': { x: 10, z: -8 },            // Main production (36m, -8m)
            '5LANES': { x: 10, z: -8 },                // Alt name
            'NPS AUGER': { x: 10, z: -12 },            // Auger (36m, -12m)
            'AUGER': { x: 10, z: -12 },                // Alt name
            'ENFLEX F14': { x: 10, z: -16 },           // Enflex F14 (36m, -16m)
            'CANISTER': { x: 10, z: -20 },             // Canister line (36m, -20m)
            'CANISTER LINE': { x: 10, z: -20 }         // Full name
          };
          
          // COLUMN 6 (46-52m): Auxiliary Equipment - Right side
          const column6Positions = {
            'PLOUGHSHARE': { x: 23.5, z: 16.5 },       // Top right (49m, 2.5m)
            'PLOUGH': { x: 23.5, z: 16.5 },            // Alt name
            'BLENDER MAXMIX': { x: 23.5, z: 10 },      // MaxMix (49m, 10m)
            'MAXMIX': { x: 23.5, z: 10 },              // Alt name
            'MAX MIX': { x: 23.5, z: 10 },             // Alt name
            'DRUMBLENDER': { x: 23.5, z: 5.5 },        // Drumblender (49m, 5.5m)
            'DRUM BLENDER': { x: 23.5, z: 5.5 },       // Alt name
            'DRUM': { x: 23.5, z: 5.5 },               // Alt name
            'BULKLINE': { x: 23.5, z: 0 },             // Bulkline (49m, 0m)
            'BULK LINE': { x: 23.5, z: 0 },            // Alt name
            'BULK': { x: 23.5, z: 0 },                 // Alt name
            'LIQUID LINE': { x: 23.5, z: -8 },         // Liquid Line (49m, -8m)
            'LIQUID': { x: 23.5, z: -8 }               // Alt name
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
            // Columns 1-2: Blending equipment
            return { x: -23.5 + (envIndex % 2) * 5, z: 16.5 - (Math.floor(envIndex / 2) * 8) };
          }
          
          if (machine.environment === 'maturation') {
            // Column 1: Maturation area
            return { x: -23.5, z: 9 - (envIndex * 4) };
          }
          
          if (machine.environment === 'processing') {
            // Column 6: Processing equipment
            return { x: 23.5, z: 16.5 - (envIndex * 6) };
          }
          
          if (machine.environment === 'packaging') {
            // Columns 3-5: Packaging operations
            return { x: -13 + (envIndex % 3) * 11.5, z: 16.5 - (Math.floor(envIndex / 3) * 8) };
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
    <div className="w-full bg-gray-900 rounded-lg overflow-hidden relative" style={{ height: 'calc(100vh - 120px)' }}>
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
            className="w-full px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-left"
          >
            🔳 Fullscreen
          </button>
        </div>
      </div>

      {/* Real-time Status Panel */}
      <div className="absolute top-4 right-4 z-10 bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white">
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
            <span className="text-purple-400">52m × 42m</span>
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