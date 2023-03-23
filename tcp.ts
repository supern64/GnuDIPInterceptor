/*
    GnuDIPInterceptor
    A fake GnuDIP server, for when your router is terrible.
    Implements the TCP Protocol.
    SuperN64 2023-03-22
*/

import net from 'net';
import md5 from 'md5';
import crypto from 'crypto';
import { config } from 'dotenv';
config();

const server = net.createServer();
const ip = process.env.IP || "0.0.0.0";
const port = parseInt(process.env.PORT) || 3495;

const encoder = new TextEncoder();

type SocketData<T> = Partial<T> & {
    salt: string
}

server.on("connection", (sock) => {
    sock.setDefaultEncoding("ascii");
    const dataSock = sock as SocketData<net.Socket>;
    
    dataSock.salt = generateSalt();
    dataSock.write(dataSock.salt + "\n"); // send salt
    
    sock.on("error", () => {
        console.log(`[SERVER] Error in connection to ${sock.remoteAddress}!`);
    })

    sock.on("data", async (data) => {
        const params = data.toString().trim().split(":");
        /*
            0 = username
            1 = pwd
            2 = domain
            3 = code
            4 = (if 3 = 0) address
        */

        if (params.length < 4) return;
        // const user = params[0]; (ignored)
        const passwordHash = params[1];
        const correctHash: string = md5(md5(process.env.GNUDIP_PASS) + "." + dataSock.salt);
        const passwordValid = crypto.timingSafeEqual(encoder.encode(correctHash), encoder.encode(passwordHash));
        
        if (!passwordValid) { 
            dataSock.write("1\n"); // invalid password
            return;
        }

        // the difference is we now have the option to say "screw you" to clients that don't obey!
        let response: Response, text: string;
        switch(params[3]) {
            case "0": // set prompted (or detected!) address
                const ip = params[4] || dataSock.remoteAddress; // fallback
                response = await updateExternal(params[2], ip);
                text = await response.text();
                if (response.status != 200 || (text.toLowerCase().includes("error") && !text.toLowerCase().includes("has not changed"))) { // exceptions for afraid.org v1
                    console.log("[UPDATE] External update failed. Returned " + text.trim());
                    dataSock.write("1\n");
                } else {
                    console.log(`[UPDATE] Successfully updated ${params[2]} to ${ip}.`);
                    dataSock.write("0\n");
                }
                break;
            case "1": // go offline (NOOP)
                dataSock.write("2\n");
                break;
            case "2": // set detected address
                response = await updateExternal(params[2], dataSock.remoteAddress);
                text = await response.text();
                if (response.status != 200 || (text.toLowerCase().includes("error") && !text.toLowerCase().includes("has not changed"))) { // exceptions for afraid.org v1
                    console.log("[UPDATE] External update failed. Returned " + text.trim());
                    dataSock.write("1\n");
                } else {
                    console.log(`[UPDATE] Successfully updated ${params[2]} to ${dataSock.remoteAddress}.`);
                    dataSock.write(`0:${dataSock.remoteAddress}\n`);
                }
                break;
        }
    })
})

server.listen(port, ip, () => {
    console.log(`[SERVER] Listening at ${ip}:${port}.`);
})

async function updateExternal(domain: string, ip: string) : Promise<Response> {
    const replacements = {"{DOMAIN}": domain, "{ADDRESS}": ip};
    const requestUrl = process.env.TARGET_URL.replace(/{\w+}/g, (a) => {return replacements[a] || a});
    return await fetch(requestUrl);
}

function generateSalt(): string {
    return crypto.randomBytes(5).toString("hex");
}