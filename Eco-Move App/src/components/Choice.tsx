import React, { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable as Backdrop, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Check, ChevronDown, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { Copy, Field, Glass, IconButton } from './Glass';
import { MotionPressable as Pressable } from './MotionPressable';

export function Choice({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: { value: string; label: string; detail?: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const { c, dark, reduceMotion } = useTheme();
  const safe = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find(x => x.value === value);
  const filtered = options.filter(o =>
    `${o.label} ${o.detail || ''}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <Copy size={11} muted weight="600" style={{ letterSpacing: 0.6, textTransform: 'uppercase' }}>
        {label}
      </Copy>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => {
          setQuery('');
          setOpen(true);
        }}
      >
        {({ pressed }) => (
          <Glass
            level={1}
            blur={false}
            state={disabled ? 'disabled' : pressed ? 'pressed' : 'default'}
            style={{
              borderRadius: 19,
            }}
          >
            <View
              style={{
                minHeight: 50,
                paddingHorizontal: 16,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Copy size={15} weight={selected ? '500' : '400'} muted={!selected} style={{ flex: 1 }}>
                {selected?.label || value || `Choose ${label.toLowerCase()}`}
              </Copy>
              {!disabled && <ChevronDown size={18} color={c.muted} />}
            </View>
          </Glass>
        )}
      </Pressable>

      <Modal visible={open} animationType={reduceMotion ? 'none' : 'fade'} transparent onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{
            flex: 1,
            backgroundColor: dark ? 'rgba(3, 12, 8, 0.55)' : 'rgba(27, 52, 40, 0.22)',
            paddingTop: safe.top + 12,
            paddingBottom: safe.bottom + 12,
            paddingHorizontal: 12,
            justifyContent: 'center',
          }}
        >
          <Backdrop accessibilityLabel="Dismiss selection" accessibilityRole="button" onPress={() => setOpen(false)} style={StyleSheet.absoluteFill} />
          <Glass isolated level={4} specular style={{ height: Math.min(600, height - safe.top - safe.bottom - 24, 200 + options.length * 64), flexShrink: 1, maxHeight: '100%', borderRadius: 30 }}>
          <View style={{ flex: 1, padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Copy size={22} weight="600" style={{ flex: 1 }}>
              {label}
            </Copy>
            <IconButton label="Close selection" icon={X} onPress={() => setOpen(false)} />
          </View>
          <Field
            label="Filter options"
            placeholder="Type to filter…"
            value={query}
            onChangeText={setQuery}
            autoFocus={options.length > 8}
          />
          <FlatList
            style={{ marginTop: 12 }}
            data={filtered}
            keyExtractor={(o, i) => o.value + i}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <Copy muted size={14}>
                  No matches. Try a different search.
                </Copy>
              </View>
            }
            renderItem={({ item: o }) => {
              const isItemChosen = o.value === value;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={o.label}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  style={{
                    paddingVertical: 14,
                    paddingHorizontal: 12,
                    borderRadius: 14,
                    marginVertical: 2,
                    backgroundColor: isItemChosen
                      ? dark
                        ? 'rgba(74, 222, 128, 0.12)'
                        : 'rgba(24, 109, 78, 0.08)'
                      : 'transparent',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Copy size={15} weight={isItemChosen ? '600' : '400'}>
                      {o.label}
                    </Copy>
                    {o.detail && (
                      <Copy muted size={12}>
                        {o.detail}
                      </Copy>
                    )}
                  </View>
                  {isItemChosen && <Check size={19} color={c.accent} strokeWidth={2.2} />}
                </Pressable>
              );
            }}
          />
          </View>
          </Glass>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

