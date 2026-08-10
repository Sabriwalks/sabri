Add-Type -AssemblyName System.Drawing

$outDir = "C:\Users\aharo\AI projects\sabri"
$sizes = @(16, 32, 48)
$pngFiles = $sizes | ForEach-Object { "$outDir\favicon-$_.png" }

$icoPath = "$outDir\favicon.ico"
$fs = New-Object System.IO.FileStream($icoPath, [System.IO.FileMode]::Create)
$bw = New-Object System.IO.BinaryWriter($fs)

# ICONDIR header
$bw.Write([UInt16]0)      # reserved
$bw.Write([UInt16]1)      # type: 1 = icon
$bw.Write([UInt16]$sizes.Count)

$pngBytesList = @()
foreach ($f in $pngFiles) {
    $pngBytesList += ,([System.IO.File]::ReadAllBytes($f))
}

$headerSize = 6 + (16 * $sizes.Count)
$offset = $headerSize
for ($i = 0; $i -lt $sizes.Count; $i++) {
    $size = $sizes[$i]
    $pngBytes = $pngBytesList[$i]
    $dim = if ($size -ge 256) { 0 } else { $size }
    $bw.Write([Byte]$dim)       # width (0 means 256)
    $bw.Write([Byte]$dim)       # height
    $bw.Write([Byte]0)          # color palette
    $bw.Write([Byte]0)          # reserved
    $bw.Write([UInt16]1)        # color planes
    $bw.Write([UInt16]32)       # bits per pixel
    $bw.Write([UInt32]$pngBytes.Length)
    $bw.Write([UInt32]$offset)
    $offset += $pngBytes.Length
}

foreach ($pngBytes in $pngBytesList) {
    $bw.Write($pngBytes)
}

$bw.Close()
$fs.Close()
Write-Output "favicon.ico written ($($sizes -join ', ')px)."
