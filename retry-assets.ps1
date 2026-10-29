# Retry missing assets with curl (browser UA) — Node fetch is blocked by CF bot protection.
$base = "https://helinorth.co.nz"
$out = "C:\Users\PC\.openclaw\workspace\main\projects\helinorth-clone\site"
$failed = @(
  "wp-content/uploads/Landscape Website Show Reel adjusted.mp4",
  "wp-content/plugins/custom-facebook-feed/assets/img/cff-avatar.png",
  "wp-content/plugins/custom-facebook-feed/assets/fonts/fontawesome-webfont.eot",
  "wp-content/plugins/custom-facebook-feed/assets/fonts/fontawesome-webfont.woff2",
  "wp-content/plugins/custom-facebook-feed/assets/fonts/fontawesome-webfont.woff",
  "wp-content/plugins/custom-facebook-feed/assets/fonts/fontawesome-webfont.ttf",
  "wp-content/plugins/custom-facebook-feed/assets/fonts/fontawesome-webfont.svg",
  "wp-content/plugins/instagram-feed/img/sbi-sprite.png",
  "wp-content/plugins/ml-slider/assets/metaslider/bg_direction_nav.png",
  "wp-content/plugins/ml-slider/assets/sliders/flexslider/fonts/flexslider-icon.eot",
  "wp-content/plugins/ml-slider/assets/sliders/flexslider/fonts/flexslider-icon.woff",
  "wp-content/plugins/ml-slider/assets/sliders/flexslider/fonts/flexslider-icon.ttf",
  "wp-content/plugins/ml-slider/assets/sliders/flexslider/fonts/flexslider-icon.svg",
  "wp-content/plugins/ml-slider/themes/highway/v1.0.0/images/arrow.svg",
  "wp-content/plugins/ml-slider/themes/highway/v1.0.0/images/arrow-left.png",
  "wp-content/plugins/ml-slider/themes/highway/v1.0.0/images/arrow-right.png",
  "wp-content/plugins/oxygen/component-framework/components/classes/gallery/photoswipe/default-skin/default-skin.png",
  "wp-content/plugins/oxygen/component-framework/components/classes/gallery/photoswipe/default-skin/default-skin.svg",
  "wp-content/plugins/oxygen/component-framework/components/classes/gallery/photoswipe/default-skin/preloader.gif",
  "wp-content/plugins/reviews-feed/assets/images/sprite.png",
  "wp-content/plugins/reviews-feed/assets/images/close.png",
  "wp-includes/fonts/dashicons.eot",
  "wp-includes/fonts/dashicons.ttf"
)
$ok = 0; $bad = 0
foreach ($f in $failed) {
  $dest = Join-Path $out $f
  New-Item -ItemType Directory -Path (Split-Path $dest) -Force | Out-Null
  $url = "$base/$($f -replace ' ','%20')"
  $code = & curl.exe -s -L -o $dest -w "%{http_code}" -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36" $url
  if ($code -eq "200") { $ok++ } else { $bad++; "FAIL $code $f"; Remove-Item $dest -ErrorAction SilentlyContinue }
}
"done: ok=$ok fail=$bad"
