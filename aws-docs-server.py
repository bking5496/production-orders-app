#!/usr/bin/env python3
"""
AWS CLI Documentation Server
A simple web server to browse AWS CLI documentation locally
"""

import http.server
import socketserver
import subprocess
import json
import re
import os
from urllib.parse import parse_qs, urlparse
from datetime import datetime

class AWSDocsHandler(http.server.BaseHTTPRequestHandler):
    
    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        query = parse_qs(parsed_path.query)
        
        if path == '/':
            self.serve_index()
        elif path == '/service':
            service = query.get('name', [''])[0]
            self.serve_service_help(service)
        elif path == '/command':
            service = query.get('service', [''])[0]
            command = query.get('name', [''])[0]
            self.serve_command_help(service, command)
        elif path == '/topic':
            topic = query.get('name', [''])[0]
            self.serve_topic_help(topic)
        elif path == '/search':
            query_term = query.get('q', [''])[0]
            self.serve_search_results(query_term)
        else:
            self.send_error(404)
    
    def serve_index(self):
        """Serve the main index page"""
        html = self.get_base_html("AWS CLI Documentation Server", self.get_index_content())
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        self.wfile.write(html.encode())
    
    def get_index_content(self):
        """Generate index page content"""
        try:
            # Get list of AWS services
            result = subprocess.run(['aws', 'help'], capture_output=True, text=True, timeout=10)
            services = self.extract_services_from_help(result.stdout)
            
            # Get topics
            topics_result = subprocess.run(['aws', 'help', 'topics'], capture_output=True, text=True, timeout=10)
            topics = self.extract_topics_from_help(topics_result.stdout)
            
            content = f"""
            <div class="container">
                <h1>AWS CLI Documentation Server</h1>
                <p>Local documentation server for AWS CLI commands and services.</p>
                
                <!-- Search -->
                <div class="search-section">
                    <h2>Search Documentation</h2>
                    <form action="/search" method="get" class="search-form">
                        <input type="text" name="q" placeholder="Search AWS services, commands..." class="search-input">
                        <button type="submit" class="search-btn">Search</button>
                    </form>
                </div>
                
                <!-- Quick Links -->
                <div class="quick-links">
                    <h2>Quick Links</h2>
                    <div class="links-grid">
                        <a href="/service?name=s3" class="link-card">S3 Storage</a>
                        <a href="/service?name=ec2" class="link-card">EC2 Compute</a>
                        <a href="/service?name=iam" class="link-card">IAM Identity</a>
                        <a href="/service?name=lambda" class="link-card">Lambda Functions</a>
                        <a href="/service?name=rds" class="link-card">RDS Database</a>
                        <a href="/service?name=cloudformation" class="link-card">CloudFormation</a>
                    </div>
                </div>
                
                <!-- Topics -->
                <div class="topics-section">
                    <h2>Help Topics</h2>
                    <div class="topics-list">
                        {self.generate_topics_html(topics)}
                    </div>
                </div>
                
                <!-- All Services -->
                <div class="services-section">
                    <h2>All AWS Services ({len(services)})</h2>
                    <div class="services-grid">
                        {self.generate_services_html(services[:50])}  <!-- Show first 50 -->
                    </div>
                    {f'<p class="note">Showing first 50 services. Use search to find specific services.</p>' if len(services) > 50 else ''}
                </div>
            </div>
            """
            return content
        except Exception as e:
            return f"<div class='error'>Error loading AWS CLI help: {str(e)}</div>"
    
    def serve_service_help(self, service):
        """Serve help for a specific service"""
        if not service:
            self.send_error(400, "Service name required")
            return
        
        try:
            result = subprocess.run(['aws', service, 'help'], capture_output=True, text=True, timeout=30)
            if result.returncode != 0:
                self.send_error(404, f"Service '{service}' not found")
                return
            
            # Convert help text to HTML
            help_html = self.convert_help_to_html(result.stdout)
            
            # Extract available subcommands
            subcommands = self.extract_subcommands(result.stdout)
            
            content = f"""
            <div class="container">
                <nav class="breadcrumb">
                    <a href="/">Home</a> > <span>{service}</span>
                </nav>
                
                <div class="service-header">
                    <h1>AWS {service.upper()} Service</h1>
                    <div class="subcommands">
                        <h3>Available Commands:</h3>
                        <div class="commands-grid">
                            {self.generate_subcommands_html(service, subcommands)}
                        </div>
                    </div>
                </div>
                
                <div class="help-content">
                    {help_html}
                </div>
            </div>
            """
            
            html = self.get_base_html(f"AWS {service} Documentation", content)
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(html.encode())
            
        except subprocess.TimeoutExpired:
            self.send_error(504, "Request timeout")
        except Exception as e:
            self.send_error(500, f"Error: {str(e)}")
    
    def serve_command_help(self, service, command):
        """Serve help for a specific command"""
        if not service or not command:
            self.send_error(400, "Service and command name required")
            return
        
        try:
            result = subprocess.run(['aws', service, command, 'help'], capture_output=True, text=True, timeout=30)
            if result.returncode != 0:
                self.send_error(404, f"Command '{service} {command}' not found")
                return
            
            help_html = self.convert_help_to_html(result.stdout)
            
            content = f"""
            <div class="container">
                <nav class="breadcrumb">
                    <a href="/">Home</a> > 
                    <a href="/service?name={service}">{service}</a> > 
                    <span>{command}</span>
                </nav>
                
                <div class="command-header">
                    <h1>aws {service} {command}</h1>
                </div>
                
                <div class="help-content">
                    {help_html}
                </div>
            </div>
            """
            
            html = self.get_base_html(f"AWS {service} {command} Documentation", content)
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(html.encode())
            
        except subprocess.TimeoutExpired:
            self.send_error(504, "Request timeout")
        except Exception as e:
            self.send_error(500, f"Error: {str(e)}")
    
    def serve_topic_help(self, topic):
        """Serve help for a specific topic"""
        if not topic:
            self.send_error(400, "Topic name required")
            return
        
        try:
            result = subprocess.run(['aws', 'help', topic], capture_output=True, text=True, timeout=30)
            if result.returncode != 0:
                self.send_error(404, f"Topic '{topic}' not found")
                return
            
            help_html = self.convert_help_to_html(result.stdout)
            
            content = f"""
            <div class="container">
                <nav class="breadcrumb">
                    <a href="/">Home</a> > Topics > <span>{topic}</span>
                </nav>
                
                <div class="topic-header">
                    <h1>AWS CLI Topic: {topic}</h1>
                </div>
                
                <div class="help-content">
                    {help_html}
                </div>
            </div>
            """
            
            html = self.get_base_html(f"AWS CLI Topic: {topic}", content)
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(html.encode())
            
        except subprocess.TimeoutExpired:
            self.send_error(504, "Request timeout")
        except Exception as e:
            self.send_error(500, f"Error: {str(e)}")
    
    def serve_search_results(self, query_term):
        """Serve search results"""
        if not query_term:
            self.send_error(400, "Search query required")
            return
        
        # Simple search through available services
        try:
            result = subprocess.run(['aws', 'help'], capture_output=True, text=True, timeout=10)
            services = self.extract_services_from_help(result.stdout)
            
            # Filter services that match the query
            matching_services = [s for s in services if query_term.lower() in s.lower()]
            
            content = f"""
            <div class="container">
                <nav class="breadcrumb">
                    <a href="/">Home</a> > Search Results
                </nav>
                
                <div class="search-results">
                    <h1>Search Results for "{query_term}"</h1>
                    <p>Found {len(matching_services)} matching services:</p>
                    
                    <div class="results-list">
                        {self.generate_search_results_html(matching_services, query_term)}
                    </div>
                </div>
            </div>
            """
            
            html = self.get_base_html(f"Search: {query_term}", content)
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(html.encode())
            
        except Exception as e:
            self.send_error(500, f"Search error: {str(e)}")
    
    def extract_services_from_help(self, help_text):
        """Extract service names from AWS help output"""
        services = []
        in_services_section = False
        
        for line in help_text.split('\n'):
            if 'AVAILABLE SERVICES' in line:
                in_services_section = True
                continue
            
            if in_services_section:
                if line.strip().startswith('+o '):
                    service = line.strip()[3:]  # Remove '+o '
                    services.append(service)
                elif line.strip() and not line.startswith(' ') and 'SEE ALSO' in line:
                    break
        
        return sorted(services)
    
    def extract_topics_from_help(self, help_text):
        """Extract topic names from AWS help topics output"""
        topics = []
        lines = help_text.split('\n')
        
        for i, line in enumerate(lines):
            if '+o ' in line and ':' in line:
                # Extract topic name before the colon
                topic_line = line.strip()
                if topic_line.startswith('+o '):
                    topic_desc = topic_line[3:]  # Remove '+o '
                    if ':' in topic_desc:
                        topic_name = topic_desc.split(':')[0].strip()
                        description = topic_desc.split(':', 1)[1].strip()
                        topics.append({'name': topic_name, 'description': description})
        
        return topics
    
    def extract_subcommands(self, help_text):
        """Extract subcommands from service help"""
        subcommands = []
        in_commands_section = False
        
        for line in help_text.split('\n'):
            if 'AVAILABLE COMMANDS' in line or 'SUBCOMMANDS' in line:
                in_commands_section = True
                continue
            
            if in_commands_section:
                if line.strip().startswith('+o '):
                    command = line.strip()[3:]  # Remove '+o '
                    subcommands.append(command)
                elif line.strip() and not line.startswith(' ') and ('SEE ALSO' in line or 'EXAMPLES' in line):
                    break
        
        return sorted(subcommands)
    
    def convert_help_to_html(self, help_text):
        """Convert AWS CLI help text to HTML"""
        html = help_text
        
        # Escape HTML characters
        html = html.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        
        # Convert to preformatted text but add some basic formatting
        html = f'<pre class="help-text">{html}</pre>'
        
        return html
    
    def generate_services_html(self, services):
        """Generate HTML for services list"""
        html = ""
        for service in services:
            html += f'<a href="/service?name={service}" class="service-card">{service}</a>'
        return html
    
    def generate_topics_html(self, topics):
        """Generate HTML for topics list"""
        html = ""
        for topic in topics:
            html += f'''
            <div class="topic-item">
                <a href="/topic?name={topic['name']}" class="topic-link">{topic['name']}</a>
                <span class="topic-desc">{topic['description']}</span>
            </div>
            '''
        return html
    
    def generate_subcommands_html(self, service, subcommands):
        """Generate HTML for subcommands"""
        html = ""
        for command in subcommands:
            html += f'<a href="/command?service={service}&name={command}" class="command-card">{command}</a>'
        return html
    
    def generate_search_results_html(self, services, query):
        """Generate HTML for search results"""
        html = ""
        for service in services:
            highlighted = service.replace(query.lower(), f'<mark>{query.lower()}</mark>')
            html += f'''
            <div class="search-result">
                <a href="/service?name={service}" class="result-link">{highlighted}</a>
                <span class="result-type">AWS Service</span>
            </div>
            '''
        return html
    
    def get_base_html(self, title, content):
        """Generate base HTML template"""
        return f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{title}</title>
            <style>
                * {{ margin: 0; padding: 0; box-sizing: border-box; }}
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }}
                .container {{ max-width: 1200px; margin: 0 auto; padding: 20px; }}
                
                h1 {{ color: #232f3e; margin-bottom: 20px; }}
                h2 {{ color: #232f3e; margin: 30px 0 15px 0; }}
                h3 {{ color: #666; margin: 20px 0 10px 0; }}
                
                .breadcrumb {{ margin-bottom: 20px; }}
                .breadcrumb a {{ color: #0073bb; text-decoration: none; }}
                .breadcrumb a:hover {{ text-decoration: underline; }}
                .breadcrumb span {{ color: #666; }}
                
                .search-section {{ background: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
                .search-form {{ display: flex; gap: 10px; max-width: 600px; }}
                .search-input {{ flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px; }}
                .search-btn {{ padding: 12px 24px; background: #ff9900; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }}
                .search-btn:hover {{ background: #e88b00; }}
                
                .quick-links, .topics-section, .services-section {{ background: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
                
                .links-grid, .services-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }}
                .commands-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }}
                
                .link-card, .service-card, .command-card {{ display: block; padding: 15px; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; text-decoration: none; color: #0073bb; text-align: center; transition: all 0.2s; }}
                .link-card:hover, .service-card:hover, .command-card:hover {{ background: #e3f2fd; border-color: #0073bb; transform: translateY(-2px); }}
                
                .topics-list {{ display: flex; flex-direction: column; gap: 10px; }}
                .topic-item {{ padding: 15px; background: #f8f9fa; border-radius: 6px; }}
                .topic-link {{ color: #0073bb; text-decoration: none; font-weight: bold; }}
                .topic-link:hover {{ text-decoration: underline; }}
                .topic-desc {{ color: #666; margin-left: 10px; }}
                
                .help-content {{ background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
                .help-text {{ background: #f8f9fa; padding: 20px; border-radius: 6px; overflow-x: auto; white-space: pre-wrap; }}
                
                .search-results {{ background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
                .results-list {{ display: flex; flex-direction: column; gap: 15px; }}
                .search-result {{ padding: 15px; background: #f8f9fa; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; }}
                .result-link {{ color: #0073bb; text-decoration: none; font-weight: bold; }}
                .result-link:hover {{ text-decoration: underline; }}
                .result-type {{ color: #666; font-size: 14px; }}
                mark {{ background: #fff3cd; padding: 2px 4px; }}
                
                .note {{ color: #666; font-style: italic; margin-top: 20px; }}
                .error {{ color: #dc3545; padding: 20px; background: #f8d7da; border-radius: 6px; }}
                
                .service-header, .command-header, .topic-header {{ margin-bottom: 30px; }}
                .subcommands {{ margin-top: 20px; }}
            </style>
        </head>
        <body>
            {content}
            <footer style="text-align: center; padding: 40px 20px; color: #666;">
                <p>AWS CLI Documentation Server • Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            </footer>
        </body>
        </html>
        """

def start_server(port=8080):
    """Start the AWS documentation server"""
    handler = AWSDocsHandler
    
    try:
        with socketserver.TCPServer(("", port), handler) as httpd:
            print(f"AWS CLI Documentation Server starting on port {port}")
            print(f"Open your browser to: http://localhost:{port}")
            print("Press Ctrl+C to stop the server")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    except OSError as e:
        if e.errno == 98:  # Address already in use
            print(f"Port {port} is already in use. Try a different port:")
            print(f"python3 aws-docs-server.py --port 8081")
        else:
            print(f"Error starting server: {e}")

if __name__ == "__main__":
    import sys
    port = 8080
    
    # Check for port argument
    if "--port" in sys.argv:
        try:
            port_index = sys.argv.index("--port") + 1
            port = int(sys.argv[port_index])
        except (IndexError, ValueError):
            print("Invalid port specified. Using default port 8080.")
    
    start_server(port)