import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient as SvgGrad, Stop, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_W } = Dimensions.get('window');

type DataPoint = { month: string; value: number; bankValue: number };

interface Props {
  data: DataPoint[];
  colors: any;
  accentColor?: string;
  height?: number;
}

function buildPath(points: { x: number; y: number }[], smooth = true): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  if (!smooth) {
    for (let i = 1; i < points.length; i++) d += ` L ${points[i].x} ${points[i].y}`;
    return d;
  }
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
    const cpx2 = curr.x - (curr.x - prev.x) * 0.4;
    d += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

export function PerformanceChart({ data, colors, accentColor = '#16A34A', height = 180 }: Props) {
  const [selected, setSelected] = useState<number | null>(null);

  if (data.length < 2) {
    return (
      <View style={[s.card, { backgroundColor: colors.card }]}>
        <Text style={[s.title, { color: colors.foreground }]}>Performance Timeline</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, textAlign: 'center', paddingVertical: 24 }}>
          Need at least 2 months of data to show performance chart.
        </Text>
      </View>
    );
  }

  const padL = 8, padR = 8, padT = 24, padB = 32;
  const chartW = (SCREEN_W - 64) - padL - padR;
  const chartH = height - padT - padB;

  const allVals = data.flatMap(d => [d.value, d.bankValue]);
  const minV = Math.min(...allVals) * 0.95;
  const maxV = Math.max(...allVals) * 1.05;
  const range = maxV - minV || 1;

  const mainPts = data.map((d, i) => ({
    x: padL + (i / Math.max(data.length - 1, 1)) * chartW,
    y: padT + chartH - ((d.value - minV) / range) * chartH,
  }));
  const bankPts = data.map((d, i) => ({
    x: padL + (i / Math.max(data.length - 1, 1)) * chartW,
    y: padT + chartH - ((d.bankValue - minV) / range) * chartH,
  }));

  const linePath = buildPath(mainPts);
  const bankPath = buildPath(bankPts);

  const fillPath = linePath +
    ` L ${mainPts[mainPts.length - 1].x} ${padT + chartH}` +
    ` L ${mainPts[0].x} ${padT + chartH} Z`;

  const selPoint = selected !== null ? data[selected] : null;
  const selPt = selected !== null ? mainPts[selected] : null;

  return (
    <View style={[s.card, { backgroundColor: colors.card }]}>
      <View style={s.headerRow}>
        <Text style={[s.title, { color: colors.foreground }]}>Performance Timeline</Text>
        <View style={s.legendRow}>
          <View style={[s.legendDot, { backgroundColor: accentColor }]} />
          <Text style={[s.legendTxt, { color: colors.mutedForeground }]}>Portfolio</Text>
          <View style={[s.legendDot, { backgroundColor: colors.mutedForeground }]} />
          <Text style={[s.legendTxt, { color: colors.mutedForeground }]}>Bank</Text>
        </View>
      </View>

      {selPoint && (
        <View style={s.tooltipRow}>
          <Text style={[s.tooltipMonth, { color: colors.foreground }]}>{selPoint.month}</Text>
          <Text style={[s.tooltipVal, { color: accentColor }]}>
            R {selPoint.value.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}
          </Text>
          <Text style={[s.tooltipGain, { color: accentColor }]}>
            +R {(selPoint.value - selPoint.bankValue).toLocaleString('en-ZA', { maximumFractionDigits: 0 })} vs bank
          </Text>
        </View>
      )}

      <Svg width={chartW + padL + padR} height={height} style={{ alignSelf: 'center' }}>
        <Defs>
          <SvgGrad id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={accentColor} stopOpacity="0.25" />
            <Stop offset="100%" stopColor={accentColor} stopOpacity="0.02" />
          </SvgGrad>
        </Defs>

        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = padT + chartH * (1 - pct);
          return (
            <Line key={pct} x1={padL} y1={y} x2={padL + chartW} y2={y}
              stroke={colors.border} strokeWidth={0.5} strokeDasharray="4,4" />
          );
        })}

        <Path d={fillPath} fill="url(#areaFill)" />
        <Path d={bankPath} stroke={colors.mutedForeground} strokeWidth={1.5}
          strokeDasharray="4,4" fill="none" opacity={0.5} />
        <Path d={linePath} stroke={accentColor} strokeWidth={2.5} fill="none" strokeLinecap="round" />

        {mainPts.map((pt, i) => (
          <Circle key={i} cx={pt.x} cy={pt.y} r={selected === i ? 5 : 3}
            fill={selected === i ? accentColor : colors.card}
            stroke={accentColor} strokeWidth={selected === i ? 2.5 : 1.5} />
        ))}

        {selPt && (
          <Line x1={selPt.x} y1={padT} x2={selPt.x} y2={padT + chartH}
            stroke={accentColor} strokeWidth={1} strokeDasharray="3,3" opacity={0.4} />
        )}

        {data.map((d, i) => {
          const x = padL + (i / Math.max(data.length - 1, 1)) * chartW;
          return (
            <React.Fragment key={i}>
              <Rect x={x - 16} y={padT - 4} width={32} height={chartH + padB}
                fill="transparent"
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelected(i === selected ? null : i); }} />
            </React.Fragment>
          );
        })}
      </Svg>

      <View style={s.xLabels}>
        {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 6)) === 0 || i === data.length - 1).map((d, i) => (
          <Text key={i} style={[s.xLabel, { color: colors.mutedForeground }]}>{d.month}</Text>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card:        { borderRadius: 16, padding: 16, gap: 8 },
  headerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:       { fontSize: 15, fontWeight: '700' },
  legendRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:   { width: 8, height: 8, borderRadius: 4 },
  legendTxt:   { fontSize: 10 },
  tooltipRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  tooltipMonth:{ fontSize: 12, fontWeight: '600' },
  tooltipVal:  { fontSize: 13, fontWeight: '700' },
  tooltipGain: { fontSize: 11, fontWeight: '600' },
  xLabels:     { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, marginTop: -4 },
  xLabel:      { fontSize: 9, fontWeight: '500' },
});
