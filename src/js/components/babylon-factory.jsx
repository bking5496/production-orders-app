import React, { useState, useCallback } from 'react';

const BabylonFactory = ({ machines = [], environments = [], onMachineClick }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMachine, setSelectedMachine] = useState(null);
  
  let scene = null;
  let engine = null;

  // Load Babylon.js dynamically
  const loadBabylonJS = async () => {
    try {
      if (typeof window.BABYLON !== 'undefined' && window.BABYLON.ArcRotateCamera) {
        console.log('✅ Babylon.js already loaded');
        return true;
      }

      console.log('📦 Loading Babylon.js libraries...');
      
      const babylonScript = document.createElement('script');
      babylonScript.src = 'https://cdn.babylonjs.com/babylon.js';
      
      await new Promise((resolve, reject) => {
        babylonScript.onload = () => {
          console.log('✅ Babylon.js core loaded');
          // Verify essential classes are available
          if (window.BABYLON && window.BABYLON.Engine && window.BABYLON.Scene && window.BABYLON.ArcRotateCamera) {
            resolve();
          } else {
            reject(new Error('Babylon.js core classes not available'));
          }
        };
        babylonScript.onerror = () => reject(new Error('Failed to load Babylon.js core'));
        document.head.appendChild(babylonScript);
      });

      // Small delay to ensure everything is initialized
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('✅ Babylon.js fully ready');
      return true;
    } catch (error) {
      console.error('❌ Failed to load Babylon.js:', error);
      throw error;
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

      // Create Babylon engine directly with canvas
      engine = new window.BABYLON.Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
        antialias: true
      });

      // Create scene
      scene = new window.BABYLON.Scene(engine);
      
      console.log('✅ Engine and scene created successfully');
      
      // Disable debug rendering and random lines completely
      scene.forceWireframe = false;
      scene.forcePointsCloud = false;
      
      // Global setting to prevent any debug/wireframe rendering
      if (scene.getMeshes) {
        scene.onNewMeshAddedObservable.add((mesh) => {
          if (mesh) {
            mesh.renderOutline = false;
            mesh.showBoundingBox = false;
            if (mesh.material) {
              mesh.material.wireframe = false;
            }
          }
        });
      }

      // Setup camera for 52m × 42m factory floor
      console.log('🎥 Creating camera...');
      const camera = new window.BABYLON.ArcRotateCamera(
        'camera', 
        -Math.PI / 2,  // Start looking from the side
        Math.PI / 3,   // Angled down view
        80,            // Closer distance for 52m factory
        new window.BABYLON.Vector3(0, 0, 0), // Center of factory floor
        scene
      );
      
      console.log('🎥 Camera created:', camera.constructor.name);
      
      // Set camera limits for better control
      camera.lowerBetaLimit = 0.1;
      camera.upperBetaLimit = Math.PI / 2.2;
      camera.lowerRadiusLimit = 20;
      camera.upperRadiusLimit = 200;
      
      // Attach camera controls with proper error checking
      if (camera && typeof camera.attachControls === 'function') {
        camera.attachControls(canvas, true);
        console.log('🎥 Camera controls attached successfully');
        
        // Ensure camera is active
        scene.activeCamera = camera;
        
        // Set wheel precision for better zooming
        camera.wheelPrecision = 50;
        camera.angularSensibilityX = 2000;
        camera.angularSensibilityY = 2000;
      } else {
        console.warn('⚠️ Camera attachControls method not available, using basic controls');
        scene.activeCamera = camera;
      }

      // Simplified lighting system
      const createBasicLighting = (scene) => {
        const light = new window.BABYLON.HemisphericLight(
          'light', 
          new window.BABYLON.Vector3(0, 1, 0), 
          scene
        );
        light.intensity = 0.6;
        
        const dirLight = new window.BABYLON.DirectionalLight(
          'dirLight', 
          new window.BABYLON.Vector3(-1, -1, 1), 
          scene
        );
        dirLight.intensity = 1.0;
        dirLight.diffuse = new window.BABYLON.Color3(0.4, 0.6, 1.0);
      };
      
      // Initialize basic lighting
      createBasicLighting(scene);

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

      // Create zone floor sections with color coding
      // BLENDING area floor section (top section) - Blue tint
      const blendingFloor = createSimpleFloor('blendingFloor',
        { width: factoryWidth, height: 11 }, // 5m + 6m sections
        new window.BABYLON.Vector3(0, 0.02, -15.5), // Slightly elevated
        new window.BABYLON.Color3(0.2, 0.4, 0.8), // Safety blue
        scene
      );

      // MATURATION area floor section (left center) - Amber tint
      const maturationFloor = createSimpleFloor('maturationFloor',
        { width: 16, height: 14 }, // Left portion of 14m section
        new window.BABYLON.Vector3(-18, 0.02, -3), // Left center
        new window.BABYLON.Color3(0.8, 0.6, 0.2), // Warm amber
        scene
      );

      // PACKAGING area floor section (bottom section) - Green tint
      const packagingFloor = createSimpleFloor('packagingFloor',
        { width: factoryWidth, height: 8 }, // Bottom 8m section
        new window.BABYLON.Vector3(0, 0.02, 17), // Bottom section
        new window.BABYLON.Color3(0.2, 0.7, 0.3), // Fresh green
        scene
      );

      // ENHANCED ZONE BOUNDARY SYSTEM
      const createZoneBoundaries = (scene) => {
        const boundaries = [
          {
            name: 'BLENDING ZONE',
            position: new window.BABYLON.Vector3(0, 0.1, -10),
            size: { width: 50, height: 0.2, depth: 2 },
            color: '#2563EB'
          },
          {
            name: 'MATURATION ZONE', 
            position: new window.BABYLON.Vector3(-10, 0.1, 4),
            size: { width: 2, height: 0.2, depth: 14 },
            color: '#D97706'
          },
          {
            name: 'PACKAGING ZONE',
            position: new window.BABYLON.Vector3(0, 0.1, 13),
            size: { width: 50, height: 0.2, depth: 2 },
            color: '#059669'
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

      // ZONE INFORMATION PANELS
      const createZoneInformationPanels = (scene) => {
        const zoneInfo = [
          {
            name: 'BLENDING ZONE',
            position: new window.BABYLON.Vector3(-25, 3, -15),
            color: '#2563EB',
            description: 'Raw Material Processing',
            processes: ['Material Receipt', 'Primary Blending', 'Batch Preparation']
          },
          {
            name: 'MATURATION ZONE',
            position: new window.BABYLON.Vector3(-25, 3, -2),
            color: '#D97706',
            description: 'Product Development',
            processes: ['Fluid Bed Processing', 'Aging & Development']
          },
          {
            name: 'PACKAGING ZONE',
            position: new window.BABYLON.Vector3(-25, 3, 15),
            color: '#059669',
            description: 'Final Product Processing',
            processes: ['Tablet Formation', 'Flexible Packaging', 'Container Filling']
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

      // Start render loop
      engine.runRenderLoop(() => {
        if (scene) {
          scene.render();
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
      'available': new window.BABYLON.Color3(0.0, 0.8, 0.4),
      'busy': new window.BABYLON.Color3(1.0, 0.6, 0.0),
      'offline': new window.BABYLON.Color3(0.6, 0.6, 0.6),
      'error': new window.BABYLON.Color3(1.0, 0.2, 0.2)
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

        // WORKFLOW-OPTIMIZED MACHINE POSITIONING
        // Based on manufacturing process flow: Raw Materials → Processing → Final Products
        const getOptimizedMachinePosition = (machine) => {
          const machineName = machine.name.toUpperCase();
          
          // BLENDING ZONE - Raw material input and primary processing (top section)
          const blendingPositions = {
            'BLENDING': { x: -22, z: -18 },           // Raw material receipt
            'PLOUGH BLENDER': { x: -8, z: -16 },     // Primary blending
            'PLOUGHSHARE': { x: -8, z: -16 },        // Primary blending alt name
            'PRE-BATCH': { x: 8, z: -16 },           // Batch preparation
            '1000L BLENDER': { x: 18, z: -12 },      // Large batch blending
            'MAXMIX': { x: 18, z: -12 },             // Large batch blending alt name
            '1500L BLENDER': { x: 18, z: -8 },       // Industrial blending
            'WINKWORK': { x: 18, z: -8 }             // Industrial blending alt name
          };
          
          // MATURATION ZONE - Process development and aging (left center)
          const maturationPositions = {
            'FB-10': { x: -22, z: -2 },              // Fluid bed processing
            'FB 10': { x: -22, z: -2 },              // Fluid bed processing alt
            'MATURATION': { x: -18, z: 2 }           // Aging/development
          };
          
          // PACKAGING ZONE - Final product processing by type
          const packagingPositions = {
            // Solid product processing
            'TABLETS': { x: -22, z: 16 },            // Tablet formation
            'CUBES': { x: -12, z: 16 },              // Cube cutting
            'STOCK POWDER': { x: -2, z: 16 },        // Powder finishing
            'POWDER': { x: -2, z: 16 },              // Powder finishing alt
            
            // Flexible packaging lines
            'STICKPACK': { x: -18, z: -6 },          // Stick pack filling
            'STICK PACK': { x: -18, z: -6 },         // Stick pack alt name
            'ILAPACK': { x: -18, z: 2 },             // ILA packaging
            'ILAPAK': { x: -18, z: 2 },              // ILA packaging alt
            'UNIVERSAL': { x: -18, z: 14 },          // Universal packaging
            
            // Container and can lines
            'OLD CAN LINE': { x: 8, z: 16 },         // Legacy can line
            'CANLINE': { x: 8, z: 16 },              // Can line alt name
            '5LANES': { x: 18, z: 12 },              // Multi-lane filling
            'AUGER': { x: 20, z: 8 },                // Auger filling
            'ENFLEX': { x: 22, z: 4 },               // Flexible packaging
            'CANS': { x: 22, z: 16 },                // Can finishing
            
            // Bulk processing
            'BULK': { x: -2, z: 6 }                  // Bulk handling
          };
          
          // Check each position category
          if (machine.environment === 'blending') {
            for (const [key, pos] of Object.entries(blendingPositions)) {
              if (machineName.includes(key)) return pos;
            }
            // Default blending position
            return { x: -19 + (envIndex % 3) * 8, z: -16 + Math.floor(envIndex / 3) * 3 };
          }
          
          if (machine.environment === 'maturation') {
            for (const [key, pos] of Object.entries(maturationPositions)) {
              if (machineName.includes(key)) return pos;
            }
            // Default maturation position
            return { x: -22 + (envIndex % 2) * 6, z: -5 + Math.floor(envIndex / 2) * 6 };
          }
          
          if (machine.environment === 'packaging') {
            for (const [key, pos] of Object.entries(packagingPositions)) {
              if (machineName.includes(key)) return pos;
            }
            // Default packaging position
            return { x: -15 + (envIndex % 6) * 7, z: -5 + Math.floor(envIndex / 6) * 8 };
          }
          
          // Default position for unmatched machines
          return { x: -20 + (envIndex % 6) * 7, z: -15 + Math.floor(envIndex / 6) * 8 };
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

  // Ref callback that initializes Babylon when element is actually mounted
  const containerRefCallback = useCallback((element) => {
    if (!element) {
      // Element is being unmounted
      if (engine) {
        engine.dispose();
      }
      return;
    }

    // Use setTimeout to avoid blocking React's render cycle
    setTimeout(async () => {
      try {
        setError(null);
        console.log('🏭 Container element mounted, starting Babylon factory initialization...');
        
        // First load Babylon.js libraries
        await loadBabylonJS();
        console.log('✅ Babylon.js libraries loaded');
        
        // Initialize the scene with the canvas element
        await initializeBabylonScene(element);
        console.log('✅ Babylon scene initialized');
        
      } catch (error) {
        console.error('❌ Babylon factory initialization failed:', error);
        setError(error.message);
      }
    }, 100);
  }, []);

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
    <div className="w-full h-96 bg-gray-900 rounded-lg overflow-hidden relative">
      <canvas 
        ref={containerRefCallback}
        className="w-full h-full"
        style={{ 
          display: 'block', 
          minHeight: '400px',
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