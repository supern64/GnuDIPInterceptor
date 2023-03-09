# GnuDIPInterceptor
Fake GnuDIP server that can redirect requests somewhere else.
## Why?
My router has no support for custom protocols.
## How?
Configure it by creating a .env file. (using environment variables also work)
```dotenv
GNUDIP_PASS=your GnuDIP password (currently ignores username)
TARGET_URL=the URL you want to ping
IP=the IP you want to bind to
PORT=the port you want to bind to
```
Run `npm install` to install all the dependencies, then `npm start` to run.  
It should automatically start listening at `0.0.0.0:8080`, and you should be able to point GnuDIP to `/gnudip/cgi-bin/gdipupdt.cgi`.
