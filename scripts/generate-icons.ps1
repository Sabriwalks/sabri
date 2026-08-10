Add-Type -AssemblyName System.Drawing

$outDir = Split-Path -Parent $PSScriptRoot
$srcPath = Join-Path $outDir "branding-source-logo.jpg"

# Format24bppRgb explicitly — System.Drawing.Bitmap's default (32bppArgb)
# writes a fully-opaque-but-present alpha channel into the PNG, which Apple's
# App Store rejects for app icons (and is pointless anyway: the source JPEG
# has no transparency at all). Every generated PNG here must have NO alpha
# channel, not just a fully-opaque one.
function Resize-Image($srcImage, $size, $outPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.DrawImage($srcImage, 0, 0, $size, $size)
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bmp.Dispose()
}

function Crop-Square($srcImage, $x, $y, $cropSize) {
    $bmp = New-Object System.Drawing.Bitmap($cropSize, $cropSize, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $srcRect = New-Object System.Drawing.Rectangle($x, $y, $cropSize, $cropSize)
    $destRect = New-Object System.Drawing.Rectangle(0, 0, $cropSize, $cropSize)
    $graphics.DrawImage($srcImage, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.Dispose()
    return $bmp
}

$src = [System.Drawing.Image]::FromFile($srcPath)

# Full illustration — used everywhere detail reads fine at the target size
# (app icon, PWA install icon, splash, larger favicons).
Resize-Image $src 1024 "$outDir\icon-1024-master.png"
Resize-Image $src 512 "$outDir\icon-512.png"
Resize-Image $src 192 "$outDir\icon-192.png"
Resize-Image $src 180 "$outDir\icon-180.png"

# Tight cactus-only crop for the smallest favicon sizes, where the full
# scene (two suns + layered dune colors) turns muddy. The cactus is wide
# enough (three arms) that a square crop can't fully exclude both sun
# corners without also clipping an arm — this framing reads cleanly as "a
# cactus" at 16x16/32x32 with only a small corner of one sun visible,
# which checked out fine visually.
$cropBitmap = Crop-Square $src 300 280 900
Resize-Image $cropBitmap 32 "$outDir\favicon-32.png"
Resize-Image $cropBitmap 16 "$outDir\favicon-16.png"
Resize-Image $cropBitmap 48 "$outDir\favicon-48.png"
$cropBitmap.Save("$outDir\icon-cactus-crop-preview.png", [System.Drawing.Imaging.ImageFormat]::Png)
$cropBitmap.Dispose()

$src.Dispose()
Write-Output "Icons generated."
