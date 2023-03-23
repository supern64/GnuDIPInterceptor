# GnuDIPInterceptor
Fake GnuDIP server that can redirect requests somewhere else.
## Why?
My router has no support for custom protocols. (It still didn't work with this, c'mon FiberHome stop being a POS)
## How?
Configure it by creating a .env file. (using environment variables also work)
```dotenv
GNUDIP_PASS=your GnuDIP password (currently ignores username)
TARGET_URL=the URL you want to ping (use {DOMAIN} for the DDNS domain, and {ADDRESS} for the IP)
IP=the IP you want to bind to
PORT=the port you want to bind to
```
Run `npm install` to install all the dependencies, then `npm start` to run the HTTP based version, or `npm run start-tcp` to run the TCP based version.
It should automatically start listening at `0.0.0.0:8080` for HTTP or `0.0.0.0:3495` for TCP, and you should be able to point GnuDIP to `/gnudip/cgi-bin/gdipupdt.cgi` if you are on HTTP.
