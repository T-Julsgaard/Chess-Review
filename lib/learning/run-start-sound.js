import {knockoutCue} from './knockout-sound.js';

// Original intro cues, synthesized locally with a soft attack and release.
export function createRunStartSound(view, settings) {
  let context;
  const knockoutBuffers=new Map();
  const voices=new Set();
  const stop=()=>{for(const voice of voices)voice();};
  const prime=()=>{
    if(!settings().sound)return;
    try {
      context ||= new (view.AudioContext||view.webkitAudioContext)();
      if(context.state==='suspended')context.resume().catch(()=>{});
    } catch { /* Audio is optional; the visual countdown still runs. */ }
  };
  return {
    prime,stop,
    play(step,mode='timeAttack') {
      stop();
      const config=settings(),level=config.soundFx?.runStart?.volume;
      const countdownVolume=level==null||!Number.isFinite(+level)?100:Math.max(0,Math.min(100,+level));
      const volume=Math.max(0,Math.min(100,config.soundVolume??100))/100*countdownVolume/100;
      if(!config.sound||!volume)return;
      prime();
      if(!context||context.state!=='running')return;
      try {
        if(mode==='knockout'){
          let buffer=knockoutBuffers.get(step);
          if(!buffer){
            const samples=knockoutCue(step,context.sampleRate);
            buffer=context.createBuffer(1,samples.length,context.sampleRate);
            buffer.copyToChannel(samples,0);knockoutBuffers.set(step,buffer);
          }
          const source=context.createBufferSource(),gain=context.createGain();
          source.buffer=buffer;gain.gain.value=volume*.45;
          source.connect(gain);gain.connect(context.destination);
          const cleanup=()=>{source.onended=null;try{source.stop();}catch{}source.disconnect();gain.disconnect();voices.delete(cleanup);};
          voices.add(cleanup);source.onended=cleanup;source.start();
          return;
        }
        const go=step==='Go!',notes=go?[660,880]:[440],duration=go ? .24 : .12;
        for(const frequency of notes){
          const oscillator=context.createOscillator(),gain=context.createGain(),now=context.currentTime;
          oscillator.type='sine';oscillator.frequency.value=frequency;
          gain.gain.setValueAtTime(0,now);
          gain.gain.linearRampToValueAtTime(volume*(go ? .13 : .18),now+.008);
          gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
          oscillator.connect(gain);gain.connect(context.destination);
          const cleanup=()=>{oscillator.onended=null;try{oscillator.stop();}catch{}oscillator.disconnect();gain.disconnect();voices.delete(cleanup);};
          voices.add(cleanup);oscillator.onended=cleanup;
          oscillator.start(now);oscillator.stop(now+duration+.01);
        }
      } catch {stop();}
    },
    close() {stop();context?.close().catch(()=>{});context=null;knockoutBuffers.clear();}
  };
}
