import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

export type DonutSegment = {
  label: string;
  value: number;
  color: string;
};

type Props = {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
  centerValueColor?: string;
};

export default function DonutChart({
  segments,
  size = 220,
  strokeWidth = 26,
  centerLabel,
  centerValue,
  centerValueColor = "#FFFFFF",
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((acc, s) => acc + Math.max(0, s.value), 0);

  let offset = 0;

  return (
    <View style={[styles.wrap, { width: size, height: size }]} testID="donut-chart">
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          {/* Track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#1C1C1F"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {total > 0 &&
            segments.map((seg, idx) => {
              const value = Math.max(0, seg.value);
              if (value <= 0) return null;
              const length = (value / total) * circumference;
              const strokeDasharray = `${length} ${circumference - length}`;
              const strokeDashoffset = -offset;
              offset += length;
              return (
                <Circle
                  key={idx}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="butt"
                />
              );
            })}
        </G>
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {centerLabel && <Text style={styles.centerLabel}>{centerLabel}</Text>}
        {centerValue && (
          <Text style={[styles.centerValue, { color: centerValueColor }]} testID="donut-center-value">
            {centerValue}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  centerLabel: {
    color: "#A1A1AA",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
    fontWeight: "600",
  },
  centerValue: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
});
