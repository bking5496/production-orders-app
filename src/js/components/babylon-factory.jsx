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
  const initializeBabylonScene = async (container) => {
    try {
      if (!container) {
        throw new Error('Container element not provided');
      }

      console.log('🏭 Container found, creating canvas...');

      // Clear any existing content
      container.innerHTML = '';

      // Create canvas element directly in the container
      const babylonCanvas = document.createElement('canvas');
      babylonCanvas.id = `babylonCanvas-${Date.now()}`;
      babylonCanvas.style.width = '100%';
      babylonCanvas.style.height = '100%';
      babylonCanvas.style.display = 'block';
      babylonCanvas.style.outline = 'none';
      babylonCanvas.style.touchAction = 'none';
      container.appendChild(babylonCanvas);

      console.log('✅ Canvas created and appended to container');

      // Create Babylon engine
      engine = new window.BABYLON.Engine(babylonCanvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
        antialias: true
      });

      // Create scene
      scene = new window.BABYLON.Scene(engine);
      
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

      // Setup camera with proper checks for large factory complex
      const camera = new window.BABYLON.ArcRotateCamera(
        'camera', 
        -Math.PI / 2, 
        Math.PI / 4, 
        150,  // Much further back to view entire complex
        new window.BABYLON.Vector3(-30, 0, 10), // Center view between factory and warehouses
        scene
      );
      
      // Ensure canvas is ready before attaching controls
      if (babylonCanvas && typeof camera.attachControls === 'function') {
        camera.attachControls(babylonCanvas);
      } else {
        console.warn('⚠️ Camera controls not available, using default settings');
      }
      
      if (typeof camera.setTarget === 'function') {
        camera.setTarget(window.BABYLON.Vector3.Zero());
      }

      // Add lighting
      const hemiLight = new window.BABYLON.HemisphericLight(
        'hemiLight', 
        new window.BABYLON.Vector3(0, 1, 0), 
        scene
      );
      hemiLight.intensity = 0.6;
      
      const dirLight = new window.BABYLON.DirectionalLight(
        'dirLight', 
        new window.BABYLON.Vector3(-1, -1, 1), 
        scene
      );
      dirLight.intensity = 1.0;
      dirLight.diffuse = new window.BABYLON.Color3(0.4, 0.6, 1.0);

      // COMPLETE FACTORY FLOOR RECREATION - Based on precise layout
      // Factory dimensions from layout: 52m width x 42m height
      // Grid: 5m + 5m + 6m + 10m + 20m + 6m = 52m width
      // Heights: 5m + 6m + 14m + 8m + various = 42m height
      
      const factoryWidth = 52;  // Total factory width
      const factoryHeight = 42; // Total factory height  
      const wallHeight = 6;
      const wallThickness = 0.3;

      // Create main factory floor (52m x 42m) - Single production facility
      const factoryFloor = window.BABYLON.MeshBuilder.CreateGround('factoryFloor', {
        width: factoryWidth, height: factoryHeight
      }, scene);
      factoryFloor.position = new window.BABYLON.Vector3(0, 0, 0);
      
      const factoryMaterial = new window.BABYLON.StandardMaterial('factoryMaterial', scene);
      factoryMaterial.diffuseColor = new window.BABYLON.Color3(0.18, 0.22, 0.25); // Industrial concrete
      factoryMaterial.specularColor = new window.BABYLON.Color3(0.1, 0.1, 0.1);
      factoryMaterial.wireframe = false;
      factoryFloor.material = factoryMaterial;
      factoryFloor.renderOutline = false;
      factoryFloor.showBoundingBox = false;

      // Create area floor sections based on layout zones
      // BLENDING area floor section (top section)
      const blendingFloor = window.BABYLON.MeshBuilder.CreateGround('blendingFloor', {
        width: factoryWidth, height: 11 // 5m + 6m sections  
      }, scene);
      blendingFloor.position = new window.BABYLON.Vector3(0, 0.01, -15.5); // Top section, slightly elevated
      
      const blendingMaterial = new window.BABYLON.StandardMaterial('blendingMaterial', scene);
      blendingMaterial.diffuseColor = new window.BABYLON.Color3(0.25, 0.20, 0.30); // Purple tint for blending
      blendingMaterial.alpha = 0.8;
      blendingMaterial.wireframe = false;
      blendingFloor.material = blendingMaterial;
      blendingFloor.renderOutline = false;
      blendingFloor.showBoundingBox = false;

      // MATURATION area floor section (left center section)  
      const maturationFloor = window.BABYLON.MeshBuilder.CreateGround('maturationFloor', {
        width: 16, height: 14 // Left portion of 14m section
      }, scene);
      maturationFloor.position = new window.BABYLON.Vector3(-18, 0.01, -3); // Left center
      
      const maturationMaterial = new window.BABYLON.StandardMaterial('maturationMaterial', scene);
      maturationMaterial.diffuseColor = new window.BABYLON.Color3(0.20, 0.30, 0.25); // Green tint for maturation
      maturationMaterial.alpha = 0.8;
      maturationMaterial.wireframe = false;
      maturationFloor.material = maturationMaterial;
      maturationFloor.renderOutline = false;
      maturationFloor.showBoundingBox = false;

      // PACKAGING area floor section (bottom section)
      const packagingFloor = window.BABYLON.MeshBuilder.CreateGround('packagingFloor', {
        width: factoryWidth, height: 8 // Bottom 8m section
      }, scene);
      packagingFloor.position = new window.BABYLON.Vector3(0, 0.01, 17); // Bottom section
      
      const packagingMaterial = new window.BABYLON.StandardMaterial('packagingMaterial', scene);
      packagingMaterial.diffuseColor = new window.BABYLON.Color3(0.30, 0.25, 0.20); // Orange tint for packaging
      packagingMaterial.alpha = 0.8;
      packagingMaterial.wireframe = false;
      packagingFloor.material = packagingMaterial;
      packagingFloor.renderOutline = false;
      packagingFloor.showBoundingBox = false;

      // Create perimeter walls for factory building (52m x 42m)
      const walls = [
        // Factory perimeter walls
        { name: 'factoryNorth', pos: [0, wallHeight/2, -factoryHeight/2], size: [factoryWidth, wallHeight, wallThickness] },
        { name: 'factorySouth', pos: [0, wallHeight/2, factoryHeight/2], size: [factoryWidth, wallHeight, wallThickness] },
        { name: 'factoryWest', pos: [-factoryWidth/2, wallHeight/2, 0], size: [wallThickness, wallHeight, factoryHeight] },
        { name: 'factoryEast', pos: [factoryWidth/2, wallHeight/2, 0], size: [wallThickness, wallHeight, factoryHeight] },
        
        // Internal area divider walls (optional visual separators)
        // Blending area separator
        { name: 'blendingDivider', pos: [0, wallHeight/4, -10], size: [factoryWidth * 0.8, wallHeight/2, wallThickness/2] },
        // Maturation area separator  
        { name: 'maturationDivider', pos: [-10, wallHeight/4, 4], size: [wallThickness/2, wallHeight/2, 14] },
        // Packaging area separator
        { name: 'packagingDivider', pos: [0, wallHeight/4, 13], size: [factoryWidth * 0.8, wallHeight/2, wallThickness/2] }
      ];

      // Create wall material - more subtle appearance
      const wallMaterial = new window.BABYLON.StandardMaterial('wallMaterial', scene);
      wallMaterial.diffuseColor = new window.BABYLON.Color3(0.4, 0.4, 0.4); // Darker walls
      wallMaterial.alpha = 0.3; // Semi-transparent to reduce visibility

      // Build all walls
      walls.forEach(wall => {
        const wallMesh = window.BABYLON.MeshBuilder.CreateBox(wall.name, {
          width: wall.size[0], height: wall.size[1], depth: wall.size[2]
        }, scene);
        wallMesh.position = new window.BABYLON.Vector3(...wall.pos);
        wallMesh.material = wallMaterial;
      });

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
              
              // Add visual feedback - pulse effect
              const originalScale = pickedMesh.scaling.clone();
              window.BABYLON.Animation.CreateAndStartAnimation(
                'clickPulse', pickedMesh, 'scaling', 60, 30, 
                originalScale, originalScale.scale(1.2), 
                window.BABYLON.Animation.ANIMATIONLOOPMODE_YOYO
              );
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

        // PRECISE MACHINE POSITIONING - Factory Layout 52m x 42m
        // Column positions: -24, -19, -13, -3, 17, 23 (based on 5m+5m+6m+10m+20m+6m)
        // Row positions: -18.5, -12.5, -3, 17 (based on 5m+6m+14m+8m sections)
        
        if (machine.environment === 'blending') {
          // BLENDING area - Top section (rows -18.5 to -12.5)
          if (machine.name.includes('BLENDING')) {
            x = -24; z = -18; // Far left blending area
          } else if (machine.name.includes('PLOUGH BLENDER') || machine.name.includes('Ploughshare')) {
            x = -3; z = -15; // Center-right in blending area
          } else if (machine.name.includes('PRE-BATCH')) {
            x = 10; z = -15; // Right side in blending area  
          } else if (machine.name.includes('1000L BLENDER') || machine.name.includes('MaxMix')) {
            x = 17; z = -8; // Far right blending, lower row
          } else if (machine.name.includes('1500L BLENDER') || machine.name.includes('Winkwork')) {
            x = 17; z = -2; // Far right blending, bottom
          } else {
            // Other blending equipment
            x = -19 + (envIndex % 3) * 8;
            z = -16 + Math.floor(envIndex / 3) * 3;
          }
        } else if (machine.environment === 'packaging') {
          // PACKAGING area - Bottom section and center areas
          if (machine.name.includes('STICKPACK') || machine.name.includes('Stick Pack')) {
            x = -19; z = -8; // Left side packaging area
          } else if (machine.name.includes('ILAPACK') || machine.name.includes('IlaPak')) {
            x = -19; z = 5; // Left side, lower packaging
          } else if (machine.name.includes('UNIVERSAL')) {
            x = -19; z = 15; // Bottom left universal area
          } else if (machine.name.includes('TABLETS')) {
            x = -24; z = 17; // Bottom far left tablets
          } else if (machine.name.includes('CUBES')) {
            x = -13; z = 17; // Bottom cubes area
          } else if (machine.name.includes('STOCK') || machine.name.includes('POWDER')) {
            x = -3; z = 17; // Bottom center stock powder
          } else if (machine.name.includes('OLD CAN LINE') || machine.name.includes('CANLINE')) {
            x = 10; z = 17; // Bottom right can line
          } else if (machine.name.includes('5LANES') || machine.name.includes('AUGER') || machine.name.includes('ENFLEX') || machine.name.includes('CANS')) {
            x = 20; z = 17; // Far right lanes/auger/enflex/cans
          } else if (machine.name.includes('FB') || machine.name.includes('fb 10')) {
            x = -24; z = -2; // FB-10 in maturation room area (per layout)
          } else if (machine.name.includes('BULK')) {
            x = -3; z = 5; // Center bulk area
          } else {
            // Other packaging equipment
            x = -15 + (envIndex % 6) * 7;
            z = -5 + Math.floor(envIndex / 6) * 8;
          }
        } else if (machine.environment === 'maturation') {
          // MATURATION area - Center left section
          if (machine.name.includes('FB-10') || machine.name.includes('fb 10')) {
            x = -24; z = -2; // Left side maturation (FB-10 area)
          } else {
            // Other maturation equipment in left center area
            x = -22 + (envIndex % 2) * 6;
            z = -5 + Math.floor(envIndex / 2) * 6;
          }
        } else {
          // Default positioning across factory floor
          x = -20 + (envIndex % 6) * 7;
          z = -15 + Math.floor(envIndex / 6) * 8;
        }

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

        // Create material with status color for main body
        if (mainBody) {
          const material = new window.BABYLON.StandardMaterial(`machineMat_${machine.id}`, scene);
          const statusColor = machineColors[machine.status] || machineColors.offline;
          material.diffuseColor = statusColor;
          material.emissiveColor = statusColor.scale(0.1);
          material.specularColor = new window.BABYLON.Color3(0.5, 0.5, 0.5);
          material.roughness = 0.3;
          material.wireframe = false; // Disable wireframe on machines
          mainBody.material = material;
          mainBody.renderOutline = false;
          mainBody.showBoundingBox = false;
        }

        // Add machine name label
        const nameLabel = window.BABYLON.MeshBuilder.CreatePlane(`label_${machine.id}`, {
          width: 6, height: 1
        }, scene);
        nameLabel.position = new window.BABYLON.Vector3(x, 6, z);
        nameLabel.billboardMode = window.BABYLON.Mesh.BILLBOARDMODE_Y;
        
        const labelMaterial = new window.BABYLON.StandardMaterial(`labelMat_${machine.id}`, scene);
        labelMaterial.diffuseColor = new window.BABYLON.Color3(1, 1, 1);
        labelMaterial.emissiveColor = new window.BABYLON.Color3(0.8, 0.8, 0.8);
        nameLabel.material = labelMaterial;

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
        
        // Initialize the scene with the actual DOM element
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
      <div 
        ref={containerRefCallback}
        className="w-full h-full absolute inset-0"
        style={{ minHeight: '400px' }}
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