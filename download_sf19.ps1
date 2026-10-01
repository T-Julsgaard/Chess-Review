$jsUrl = "https://github.com/nmrugg/stockfish.js/releases/download/v19.0.0/stockfish-19-single.js"
$wasmUrl = "https://github.com/nmrugg/stockfish.js/releases/download/v19.0.0/stockfish-19-single.wasm"
try {
  Invoke-WebRequest -Uri $jsUrl -OutFile "engine\stockfish-19-single.js" -UseBasicParsing
  "Downloaded JS asset"
} catch {
  Write-Error "Failed to download JS: $_"
}
try {
  Invoke-WebRequest -Uri $wasmUrl -OutFile "engine\stockfish-19-single.wasm" -UseBasicParsing
  "Downloaded WASM asset"
} catch {
  Write-Error "Failed to download WASM: $_"
}