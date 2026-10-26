// Original, deterministic sound design: a muted preparation tap, then a compact
// boxing bell. Inharmonic, independently damped modes give the strike its metal
// body without samples, downloads, randomness or an audio dependency.
export function knockoutCue(step,sampleRate=48000) {
  const bell=step==='Go!',duration=bell ? .84 : .16;
  const samples=new Float32Array(Math.ceil(duration*sampleRate));
  const modes=[[640,1,.29],[947,.42,.23],[1302,.28,.18],[1645,.18,.14],[2528,.09,.08]];
  let peak=0;
  for(let i=0;i<samples.length;i++){
    const t=i/sampleRate;
    let value;
    if(bell){
      value=modes.reduce((sum,[hz,level,decay])=>sum+level*Math.sin(2*Math.PI*hz*t)*Math.exp(-t/decay),0);
      value+=.26*Math.sin(2*Math.PI*145*t)*Math.exp(-t/.045);
      value+=.12*Math.sin(2*Math.PI*3617*t)*Math.exp(-t/.009);
    } else {
      value=Math.sin(2*Math.PI*(90*t-100*t*t))*Math.exp(-t/.035);
      value+=.15*Math.sin(2*Math.PI*520*t)*Math.exp(-t/.012);
    }
    value*=Math.min(1,t/.0025)*Math.min(1,(duration-t)/.035);
    samples[i]=value;peak=Math.max(peak,Math.abs(value));
  }
  const level=bell ? .65 : .5;
  for(let i=0;i<samples.length;i++)samples[i]*=level/peak;
  samples[0]=samples[samples.length-1]=0;
  return samples;
}
