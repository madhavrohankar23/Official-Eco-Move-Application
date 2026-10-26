import type {VoiceIntent} from './voiceTypes';
export type VoicePhase='idle'|'permission'|'listening'|'review'|'thinking';
type VoiceSessionAdapter={
  supported:boolean;
  permission:()=>Promise<{granted:boolean}>;
  start:()=>void;
  abort:()=>void;
  request:(id:string,query:string,isCurrent:()=>boolean)=>Promise<VoiceIntent>;
  cancel:(id:string)=>void;
  state:(phase:VoicePhase)=>void;
  transcript:(text:string)=>void;
  reply:(result:VoiceIntent,isCurrent:()=>boolean)=>Promise<void>;
  error:(message:string)=>void;
  finish:()=>void;
};
let sequence=0;
/** Owns one permission, speech and network session. Late results never update a stopped session. */
export class VoiceSession {
  private epoch=0;
  private phase:VoicePhase='idle';
  private requestId:string|null=null;
  private endTimer:ReturnType<typeof setTimeout>|undefined;
  private listenTimer:ReturnType<typeof setTimeout>|undefined;
  constructor(private adapter:VoiceSessionAdapter){}
  private state(phase:VoicePhase){this.phase=phase;this.adapter.state(phase)}
  async start(){
    if(this.phase!=='idle')return;
    const run=++this.epoch;
    this.state('permission');
    try{
      if(!this.adapter.supported)throw Error('Voice recognition is unavailable in this browser or Expo Go. Use the installed Eco-Move app, or type your question.');
      const permission=await this.adapter.permission();
      if(run!==this.epoch)return;
      if(!permission.granted)throw Error('Microphone or speech permission is off. Allow it in device settings, or type your question.');
      this.state('listening');
      this.adapter.start();
      this.listenTimer=setTimeout(()=>{if(run===this.epoch&&this.phase==='listening')this.fail('No speech was received. Tap Voice and try again, or type your question.')},30000);
    }catch(error){if(run===this.epoch)this.fail(error instanceof Error?error.message:'Voice input could not start. Please retry.')}
  }
  result(text:string,isFinal:boolean,needsReview=false){
    if(this.phase!=='listening'||!text.trim())return;
    this.adapter.transcript(text);
    if(!isFinal)return;
    if(needsReview){
      clearTimeout(this.endTimer);clearTimeout(this.listenTimer);
      this.state('review');this.adapter.abort();return;
    }
    this.dispatch(text);
  }
  confirm(text:string){if(this.phase==='review'&&text.trim())this.dispatch(text.trim())}
  /** Typed commands share the same cancellation and final-result path as speech. */
  submit(text:string){
    if(this.phase!=='idle'||!text.trim())return;
    this.epoch++;
    this.dispatch(text.trim());
  }
  private dispatch(text:string){
    clearTimeout(this.endTimer);clearTimeout(this.listenTimer);
    this.state('thinking');
    const run=this.epoch,id=`voice-${Date.now()}-${++sequence}`;this.requestId=id;
    const isCurrent=()=>run===this.epoch;
    void (async()=>{try{
      const result=await this.adapter.request(id,text,isCurrent);
      if(!isCurrent())return;
      await this.adapter.reply(result,isCurrent);
      if(isCurrent())this.finish();
    }catch(error){if(isCurrent())this.fail(error instanceof Error?error.message:'The assistant could not respond. Please retry.')}})();
  }
  end(){
    if(this.phase!=='listening')return;
    // Some recognizers deliver a final result immediately after their end event.
    clearTimeout(this.endTimer);
    this.endTimer=setTimeout(()=>{if(this.phase==='listening')this.fail('No speech was recognized. Tap Voice and try again, or type your question.')},250);
  }
  error(message:string){if(this.phase==='listening'||this.phase==='permission')this.fail(message||'Speech recognition stopped. Please retry.')}
  private fail(message:string){this.stop();this.adapter.error(message);this.adapter.finish()}
  private finish(){this.stop();this.adapter.finish()}
  stop(){
    this.epoch++;clearTimeout(this.endTimer);clearTimeout(this.listenTimer);
    // Set idle before abort, because abort can synchronously deliver error/end events.
    this.state('idle');this.adapter.abort();
    if(this.requestId){this.adapter.cancel(this.requestId);this.requestId=null}
  }
}
