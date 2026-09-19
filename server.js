const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const zlib = require('node:zlib')

const root = __dirname
const port = Number(process.env.PORT || 3000)
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
  '.gz': 'application/gzip',
  '.br': 'application/octet-stream',
}

const server = http.createServer((request, response) => {
  const requestedPath = decodeURIComponent(request.url.split('?')[0])
  const relativePath = requestedPath === '/' ? '/index.html' : requestedPath
  let filePath = path.resolve(root, `.${relativePath}`)

  // دعم deep links مثل /login و /register في المعاينة، كما تفعل Netlify.
  // نستخدم index.html فقط للمسارات غير الملفية حتى تبقى الأصول 404 صحيحة.
  if (!fs.existsSync(filePath) && !path.extname(relativePath)) {
    filePath = path.join(root, 'index.html')
  }

  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Not found')
    return
  }

  const extension = path.extname(filePath).toLowerCase()
  const isHtml = extension === '.html'
  const isStaticAsset = !isHtml && /\.(js|css|png|jpg|jpeg|svg|ico|ttf|woff|woff2|webp)$/.test(extension)
  const acceptsGzip = /gzip/.test(request.headers['accept-encoding'] || '')
  const headers = {
    'Content-Type': mimeTypes[extension] || 'application/octet-stream',
    'Cache-Control': isStaticAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  }
  if (acceptsGzip && /\.(js|css|html|json|svg)$/.test(extension)) {
    headers['Content-Encoding'] = 'gzip'
    headers.Vary = 'Accept-Encoding'
    response.writeHead(200, headers)
    fs.createReadStream(filePath).pipe(zlib.createGzip({ level: 6 })).pipe(response)
    return
  }
  response.writeHead(200, headers)
  fs.createReadStream(filePath).pipe(response)
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Hawachat preview running on port ${port}`)
})
