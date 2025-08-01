/**
 * Authentication Testing Script for oracles.africa
 * Tests login functionality and admin panel access
 */

const https = require('https');
const querystring = require('querystring');

class AuthenticationTester {
    constructor() {
        this.baseUrl = 'https://oracles.africa';
        this.credentials = {
            username: 'admin',
            password: 'admin123'
        };
        this.cookies = '';
        this.authResults = [];
    }

    async testLoginEndpoint() {
        console.log('🔐 Testing Authentication Endpoints...');
        
        // Test common login endpoints
        const loginEndpoints = [
            '/api/auth/login',
            '/api/login',
            '/login',
            '/auth/login',
            '/signin',
            '/api/signin'
        ];

        for (const endpoint of loginEndpoints) {
            await this.testEndpoint(endpoint, 'POST', {
                username: this.credentials.username,
                password: this.credentials.password
            });
        }
    }

    async testEndpoint(path, method = 'GET', data = null) {
        return new Promise((resolve) => {
            const options = {
                hostname: 'oracles.africa',
                port: 443,
                path: path,
                method: method,
                headers: {
                    'User-Agent': 'WebSage-Auth-Tester/1.0',
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            };

            if (data && method === 'POST') {
                const postData = JSON.stringify(data);
                options.headers['Content-Length'] = Buffer.byteLength(postData);
            }

            const req = https.request(options, (res) => {
                let body = '';
                
                res.on('data', (chunk) => {
                    body += chunk;
                });

                res.on('end', () => {
                    this.authResults.push({
                        endpoint: path,
                        method: method,
                        status: res.statusCode,
                        response: body.substring(0, 500), // Limit response size
                        headers: res.headers,
                        success: res.statusCode >= 200 && res.statusCode < 300
                    });

                    console.log(`${method} ${path}: ${res.statusCode}`);
                    resolve();
                });
            });

            req.on('error', (error) => {
                this.authResults.push({
                    endpoint: path,
                    method: method,
                    error: error.message,
                    success: false
                });
                console.log(`${method} ${path}: ERROR - ${error.message}`);
                resolve();
            });

            if (data && method === 'POST') {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    async testAPIEndpoints() {
        console.log('🔍 Testing API Endpoints...');
        
        const apiEndpoints = [
            '/api/orders',
            '/api/machines',
            '/api/users',
            '/api/dashboard',
            '/api/reports',
            '/api/production',
            '/api/environments'
        ];

        for (const endpoint of apiEndpoints) {
            await this.testEndpoint(endpoint, 'GET');
        }
    }

    async runAuthTests() {
        console.log('🎯 Starting Authentication Testing for oracles.africa');
        console.log('======================================================');

        await this.testLoginEndpoint();
        await this.testAPIEndpoints();

        return {
            testDate: new Date().toISOString(),
            credentials: { username: this.credentials.username, password: '[REDACTED]' },
            results: this.authResults,
            summary: this.generateAuthSummary()
        };
    }

    generateAuthSummary() {
        const totalTests = this.authResults.length;
        const successfulTests = this.authResults.filter(r => r.success || (r.status >= 200 && r.status < 400)).length;
        const loginEndpoints = this.authResults.filter(r => r.endpoint.includes('login') || r.endpoint.includes('auth')).length;
        const apiEndpoints = this.authResults.filter(r => r.endpoint.includes('/api/')).length;

        return {
            totalEndpointsTested: totalTests,
            accessibleEndpoints: successfulTests,
            loginEndpointsFound: loginEndpoints,
            apiEndpointsFound: apiEndpoints,
            authenticationPossible: this.authResults.some(r => 
                (r.endpoint.includes('login') || r.endpoint.includes('auth')) && 
                r.status && r.status < 500
            )
        };
    }
}

// Run the tests
if (require.main === module) {
    const tester = new AuthenticationTester();
    tester.runAuthTests().then(results => {
        console.log('\n📊 Authentication Test Results:');
        console.log('===============================');
        console.log(`Total Endpoints Tested: ${results.summary.totalEndpointsTested}`);
        console.log(`Accessible Endpoints: ${results.summary.accessibleEndpoints}`);
        console.log(`Authentication Possible: ${results.summary.authenticationPossible ? 'Yes' : 'Unknown'}`);
        
        require('fs').writeFileSync(
            '/home/production-app/production-orders-app/auth-test-results.json',
            JSON.stringify(results, null, 2)
        );
        console.log('✅ Authentication test results saved');
    });
}