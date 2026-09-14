// Offline asset preparation only; FFmpeg is not a browser/runtime dependency.
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const run = args => new Promise((resolve, reject) => {
  const child = spawn(ffmpeg, args, { windowsHide: true });
  let log = '';
  child.stderr.on('data', data => { log += data; });
  child.on('error', reject);
  child.on('close', code => code === 0 ? resolve(log) : reject(new Error(log)));
});

async function inspect(path) {
  const log = await run(['-hide_banner', '-i', path, '-map', '0:v:0', '-an', '-vf', 'showinfo', '-fps_mode', 'passthrough', '-f', 'null', '-']);
  const frames = [...log.matchAll(/n:\s*(\d+).*?pts_time:([\d.]+).*?s:(\d+)x(\d+).*?iskey:(\d)/g)]
    .map(match => ({ index: Number(match[1]), time: Number(match[2]), width: Number(match[3]), height: Number(match[4]), key: match[5] === '1' }));
  assert.ok(frames.length, 'FFmpeg must report decoded frame metadata');
  const fps = Number(log.match(/, ([\d.]+) fps[, ]/)?.[1]);
  assert.ok(fps > 0, 'FPS must be available before choosing GOP');
  const keyframes = frames.filter(frame => frame.key).map(frame => frame.time);
  return { width: frames[0].width, height: frames[0].height, fps, frameCount: frames.length, firstTime: frames[0].time, lastTime: frames.at(-1).time, keyframes, maxKeyframeGap: Math.max(...keyframes.slice(1).map((time, index) => time - keyframes[index]), 0), videoStream: log.split('\n').find(line => line.includes('Video:'))?.trim() };
}

const report = [];
for (const format of ['desktop', 'mobile']) {
  const input = fileURLToPath(new URL(`../public/videos/chadoo-hero-${format}.mp4`, import.meta.url));
  const output = fileURLToPath(new URL(`../public/videos/chadoo-hero-${format}-scrub.mp4`, import.meta.url));
  const before = await inspect(input);
  console.log(JSON.stringify({ format, before }));
  const gop = Math.max(1, Math.round(before.fps * 0.25));
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-map', '0:v:0', '-map', '0:a?', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-g', String(gop), '-keyint_min', String(gop), '-sc_threshold', '0', '-bf', '0', '-pix_fmt', 'yuv420p', '-fps_mode', 'passthrough', '-c:a', 'copy', '-movflags', '+faststart', output];
  await run(args);
  const after = await inspect(output);
  for (const key of ['width', 'height', 'fps', 'frameCount', 'firstTime', 'lastTime']) assert.equal(after[key], before[key], `Preserve ${format} ${key}`);
  assert.ok(after.maxKeyframeGap < 0.26);
  const bytes = await readFile(output);
  const atoms = [];
  for (let offset = 0; offset + 8 <= bytes.length;) {
    const size = bytes.readUInt32BE(offset);
    atoms.push(bytes.toString('ascii', offset + 4, offset + 8));
    if (size < 8) break;
    offset += size;
  }
  assert.ok(atoms.indexOf('moov') >= 0 && atoms.indexOf('moov') < atoms.indexOf('mdat'), 'Faststart metadata before media');
  report.push({ format, before, after, args, atoms, bytes: bytes.length });
  console.log(JSON.stringify({ format, after, bytes: bytes.length }));
}
await mkdir(new URL('../.qa/', import.meta.url), { recursive: true });
await writeFile(new URL('../.qa/encoding-report.json', import.meta.url), JSON.stringify(report, null, 2));
