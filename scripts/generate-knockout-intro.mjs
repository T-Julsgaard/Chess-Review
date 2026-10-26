import fs from 'node:fs/promises';
import path from 'node:path';
import {knockoutCue} from '../lib/learning/knockout-sound.js';

// Audition the exact runtime synthesis: preparation tap, one second, then bell.
const sampleRate=48000,samples=new Float32Array(sampleRate*1.9);
for(const [step,offset] of [['1',0],['Go!',sampleRate]]){
  const cue=knockoutCue(step,sampleRate);
  for(let i=0;i<cue.length;i++)samples[offset+i]=cue[i]*.45;
}
const wav=Buffer.alloc(44+samples.length*2);
wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);
wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);
wav.writeUInt32LE(sampleRate,24);wav.writeUInt32LE(sampleRate*2,28);
wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples.length*2,40);
for(let i=0;i<samples.length;i++)wav.writeInt16LE(Math.round(samples[i]*32767),44+i*2);
const output=path.resolve(process.argv[2]||'web-ext-artifacts/knockout-intro.wav');
await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,wav);
console.log(output);
