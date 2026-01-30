
import fetch from 'node-fetch';

async function debug(q) {
    const res = await fetch(`http://qt.gtimg.cn/q=${q}`);
    const text = await res.text();
    console.log(`\n--- Results for ${q} ---`);
    console.log(text);
    const match = text.match(/="([^"]*)"/);
    if (match) {
        const parts = match[1].split('~');
        parts.forEach((p, i) => console.log(`${i}: ${p}`));
    }
}

async function run() {
    await debug('hk09988');
    await debug('usBABA');
}

run();
