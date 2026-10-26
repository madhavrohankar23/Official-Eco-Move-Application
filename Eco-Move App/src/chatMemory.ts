export const chatMemory:{role:'user'|'assistant';text:string}[]=[];
export let chatGeneration=0;
export const clearChatMemory=()=>{chatGeneration++;chatMemory.length=0};
