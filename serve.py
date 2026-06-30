import http.server, socketserver, os
os.chdir('/Users/carina.ortiz/Documents/Organisera')
PORT = int(os.environ.get('PORT', 3132))
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
with socketserver.TCPServer(('', PORT), H) as s:
    s.serve_forever()
