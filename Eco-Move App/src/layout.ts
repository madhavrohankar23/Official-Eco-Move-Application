export const TABS=['home','plan','nearby','trips','profile'] as const;
export function navbarLayout(width:number,bottomInset:number,footerInset=0){const barWidth=Math.min(340,width-32);return {width:barWidth,left:(width-barWidth)/2,bottom:bottomInset+18+footerInset,itemWidth:(barWidth-16)/5,height:68,touchHeight:52,padding:8};}
export function panelLayout(width:number,height:number,bottomInset:number,keyboard:number,expanded:boolean,collapsed:boolean,topInset:number,footerInset=0,routeFocus=false){
  const landscape=width>height*1.3;
  const bottom=keyboard?bottomInset+12+footerInset:routeFocus?bottomInset+16+footerInset:bottomInset+100+footerInset;
  const max=Math.max(82,height-topInset-bottom-(routeFocus?16:90));
  const restingFraction=routeFocus?(height<650?0.44:0.50):(height<650?0.36:0.47);
  const h=collapsed?82:expanded?(routeFocus?max:Math.min(max,height*0.73)):Math.min(max,Math.max(180,height*restingFraction));
  return {landscape,left:16,right:landscape?undefined:16,width:landscape?Math.min(width*.47,430):undefined,bottom,height:Math.round(h)};
}
