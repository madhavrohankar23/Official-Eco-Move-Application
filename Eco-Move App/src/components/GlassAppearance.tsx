import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { Copy, Glass } from './Glass';
import { MotionPressable } from './MotionPressable';

/** Appearance-only controls; retain stored night material and all profile preferences. */
export function GlassAppearanceSelector() {
  const theme = useTheme();
  return <View style={{gap:10}} testID="glass-appearance">
    <Copy size={11} weight="600" muted style={{letterSpacing:1.2}}>APPEARANCE</Copy>
    <View accessibilityRole="radiogroup" accessibilityLabel="Appearance" style={{flexDirection:'row',gap:10}}>
      {([{night:false,label:'Light'},{night:true,label:'Night'}] as const).map(option => {
        const selected = theme.dark === option.night;
        return <MotionPressable key={option.label} testID={`mode-${option.label.toLowerCase()}`}
          accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{checked:selected}} aria-checked={selected}
          onPress={()=>theme.setDark(option.night)} style={{flex:1,minWidth:0}}>
          {({pressed})=><Glass level={1} blur={false} state={pressed?'pressed':selected?'selected':'default'} style={{borderRadius:16}}>
            <View style={{minHeight:48,alignItems:'center',justifyContent:'center',padding:10}}>
              <Copy size={15} weight={selected?'700':'500'}>{option.label}</Copy>
            </View>
          </Glass>}
        </MotionPressable>;
      })}
    </View>
    <Copy muted size={12}>{theme.dark?'Night Mode · your saved reflective glass appearance':'Light Mode · matte white with clear, quiet boundaries'}</Copy>
  </View>;
}
