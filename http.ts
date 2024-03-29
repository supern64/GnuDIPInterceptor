/*
    GnuDIPInterceptor
    A fake GnuDIP server, for when your router is terrible.
    Implements the HTTP Protocol.
    SuperN64 2023-03-09
*/

import express from 'express';
import crypto from 'crypto';
import md5 from 'md5';
import { config } from 'dotenv';
config();

const app = express();
const ip = process.env.IP || "0.0.0.0";
const port = parseInt(process.env.PORT) || 8080;

const encoder = new TextEncoder();

console.log("Generating signing key...")
const key = crypto.randomBytes(64);

  
app.get("/", (req, res) => {
    res.redirect("https://www.youtube.com/watch?v=cGw-8FrRT1E"); // COCONUT MALLED
});

app.get("/gnudip/cgi-bin/gdipupdt.cgi", async (req, res) => {
    if (Object.keys(req.query).length == 0) { // requesting salt
        const salt = generateSalt();
        const time = Date.now();
        const hmac = crypto.createHmac("sha512", key).update(`${salt}.${time}`);
        res.send(saltGeneratedTemplate(salt, time, hmac.digest("base64")));
    } else {
        const salt = req.query.salt as string;
        const time = parseInt(req.query.time as string);
        const signature = req.query.sign as string;

        // validate salt, time and signature
        if (Number.isNaN(time)) {
            res.send(responseTemplate(1, null, "Invalid Time"))
            return;
        }
        if (Date.now() - time > 60*1000) {
            res.send(responseTemplate(1, null, "Salt Expired"))
            return;
        }
        const saltValid = crypto.timingSafeEqual(crypto.createHmac("sha512", key).update(`${salt}.${time}`).digest(), Buffer.from(signature, "base64"))
        if (!saltValid) {
            res.send(responseTemplate(1, null, "Signature Invalid"));
            return;
        }

        // validate username and password
        // const user = req.query.user as string; // user is ignored
        const passwordHash = req.query.pass as string;
        const correctHash: string = md5(md5(process.env.GNUDIP_PASS) + "." + salt);
        const passwordValid = crypto.timingSafeEqual(encoder.encode(correctHash), encoder.encode(passwordHash));
        if (!passwordValid) {
            res.send(responseTemplate(1, null, "Credentials Invalid"));
            return;
        }

        // now that we know we have the right person, time to update!
        const requestCode = parseInt(req.query.reqc as string);
        const domain = req.query.domn as string;
        if (Number.isNaN(time) || requestCode > 2 || requestCode < 0) {
            res.send(responseTemplate(1, null, "Invalid Request Code"))
            return;
        }
        if (domain == null) {
            res.send(responseTemplate(1, null, "Domain Not Provided"));
            return;
        }

        let response: Response, text: string;
        switch (requestCode) {
            case 0: // set prompted address
                if (!req.query.addr) {
                    res.send(responseTemplate(1, null, "No Address Provided"));
                    return;
                }
                response = await updateExternal(domain, req.query.addr as string);
                text = await response.text();
                if (response.status != 200 || (text.toLowerCase().includes("error") && !text.toLowerCase().includes("has not changed"))) { // exceptions for afraid.org v1
                    console.log("[UPDATE] External update failed. Returned " + text.trim());
                    res.send(responseTemplate(1, null, "External Update Failed - " + text.trim()));
                } else {
                    console.log(`[UPDATE] Successfully updated ${domain} to ${req.query.addr}.`);
                    res.send(responseTemplate(0, null, "Update Successful"))
                }
                break;
            case 1: // go offline
                res.send(responseTemplate(2, null, "!! NOOP - Going offline is not supported. !!"))
                break;
            case 2: // set detected address
                response = await updateExternal(domain, req.ip);
                text = await response.text();
                if (response.status != 200 || (text.toLowerCase().includes("error") && !text.toLowerCase().includes("has not changed"))) {
                    console.log("[UPDATE] External update failed. Returned " + text.trim());
                    res.send(responseTemplate(1, null, "External Update Failed - " + text.trim()));
                } else {
                    console.log(`[UPDATE] Successfully updated ${domain} to ${req.ip}.`);
                    res.send(responseTemplate(0, req.ip, "Update Successful"))
                }
                break;
        }
    }
});

app.listen(port, ip, () => {
    console.log(`[SERVER] Listening at ${ip}:${port}.`);
});

// send stuff
async function updateExternal(domain: string, ip: string) : Promise<Response> {
    const replacements = {"{DOMAIN}": domain, "{ADDRESS}": ip};
    const requestUrl = process.env.TARGET_URL.replace(/{\w+}/g, (a) => {return replacements[a] || a});
    return await fetch(requestUrl);
}

// salt generation
function generateSalt(): string {
    return crypto.randomBytes(5).toString("hex");
}

// page templates
// all ugliness is done to conform to spec.
function basicTemplate(metaSection: string, contentSection: string) {
    return `<!DOCTYPE HTML> 
<html>
<head>
<title>
GnuDIP Interceptor
</title>
${metaSection}
</head>
<body>
<center>
<h2>GnuDIP Interceptor</h2>
${contentSection}
</center>
</body>
</html>`
}

function saltGeneratedTemplate(salt: string, time: number, sign: string) : string {
    return basicTemplate(
        `<meta name="salt" content="${salt}">
<meta name="time" content="${time}">
<meta name="sign" content="${sign}">`
        , "Salt Generated"
    );
}

function responseTemplate(responseCode: number, address?: string, reason?: string) : string {
    return basicTemplate(
        `<meta name="retc" content="${responseCode}">` +
        (address ? `\n<meta name="addr" content="${address}">` : ""),
        (responseCode !== 1 ? "Update Successful" : "Error: " + reason)
    );
}