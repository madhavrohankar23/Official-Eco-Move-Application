import React from 'react';
import { View } from 'react-native';
import { Action, Copy } from './Glass';
import { useApp } from '../AppContext';
import { VOICE_LANGUAGES } from '../voiceInput';

export function VoiceLanguagePicker({ disabled = false }: { disabled?: boolean }) {
  const app = useApp();
  return <View style={{ gap: 6 }}>
    <Copy size={12} muted>Speech language</Copy>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {VOICE_LANGUAGES.map(language => <Action key={language.id} label={language.label}
        accessibilityLabel={`Speech language: ${language.label}`} compact quiet
        selected={app.voiceLanguage === language.id} disabled={disabled}
        style={{ flex: 1, minWidth: 80 }} onPress={() => app.setVoiceLanguage(language.id)} />)}
    </View>
    <Copy size={12} muted>For mixed speech, select your main language. Say both places, for example “Sitabuldi se Airport जाना है”.</Copy>
  </View>;
}
