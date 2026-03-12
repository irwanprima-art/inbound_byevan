const fs = require('fs');
const path = 'c:/inbound_byevan/frontend/src/pages/dashboard/DashboardInboundTab.tsx';

let buf = fs.readFileSync(path);

function replaceBytes(buf, searchHex, replaceHex) {
    const search = Buffer.from(searchHex.replace(/\s/g, ''), 'hex');
    const replace = Buffer.from(replaceHex.replace(/\s/g, ''), 'hex');
    let idx = 0, parts = [];
    while (true) {
        const pos = buf.indexOf(search, idx);
        if (pos === -1) { parts.push(buf.slice(idx)); break; }
        parts.push(buf.slice(idx, pos));
        parts.push(replace);
        idx = pos + search.length;
    }
    const result = Buffer.concat(parts);
    if (result.length !== buf.length || !result.equals(buf)) {
        console.log('Replaced hex:', searchHex.substring(0, 20), '->', replaceHex.substring(0, 20));
    }
    return result;
}

// 🏷️ (U+1F3F7 U+FE0F) = f0 9f 8f b7 ef b8 8f
// corrupted as: c3b0 c5b8 c28f c2b7 c3af c2b8 c28f
buf = replaceBytes(buf, 'c3b0 c5b8 c28f c2b7 c3af c2b8 c28f', 'f0 9f 8f b7 ef b8 8f');

// 🎁 (U+1F381) = f0 9f 8e 81
// From hex L319: c3b0 c5b8 c5bd c281  
buf = replaceBytes(buf, 'c3b0 c5b8 c5bd c281', 'f0 9f 8e 81');

// 📎 (U+1F4CE) = f0 9f 93 8e
// From hex L320: c3b0 c5b8 e2 80 9c c5bd
buf = replaceBytes(buf, 'c3b0 c5b8 e2809c c5bd', 'f0 9f 93 8e');

// em-dash — (U+2014) = e2 80 94
// From hex L318: c3a2 e282 ac e2809d (= â€")
buf = replaceBytes(buf, 'c3a2 e282ac e2809d', 'e2 80 94');
// Also possibly: c3a2 e2 80 c293 (another version)
buf = replaceBytes(buf, 'c3a2 e2 80 c294', 'e2 80 94');

// → (U+2192) = e2 86 92
// corrupted: c3a2 c286 c292
buf = replaceBytes(buf, 'c3a2 c286 c292', 'e2 86 92');

// ✅ (U+2705) = e2 9c 85
// corrupted: c3a2 c29c c285
buf = replaceBytes(buf, 'c3a2 c29c c285', 'e2 9c 85');

fs.writeFileSync(path, buf);
console.log('Done, file size:', buf.length);
