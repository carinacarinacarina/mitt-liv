import http.server, socketserver, os
os.chdir('/Users/carina.ortiz/Documents/Organisera')
PORT = int(os.environ.get('PORT', 3132))
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
with socketserver.TCPServer(('', PORT), H) as s:
    s.serve_forever()
