@echo off
set CLOUDFLARE_API_TOKEN=
node -e "console.log('token seen by child:', process.env.CLOUDFLARE_API_TOKEN ? 'STILL SET (len ' + process.env.CLOUDFLARE_API_TOKEN.length + ')' : 'CLEARED')"
