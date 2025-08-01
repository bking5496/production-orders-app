#!/usr/bin/env node

// WebSocket Test Script for Enhanced Production Management System
const WebSocket = require('ws');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

class WebSocketTester {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.authenticated = false;
        this.subscriptions = [];
        this.rooms = [];
    }

    async connect(token) {
        return new Promise((resolve, reject) => {
            console.log('🔗 Connecting to WebSocket server...');
            
            // Try multiple URLs for different environments
            const urls = [
                `ws://localhost:3000?token=${encodeURIComponent(token)}`,
                `ws://localhost:3000/ws?token=${encodeURIComponent(token)}`
            ];

            const connectUrl = urls[0]; // Use first URL for local testing
            this.ws = new WebSocket(connectUrl);

            this.ws.on('open', () => {
                console.log('✅ WebSocket connected successfully');
                this.connected = true;
                resolve();
            });

            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleMessage(message);
                } catch (error) {
                    console.error('💥 Failed to parse message:', error);
                }
            });

            this.ws.on('close', (code, reason) => {
                console.log(`🔌 WebSocket disconnected - Code: ${code}, Reason: ${reason}`);
                this.connected = false;
                this.authenticated = false;
            });

            this.ws.on('error', (error) => {
                console.error('💥 WebSocket error:', error);
                reject(error);
            });

            // Timeout after 10 seconds
            setTimeout(() => {
                if (!this.connected) {
                    reject(new Error('Connection timeout'));
                }
            }, 10000);
        });
    }

    handleMessage(message) {
        const { type, data, timestamp, room, channel } = message;
        
        console.log(`📨 Received: ${type}`, data ? `- ${JSON.stringify(data).substring(0, 100)}...` : '');
        
        switch (type) {
            case 'welcome':
                this.authenticated = true;
                console.log('🎉 Authentication successful:', data.user);
                break;
                
            case 'auth_error':
                console.error('🚫 Authentication failed:', data.error);
                break;
                
            case 'pong':
                console.log('💓 Pong received');
                break;
                
            case 'subscription_confirmed':
                console.log('✅ Subscribed to channels:', data.channels);
                break;
                
            case 'room_joined':
                console.log('🏠 Joined room:', data.room, 'Members:', data.members?.length);
                break;
                
            case 'production_stats':
                console.log('📊 Production Stats:');
                console.log('  Orders:', data.orders);
                console.log('  Machines:', data.machines);
                console.log('  Production:', data.production);
                break;
                
            default:
                console.log(`📨 ${type}:`, data);
                break;
        }
    }

    send(type, data = {}) {
        if (!this.connected) {
            console.error('❌ Not connected');
            return;
        }

        const message = {
            type,
            ...data,
            timestamp: new Date().toISOString()
        };

        this.ws.send(JSON.stringify(message));
        console.log(`📤 Sent: ${type}`);
    }

    subscribe(channels) {
        this.send('subscribe', { channels: Array.isArray(channels) ? channels : [channels] });
    }

    joinRoom(room) {
        this.send('join_room', { room });
    }

    requestStats() {
        this.send('request_stats');
    }

    ping() {
        this.send('ping');
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

async function getTestToken() {
    // In a real scenario, you'd get this from authentication
    // For testing, we'll use a simple token (you'll need to modify this based on your JWT structure)
    return new Promise((resolve) => {
        rl.question('Enter JWT token (or press Enter for demo): ', (token) => {
            if (!token) {
                console.log('ℹ️ Using demo token - this may not work without proper authentication');
                resolve('demo_token');
            } else {
                resolve(token);
            }
        });
    });
}

async function runTests() {
    console.log('🚀 WebSocket Enhanced System Test');
    console.log('================================');

    const tester = new WebSocketTester();

    try {
        // Get authentication token
        const token = await getTestToken();

        // Connect to WebSocket
        await tester.connect(token);

        // Wait for authentication
        await new Promise(resolve => {
            const checkAuth = setInterval(() => {
                if (tester.authenticated) {
                    clearInterval(checkAuth);
                    resolve();
                }
            }, 100);
        });

        console.log('\n🧪 Running tests...\n');

        // Test 1: Basic ping/pong
        console.log('Test 1: Ping/Pong');
        tester.ping();
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Test 2: Subscribe to channels
        console.log('\nTest 2: Channel Subscription');
        tester.subscribe(['orders', 'machines', 'production']);
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Test 3: Join room
        console.log('\nTest 3: Room Management');
        tester.joinRoom('dashboard');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Test 4: Request production stats
        console.log('\nTest 4: Production Statistics');
        tester.requestStats();
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('\n✅ All tests completed successfully!');

        // Interactive mode
        console.log('\n🎮 Interactive Mode (type "help" for commands):');
        startInteractiveMode(tester);

    } catch (error) {
        console.error('💥 Test failed:', error.message);
        process.exit(1);
    }
}

function startInteractiveMode(tester) {
    rl.setPrompt('ws> ');
    rl.prompt();

    rl.on('line', (input) => {
        const [command, ...args] = input.trim().split(' ');

        switch (command) {
            case 'help':
                console.log(`
Available commands:
  ping                    - Send ping to server
  subscribe <channels>    - Subscribe to channels (comma-separated)
  join <room>            - Join a room
  stats                  - Request production statistics
  send <type> [data]     - Send custom message
  quit                   - Exit
                `);
                break;

            case 'ping':
                tester.ping();
                break;

            case 'subscribe':
                if (args.length > 0) {
                    const channels = args[0].split(',').map(c => c.trim());
                    tester.subscribe(channels);
                } else {
                    console.log('Usage: subscribe <channels>');
                }
                break;

            case 'join':
                if (args.length > 0) {
                    tester.joinRoom(args[0]);
                } else {
                    console.log('Usage: join <room>');
                }
                break;

            case 'stats':
                tester.requestStats();
                break;

            case 'send':
                if (args.length > 0) {
                    const type = args[0];
                    const data = args.slice(1).join(' ');
                    try {
                        const parsedData = data ? JSON.parse(data) : {};
                        tester.send(type, parsedData);
                    } catch (error) {
                        console.error('Invalid JSON data:', error.message);
                    }
                } else {
                    console.log('Usage: send <type> [json_data]');
                }
                break;

            case 'quit':
            case 'exit':
                tester.disconnect();
                rl.close();
                process.exit(0);
                break;

            default:
                if (input.trim()) {
                    console.log('Unknown command. Type "help" for available commands.');
                }
                break;
        }

        rl.prompt();
    });

    rl.on('close', () => {
        console.log('\n👋 Goodbye!');
        tester.disconnect();
        process.exit(0);
    });
}

// Run the tests
if (require.main === module) {
    runTests().catch(error => {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    });
}

module.exports = WebSocketTester;