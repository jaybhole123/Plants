param([string]$src,[string]$out)
Add-Type -AssemblyName System.Drawing

function Save-Jpeg($bmp, $path, $q) {
  $enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $p = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $p.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$q)
  $bmp.Save($path, $enc, $p)
}
function Resize($img, $w, $h) {
  $b = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($b)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.Clear([System.Drawing.Color]::White)
  $g.DrawImage($img, 0, 0, $w, $h)
  $g.Dispose()
  return $b
}

foreach ($f in Get-ChildItem $src -Filter *.png) {
  $img = [System.Drawing.Image]::FromFile($f.FullName)
  $name = [IO.Path]::GetFileNameWithoutExtension($f.Name) + '.jpg'

  # lowq: 55% size, JPEG quality 30
  New-Item -ItemType Directory -Force "$out\lowq" | Out-Null
  $b = Resize $img ([int]($img.Width * 0.55)) ([int]($img.Height * 0.55))
  Save-Jpeg $b "$out\lowq\$name" 30; $b.Dispose()

  # blur: shrink to 30% then back up (soft / out-of-focus look), JPEG 80
  New-Item -ItemType Directory -Force "$out\blur" | Out-Null
  $s = Resize $img ([int]($img.Width * 0.30)) ([int]($img.Height * 0.30))
  $b = Resize $s $img.Width $img.Height
  Save-Jpeg $b "$out\blur\$name" 80; $s.Dispose(); $b.Dispose()

  # tilt: rotate 3 degrees on a grey desk-coloured background, JPEG 70 (phone-photo style)
  New-Item -ItemType Directory -Force "$out\tilt" | Out-Null
  $w = $img.Width; $h = $img.Height
  $b = New-Object System.Drawing.Bitmap([int]($w * 1.12), [int]($h * 1.12))
  $g = [System.Drawing.Graphics]::FromImage($b)
  $g.Clear([System.Drawing.Color]::FromArgb(120, 110, 100))
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.TranslateTransform($b.Width / 2, $b.Height / 2)
  $g.RotateTransform(3)
  $g.DrawImage($img, -$w / 2, -$h / 2, $w, $h)
  $g.Dispose()
  Save-Jpeg $b "$out\tilt\$name" 70; $b.Dispose()

  $img.Dispose()
}
Get-ChildItem $out -Recurse -File | Select-Object @{n='path';e={$_.FullName.Substring($out.Length)}}, @{n='KB';e={[int]($_.Length/1KB)}} | Format-Table -AutoSize | Out-String
