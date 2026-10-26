export type MotionSample={x:number;y:number;z:number};
/** Three strong, alternating impulses; a single knock/rotation is insufficient. Units: g. */
export class ShakeRecognizer {
  private peak:MotionSample|null=null;
  private first=0;
  private lastPeak=-Infinity;
  private count=0;
  private lastTrigger=-Infinity;
  constructor(private threshold=2.4,private cooldownMs=3000){}
  reset(){this.peak=null;this.count=0;this.lastPeak=-Infinity}
  push(sample:MotionSample,now:number):boolean{
    const {x,y,z}=sample;
    if(![x,y,z,now].every(Number.isFinite)||now-this.lastTrigger<this.cooldownMs)return false;
    if(this.count&&now-this.first>900)this.reset();
    if(Math.hypot(x,y,z)<this.threshold||now-this.lastPeak<100)return false;
    if(!this.peak){this.peak=sample;this.first=now;this.lastPeak=now;this.count=1;return false}
    const dot=x*this.peak.x+y*this.peak.y+z*this.peak.z;
    if(dot>=0)return false;
    this.peak=sample;this.lastPeak=now;this.count++;
    if(this.count<3)return false;
    this.lastTrigger=now;this.reset();return true;
  }
}
