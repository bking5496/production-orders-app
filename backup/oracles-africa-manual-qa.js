/**
 * Manual QA Testing Script for oracles.africa
 * WebSage - Autonomous Website Testing & Quality Assurance
 * 
 * This script performs comprehensive testing using available tools:
 * - curl for HTTP testing
 * - Node.js native modules for analysis
 * - Custom validation logic
 */

const https = require('https');
const http = require('http');
const url = require('url');
const fs = require('fs');

class OraclesAfricaManualQA {
    constructor() {
        this.baseUrl = 'https://oracles.africa';
        this.results = {
            connectivity: [],
            security: [],
            headers: {},
            performance: {},
            content: {},
            seo: {},
            errors: []
        };
    }

    async testConnectivity() {
        console.log('🔍 Testing Website Connectivity...');
        
        return new Promise((resolve) => {
            const startTime = Date.now();
            
            const parsedUrl = url.parse(this.baseUrl);
            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || 443,
                path: parsedUrl.path || '/',
                method: 'GET',
                headers: {
                    'User-Agent': 'WebSage-QA-Bot/1.0'
                },
                timeout: 30000
            };

            const req = https.request(options, (res) => {
                const loadTime = Date.now() - startTime;
                
                this.results.connectivity.push({
                    test: 'HTTPS Connection',
                    status: 'PASS',
                    statusCode: res.statusCode,
                    responseTime: `${loadTime}ms`,
                    message: `Successfully connected to ${this.baseUrl}`
                });

                this.results.headers = res.headers;
                this.results.performance.responseTime = loadTime;
                this.results.performance.statusCode = res.statusCode;

                let body = '';
                res.on('data', (chunk) => {
                    body += chunk;
                });

                res.on('end', () => {
                    this.results.content.body = body;
                    this.results.content.size = Buffer.byteLength(body, 'utf8');
                    
                    console.log(`✅ Connected successfully (${res.statusCode}) in ${loadTime}ms`);
                    console.log(`📄 Page size: ${this.results.content.size} bytes`);
                    
                    resolve();
                });
            });

            req.on('error', (error) => {
                this.results.connectivity.push({
                    test: 'HTTPS Connection',
                    status: 'FAIL',
                    error: error.message,
                    message: `Failed to connect to ${this.baseUrl}`
                });
                
                console.log(`❌ Connection failed: ${error.message}`);
                resolve();
            });

            req.on('timeout', () => {
                this.results.connectivity.push({
                    test: 'HTTPS Connection',
                    status: 'FAIL',
                    error: 'Connection timeout',
                    message: `Connection to ${this.baseUrl} timed out after 30 seconds`
                });
                
                console.log('❌ Connection timed out');
                req.destroy();
                resolve();
            });

            req.end();
        });
    }

    analyzeSecurityHeaders() {
        console.log('🔒 Analyzing Security Headers...');
        
        const criticalHeaders = {
            'strict-transport-security': 'HSTS Protection',
            'x-content-type-options': 'MIME Type Sniffing Protection',
            'x-frame-options': 'Clickjacking Protection',
            'x-xss-protection': 'XSS Protection',
            'content-security-policy': 'CSP Protection',
            'referrer-policy': 'Referrer Policy'
        };

        Object.entries(criticalHeaders).forEach(([header, description]) => {
            const headerValue = this.results.headers[header];
            
            this.results.security.push({
                test: description,
                header: header,
                status: headerValue ? 'PASS' : 'FAIL',
                value: headerValue || 'Not present',
                severity: this.getHeaderSeverity(header, headerValue)
            });
        });

        // Check if HTTPS is enforced
        const isHttps = this.baseUrl.startsWith('https://');
        this.results.security.push({
            test: 'HTTPS Enforcement',
            status: isHttps ? 'PASS' : 'FAIL',
            message: isHttps ? 'Site uses HTTPS' : 'Site does not use HTTPS',
            severity: isHttps ? 'low' : 'critical'
        });
    }

    getHeaderSeverity(header, value) {
        if (!value) {
            switch (header) {
                case 'strict-transport-security':
                case 'content-security-policy':
                    return 'high';
                case 'x-frame-options':
                case 'x-content-type-options':
                    return 'medium';
                default:
                    return 'low';
            }
        }
        return 'low';
    }

    analyzeContent() {
        console.log('📄 Analyzing Content...');
        
        if (!this.results.content.body) {
            this.results.content.analysis = { error: 'No content to analyze' };
            return;
        }

        const content = this.results.content.body;
        
        // Basic HTML analysis
        const htmlAnalysis = {
            hasDoctype: content.toLowerCase().includes('<!doctype'),
            hasTitle: /<title[^>]*>([^<]+)<\/title>/i.test(content),
            hasMetaDescription: /<meta[^>]*name=['"]description['"][^>]*>/i.test(content),
            hasH1: /<h1[^>]*>/i.test(content),
            hasImages: /<img[^>]*>/i.test(content),
            hasForms: /<form[^>]*>/i.test(content),
            hasLoginForm: /login|signin|log-in/i.test(content),
            hasJavaScript: /<script[^>]*>/i.test(content),
            hasCSS: /<link[^>]*stylesheet|<style[^>]*>/i.test(content)
        };

        // Extract title and meta description
        const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
        const metaDescMatch = content.match(/<meta[^>]*name=['"]description['"][^>]*content=['"]([^'"]+)['"][^>]*>/i);
        
        this.results.seo = {
            title: titleMatch ? titleMatch[1].trim() : 'No title found',
            metaDescription: metaDescMatch ? metaDescMatch[1].trim() : 'No meta description found',
            titleLength: titleMatch ? titleMatch[1].trim().length : 0,
            descriptionLength: metaDescMatch ? metaDescMatch[1].trim().length : 0
        };

        // Count elements
        const h1Count = (content.match(/<h1[^>]*>/gi) || []).length;
        const imageCount = (content.match(/<img[^>]*>/gi) || []).length;
        const linkCount = (content.match(/<a[^>]*href/gi) || []).length;
        const formCount = (content.match(/<form[^>]*>/gi) || []).length;

        this.results.content.analysis = {
            ...htmlAnalysis,
            elementCounts: {
                h1Tags: h1Count,
                images: imageCount,
                links: linkCount,
                forms: formCount
            },
            validation: {
                multipleH1: h1Count > 1 ? 'WARNING' : 'OK',
                titleLength: this.validateTitleLength(this.results.seo.titleLength),
                descriptionLength: this.validateDescriptionLength(this.results.seo.descriptionLength)
            }
        };

        console.log(`📊 Content Analysis Complete:`);
        console.log(`   Title: "${this.results.seo.title}"`);
        console.log(`   Images: ${imageCount}, Links: ${linkCount}, Forms: ${formCount}`);
    }

    validateTitleLength(length) {
        if (length === 0) return 'MISSING';
        if (length < 30) return 'TOO_SHORT';
        if (length > 60) return 'TOO_LONG';
        return 'OPTIMAL';
    }

    validateDescriptionLength(length) {
        if (length === 0) return 'MISSING';
        if (length < 120) return 'TOO_SHORT';
        if (length > 160) return 'TOO_LONG';
        return 'OPTIMAL';
    }

    detectTechnology() {
        console.log('🔧 Detecting Technology Stack...');
        
        const content = this.results.content.body || '';
        const headers = this.results.headers || {};
        
        const technologies = {
            server: headers.server || 'Unknown',
            poweredBy: headers['x-powered-by'] || 'Not disclosed',
            framework: this.detectFramework(content),
            hasReact: content.includes('react') || content.includes('React'),
            hasJQuery: content.includes('jquery') || content.includes('jQuery'),
            hasBootstrap: content.includes('bootstrap'),
            hasWordPress: content.includes('wp-content') || content.includes('wordpress'),
            hasCloudflare: headers['cf-ray'] ? true : false,
            hasCDN: this.detectCDN(content, headers)
        };

        this.results.content.technologies = technologies;
        
        console.log(`🛠️  Technology Detection:`);
        console.log(`   Server: ${technologies.server}`);
        console.log(`   Framework: ${technologies.framework}`);
        console.log(`   React: ${technologies.hasReact ? 'Yes' : 'No'}`);
    }

    detectFramework(content) {
        if (content.includes('next.js') || content.includes('Next.js')) return 'Next.js';
        if (content.includes('nuxt') || content.includes('Nuxt')) return 'Nuxt.js';
        if (content.includes('gatsby') || content.includes('Gatsby')) return 'Gatsby';
        if (content.includes('vue') || content.includes('Vue')) return 'Vue.js';
        if (content.includes('angular') || content.includes('Angular')) return 'Angular';
        if (content.includes('react') || content.includes('React')) return 'React';
        return 'Unknown';
    }

    detectCDN(content, headers) {
        const cdnIndicators = [
            'cloudflare', 'cloudfront', 'fastly', 'maxcdn', 'jsdelivr',
            'unpkg', 'cdnjs', 'stackpath', 'keycdn'
        ];
        
        const contentLower = content.toLowerCase();
        const serverHeader = (headers.server || '').toLowerCase();
        
        return cdnIndicators.some(cdn => 
            contentLower.includes(cdn) || serverHeader.includes(cdn)
        );
    }

    async testAlternativeUrls() {
        console.log('🔄 Testing Alternative URLs...');
        
        const urlsToTest = [
            'https://www.oracles.africa',
            'http://oracles.africa',
            'http://www.oracles.africa',
            'https://oracles.africa/admin',
            'https://oracles.africa/login',
            'https://oracles.africa/dashboard'
        ];

        for (const testUrl of urlsToTest) {
            try {
                await this.testSingleUrl(testUrl);
            } catch (error) {
                this.results.connectivity.push({
                    test: `Alternative URL: ${testUrl}`,
                    status: 'FAIL',
                    error: error.message
                });
            }
        }
    }

    testSingleUrl(testUrl) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const parsedUrl = url.parse(testUrl);
            const isHttps = parsedUrl.protocol === 'https:';
            const requestModule = isHttps ? https : http;
            const port = parsedUrl.port || (isHttps ? 443 : 80);

            const options = {
                hostname: parsedUrl.hostname,
                port: port,
                path: parsedUrl.path || '/',
                method: 'GET',
                headers: {
                    'User-Agent': 'WebSage-QA-Bot/1.0'
                },
                timeout: 15000
            };

            const req = requestModule.request(options, (res) => {
                const loadTime = Date.now() - startTime;
                
                this.results.connectivity.push({
                    test: `Alternative URL: ${testUrl}`,
                    status: res.statusCode < 400 ? 'PASS' : 'WARNING',
                    statusCode: res.statusCode,
                    responseTime: `${loadTime}ms`,
                    redirect: res.headers.location || null
                });

                res.on('data', () => {}); // Consume response
                res.on('end', resolve);
            });

            req.on('error', (error) => {
                this.results.connectivity.push({
                    test: `Alternative URL: ${testUrl}`,
                    status: 'FAIL',
                    error: error.message
                });
                resolve();
            });

            req.on('timeout', () => {
                this.results.connectivity.push({
                    test: `Alternative URL: ${testUrl}`,
                    status: 'FAIL',
                    error: 'Timeout'
                });
                req.destroy();
                resolve();
            });

            req.end();
        });
    }

    generateHealthScore() {
        let totalScore = 0;
        let maxScore = 0;

        // Connectivity score (30 points)
        const connectivityPasses = this.results.connectivity.filter(t => t.status === 'PASS').length;
        const connectivityTotal = this.results.connectivity.length;
        if (connectivityTotal > 0) {
            totalScore += (connectivityPasses / connectivityTotal) * 30;
        }
        maxScore += 30;

        // Security score (40 points)
        const securityPasses = this.results.security.filter(t => t.status === 'PASS').length;
        const securityTotal = this.results.security.length;
        if (securityTotal > 0) {
            totalScore += (securityPasses / securityTotal) * 40;
        }
        maxScore += 40;

        // Content score (20 points)
        const contentAnalysis = this.results.content.analysis || {};
        let contentScore = 0;
        if (contentAnalysis.hasDoctype) contentScore += 2;
        if (contentAnalysis.hasTitle) contentScore += 4;
        if (contentAnalysis.hasMetaDescription) contentScore += 4;
        if (contentAnalysis.hasH1) contentScore += 3;
        if (contentAnalysis.hasImages) contentScore += 2;
        if (contentAnalysis.hasJavaScript) contentScore += 2;
        if (contentAnalysis.hasCSS) contentScore += 3;
        totalScore += contentScore;
        maxScore += 20;

        // Performance score (10 points)
        const responseTime = this.results.performance.responseTime || 0;
        let performanceScore = 10;
        if (responseTime > 3000) performanceScore = 2;
        else if (responseTime > 2000) performanceScore = 5;
        else if (responseTime > 1000) performanceScore = 8;
        totalScore += performanceScore;
        maxScore += 10;

        return Math.round((totalScore / maxScore) * 100);
    }

    generateSummary() {
        const healthScore = this.generateHealthScore();
        const criticalIssues = this.results.security.filter(s => s.severity === 'critical').length;
        const highIssues = this.results.security.filter(s => s.severity === 'high').length;
        const mediumIssues = this.results.security.filter(s => s.severity === 'medium').length;

        let healthLevel = 'Poor';
        if (healthScore >= 90) healthLevel = 'Excellent';
        else if (healthScore >= 75) healthLevel = 'Good';
        else if (healthScore >= 60) healthLevel = 'Fair';

        return {
            healthScore: healthScore,
            healthLevel: healthLevel,
            criticalIssues: criticalIssues,
            highIssues: highIssues,
            mediumIssues: mediumIssues,
            responseTime: this.results.performance.responseTime,
            pageSize: this.results.content.size,
            technologies: this.results.content.technologies
        };
    }

    async runFullTest() {
        console.log('🎯 Starting Comprehensive Manual QA Testing for oracles.africa');
        console.log('================================================================');
        console.log('');

        try {
            await this.testConnectivity();
            this.analyzeSecurityHeaders();
            this.analyzeContent();
            this.detectTechnology();
            await this.testAlternativeUrls();

            const summary = this.generateSummary();

            const report = {
                testDate: new Date().toISOString(),
                website: this.baseUrl,
                summary: summary,
                results: this.results
            };

            console.log('');
            console.log('📊 QA Test Summary:');
            console.log('==================');
            console.log(`Overall Health: ${summary.healthLevel} (${summary.healthScore}/100)`);
            console.log(`Response Time: ${summary.responseTime}ms`);
            console.log(`Page Size: ${summary.pageSize} bytes`);
            console.log(`Critical Issues: ${summary.criticalIssues}`);
            console.log(`High Priority Issues: ${summary.highIssues}`);
            console.log(`Medium Priority Issues: ${summary.mediumIssues}`);
            console.log('');

            return report;

        } catch (error) {
            console.error('❌ Error during testing:', error);
            return { error: error.message };
        }
    }
}

// Export for use
module.exports = OraclesAfricaManualQA;

// Run if called directly
if (require.main === module) {
    const tester = new OraclesAfricaManualQA();
    tester.runFullTest().then(report => {
        console.log('💾 Saving detailed report...');
        fs.writeFileSync('/home/production-app/production-orders-app/oracles-africa-qa-report.json', 
                         JSON.stringify(report, null, 2));
        console.log('✅ Report saved to oracles-africa-qa-report.json');
    });
}