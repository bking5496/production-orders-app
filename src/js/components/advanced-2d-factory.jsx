import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Settings, Save, Upload, Download, Move, RotateCw, Square, Monitor, 
  Maximize2, Grid, Eye, EyeOff, Zap, Plus, Minus, RefreshCw, 
  MousePointer, Hand, Edit3, Layers, Palette, Wrench, Activity 
} from 'lucide-react';

// High-quality 2D Digital Twin Factory Layout System
// Features: Customizable screens, layout sizing, room management, machine placement
// Built for >15MB rich graphics and enterprise functionality

const Advanced2DFactory = ({ 
  machines = [], 
  environments = [],
  onMachineClick,
  onLayoutChange,
  readOnly = false
}) => {
  // Core state management
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTool, setSelectedTool] = useState('select'); // select, move, rotate, room, machine
  const [selectedElement, setSelectedElement] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [viewportTransform, setViewportTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  // Layout configuration state
  const [layoutConfig, setLayoutConfig] = useState({
    width: 2000,
    height: 1500,
    gridSize: 20,
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    rooms: [],
    screens: [],
    customElements: []
  });

  // Machine positioning state
  const [machinePositions, setMachinePositions] = useState(new Map());
  const [machineCustomization, setMachineCustomization] = useState(new Map());

  // UI state
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [activeLayer, setActiveLayer] = useState('machines');
  const [snapToGrid, setSnapToGrid] = useState(true);

  // Advanced graphics configuration
  const [graphicsConfig, setGraphicsConfig] = useState({
    enableShadows: true,
    enableReflections: true,
    enableAnimations: true,
    quality: 'ultra', // low, medium, high, ultra
    renderScale: window.devicePixelRatio || 1,
    antiAliasing: true,
    texture: {
      floor: 'polished-concrete',
      walls: 'industrial-steel',
      machines: 'brushed-metal'
    }
  });

  // High-quality textures and patterns
  const texturePatterns = useMemo(() => ({
    'polished-concrete': {
      pattern: 'radial-gradient(circle at 30% 20%, #f1f5f9 0%, #e2e8f0 25%, #cbd5e1 50%, #94a3b8 100%)',
      roughness: 0.1,
      metallic: 0.0
    },
    'industrial-steel': {
      pattern: 'linear-gradient(45deg, #64748b 0%, #475569 25%, #334155 50%, #1e293b 75%, #0f172a 100%)',
      roughness: 0.3,
      metallic: 0.8
    },
    'brushed-metal': {
      pattern: 'repeating-linear-gradient(90deg, #71717a 0px, #52525b 1px, #3f3f46 2px, #27272a 3px)',
      roughness: 0.2,
      metallic: 0.9
    },
    'safety-yellow': {
      pattern: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
      roughness: 0.4,
      metallic: 0.1
    },
    'emergency-red': {
      pattern: 'radial-gradient(circle, #dc2626 0%, #991b1b 70%, #7f1d1d 100%)',
      roughness: 0.3,
      metallic: 0.2
    }
  }), []);

  // Default room templates
  const roomTemplates = useMemo(() => [
    {
      id: 'production-floor',
      name: 'Production Floor',
      width: 800,
      height: 600,
      color: '#f0f9ff',
      borderColor: '#0ea5e9',
      type: 'production'
    },
    {
      id: 'quality-control',
      name: 'Quality Control',
      width: 300,
      height: 200,
      color: '#f0fdf4',
      borderColor: '#22c55e',
      type: 'quality'
    },
    {
      id: 'warehouse',
      name: 'Warehouse',
      width: 400,
      height: 300,
      color: '#fffbeb',
      borderColor: '#f59e0b',
      type: 'storage'
    },
    {
      id: 'office-space',
      name: 'Office Space',
      width: 250,
      height: 200,
      color: '#fdf4ff',
      borderColor: '#a855f7',
      type: 'office'
    }
  ], []);

  // Advanced machine templates with detailed graphics
  const machineTemplates = useMemo(() => ({
    'blending': {
      width: 80,
      height: 60,
      color: '#3b82f6',
      icon: '⚗️',
      shape: 'rounded-rect',
      details: {
        pipes: true,
        controls: true,
        animations: ['mixing', 'filling']
      }
    },
    'packaging': {
      width: 100,
      height: 40,
      color: '#10b981',
      icon: '📦',
      shape: 'rect',
      details: {
        conveyor: true,
        robotic: true,
        animations: ['conveyor-belt', 'packaging']
      }
    },
    'beverage': {
      width: 70,
      height: 70,
      color: '#f59e0b',
      icon: '🥤',
      shape: 'circle',
      details: {
        tanks: true,
        fillers: true,
        animations: ['filling', 'carbonation']
      }
    },
    'quality-station': {
      width: 60,
      height: 60,
      color: '#8b5cf6',
      icon: '🔬',
      shape: 'hexagon',
      details: {
        sensors: true,
        displays: true,
        animations: ['scanning', 'testing']
      }
    }
  }), []);

  // Screen/Display templates
  const screenTemplates = useMemo(() => [
    {
      id: 'main-dashboard',
      name: 'Main Dashboard',
      width: 200,
      height: 120,
      type: 'dashboard',
      content: 'production-overview'
    },
    {
      id: 'machine-status',
      name: 'Machine Status',
      width: 150,
      height: 100,
      type: 'status',
      content: 'machine-data'
    },
    {
      id: 'kpi-display',
      name: 'KPI Display',
      width: 180,
      height: 80,
      type: 'metrics',
      content: 'performance-kpis'
    },
    {
      id: 'emergency-panel',
      name: 'Emergency Panel',
      width: 120,
      height: 160,
      type: 'emergency',
      content: 'safety-controls'
    }
  ], []);

  // Initialize default layout
  useEffect(() => {
    if (layoutConfig.rooms.length === 0) {
      setLayoutConfig(prev => ({
        ...prev,
        rooms: [
          {
            id: 'main-production',
            ...roomTemplates[0],
            x: 100,
            y: 100
          },
          {
            id: 'quality-area',
            ...roomTemplates[1],
            x: 1000,
            y: 100
          }
        ]
      }));
    }
  }, [roomTemplates]);

  // Advanced rendering engine
  const renderFactory = useCallback((ctx) => {
    if (!ctx) return;

    const { width, height } = layoutConfig;
    const { scale, offsetX, offsetY } = viewportTransform;

    // Clear canvas with high quality
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Apply viewport transformation
    ctx.scale(scale, scale);
    ctx.translate(offsetX, offsetY);

    // Enable high-quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.textRenderingOptimization = 'optimizeQuality';

    // Render background with texture
    renderBackground(ctx);
    
    // Render grid if enabled
    if (showGrid) {
      renderGrid(ctx);
    }

    // Render rooms with advanced graphics
    layoutConfig.rooms.forEach(room => renderRoom(ctx, room));

    // Render screens with realistic displays
    layoutConfig.screens.forEach(screen => renderScreen(ctx, screen));

    // Render machines with detailed graphics
    machines.forEach(machine => {
      const position = machinePositions.get(machine.id);
      const customization = machineCustomization.get(machine.id);
      if (position) {
        renderMachine(ctx, machine, position, customization);
      }
    });

    // Render custom elements
    layoutConfig.customElements.forEach(element => renderCustomElement(ctx, element));

    // Render selection overlay
    if (selectedElement && isEditing) {
      renderSelectionOverlay(ctx, selectedElement);
    }

    ctx.restore();
  }, [layoutConfig, viewportTransform, showGrid, showLabels, selectedElement, isEditing, machines, machinePositions, machineCustomization]);

  // Background rendering with advanced patterns
  const renderBackground = useCallback((ctx) => {
    const { width, height, backgroundColor } = layoutConfig;
    const texture = texturePatterns[graphicsConfig.texture.floor];

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, backgroundColor);
    gradient.addColorStop(0.5, '#ffffff');
    gradient.addColorStop(1, backgroundColor);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add subtle texture overlay
    if (texture && graphicsConfig.quality !== 'low') {
      ctx.globalAlpha = 0.1;
      const pattern = ctx.createPattern(createTextureCanvas(texture.pattern, 50, 50), 'repeat');
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.globalAlpha = 1.0;
    }

    // Add border
    ctx.strokeStyle = layoutConfig.borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);
  }, [layoutConfig, texturePatterns, graphicsConfig]);

  // Grid rendering
  const renderGrid = useCallback((ctx) => {
    const { width, height, gridSize } = layoutConfig;
    const { scale } = viewportTransform;

    // Adaptive grid opacity based on zoom
    const opacity = Math.max(0.1, Math.min(0.5, scale));
    ctx.globalAlpha = opacity;

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1.0;
  }, [layoutConfig, viewportTransform]);

  // Advanced room rendering
  const renderRoom = useCallback((ctx, room) => {
    const { x, y, width, height, color, borderColor, name, type } = room;

    // Shadow effect
    if (graphicsConfig.enableShadows) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
    }

    // Room background with gradient
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, adjustBrightness(color, -10));

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);

    // Reset shadow
    ctx.shadowColor = 'transparent';

    // Border with enhanced styling
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.strokeRect(x, y, width, height);

    // Room type indicator
    renderRoomTypeIndicator(ctx, room);

    // Room label
    if (showLabels) {
      renderRoomLabel(ctx, room);
    }
  }, [graphicsConfig, showLabels]);

  // Room type indicator
  const renderRoomTypeIndicator = useCallback((ctx, room) => {
    const { x, y, type } = room;
    const iconSize = 20;
    const padding = 10;

    const typeIcons = {
      'production': '🏭',
      'quality': '✅',
      'storage': '📦',
      'office': '🏢'
    };

    ctx.font = `${iconSize}px Arial`;
    ctx.fillText(typeIcons[type] || '🏭', x + padding, y + iconSize + padding);
  }, []);

  // Room label rendering
  const renderRoomLabel = useCallback((ctx, room) => {
    const { x, y, width, height, name } = room;
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#1f2937';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Text background
    const textMetrics = ctx.measureText(name);
    const textWidth = textMetrics.width + 20;
    const textHeight = 24;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(centerX - textWidth/2, centerY - textHeight/2, textWidth, textHeight);

    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.strokeRect(centerX - textWidth/2, centerY - textHeight/2, textWidth, textHeight);

    // Text
    ctx.fillStyle = '#1f2937';
    ctx.fillText(name, centerX, centerY);
  }, []);

  // Advanced screen rendering
  const renderScreen = useCallback((ctx, screen) => {
    const { x, y, width, height, name, type, content } = screen;

    // Screen frame with metallic effect
    const frameWidth = 8;
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, '#4b5563');
    gradient.addColorStop(0.5, '#374151');
    gradient.addColorStop(1, '#1f2937');

    ctx.fillStyle = gradient;
    ctx.fillRect(x - frameWidth, y - frameWidth, width + frameWidth * 2, height + frameWidth * 2);

    // Screen display area
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, width, height);

    // Screen content simulation
    renderScreenContent(ctx, screen);

    // Screen label
    if (showLabels) {
      ctx.font = 'bold 12px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(name, x + width/2, y + height + 20);
    }
  }, [showLabels]);

  // Screen content rendering
  const renderScreenContent = useCallback((ctx, screen) => {
    const { x, y, width, height, type, content } = screen;
    const padding = 10;

    switch (type) {
      case 'dashboard':
        renderDashboardContent(ctx, x + padding, y + padding, width - padding * 2, height - padding * 2);
        break;
      case 'status':
        renderStatusContent(ctx, x + padding, y + padding, width - padding * 2, height - padding * 2);
        break;
      case 'metrics':
        renderMetricsContent(ctx, x + padding, y + padding, width - padding * 2, height - padding * 2);
        break;
      case 'emergency':
        renderEmergencyContent(ctx, x + padding, y + padding, width - padding * 2, height - padding * 2);
        break;
      default:
        renderGenericContent(ctx, x + padding, y + padding, width - padding * 2, height - padding * 2);
    }
  }, []);

  // Dashboard content simulation
  const renderDashboardContent = useCallback((ctx, x, y, width, height) => {
    // Simulated dashboard with charts and metrics
    ctx.fillStyle = '#10b981';
    ctx.fillRect(x, y, width * 0.3, height * 0.4);
    
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(x + width * 0.35, y, width * 0.3, height * 0.6);
    
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(x + width * 0.7, y, width * 0.25, height * 0.3);

    // Status indicators
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(x + 15, y + height - 15, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '8px Arial';
    ctx.fillText('ONLINE', x + 25, y + height - 10);
  }, []);

  // Status content simulation
  const renderStatusContent = useCallback((ctx, x, y, width, height) => {
    const statusItems = ['M1: ONLINE', 'M2: ONLINE', 'M3: MAINT', 'M4: ONLINE'];
    
    statusItems.forEach((status, index) => {
      const itemY = y + (index * 20) + 15;
      const color = status.includes('ONLINE') ? '#22c55e' : 
                   status.includes('MAINT') ? '#f59e0b' : '#ef4444';
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + 8, itemY, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '8px Arial';
      ctx.fillText(status, x + 20, itemY + 3);
    });
  }, []);

  // Metrics content simulation
  const renderMetricsContent = useCallback((ctx, x, y, width, height) => {
    // KPI bars
    const metrics = [
      { label: 'OEE', value: 0.85, color: '#10b981' },
      { label: 'Quality', value: 0.92, color: '#3b82f6' },
      { label: 'Availability', value: 0.78, color: '#f59e0b' }
    ];

    metrics.forEach((metric, index) => {
      const barY = y + (index * 20) + 10;
      const barWidth = width - 40;
      const filledWidth = barWidth * metric.value;

      // Background bar
      ctx.fillStyle = '#374151';
      ctx.fillRect(x + 30, barY, barWidth, 8);

      // Filled bar
      ctx.fillStyle = metric.color;
      ctx.fillRect(x + 30, barY, filledWidth, 8);

      // Label
      ctx.fillStyle = '#ffffff';
      ctx.font = '8px Arial';
      ctx.fillText(metric.label, x, barY + 6);
    });
  }, []);

  // Emergency content simulation
  const renderEmergencyContent = useCallback((ctx, x, y, width, height) => {
    // Emergency button simulation
    const buttonSize = Math.min(width, height) * 0.6;
    const buttonX = x + (width - buttonSize) / 2;
    const buttonY = y + (height - buttonSize) / 2;

    // Animated emergency button
    const time = Date.now() / 1000;
    const pulse = Math.sin(time * 3) * 0.5 + 0.5;
    const buttonColor = `rgba(239, 68, 68, ${0.7 + pulse * 0.3})`;

    ctx.fillStyle = buttonColor;
    ctx.beginPath();
    ctx.arc(buttonX + buttonSize/2, buttonY + buttonSize/2, buttonSize/2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('STOP', buttonX + buttonSize/2, buttonY + buttonSize/2);
  }, []);

  // Generic content simulation
  const renderGenericContent = useCallback((ctx, x, y, width, height) => {
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(x, y, width, height);
    
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('DISPLAY', x + width/2, y + height/2);
  }, []);

  // Advanced machine rendering
  const renderMachine = useCallback((ctx, machine, position, customization = {}) => {
    const template = machineTemplates[machine.type] || machineTemplates['blending'];
    const { x, y } = position;
    const { width, height, color, icon, shape } = template;
    const scale = customization.scale || 1;
    const rotation = customization.rotation || 0;

    ctx.save();
    ctx.translate(x + width/2, y + height/2);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);

    // Machine shadow
    if (graphicsConfig.enableShadows) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
    }

    // Machine body based on shape
    switch (shape) {
      case 'circle':
        renderCircularMachine(ctx, machine, template, customization);
        break;
      case 'hexagon':
        renderHexagonalMachine(ctx, machine, template, customization);
        break;
      case 'rounded-rect':
        renderRoundedRectMachine(ctx, machine, template, customization);
        break;
      default:
        renderRectangularMachine(ctx, machine, template, customization);
    }

    ctx.shadowColor = 'transparent';

    // Machine details and animations
    if (graphicsConfig.quality !== 'low') {
      renderMachineDetails(ctx, machine, template, customization);
    }

    // Status indicators
    renderMachineStatus(ctx, machine, template);

    // Machine label
    if (showLabels) {
      renderMachineLabel(ctx, machine, template);
    }

    ctx.restore();
  }, [machineTemplates, graphicsConfig, showLabels]);

  // Circular machine rendering
  const renderCircularMachine = useCallback((ctx, machine, template, customization) => {
    const { width, height, color } = template;
    const radius = Math.min(width, height) / 2;

    // Main body gradient
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    gradient.addColorStop(0, adjustBrightness(color, 20));
    gradient.addColorStop(0.7, color);
    gradient.addColorStop(1, adjustBrightness(color, -20));

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.strokeStyle = adjustBrightness(color, -30);
    ctx.lineWidth = 2;
    ctx.stroke();
  }, []);

  // Hexagonal machine rendering
  const renderHexagonalMachine = useCallback((ctx, machine, template, customization) => {
    const { width, height, color } = template;
    const radius = Math.min(width, height) / 2;

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();

    // Fill with gradient
    const gradient = ctx.createLinearGradient(-radius, -radius, radius, radius);
    gradient.addColorStop(0, adjustBrightness(color, 20));
    gradient.addColorStop(1, adjustBrightness(color, -20));
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = adjustBrightness(color, -30);
    ctx.lineWidth = 2;
    ctx.stroke();
  }, []);

  // Rounded rectangle machine rendering
  const renderRoundedRectMachine = useCallback((ctx, machine, template, customization) => {
    const { width, height, color } = template;
    const radius = 8;

    ctx.beginPath();
    ctx.roundRect(-width/2, -height/2, width, height, radius);

    const gradient = ctx.createLinearGradient(-width/2, -height/2, width/2, height/2);
    gradient.addColorStop(0, adjustBrightness(color, 20));
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, adjustBrightness(color, -20));

    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = adjustBrightness(color, -30);
    ctx.lineWidth = 2;
    ctx.stroke();
  }, []);

  // Rectangular machine rendering
  const renderRectangularMachine = useCallback((ctx, machine, template, customization) => {
    const { width, height, color } = template;

    const gradient = ctx.createLinearGradient(-width/2, -height/2, width/2, height/2);
    gradient.addColorStop(0, adjustBrightness(color, 20));
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, adjustBrightness(color, -20));

    ctx.fillStyle = gradient;
    ctx.fillRect(-width/2, -height/2, width, height);

    ctx.strokeStyle = adjustBrightness(color, -30);
    ctx.lineWidth = 2;
    ctx.strokeRect(-width/2, -height/2, width, height);
  }, []);

  // Machine details rendering
  const renderMachineDetails = useCallback((ctx, machine, template, customization) => {
    const { width, height, details } = template;

    if (details?.pipes) {
      // Render pipes
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-width/3, -height/2);
      ctx.lineTo(-width/3, height/2);
      ctx.moveTo(width/3, -height/2);
      ctx.lineTo(width/3, height/2);
      ctx.stroke();
    }

    if (details?.controls) {
      // Control panel
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(width/4, -height/4, width/4, height/2);
      
      // Control buttons
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(width/3, -height/8, 3, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(width/3, height/8, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    if (details?.conveyor) {
      // Conveyor belt simulation
      const time = Date.now() / 500;
      const beltY = height/3;
      
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-width/2, beltY);
      ctx.lineTo(width/2, beltY);
      ctx.stroke();

      // Moving belt segments
      for (let i = 0; i < 5; i++) {
        const x = -width/2 + ((i * 20 + time * 20) % width);
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(x, beltY - 2, 8, 4);
      }
    }
  }, []);

  // Machine status rendering
  const renderMachineStatus = useCallback((ctx, machine, template) => {
    const { width, height } = template;
    const statusSize = 12;
    const statusX = width/2 - statusSize - 5;
    const statusY = -height/2 + statusSize + 5;

    // Status colors
    const statusColors = {
      'available': '#22c55e',
      'in_use': '#3b82f6',
      'maintenance': '#f59e0b',
      'offline': '#ef4444'
    };

    const statusColor = statusColors[machine.status] || '#6b7280';

    // Status indicator with glow effect
    if (graphicsConfig.enableAnimations) {
      const time = Date.now() / 1000;
      const pulse = machine.status === 'in_use' ? Math.sin(time * 2) * 0.2 + 0.8 : 1;
      ctx.globalAlpha = pulse;
    }

    ctx.fillStyle = statusColor;
    ctx.beginPath();
    ctx.arc(statusX, statusY, statusSize/2, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;

    // Status border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [graphicsConfig]);

  // Machine label rendering
  const renderMachineLabel = useCallback((ctx, machine, template) => {
    const { height } = template;
    
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 3;
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    const labelY = height/2 + 10;
    
    // Text outline
    ctx.strokeText(machine.name, 0, labelY);
    ctx.fillText(machine.name, 0, labelY);
  }, []);

  // Custom element rendering
  const renderCustomElement = useCallback((ctx, element) => {
    const { x, y, width, height, type, style } = element;

    switch (type) {
      case 'wall':
        ctx.fillStyle = style.color || '#64748b';
        ctx.fillRect(x, y, width, height);
        break;
      case 'door':
        ctx.fillStyle = style.color || '#8b5cf6';
        ctx.fillRect(x, y, width, height);
        // Door handle
        ctx.fillStyle = '#374151';
        ctx.beginPath();
        ctx.arc(x + width - 10, y + height/2, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'safety-zone':
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(x, y, width, height);
        ctx.setLineDash([]);
        break;
    }
  }, []);

  // Selection overlay rendering
  const renderSelectionOverlay = useCallback((ctx, element) => {
    if (!element) return;

    const { x, y, width, height } = element;
    
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x - 5, y - 5, width + 10, height + 10);
    ctx.setLineDash([]);

    // Selection handles
    const handleSize = 8;
    const handles = [
      { x: x - handleSize/2, y: y - handleSize/2 }, // Top-left
      { x: x + width - handleSize/2, y: y - handleSize/2 }, // Top-right
      { x: x - handleSize/2, y: y + height - handleSize/2 }, // Bottom-left
      { x: x + width - handleSize/2, y: y + height - handleSize/2 } // Bottom-right
    ];

    ctx.fillStyle = '#3b82f6';
    handles.forEach(handle => {
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
    });
  }, []);

  // Utility functions
  const createTextureCanvas = useCallback((pattern, width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    // Parse pattern string and apply
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
    
    return canvas;
  }, []);

  const adjustBrightness = useCallback((color, percent) => {
    const hex = color.replace('#', '');
    const r = Math.min(255, Math.max(0, parseInt(hex.substr(0, 2), 16) + percent));
    const g = Math.min(255, Math.max(0, parseInt(hex.substr(2, 2), 16) + percent));
    const b = Math.min(255, Math.max(0, parseInt(hex.substr(4, 2), 16) + percent));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }, []);

  const snapToGridPosition = useCallback((x, y) => {
    if (!snapToGrid) return { x, y };
    const { gridSize } = layoutConfig;
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize
    };
  }, [snapToGrid, layoutConfig]);

  // Event handlers
  const handleCanvasClick = useCallback((event) => {
    if (!isEditing) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const { scale, offsetX, offsetY } = viewportTransform;
    const x = (event.clientX - rect.left) / scale - offsetX;
    const y = (event.clientY - rect.top) / scale - offsetY;

    // Handle tool actions
    switch (selectedTool) {
      case 'room':
        addRoom(x, y);
        break;
      case 'machine':
        addMachine(x, y);
        break;
      case 'screen':
        addScreen(x, y);
        break;
      case 'select':
        selectElementAt(x, y);
        break;
    }
  }, [isEditing, selectedTool, viewportTransform]);

  const addRoom = useCallback((x, y) => {
    const snapped = snapToGridPosition(x, y);
    const newRoom = {
      id: `room-${Date.now()}`,
      ...roomTemplates[0],
      x: snapped.x,
      y: snapped.y
    };

    setLayoutConfig(prev => ({
      ...prev,
      rooms: [...prev.rooms, newRoom]
    }));
  }, [roomTemplates, snapToGridPosition]);

  const addMachine = useCallback((x, y) => {
    const snapped = snapToGridPosition(x, y);
    // This would typically create a machine placeholder
    // For now, we'll just update position of existing machines
    console.log('Add machine at:', snapped);
  }, [snapToGridPosition]);

  const addScreen = useCallback((x, y) => {
    const snapped = snapToGridPosition(x, y);
    const newScreen = {
      id: `screen-${Date.now()}`,
      ...screenTemplates[0],
      x: snapped.x,
      y: snapped.y
    };

    setLayoutConfig(prev => ({
      ...prev,
      screens: [...prev.screens, newScreen]
    }));
  }, [screenTemplates, snapToGridPosition]);

  const selectElementAt = useCallback((x, y) => {
    // Find element at position
    let foundElement = null;

    // Check screens
    for (const screen of layoutConfig.screens) {
      if (x >= screen.x && x <= screen.x + screen.width &&
          y >= screen.y && y <= screen.y + screen.height) {
        foundElement = { ...screen, type: 'screen' };
        break;
      }
    }

    // Check rooms if no screen found
    if (!foundElement) {
      for (const room of layoutConfig.rooms) {
        if (x >= room.x && x <= room.x + room.width &&
            y >= room.y && y <= room.y + room.height) {
          foundElement = { ...room, type: 'room' };
          break;
        }
      }
    }

    // Check machines if no room found
    if (!foundElement) {
      for (const machine of machines) {
        const position = machinePositions.get(machine.id);
        if (position) {
          const template = machineTemplates[machine.type] || machineTemplates['blending'];
          if (x >= position.x && x <= position.x + template.width &&
              y >= position.y && y <= position.y + template.height) {
            foundElement = { ...machine, ...position, type: 'machine' };
            break;
          }
        }
      }
    }

    setSelectedElement(foundElement);
    setShowPropertiesPanel(!!foundElement);
  }, [layoutConfig, machines, machinePositions, machineTemplates]);

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const container = containerRef.current;

    // Set canvas size with high DPI support
    const updateCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      
      ctx.scale(dpr, dpr);
      renderFactory(ctx);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [renderFactory]);

  // Animation loop
  useEffect(() => {
    if (!graphicsConfig.enableAnimations) return;

    let animationId;
    const animate = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        renderFactory(ctx);
      }
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [renderFactory, graphicsConfig.enableAnimations]);

  // Initialize machine positions
  useEffect(() => {
    if (machines.length > 0 && machinePositions.size === 0) {
      const newPositions = new Map();
      machines.forEach((machine, index) => {
        const x = 200 + (index * 120);
        const y = 200;
        newPositions.set(machine.id, { x, y });
      });
      setMachinePositions(newPositions);
    }
  }, [machines, machinePositions.size]);

  // Toolbar component
  const Toolbar = () => (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isEditing ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Edit3 className="w-4 h-4 inline mr-2" />
            {isEditing ? 'Exit Edit' : 'Edit Layout'}
          </button>

          {isEditing && (
            <>
              <div className="border-l border-gray-300 pl-4">
                <div className="flex space-x-2">
                  {[
                    { id: 'select', icon: MousePointer, label: 'Select' },
                    { id: 'move', icon: Hand, label: 'Move' },
                    { id: 'room', icon: Square, label: 'Add Room' },
                    { id: 'machine', icon: Settings, label: 'Add Machine' },
                    { id: 'screen', icon: Monitor, label: 'Add Screen' }
                  ].map(tool => (
                    <button
                      key={tool.id}
                      onClick={() => setSelectedTool(tool.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        selectedTool === tool.id ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      title={tool.label}
                    >
                      <tool.icon className="w-5 h-5" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-l border-gray-300 pl-4">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowGrid(!showGrid)}
                    className={`p-2 rounded-lg transition-colors ${
                      showGrid ? 'bg-green-100 text-green-600' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title="Toggle Grid"
                  >
                    <Grid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowLabels(!showLabels)}
                    className={`p-2 rounded-lg transition-colors ${
                      showLabels ? 'bg-green-100 text-green-600' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title="Toggle Labels"
                  >
                    {showLabels ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => setSnapToGrid(!snapToGrid)}
                    className={`p-2 rounded-lg transition-colors ${
                      snapToGrid ? 'bg-green-100 text-green-600' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title="Snap to Grid"
                  >
                    <Maximize2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setViewportTransform(prev => ({ ...prev, scale: Math.min(3, prev.scale * 1.2) }))}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              title="Zoom In"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewportTransform(prev => ({ ...prev, scale: Math.max(0.1, prev.scale / 1.2) }))}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              title="Zoom Out"
            >
              <Minus className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewportTransform({ scale: 1, offsetX: 0, offsetY: 0 })}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              title="Reset View"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          <div className="border-l border-gray-300 pl-4">
            <div className="flex space-x-2">
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Import Layout">
                <Upload className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Export Layout">
                <Download className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Save Layout">
                <Save className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Properties panel component
  const PropertiesPanel = () => (
    showPropertiesPanel && selectedElement && (
      <div className="absolute top-0 right-0 w-80 h-full bg-white border-l border-gray-200 shadow-lg overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Properties</h3>
            <button
              onClick={() => setShowPropertiesPanel(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={selectedElement.name || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                readOnly={!isEditing}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
                <input
                  type="number"
                  value={selectedElement.width || 0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  readOnly={!isEditing}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
                <input
                  type="number"
                  value={selectedElement.height || 0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  readOnly={!isEditing}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">X Position</label>
                <input
                  type="number"
                  value={selectedElement.x || 0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  readOnly={!isEditing}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Y Position</label>
                <input
                  type="number"
                  value={selectedElement.y || 0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  readOnly={!isEditing}
                />
              </div>
            </div>

            {selectedElement.type === 'screen' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Screen Type</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="dashboard">Dashboard</option>
                    <option value="status">Status Display</option>
                    <option value="metrics">Metrics</option>
                    <option value="emergency">Emergency Panel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="production-overview">Production Overview</option>
                    <option value="machine-data">Machine Data</option>
                    <option value="performance-kpis">Performance KPIs</option>
                    <option value="safety-controls">Safety Controls</option>
                  </select>
                </div>
              </>
            )}

            {selectedElement.type === 'room' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="production">Production</option>
                    <option value="quality">Quality Control</option>
                    <option value="storage">Storage</option>
                    <option value="office">Office</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
                  <input
                    type="color"
                    value={selectedElement.color || '#ffffff'}
                    className="w-full h-10 border border-gray-300 rounded-md"
                  />
                </div>
              </>
            )}

            {selectedElement.type === 'machine' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Machine Type</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="blending">Blending</option>
                    <option value="packaging">Packaging</option>
                    <option value="beverage">Beverage</option>
                    <option value="quality-station">Quality Station</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="available">Available</option>
                    <option value="in_use">In Use</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scale</label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    defaultValue="1"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rotation</label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="15"
                    defaultValue="0"
                    className="w-full"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  );

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Toolbar />
      
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="absolute inset-0 cursor-crosshair"
          style={{ 
            cursor: selectedTool === 'select' ? 'default' : 
                   selectedTool === 'move' ? 'move' : 'crosshair'
          }}
        />
        
        <PropertiesPanel />
        
        {/* Status bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2">
          <div className="flex justify-between text-sm text-gray-600">
            <div>
              Zoom: {Math.round(viewportTransform.scale * 100)}% | 
              Layout: {layoutConfig.width}×{layoutConfig.height} | 
              Quality: {graphicsConfig.quality.toUpperCase()}
            </div>
            <div>
              Rooms: {layoutConfig.rooms.length} | 
              Screens: {layoutConfig.screens.length} | 
              Machines: {machines.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Advanced2DFactory;