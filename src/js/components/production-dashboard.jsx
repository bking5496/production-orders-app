import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Activity, Clock, Users, AlertTriangle, Pause, Play, RefreshCw, Filter, TrendingUp, Eye, X, Wifi, Zap, Target, Timer, BarChart3, Gauge, Factory, Settings, CheckCircle, XCircle, Wrench } from 'lucide-react';
import API from '../core/api';
import Time from '../core/time';
import { Icon } from './layout-components.jsx';
import { useOrderUpdates, useMachineUpdates, useWebSocketEvent, useAutoConnect, useNotifications } from '../core/websocket-hooks.js';
import { WebSocketStatusCompact, WebSocketIndicator } from './websocket-status.jsx';

// Advanced Animated Counter Component
const AnimatedCounter = ({ value, duration = 2000, prefix = '', suffix = '', className = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startTimeRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const startAnimation = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(easeOutCubic * value));
      
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(startAnimation);
      }
    };

    startTimeRef.current = null;
    frameRef.current = requestAnimationFrame(startAnimation);
    
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
};

// Ultra-Modern KPI Card with Advanced Animations
const UltraKPICard = ({ title, value, change, icon: Icon, color = "blue", target, trend, sparklineData = [] }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  const colorClasses = {
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-green-500 to-emerald-500',
    yellow: 'from-yellow-500 to-orange-500',
    purple: 'from-purple-500 to-pink-500',
    red: 'from-red-500 to-pink-500',
    gray: 'from-gray-500 to-slate-500'
  };

  const bgColors = {
    blue: 'bg-gradient-to-br from-blue-50 to-cyan-50',
    green: 'bg-gradient-to-br from-green-50 to-emerald-50',
    yellow: 'bg-gradient-to-br from-yellow-50 to-orange-50',
    purple: 'bg-gradient-to-br from-purple-50 to-pink-50',
    red: 'bg-gradient-to-br from-red-50 to-pink-50',
    gray: 'bg-gradient-to-br from-gray-50 to-slate-50'
  };

  return (
    <div
      ref={cardRef}
      className={`relative overflow-hidden rounded-2xl ${bgColors[color]} backdrop-blur-xl
        border border-white/20 shadow-xl transition-all duration-500 ease-out
        ${isHovered ? 'transform scale-105 shadow-2xl' : 'transform scale-100'}
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ 
        background: isHovered ? 
          `linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)` : 
          undefined,
        backdropFilter: 'blur(20px)'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color]} opacity-10 
        transition-opacity duration-500 ${isHovered ? 'opacity-20' : 'opacity-10'}`}></div>
      
      {/* Floating Particles Effect */}
      {isHovered && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/30 rounded-full animate-float"
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${20 + Math.random() * 60}%`,
                animationDelay: `${i * 0.2}s`,
                animationDuration: '3s'
              }}
            ></div>
          ))}
        </div>
      )}

      <div className="relative p-6">
        {/* Header with Icon */}
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} 
            shadow-lg transform transition-transform duration-300 
            ${isHovered ? 'scale-110 rotate-3' : 'scale-100 rotate-0'}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {change !== undefined && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold
              ${change >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              <TrendingUp className={`w-3 h-3 ${change < 0 ? 'rotate-180' : ''}`} />
              {Math.abs(change)}%
            </div>
          )}
        </div>

        {/* Value with Animation */}
        <div className="mb-2">
          <div className="text-3xl font-bold text-gray-800 mb-1">
            <AnimatedCounter 
              value={value} 
              duration={2000}
              className="text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-600"
            />
          </div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
        </div>

        {/* Progress Indicator */}
        {target && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-500">Progress</span>
              <span className="text-xs font-semibold text-gray-700">
                {Math.round((value / target) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-2 bg-gradient-to-r ${colorClasses[color]} rounded-full 
                  transition-all duration-1000 ease-out`}
                style={{ 
                  width: `${Math.min((value / target) * 100, 100)}%`,
                  transform: isVisible ? 'translateX(0)' : 'translateX(-100%)'
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Sparkline Chart */}
        {sparklineData.length > 0 && (
          <div className="mt-4 h-12 flex items-end justify-between gap-1">
            {sparklineData.map((point, index) => {
              const height = Math.max((point / Math.max(...sparklineData)) * 100, 5);
              return (
                <div
                  key={index}
                  className={`bg-gradient-to-t ${colorClasses[color]} rounded-sm transition-all duration-500 opacity-70`}
                  style={{ 
                    height: `${height}%`,
                    width: `${100 / sparklineData.length - 2}%`,
                    animationDelay: `${index * 100}ms`
                  }}
                ></div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hover Glow Effect */}
      <div className={`absolute inset-0 rounded-2xl transition-opacity duration-300
        ${isHovered ? 'opacity-100' : 'opacity-0'}`}
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 70%)`,
          pointerEvents: 'none'
        }}
      ></div>
    </div>
  );
};

// Enhanced Machine Status Card with Ultra-Modern Design
const UltraMachineStatusCard = ({ machine, onClick }) => {
    const [tick, setTick] = useState(0);
    const [recentUpdate, setRecentUpdate] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const cardRef = useRef(null);
    
    // Intersection Observer for entrance animations
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => setIsVisible(entry.isIntersecting),
            { threshold: 0.1 }
        );
        if (cardRef.current) observer.observe(cardRef.current);
        return () => observer.disconnect();
    }, []);
    
    // Show pulse animation for recent updates
    useEffect(() => {
        setRecentUpdate(true);
        const timer = setTimeout(() => setRecentUpdate(false), 2000);
        return () => clearTimeout(timer);
    }, [machine.status, machine.order_number]);
    
    useEffect(() => {
        if (machine.status === 'in_use') {
            const timer = setInterval(() => setTick(t => t + 1), 1000);
            return () => clearInterval(timer);
        }
    }, [machine.status]);

    const statusConfig = {
        available: { 
            gradient: 'from-green-500 to-emerald-500',
            bg: 'from-green-50 to-emerald-50',
            text: 'text-green-700', 
            icon: CheckCircle,
            pulse: 'bg-green-500',
            glow: 'shadow-green-500/25'
        },
        in_use: { 
            gradient: 'from-blue-500 to-cyan-500',
            bg: 'from-blue-50 to-cyan-50',
            text: 'text-blue-700', 
            icon: Zap,
            pulse: 'bg-blue-500',
            glow: 'shadow-blue-500/25'
        },
        maintenance: { 
            gradient: 'from-yellow-500 to-orange-500',
            bg: 'from-yellow-50 to-orange-50',
            text: 'text-yellow-700', 
            icon: Wrench,
            pulse: 'bg-yellow-500',
            glow: 'shadow-yellow-500/25'
        },
        offline: { 
            gradient: 'from-red-500 to-pink-500',
            bg: 'from-red-50 to-pink-50',
            text: 'text-red-700', 
            icon: XCircle,
            pulse: 'bg-red-500',
            glow: 'shadow-red-500/25'
        },
    };

    const config = statusConfig[machine.status] || statusConfig.offline;
    const StatusIcon = config.icon;
    const efficiency = calculateEfficiency(machine);
    const isRunning = machine.status === 'in_use';
    const hasAssignedOrder = machine.order_number;

    return (
        <div
            ref={cardRef}
            className={`group relative overflow-hidden rounded-2xl backdrop-blur-xl
                border border-white/20 shadow-xl transition-all duration-500 ease-out
                ${hasAssignedOrder ? 'cursor-pointer' : 'cursor-default'}
                ${isHovered ? `transform scale-105 shadow-2xl ${config.glow}` : 'transform scale-100'}
                ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
                bg-gradient-to-br ${config.bg}`}
            style={{ 
                background: isHovered ? 
                    `linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 100%)` : 
                    undefined,
                backdropFilter: 'blur(20px)',
                animationDelay: `${Math.random() * 200}ms`
            }}
            onClick={() => onClick && onClick(machine)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Animated Background Pattern */}
            <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-5 
                transition-opacity duration-500 ${isHovered ? 'opacity-15' : 'opacity-5'}`}></div>
            
            {/* Status Indicator Glow */}
            <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${config.pulse} 
                ${recentUpdate ? 'animate-ping' : ''} opacity-20`}></div>
            <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${config.pulse}`}></div>

            <div className="relative p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-xl bg-gradient-to-br ${config.gradient} 
                                shadow-lg transform transition-transform duration-300 
                                ${isHovered ? 'scale-110 rotate-3' : 'scale-100 rotate-0'}`}>
                                <StatusIcon className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 text-sm">{machine.name}</h3>
                                <p className="text-xs text-gray-500">{machine.type}</p>
                            </div>
                        </div>
                        
                        {/* Status Badge */}
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold
                            bg-gradient-to-r ${config.gradient} text-white shadow-lg`}>
                            {machine.status.replace('_', ' ').toUpperCase()}
                            {isRunning && efficiency > 0 && (
                                <span className="bg-white/20 px-2 py-0.5 rounded-full">
                                    {efficiency}%
                                </span>
                            )}
                        </div>
                    </div>
                    
                    {hasAssignedOrder && (
                        <Eye className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors ml-2" />
                    )}
                </div>
                
                {/* Order Information */}
                {hasAssignedOrder ? (
                    <div className="space-y-4">
                        {/* Order Card */}
                        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-800 truncate">{machine.order_number}</p>
                                    <p className="text-xs text-gray-600 truncate">{machine.product_name}</p>
                                </div>
                                {machine.order_status === 'stopped' && (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-red-100 rounded-full">
                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                        <span className="text-xs font-semibold text-red-700">STOPPED</span>
                                    </div>
                                )}
                            </div>
                            
                            {/* Runtime */}
                            <div className="flex items-center gap-2 text-gray-600">
                                <Timer className="w-4 h-4" />
                                <span className="text-lg font-mono font-bold">
                                    {formatDuration(machine.start_time)}
                                </span>
                                {machine.operator && (
                                    <div className="flex items-center gap-1 ml-auto">
                                        <Users className="w-3 h-3" />
                                        <span className="text-xs font-medium truncate max-w-16">
                                            {machine.operator}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Efficiency Bar */}
                        {efficiency > 0 && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-medium text-gray-600">Efficiency</span>
                                    <span className="text-xs font-bold text-gray-800">{efficiency}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                    <div 
                                        className={`h-2 bg-gradient-to-r transition-all duration-1000 ease-out rounded-full ${
                                            efficiency >= 90 ? 'from-green-500 to-emerald-500' :
                                            efficiency >= 70 ? 'from-yellow-500 to-orange-500' : 
                                            'from-red-500 to-pink-500'
                                        }`}
                                        style={{ 
                                            width: `${Math.min(efficiency, 100)}%`,
                                            transform: isVisible ? 'translateX(0)' : 'translateX(-100%)'
                                        }}
                                    ></div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-20">
                        <div className="text-center text-gray-400">
                            <Factory className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-xs font-medium">
                                {machine.status.replace('_', ' ').toUpperCase()}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Hover Shimmer Effect */}
            <div className={`absolute inset-0 rounded-2xl transition-opacity duration-300
                ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                style={{
                    background: `linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)`,
                    transform: isHovered ? 'translateX(100%)' : 'translateX(-100%)',
                    transition: 'transform 0.6s ease-out, opacity 0.3s ease-out',
                    pointerEvents: 'none'
                }}
            ></div>
        </div>
    );
};

// Helper to format time from a start date to now, creating a running timer effect
const formatDuration = (sastStartTime) => {
    if (!sastStartTime) return '00:00:00';
    
    const start = Time.toSAST(sastStartTime).getTime();
    const now = Time.getSASTTimestamp();
    const diff = Math.max(0, now - start);

    const hours = Math.floor(diff / 3600000).toString().padStart(2, '0');
    const minutes = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
    const seconds = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
};

// Helper to calculate efficiency percentage
const calculateEfficiency = (machine) => {
    if (!machine.start_time || machine.status !== 'in_use') return 0;
    
    // Work with UTC timestamps
    const startTime = new Date(machine.start_time).getTime();
    const runtime = Date.now() - startTime;
    const expectedProduction = (runtime / 3600000) * (machine.production_rate || 60);
    const actualProduction = machine.actual_quantity || 0;
    return expectedProduction > 0 ? Math.min(100, Math.round((actualProduction / expectedProduction) * 100)) : 0;
};

// Ultra-Modern Production Summary with Advanced KPIs
const UltraProductionSummary = ({ machines, activeOrders, todayStats, efficiency }) => {
    const [isVisible, setIsVisible] = useState(false);
    const sectionRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => setIsVisible(entry.isIntersecting),
            { threshold: 0.1 }
        );
        if (sectionRef.current) observer.observe(sectionRef.current);
        return () => observer.disconnect();
    }, []);

    const stats = useMemo(() => {
        const total = machines.length;
        const running = machines.filter(m => m.status === 'in_use').length;
        const available = machines.filter(m => m.status === 'available').length;
        const maintenance = machines.filter(m => m.status === 'maintenance').length;
        const offline = machines.filter(m => m.status === 'offline').length;
        
        const avgEfficiency = efficiency || (running > 0 ? 
            Math.round(machines.filter(m => m.status === 'in_use')
                .reduce((acc, m) => acc + calculateEfficiency(m), 0) / running) : 0);

        const utilizationRate = total > 0 ? Math.round((running / total) * 100) : 0;

        return { 
            total, 
            running, 
            available, 
            maintenance, 
            offline, 
            avgEfficiency,
            utilizationRate,
            activeOrders: activeOrders.length,
            totalOrders: todayStats.total_orders || 0,
            completedOrders: todayStats.completed_orders || 0
        };
    }, [machines, activeOrders, todayStats, efficiency]);

    const kpiData = [
        { 
            title: 'Total Machines', 
            value: stats.total, 
            icon: Factory, 
            color: 'gray',
            change: undefined,
            target: undefined
        },
        { 
            title: 'Running Now', 
            value: stats.running, 
            icon: Zap, 
            color: 'blue',
            change: undefined,
            target: stats.total,
            sparklineData: [2, 4, 3, 5, 4, 6, 5, 7, 6, stats.running]
        },
        { 
            title: 'Available', 
            value: stats.available, 
            icon: CheckCircle, 
            color: 'green',
            change: undefined,
            target: undefined
        },
        { 
            title: 'Utilization Rate', 
            value: stats.utilizationRate, 
            icon: Gauge, 
            color: 'purple',
            change: 12,
            target: 100,
            sparklineData: [65, 70, 68, 75, 72, 78, 76, 82, 79, stats.utilizationRate]
        },
        { 
            title: 'Active Orders', 
            value: stats.activeOrders, 
            icon: Target, 
            color: 'yellow',
            change: 8,
            target: stats.totalOrders,
            sparklineData: [1, 2, 3, 2, 4, 3, 5, 4, 6, stats.activeOrders]
        },
        { 
            title: 'Maintenance', 
            value: stats.maintenance, 
            icon: Wrench, 
            color: 'yellow',
            change: -3,
            target: undefined
        }
    ];

    return (
        <div ref={sectionRef} className="space-y-6">
            {/* Header */}
            <div className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                        <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    Production Performance
                </h2>
                <p className="text-gray-600">Real-time insights into your manufacturing operations</p>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                {kpiData.map((kpi, index) => (
                    <div
                        key={kpi.title}
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        <UltraKPICard {...kpi} />
                    </div>
                ))}
            </div>
        </div>
    );
};

// Order Details Modal Component (Enhanced)
const OrderDetailsModal = ({ isOpen, onClose, orderId, orderNumber }) => {
    const [orderDetails, setOrderDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [tick, setTick] = useState(0);

    const fetchOrderDetails = useCallback(async () => {
        if (!orderId || !isOpen) return;
        
        setLoading(true);
        setError('');
        
        try {
            console.log('Fetching order details for ID:', orderId);
            
            const ordersResponse = await API.get('/orders');
            console.log('Orders response:', ordersResponse);
            
            const orders = ordersResponse.data || ordersResponse || [];
            const order = orders.find(o => o.id == orderId);
            
            if (!order) {
                throw new Error(`Order with ID ${orderId} not found`);
            }
            
            let stops = [];
            try {
                const downtimeResponse = await API.get(`/reports/downtime?order_id=${orderId}`);
                const downtimeData = downtimeResponse?.data || downtimeResponse;
                stops = downtimeData?.records || downtimeData || [];
                console.log('📋 Downtime response for order', orderId, ':', stops);
                
                if (!Array.isArray(stops) || stops.length === 0) {
                    console.log('🔄 No stops found for specific order, trying all stops...');
                    const allStopsResponse = await API.get('/reports/downtime');
                    const allStopsData = allStopsResponse?.data || allStopsResponse;
                    const allStops = allStopsData?.records || allStopsData || [];
                    console.log('📊 All stops:', allStops);
                    stops = Array.isArray(allStops) ? allStops.filter(stop => stop.order_id == orderId) : [];
                }
            } catch (downtimeError) {
                console.log('Downtime endpoint error:', downtimeError);
                stops = [];
            }
            
            setOrderDetails({
                order: order,
                stops: Array.isArray(stops) ? stops : []
            });
        } catch (error) {
            console.error('Failed to fetch order details:', error);
            setError(error.message || 'Failed to load order details');
        } finally {
            setLoading(false);
        }
    }, [orderId, isOpen]);

    useEffect(() => {
        fetchOrderDetails();
    }, [fetchOrderDetails]);

    useEffect(() => {
        if (isOpen && orderDetails?.stops?.some(stop => !stop.end_time)) {
            const timer = setInterval(() => setTick(t => t + 1), 1000);
            return () => clearInterval(timer);
        }
    }, [isOpen, orderDetails?.stops]);

    const calculateTotalDowntime = useCallback((stops) => {
        if (!stops || !Array.isArray(stops) || stops.length === 0) return 0;
        
        return stops.reduce((total, stop) => {
            if (stop.start_time) {
                const startTime = new Date(stop.start_time).getTime();
                let endTime;
                
                if (stop.end_time) {
                    endTime = new Date(stop.end_time).getTime();
                } else {
                    endTime = Date.now();
                }
                
                return total + (endTime - startTime);
            }
            return total;
        }, 0);
    }, [tick]);

    const formatDowntimeDuration = useCallback((milliseconds) => {
        if (!milliseconds || milliseconds === 0) return '0m';
        
        const minutes = Math.floor(milliseconds / 60000);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        }
        return `${minutes}m`;
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
                    onClick={onClose}
                />
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                <div className="inline-block align-bottom bg-white/95 backdrop-blur-xl rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full border border-white/20">
                    {/* Ultra-Modern Header */}
                    <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 px-8 py-6 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent)]"></div>
                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                                    <Target className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-white">{orderNumber}</h3>
                                    {orderDetails && (
                                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mt-1 ${
                                            orderDetails.order.status === 'stopped' ? 'bg-red-500/20 text-red-200 border border-red-500/30' : 
                                            orderDetails.order.status === 'in_progress' ? 'bg-blue-500/20 text-blue-200 border border-blue-500/30' :
                                            orderDetails.order.status === 'completed' ? 'bg-green-500/20 text-green-200 border border-green-500/30' : 
                                            'bg-gray-500/20 text-gray-200 border border-gray-500/30'
                                        }`}>
                                            {orderDetails.order.status === 'stopped' && (
                                                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                                            )}
                                            {orderDetails.order.status.replace('_', ' ').toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-white/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20 rounded-xl p-2 hover:bg-white/10 transition-all duration-200"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    <div className="p-8">
                        {loading && (
                            <div className="flex items-center justify-center py-12">
                                <div className="flex items-center gap-3">
                                    <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                                    <span className="text-gray-600 font-medium">Loading order details...</span>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                    <span className="text-red-800 font-medium">{error}</span>
                                </div>
                            </div>
                        )}

                        {orderDetails && !loading && (
                            <div className="space-y-8">
                                {/* Production Metrics */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
                                        <div className="text-center">
                                            <Clock className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                                            <div className="text-lg font-bold text-gray-900">
                                                {orderDetails.order.start_time ? 
                                                    new Date(orderDetails.order.start_time).toLocaleString('en-ZA', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        hour12: false
                                                    }) : '--:--'}
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                {orderDetails.order.start_time ? 
                                                    new Date(orderDetails.order.start_time).toLocaleDateString('en-ZA', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    }) : 'Started'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                                        <div className="text-center">
                                            <Target className="w-6 h-6 text-green-500 mx-auto mb-2" />
                                            <div className="text-lg font-bold text-gray-900">
                                                {orderDetails.order.quantity?.toLocaleString() || '0'}
                                            </div>
                                            <div className="text-sm text-gray-600">Target Qty</div>
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                                        <div className="text-center">
                                            <BarChart3 className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                                            <div className="text-lg font-bold text-gray-900">
                                                {(orderDetails.order.actual_quantity || 0).toLocaleString()}
                                            </div>
                                            <div className="text-sm text-gray-600">Produced</div>
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-100">
                                        <div className="text-center">
                                            <Gauge className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                                            <div className="text-lg font-bold text-gray-900">
                                                {Math.round(((orderDetails.order.actual_quantity || 0) / orderDetails.order.quantity) * 100)}%
                                            </div>
                                            <div className="text-sm text-gray-600">Complete</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Enhanced Downtime Analysis */}
                                <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-2xl p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h4 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                                            <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg">
                                                <AlertTriangle className="w-5 h-5 text-white" />
                                            </div>
                                            Downtime Analysis
                                        </h4>
                                        {orderDetails.order.status === 'stopped' && (
                                            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-100 px-3 py-2 rounded-full border border-red-200">
                                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                                <span className="font-semibold">ACTIVE STOP</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="text-center">
                                            <div className="text-3xl font-bold text-orange-600 mb-2">
                                                <AnimatedCounter value={orderDetails.stops.length} />
                                            </div>
                                            <div className="text-sm text-gray-600 font-medium">Total Stops</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-3xl font-bold text-red-600 mb-2">
                                                {formatDowntimeDuration(calculateTotalDowntime(orderDetails.stops))}
                                            </div>
                                            <div className="text-sm text-gray-600 font-medium">Total Time</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-3xl font-bold text-red-500 mb-2">
                                                {orderDetails.stops.length > 0 ? 
                                                    formatDowntimeDuration(calculateTotalDowntime(orderDetails.stops) / orderDetails.stops.length) : '0m'}
                                            </div>
                                            <div className="text-sm text-gray-600 font-medium">Avg Duration</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Stop History */}
                                {(!orderDetails.stops || !Array.isArray(orderDetails.stops) || orderDetails.stops.length === 0) ? (
                                    <div className="text-center py-12">
                                        <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                            <Clock className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <p className="text-gray-500 text-lg font-medium">No stops recorded</p>
                                        <p className="text-gray-400 text-sm">This order has been running smoothly</p>
                                    </div>
                                ) : (
                                    <div>
                                        <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                            <div className="p-2 bg-gradient-to-r from-gray-500 to-slate-500 rounded-lg">
                                                <Clock className="w-5 h-5 text-white" />
                                            </div>
                                            Stop History ({orderDetails.stops.length})
                                        </h4>
                                        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                            {(orderDetails.stops || []).map((stop, index) => (
                                                <div key={index} className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-md transition-all duration-200">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <div className={`w-3 h-3 rounded-full ${!stop.end_time ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
                                                                <span className="font-semibold text-gray-900 text-sm">
                                                                    {stop.reason.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                                </span>
                                                                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                                                                    stop.category === 'Equipment' ? 'bg-red-100 text-red-700 border border-red-200' :
                                                                    stop.category === 'Material' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                                                                    stop.category === 'Quality' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                                                    'bg-gray-100 text-gray-700 border border-gray-200'
                                                                }`}>
                                                                    {stop.category || 'Other'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                <span className="font-mono">
                                                                    {new Date(stop.start_time).toLocaleString('en-ZA', {
                                                                        month: 'short',
                                                                        day: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit',
                                                                        hour12: false
                                                                    })}
                                                                </span>
                                                                {stop.end_time && (
                                                                    <>
                                                                        <span>→</span>
                                                                        <span className="font-mono">
                                                                            {new Date(stop.end_time).toLocaleString('en-ZA', {
                                                                                hour: '2-digit',
                                                                                minute: '2-digit',
                                                                                hour12: false
                                                                            })}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-right ml-4">
                                                            <div className={`text-lg font-bold ${!stop.end_time ? 'text-red-600' : 'text-gray-900'}`}>
                                                                {stop.start_time ? 
                                                                    formatDowntimeDuration(
                                                                        stop.end_time ? 
                                                                            new Date(stop.end_time).getTime() - new Date(stop.start_time).getTime() :
                                                                            Date.now() - new Date(stop.start_time).getTime()
                                                                    ) : 
                                                                    <span className="text-orange-500">Unknown</span>}
                                                            </div>
                                                            <div className={`text-xs font-medium ${!stop.end_time ? 'text-red-600' : 'text-gray-500'}`}>
                                                                {!stop.end_time ? 'ACTIVE' : 'resolved'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {/* Footer */}
                    <div className="bg-gray-50/80 backdrop-blur-sm px-8 py-6 border-t border-gray-200">
                        <div className="flex justify-end">
                            <button
                                onClick={onClose}
                                className="px-8 py-3 bg-gradient-to-r from-gray-900 to-slate-800 text-white rounded-xl hover:from-gray-800 hover:to-slate-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function UltraProductionFloorMonitor() {
    const [overviewData, setOverviewData] = useState({
        activeOrders: [],
        machineStatus: [],
        todayStats: {},
        efficiency: 0
    });
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [error, setError] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [refreshing, setRefreshing] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showOrderModal, setShowOrderModal] = useState(false);

    // WebSocket integration for real-time production monitoring
    useAutoConnect();
    const { lastUpdate: orderUpdate } = useOrderUpdates();
    const { lastUpdate: machineUpdate } = useMachineUpdates();
    const { notifications: wsNotifications } = useNotifications();

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const response = await API.get('/production/floor-overview');
            const data = response?.data || response;
            console.log('✅ Production floor overview data:', data);
            
            const activeOrders = data?.activeOrders || [];
            const machineStatus = data?.machineStatus || [];
            const todayStats = data?.todayStats || {};
            
            console.log('📊 Active orders:', activeOrders.length);
            console.log('🏭 Machine status:', machineStatus.length);
            console.log('📈 Today stats:', todayStats);
            
            setOverviewData(data || {});
        } catch (error) {
            console.error("Failed to fetch production data:", error);
            setError(error.message || 'Failed to fetch production data');
        } finally {
            setLoading(false);
            setLastUpdated(new Date());
            setRefreshing(false);
        }
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleMachineClick = (machine) => {
        if (machine.order_id && machine.order_number) {
            setSelectedOrder({
                id: machine.order_id,
                number: machine.order_number,
                machineId: machine.id,
                machineName: machine.name,
                status: machine.status
            });
            setShowOrderModal(true);
        } else {
            console.log('Machine clicked (no assigned order):', machine);
        }
    };

    useEffect(() => {
        // Check authentication before loading data
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('⚠️ No authentication token found - user needs to log in');
            setLoading(false);
            return;
        }
        
        fetchData();
        const interval = setInterval(() => {
            console.log('🔄 Periodic refresh - reloading production dashboard');
            fetchData();
        }, 5000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // WebSocket real-time updates
    useWebSocketEvent('order_started', (data) => {
        console.log('🟢 Production started:', data.data.order);
        fetchData();
        setLastUpdated(new Date());
    }, [fetchData]);

    useWebSocketEvent('order_stopped', (data) => {
        console.log('🟡 Production stopped:', data.data.order);
        setOverviewData(prevData => {
            return prevData.map(machine => 
                machine.id === data.data.order.machine_id
                    ? { ...machine, status: 'available', order_number: null, order_id: null }
                    : machine
            );
        });
        setLastUpdated(new Date());
    }, []);

    useWebSocketEvent('order_resumed', (data) => {
        console.log('🔵 Production resumed:', data.data.order);
        setOverviewData(prevData => {
            return prevData.map(machine => 
                machine.id === data.data.order.machine_id
                    ? { 
                        ...machine, 
                        status: 'in_use', 
                        order_number: data.data.order.order_number,
                        order_id: data.data.order.id,
                        start_time: data.data.order.start_time
                    }
                    : machine
            );
        });
        setLastUpdated(new Date());
    }, []);

    useWebSocketEvent('order_completed', (data) => {
        console.log('✅ Production completed:', data.data.order);
        setOverviewData(prevData => {
            return prevData.map(machine => 
                machine.id === data.data.order.machine_id
                    ? { ...machine, status: 'available', order_number: null, order_id: null }
                    : machine
            );
        });
        setLastUpdated(new Date());
    }, []);

    useWebSocketEvent('machine_status_changed', (data) => {
        console.log('🔧 Machine status changed:', data.data);
        setOverviewData(prevData => {
            return prevData.map(machine => 
                machine.id === data.data.machine_id
                    ? { ...machine, status: data.data.status }
                    : machine
            );
        });
        setLastUpdated(new Date());
    }, []);

    useEffect(() => {
        if (window.EnhancedWebSocketService?.isConnected()) {
            window.EnhancedWebSocketService.subscribe(['production', 'orders', 'machines']);
        }
    }, []);

    const filteredMachines = useMemo(() => {
        const machines = overviewData.machineStatus || [];
        if (filterStatus === 'all') return machines;
        return machines.filter(machine => machine.status === filterStatus);
    }, [overviewData, filterStatus]);

    if (loading) {
        return (
            <div className="min-h-96 bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mb-4 mx-auto animate-pulse">
                        <Factory className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex items-center justify-center gap-3 text-gray-600">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span className="text-lg font-medium">Loading Production Floor Data...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-96 bg-gradient-to-br from-gray-50 to-red-50 flex items-center justify-center p-6">
                <div className="bg-white/80 backdrop-blur-xl border border-red-200 rounded-2xl p-8 max-w-md mx-auto text-center shadow-2xl">
                    <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                        <AlertTriangle className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Connection Error</h3>
                    <p className="text-gray-600 mb-2">Failed to load production data</p>
                    <p className="text-red-600 text-sm mb-6">{error}</p>
                    <button 
                        onClick={handleRefresh}
                        className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
            {/* Ultra-Modern Header */}
            <div className="bg-white/80 backdrop-blur-xl border-b border-white/20 mb-8">
                <div className="p-6">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl shadow-lg">
                                <Factory className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                                    Production Floor Monitor
                                </h1>
                                <p className="text-gray-600 mt-1 flex items-center gap-2">
                                    Real-time production monitoring and machine intelligence
                                    <WebSocketStatusCompact />
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            {/* Advanced Filter */}
                            <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/30">
                                <Filter className="w-4 h-4 text-gray-500" />
                                <select 
                                    value={filterStatus} 
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="bg-transparent border-none text-sm font-medium text-gray-700 focus:outline-none cursor-pointer"
                                >
                                    <option value="all">All Machines</option>
                                    <option value="in_use">🔵 Running</option>
                                    <option value="available">🟢 Available</option>
                                    <option value="maintenance">🟡 Maintenance</option>
                                    <option value="offline">🔴 Offline</option>
                                </select>
                            </div>
                            
                            {/* Ultra Refresh Button */}
                            <button 
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                                {refreshing ? 'Syncing...' : 'Refresh'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-8">
                {/* Ultra-Modern Production Summary */}
                <UltraProductionSummary 
                    machines={overviewData.machineStatus || []} 
                    activeOrders={overviewData.activeOrders || []}
                    todayStats={overviewData.todayStats || {}}
                    efficiency={overviewData.efficiency || 0}
                />

                {/* Machine Grid */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg">
                                <Settings className="w-6 h-6 text-white" />
                            </div>
                            Machine Status Grid
                            <span className="text-lg font-normal text-gray-500">
                                ({filteredMachines.length} machines)
                            </span>
                        </h2>
                        <div className="text-sm text-gray-500">
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                        {filteredMachines.map((machine, index) => (
                            <UltraMachineStatusCard 
                                key={machine.id} 
                                machine={machine} 
                                onClick={handleMachineClick}
                            />
                        ))}
                    </div>

                    {filteredMachines.length === 0 && (
                        <div className="text-center py-20">
                            <div className="w-20 h-20 bg-gradient-to-r from-gray-400 to-gray-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <Activity className="w-10 h-10 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-700 mb-2">No Machines Found</h3>
                            <p className="text-gray-500">No machines match the selected filter criteria</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Enhanced Order Details Modal */}
            <OrderDetailsModal
                isOpen={showOrderModal}
                onClose={() => setShowOrderModal(false)}
                orderId={selectedOrder?.id}
                orderNumber={selectedOrder?.number}
            />

            {/* Custom CSS for animations */}
            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0; }
                    50% { transform: translateY(-20px) rotate(180deg); opacity: 1; }
                }
                .animate-float {
                    animation: float 3s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}