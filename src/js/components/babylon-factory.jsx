import React, { useEffect, useRef, useState } from 'react';

const BabylonFactory = ({ machines = [], environments = [] }) => {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const engineRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  // Load Babylon.js dynamically
  const loadBabylonJS = async () => {
    try {
      if (typeof window.BABYLON !== 'undefined') {
        return true;
      }

      console.log('📦 Loading Babylon.js libraries...');
      
      const babylonScript = document.createElement('script');
      babylonScript.src = 'https://cdn.babylonjs.com/babylon.js';
      
      await new Promise((resolve, reject) => {
        babylonScript.onload = resolve;
        babylonScript.onerror = reject;
        document.head.appendChild(babylonScript);
      });

      console.log('✅ Babylon.js core loaded');

      const loadersScript = document.createElement('script');
      loadersScript.src = 'https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js';
      
      await new Promise((resolve, reject) => {
        loadersScript.onload = resolve;
        loadersScript.onerror = reject;
        document.head.appendChild(loadersScript);
      });

      console.log('✅ Babylon.js loaders ready');
      return true;
    } catch (error) {
      console.error('❌ Failed to load Babylon.js:', error);
      throw error;
    }
  };

  // Initialize Babylon.js scene
  const initializeBabylonScene = async () => {
    try {
      if (!canvasRef.current) {
        throw new Error('Canvas element not found');
      }

      // Clear any existing canvas content
      canvasRef.current.innerHTML = '';

      // Create canvas element
      const babylonCanvas = document.createElement('canvas');
      babylonCanvas.id = 'babylonCanvas';
      babylonCanvas.style.width = '100%';
      babylonCanvas.style.height = '100%';
      babylonCanvas.style.display = 'block';
      babylonCanvas.style.outline = 'none';
      canvasRef.current.appendChild(babylonCanvas);

      // Create Babylon engine
      const engine = new window.BABYLON.Engine(babylonCanvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
        antialias: true
      });
      engineRef.current = engine;

      // Create scene
      const scene = new window.BABYLON.Scene(engine);
      sceneRef.current = scene;

      // Setup camera
      const camera = new window.BABYLON.ArcRotateCamera(
        'camera', 
        -Math.PI / 2, 
        Math.PI / 3, 
        50, 
        window.BABYLON.Vector3.Zero(), 
        scene
      );
      camera.attachControls(babylonCanvas);
      camera.setTarget(window.BABYLON.Vector3.Zero());

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

      // Create factory floor
      const ground = window.BABYLON.MeshBuilder.CreateGround('ground', {width: 60, height: 40}, scene);
      const groundMaterial = new window.BABYLON.StandardMaterial('groundMaterial', scene);
      groundMaterial.diffuseColor = new window.BABYLON.Color3(0.15, 0.2, 0.25);
      groundMaterial.specularColor = new window.BABYLON.Color3(0.1, 0.1, 0.1);
      ground.material = groundMaterial;

      // Create factory walls
      const wallHeight = 8;
      const wallThickness = 0.5;
      
      // North wall
      const northWall = window.BABYLON.MeshBuilder.CreateBox('northWall', {
        width: 60, height: wallHeight, depth: wallThickness
      }, scene);
      northWall.position = new window.BABYLON.Vector3(0, wallHeight/2, -20);
      
      // South wall
      const southWall = window.BABYLON.MeshBuilder.CreateBox('southWall', {
        width: 60, height: wallHeight, depth: wallThickness
      }, scene);
      southWall.position = new window.BABYLON.Vector3(0, wallHeight/2, 20);
      
      // East wall
      const eastWall = window.BABYLON.MeshBuilder.CreateBox('eastWall', {
        width: wallThickness, height: wallHeight, depth: 40
      }, scene);
      eastWall.position = new window.BABYLON.Vector3(30, wallHeight/2, 0);
      
      // West wall
      const westWall = window.BABYLON.MeshBuilder.CreateBox('westWall', {
        width: wallThickness, height: wallHeight, depth: 40
      }, scene);
      westWall.position = new window.BABYLON.Vector3(-30, wallHeight/2, 0);

      // Wall material
      const wallMaterial = new window.BABYLON.StandardMaterial('wallMaterial', scene);
      wallMaterial.diffuseColor = new window.BABYLON.Color3(0.9, 0.9, 0.9);
      [northWall, southWall, eastWall, westWall].forEach(wall => {
        wall.material = wallMaterial;
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

      setIsLoaded(true);
      console.log('🏭 4D Digital Twin Factory initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize Babylon scene:', error);
      setError(error.message);
      throw error;
    }
  };

  // Create 3D machines in the scene
  const createMachines = (machineList) => {
    if (!sceneRef.current || !Array.isArray(machineList) || machineList.length === 0) {
      return;
    }

    console.log('🏭 Creating 3D machines for', machineList.length, 'equipment units');

    const machineColors = {
      'available': new window.BABYLON.Color3(0.0, 0.8, 0.4),
      'busy': new window.BABYLON.Color3(1.0, 0.6, 0.0),
      'offline': new window.BABYLON.Color3(0.6, 0.6, 0.6),
      'error': new window.BABYLON.Color3(1.0, 0.2, 0.2)
    };

    // Clear existing machines
    const existingMachines = sceneRef.current.meshes.filter(mesh => 
      mesh.name.startsWith('machine_')
    );
    existingMachines.forEach(mesh => mesh.dispose());

    machineList.forEach((machine, index) => {
      try {
        // Create machine body
        const machineBox = window.BABYLON.MeshBuilder.CreateBox(`machine_${machine.id}`, {
          width: 4, height: 3, depth: 3
        }, sceneRef.current);

        // Position machines in departments
        let x, z;
        const machinesInEnv = machineList.filter(m => m.environment === machine.environment);
        const envIndex = machinesInEnv.indexOf(machine);

        if (machine.environment === 'blending') {
          x = -20 + (envIndex % 3) * 8;
          z = -15 + Math.floor(envIndex / 3) * 6;
        } else if (machine.environment === 'maturation') {
          x = -5 + (envIndex % 2) * 6;
          z = -15 + Math.floor(envIndex / 2) * 6;
        } else {
          x = 10 + (envIndex % 4) * 6;
          z = -15 + Math.floor(envIndex / 4) * 6;
        }

        machineBox.position = new window.BABYLON.Vector3(x, 1.5, z);

        // Create material with status color
        const material = new window.BABYLON.StandardMaterial(`machineMat_${machine.id}`, sceneRef.current);
        const statusColor = machineColors[machine.status] || machineColors.offline;
        material.diffuseColor = statusColor;
        material.emissiveColor = statusColor.scale(0.2);
        material.specularColor = new window.BABYLON.Color3(0.3, 0.3, 0.3);
        machineBox.material = material;

        // Add animations for running machines
        if (machine.status === 'available') {
          window.BABYLON.Animation.CreateAndStartAnimation(
            'machineRotation',
            machineBox,
            'rotation.y',
            30,
            120,
            0,
            Math.PI * 2,
            window.BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
          );
        }

        // Add machine name label
        const nameLabel = window.BABYLON.MeshBuilder.CreatePlane(`label_${machine.id}`, {
          width: 6, height: 1
        }, sceneRef.current);
        nameLabel.position = new window.BABYLON.Vector3(x, 4, z);
        
        const labelMaterial = new window.BABYLON.StandardMaterial(`labelMat_${machine.id}`, sceneRef.current);
        labelMaterial.diffuseColor = new window.BABYLON.Color3(1, 1, 1);
        labelMaterial.emissiveColor = new window.BABYLON.Color3(0.3, 0.3, 0.3);
        nameLabel.material = labelMaterial;

      } catch (error) {
        console.error(`❌ Failed to create 3D machine ${machine.name}:`, error);
      }
    });
  };

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        setError(null);
        await loadBabylonJS();
        await initializeBabylonScene();
      } catch (error) {
        console.error('❌ Babylon factory initialization failed:', error);
        setError(error.message);
      }
    };

    initialize();

    // Cleanup
    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
      }
      window.removeEventListener('resize', () => {});
    };
  }, []);

  // Update machines when prop changes
  useEffect(() => {
    if (isLoaded && machines.length > 0) {
      createMachines(machines);
    }
  }, [machines, isLoaded]);

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

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64 bg-blue-50 rounded-lg">
        <div className="text-center">
          <div className="text-blue-600 mb-2">🏭 Loading 4D Digital Twin Factory...</div>
          <div className="text-sm text-blue-500">Initializing Babylon.js engine</div>
          <div className="mt-2 w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-96 bg-gray-900 rounded-lg overflow-hidden">
      <div 
        ref={canvasRef} 
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
};

export default BabylonFactory;