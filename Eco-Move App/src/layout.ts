export const TABS=['home','plan','nearby','trips','profile'] as const;
export function navbarLayout(width:number,bottomInset:number,footerInset=0){const barWidth=Math.min(340,width-32);return {width:barWidth,left:(width-barWidth)/2,bottom:bottomInset+18+footerInset,itemWidth:(barWidth-16)/5,height:68,touchHeight:52,padding:8};}
export function panelLayout(width:number,height:number,bottomInset:number,keyboard:number,expanded:boolean,collapsed:boolean,topInset:number,footerInset=0){
  const landscape=width>height*1.3;
  const bottom=keyboard?bottomInset+12+footerInset:bottomInset+100+footerInset;
  const max=Math.max(82,height-topInset-bottom-90);
  const h=collapsed?82:Math.min(max,Math.max(180,height*(expanded?.73:height<650?.36:.47)));
  return {landscape,left:16,right:landscape?undefined:16,width:landscape?Math.min(width*.47,430):undefined,bottom,height:h};
}
