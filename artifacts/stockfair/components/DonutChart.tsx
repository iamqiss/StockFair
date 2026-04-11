import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

export type DonutSlice = {
  label: string;
  value: number;
  color: string;
  icon?: string;
};

interface Props {
  data: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  colors: any;
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCart(cx, cy, r, endAngle);
  const end = polarToCart(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function polarToCart(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function DonutChart({ data, size = 160, strokeWidth = 24, colors }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;
  const gap = 2;

  let currentAngle = 0;
  const arcs = data.map((slice, i) => {
    const pct = slice.value / total;
    const sweep = pct * 360 - gap;
    const startAngle = currentAngle + gap / 2;
    const endAngle = startAngle + Math.max(sweep, 1);
    currentAngle += pct * 360;
    return { ...slice, pct, startAngle, endAngle, index: i };
  });

  const selSlice = selected !== null ? arcs[selected] : null;

  return (
    <View style={s.wrap}>
      <View style={{ position: 'relative', width: size, height: size }}>
        <Svg width={size} height={size}>
          <SvgCircle cx={cx} cy={cy} r={r} fill="none" stroke={colors.muted} strokeWidth={strokeWidth} />
          {arcs.map((arc, i) => (
            <Path
              key={i}
              d={describeArc(cx, cy, r, arc.startAngle, arc.endAngle)}
              fill="none"
              stroke={arc.color}
              strokeWidth={selected === i ? strokeWidth + 6 : strokeWidth}
              strokeLinecap="round"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelected(i === selected ? null : i);
              }}
            />
          ))}
        </Svg>
        <View style={[s.centerLabel, { width: size, height: size }]}>
          {selSlice ? (
            <>
              <Text style={[s.centerPct, { color: selSlice.color }]}>{Math.round(selSlice.pct * 100)}%</Text>
              <Text style={[s.centerName, { color: colors.mutedForeground }]} numberOfLines={1}>{selSlice.label}</Text>
            </>
          ) : (
            <>
              <Text style={[s.centerPct, { color: colors.foreground }]}>R {(total / 1000).toFixed(0)}k</Text>
              <Text style={[s.centerName, { color: colors.mutedForeground }]}>Total</Text>
            </>
          )}
        </View>
      </View>

      <View style={s.legend}>
        {arcs.map((arc, i) => (
          <TouchableOpacity key={i} style={s.legendItem}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelected(i === selected ? null : i); }}
            activeOpacity={0.7}
          >
            <View style={[s.legendDot, { backgroundColor: arc.color }]} />
            <View style={s.legendTextWrap}>
              <Text style={[s.legendLabel, { color: colors.foreground }]} numberOfLines={1}>{arc.label}</Text>
              <Text style={[s.legendValue, { color: colors.mutedForeground }]}>
                R {arc.value.toLocaleString('en-ZA', { maximumFractionDigits: 0 })} · {Math.round(arc.pct * 100)}%
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:        { alignItems: 'center', gap: 16 },
  centerLabel: { position: 'absolute', top: 0, left: 0, justifyContent: 'center', alignItems: 'center' },
  centerPct:   { fontSize: 20, fontWeight: '800' },
  centerName:  { fontSize: 11, marginTop: 2 },
  legend:      { width: '100%', gap: 8 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendDot:   { width: 10, height: 10, borderRadius: 5 },
  legendTextWrap: { flex: 1 },
  legendLabel: { fontSize: 13, fontWeight: '600' },
  legendValue: { fontSize: 11, marginTop: 1 },
});
