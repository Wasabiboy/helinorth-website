@echo off
cd /d "C:\Users\PC\.openclaw\workspace\main\projects\helinorth-clone"
rem Extract the fresh OAuth access token from wrangler's config and use it as the API token
for /f "tokens=2 delims== " %%a in ('findstr /b "oauth_token" "C:\Users\PC\AppData\Roaming\xdg.config\.wrangler\config\default.toml"') do set "CLOUDFLARE_API_TOKEN=%%~a"
set "CLOUDFLARE_ACCOUNT_ID="
npx wrangler pages deploy site --project-name=helinorth-website --branch=main --commit-dirty=true
