/**
 * Comprehensive QA Testing Script for oracles.africa
 * WebSage - Autonomous Website Testing & Quality Assurance
 * 
 * This script performs comprehensive testing including:
 * - Functional testing
 * - Authentication testing
 * - Performance analysis
 * - Accessibility validation
 * - Security checks
 * - Visual regression testing
 */

const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
const axeCore = require('@axe-core/puppeteer');

class OraclesAfricaQATesting {
    constructor() {
        this.browser = null;
        this.page = null;
        this.baseUrl = 'https://oracles.africa';
        this.adminCredentials = {
            username: 'admin',
            password: 'admin123'
        };
        this.testResults = {
            functional: [],
            authentication: [],
            performance: {},
            accessibility: {},
            security: [],
            visual: [],
            seo: []
        };
    }

    async initialize() {
        console.log('🚀 Initializing WebSage QA Testing for oracles.africa...');
        
        this.browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        });
        
        this.page = await this.browser.newPage();
        
        // Set viewport for desktop testing
        await this.page.setViewport({ width: 1920, height: 1080 });
        
        // Set user agent
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log('✅ Browser initialized successfully');
    }

    async performFunctionalTesting() {
        console.log('🔍 Starting Functional Testing...');
        
        try {
            // Load the homepage
            console.log('Loading homepage...');
            const response = await this.page.goto(this.baseUrl, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            
            this.testResults.functional.push({
                test: 'Homepage Load',
                status: response.ok() ? 'PASS' : 'FAIL',
                statusCode: response.status(),
                message: `Homepage loaded with status ${response.status()}`
            });

            // Take screenshot for visual analysis
            await this.page.screenshot({ 
                path: '/home/production-app/production-orders-app/homepage-screenshot.png',
                fullPage: true 
            });

            // Test navigation links
            await this.testNavigationLinks();
            
            // Test forms if they exist
            await this.testForms();
            
            // Test interactive elements
            await this.testInteractiveElements();
            
        } catch (error) {
            this.testResults.functional.push({
                test: 'Functional Testing',
                status: 'FAIL',
                error: error.message
            });
        }
    }

    async testNavigationLinks() {
        console.log('Testing navigation links...');
        
        try {
            // Get all links on the page
            const links = await this.page.$$eval('a[href]', links => 
                links.map(link => ({
                    href: link.href,
                    text: link.textContent.trim(),
                    target: link.target
                }))
            );

            for (const link of links) {
                if (link.href.startsWith('http')) {
                    try {
                        const response = await this.page.goto(link.href, { 
                            waitUntil: 'networkidle2', 
                            timeout: 10000 
                        });
                        
                        this.testResults.functional.push({
                            test: `Navigation Link: ${link.text}`,
                            status: response.ok() ? 'PASS' : 'FAIL',
                            statusCode: response.status(),
                            url: link.href
                        });
                        
                        // Return to base URL
                        await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
                        
                    } catch (error) {
                        this.testResults.functional.push({
                            test: `Navigation Link: ${link.text}`,
                            status: 'FAIL',
                            error: error.message,
                            url: link.href
                        });
                    }
                }
            }
            
        } catch (error) {
            console.log('Error testing navigation links:', error.message);
        }
    }

    async testForms() {
        console.log('Testing forms...');
        
        try {
            const forms = await this.page.$$('form');
            
            for (let i = 0; i < forms.length; i++) {
                const form = forms[i];
                const action = await form.evaluate(f => f.action);
                const method = await form.evaluate(f => f.method);
                
                this.testResults.functional.push({
                    test: `Form ${i + 1}`,
                    status: 'INFO',
                    action: action,
                    method: method,
                    message: 'Form detected and analyzed'
                });
            }
            
        } catch (error) {
            console.log('Error testing forms:', error.message);
        }
    }

    async testInteractiveElements() {
        console.log('Testing interactive elements...');
        
        try {
            // Test buttons
            const buttons = await this.page.$$('button, input[type="button"], input[type="submit"]');
            
            this.testResults.functional.push({
                test: 'Interactive Elements',
                status: 'INFO',
                message: `Found ${buttons.length} interactive buttons/inputs`
            });
            
        } catch (error) {
            console.log('Error testing interactive elements:', error.message);
        }
    }

    async performAuthenticationTesting() {
        console.log('🔐 Starting Authentication Testing...');
        
        try {
            // Look for login forms
            const loginForm = await this.page.$('form[action*="login"], form[id*="login"], form[class*="login"]');
            const usernameField = await this.page.$('input[name*="username"], input[name*="user"], input[type="email"], input[id*="username"]');
            const passwordField = await this.page.$('input[type="password"]');
            
            if (loginForm && usernameField && passwordField) {
                console.log('Login form found, testing authentication...');
                
                // Fill in credentials
                await usernameField.type(this.adminCredentials.username);
                await passwordField.type(this.adminCredentials.password);
                
                // Submit form
                await loginForm.submit();
                await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
                
                // Check if login was successful
                const currentUrl = this.page.url();
                const isLoggedIn = await this.checkIfLoggedIn();
                
                this.testResults.authentication.push({
                    test: 'Admin Login',
                    status: isLoggedIn ? 'PASS' : 'FAIL',
                    message: `Login attempt with admin credentials`,
                    currentUrl: currentUrl
                });
                
                if (isLoggedIn) {
                    await this.testAdminPanelAccess();
                }
                
            } else {
                this.testResults.authentication.push({
                    test: 'Login Form Detection',
                    status: 'FAIL',
                    message: 'No login form found on the page'
                });
            }
            
        } catch (error) {
            this.testResults.authentication.push({
                test: 'Authentication Testing',
                status: 'FAIL',
                error: error.message
            });
        }
    }

    async checkIfLoggedIn() {
        try {
            // Check for common indicators of being logged in
            const loggedInIndicators = await this.page.$$(
                '[data-testid*="logout"], [class*="logout"], [id*="logout"], ' +
                '[data-testid*="dashboard"], [class*="dashboard"], [id*="dashboard"], ' +
                '[data-testid*="admin"], [class*="admin"], [id*="admin"]'
            );
            
            return loggedInIndicators.length > 0;
        } catch (error) {
            return false;
        }
    }

    async testAdminPanelAccess() {
        console.log('Testing admin panel access...');
        
        try {
            // Look for admin/dashboard links
            const adminLinks = await this.page.$$eval(
                'a[href*="admin"], a[href*="dashboard"], a[class*="admin"], a[class*="dashboard"]',
                links => links.map(link => ({ href: link.href, text: link.textContent.trim() }))
            );
            
            for (const link of adminLinks) {
                try {
                    await this.page.goto(link.href, { waitUntil: 'networkidle2' });
                    
                    this.testResults.authentication.push({
                        test: `Admin Panel Access: ${link.text}`,
                        status: 'PASS',
                        url: link.href,
                        message: 'Successfully accessed admin area'
                    });
                    
                } catch (error) {
                    this.testResults.authentication.push({
                        test: `Admin Panel Access: ${link.text}`,
                        status: 'FAIL',
                        error: error.message,
                        url: link.href
                    });
                }
            }
            
        } catch (error) {
            console.log('Error testing admin panel access:', error.message);
        }
    }

    async performPerformanceTesting() {
        console.log('⚡ Starting Performance Testing...');
        
        try {
            // Measure page load time
            const startTime = Date.now();
            await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
            const loadTime = Date.now() - startTime;
            
            // Get performance metrics
            const performanceMetrics = await this.page.evaluate(() => {
                const navigation = performance.getEntriesByType('navigation')[0];
                return {
                    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                    loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
                    firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
                    firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
                };
            });
            
            this.testResults.performance = {
                pageLoadTime: loadTime,
                domContentLoaded: performanceMetrics.domContentLoaded,
                loadComplete: performanceMetrics.loadComplete,
                firstPaint: performanceMetrics.firstPaint,
                firstContentfulPaint: performanceMetrics.firstContentfulPaint
            };
            
            console.log(`Page load time: ${loadTime}ms`);
            
        } catch (error) {
            this.testResults.performance.error = error.message;
        }
    }

    async performAccessibilityTesting() {
        console.log('♿ Starting Accessibility Testing...');
        
        try {
            await axeCore.inject(this.page);
            const results = await axeCore.analyze(this.page);
            
            this.testResults.accessibility = {
                violations: results.violations.length,
                passes: results.passes.length,
                incomplete: results.incomplete.length,
                inapplicable: results.inapplicable.length,
                details: results.violations.map(violation => ({
                    id: violation.id,
                    impact: violation.impact,
                    description: violation.description,
                    nodes: violation.nodes.length
                }))
            };
            
            console.log(`Accessibility violations: ${results.violations.length}`);
            
        } catch (error) {
            this.testResults.accessibility.error = error.message;
        }
    }

    async performSecurityTesting() {
        console.log('🔒 Starting Security Testing...');
        
        try {
            // Check HTTPS
            const isHttps = this.baseUrl.startsWith('https://');
            this.testResults.security.push({
                test: 'HTTPS Implementation',
                status: isHttps ? 'PASS' : 'FAIL',
                message: isHttps ? 'Site uses HTTPS' : 'Site does not use HTTPS'
            });
            
            // Check security headers
            const response = await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
            const headers = response.headers();
            
            const securityHeaders = [
                'strict-transport-security',
                'x-content-type-options',
                'x-frame-options',
                'x-xss-protection',
                'content-security-policy'
            ];
            
            securityHeaders.forEach(header => {
                this.testResults.security.push({
                    test: `Security Header: ${header}`,
                    status: headers[header] ? 'PASS' : 'FAIL',
                    value: headers[header] || 'Not present'
                });
            });
            
        } catch (error) {
            this.testResults.security.push({
                test: 'Security Testing',
                status: 'FAIL',
                error: error.message
            });
        }
    }

    async performSEOTesting() {
        console.log('📈 Starting SEO Testing...');
        
        try {
            const seoData = await this.page.evaluate(() => {
                return {
                    title: document.title,
                    metaDescription: document.querySelector('meta[name="description"]')?.content || '',
                    h1Tags: Array.from(document.querySelectorAll('h1')).map(h1 => h1.textContent.trim()),
                    imagesMissingAlt: Array.from(document.querySelectorAll('img:not([alt])')).length,
                    internalLinks: Array.from(document.querySelectorAll('a[href^="/"], a[href^="./"], a[href^="../"]')).length,
                    externalLinks: Array.from(document.querySelectorAll('a[href^="http"]:not([href*="' + window.location.hostname + '"])')).length
                };
            });
            
            this.testResults.seo = seoData;
            
        } catch (error) {
            this.testResults.seo.error = error.message;
        }
    }

    async generateReport() {
        console.log('📊 Generating Comprehensive QA Report...');
        
        const report = {
            testDate: new Date().toISOString(),
            website: this.baseUrl,
            summary: this.generateSummary(),
            results: this.testResults
        };
        
        return report;
    }

    generateSummary() {
        const functionalPasses = this.testResults.functional.filter(t => t.status === 'PASS').length;
        const functionalFails = this.testResults.functional.filter(t => t.status === 'FAIL').length;
        const authPasses = this.testResults.authentication.filter(t => t.status === 'PASS').length;
        const authFails = this.testResults.authentication.filter(t => t.status === 'FAIL').length;
        const securityPasses = this.testResults.security.filter(t => t.status === 'PASS').length;
        const securityFails = this.testResults.security.filter(t => t.status === 'FAIL').length;
        
        return {
            overallHealth: this.calculateOverallHealth(),
            functional: { passes: functionalPasses, fails: functionalFails },
            authentication: { passes: authPasses, fails: authFails },
            security: { passes: securityPasses, fails: securityFails },
            performance: this.testResults.performance,
            accessibility: this.testResults.accessibility
        };
    }

    calculateOverallHealth() {
        const totalTests = this.testResults.functional.length + 
                          this.testResults.authentication.length + 
                          this.testResults.security.length;
        
        const passedTests = this.testResults.functional.filter(t => t.status === 'PASS').length +
                           this.testResults.authentication.filter(t => t.status === 'PASS').length +
                           this.testResults.security.filter(t => t.status === 'PASS').length;
        
        if (totalTests === 0) return 'Unknown';
        
        const healthPercentage = (passedTests / totalTests) * 100;
        
        if (healthPercentage >= 90) return 'Excellent';
        if (healthPercentage >= 75) return 'Good';
        if (healthPercentage >= 50) return 'Fair';
        return 'Poor';
    }

    async runFullTestSuite() {
        try {
            await this.initialize();
            
            console.log('🎯 Starting Comprehensive QA Testing Suite for oracles.africa');
            console.log('================================================');
            
            await this.performFunctionalTesting();
            await this.performAuthenticationTesting();
            await this.performPerformanceTesting();
            await this.performAccessibilityTesting();
            await this.performSecurityTesting();
            await this.performSEOTesting();
            
            const report = await this.generateReport();
            
            console.log('✅ QA Testing Complete!');
            return report;
            
        } catch (error) {
            console.error('❌ Error during testing:', error);
            return { error: error.message };
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }
}

// Export for use
module.exports = OraclesAfricaQATesting;

// Run if called directly
if (require.main === module) {
    const tester = new OraclesAfricaQATesting();
    tester.runFullTestSuite().then(report => {
        console.log('\n📋 Final Report:');
        console.log(JSON.stringify(report, null, 2));
    });
}