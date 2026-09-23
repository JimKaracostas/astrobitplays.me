# Re-encode the supplied logo as browser and home-screen icons.
Add-Type -AssemblyName System.Drawing
$iconRoot = Join-Path $PSScriptRoot '..\public'
$sourceImage = [System.Drawing.Image]::FromFile((Join-Path $iconRoot 'logo.png'))
$iconFrames = @()
try {
  foreach ($size in @(16, 32, 48, 180, 192, 512)) {
    $bitmap = [System.Drawing.Bitmap]::new($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $buffer = [System.IO.MemoryStream]::new()
    try {
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.DrawImage($sourceImage, 0, 0, $size, $size)
      $bitmap.Save($buffer, [System.Drawing.Imaging.ImageFormat]::Png)
      $bytes = $buffer.ToArray()
      if ($size -le 48) { $iconFrames += @{ Size = $size; Bytes = $bytes } }
      $name = switch ($size) { 32 { 'favicon-32.png' }; 180 { 'apple-touch-icon.png' }; 192 { 'icon-192.png' }; 512 { 'icon-512.png' }; default { $null } }
      if ($name) { [System.IO.File]::WriteAllBytes((Join-Path $iconRoot $name), $bytes) }
    } finally { $buffer.Dispose(); $graphics.Dispose(); $bitmap.Dispose() }
  }
  $stream = [System.IO.File]::Create((Join-Path $iconRoot 'favicon.ico'))
  $writer = [System.IO.BinaryWriter]::new($stream)
  try {
    $writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]$iconFrames.Count)
    $offset = 6 + 16 * $iconFrames.Count
    foreach ($frame in $iconFrames) {
      $writer.Write([byte]$frame.Size); $writer.Write([byte]$frame.Size)
      $writer.Write([byte]0); $writer.Write([byte]0)
      $writer.Write([uint16]1); $writer.Write([uint16]32)
      $writer.Write([uint32]$frame.Bytes.Length); $writer.Write([uint32]$offset)
      $offset += $frame.Bytes.Length
    }
    foreach ($frame in $iconFrames) { $writer.Write([byte[]]$frame.Bytes) }
  } finally { $writer.Dispose(); $stream.Dispose() }
} finally { $sourceImage.Dispose() }
