import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, ViewStyle, TextStyle, View } from 'react-native';

interface AnimatedButtonProps {
  title: string;
  onPress: () => void;
  colors?: [string, string];
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: string;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'filled' | 'outline' | 'ghost';
}

export default function AnimatedButton({
  title, onPress, colors = ['#34c759', '#28a745'],
  style, textStyle, icon, disabled = false,
  size = 'large', variant = 'filled',
}: AnimatedButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.95, friction: 5, tension: 100, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }).start();
  };

  const sizeStyles = {
    small: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, fontSize: 13 },
    medium: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, fontSize: 15 },
    large: { paddingVertical: 17, paddingHorizontal: 32, borderRadius: 14, fontSize: 17 },
  }[size];

  if (variant === 'outline') {
    return (
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
        <TouchableOpacity onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress} disabled={disabled} activeOpacity={1}
          style={[styles.outlineBtn, { borderRadius: sizeStyles.borderRadius, paddingVertical: sizeStyles.paddingVertical, paddingHorizontal: sizeStyles.paddingHorizontal, borderColor: colors[0] }]}>
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text style={[{ fontSize: sizeStyles.fontSize, color: colors[0], fontWeight: '700' }, textStyle]}>{title}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  if (variant === 'ghost') {
    return (
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
        <TouchableOpacity onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress} disabled={disabled} activeOpacity={1} style={{ padding: 10, alignItems: 'center' }}>
          <Text style={[{ fontSize: sizeStyles.fontSize, color: colors[0], fontWeight: '600' }, textStyle]}>{title}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }], opacity: disabled ? 0.5 : 1 }, style]}>
      <TouchableOpacity onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress} disabled={disabled} activeOpacity={1}>
        <View style={[styles.filled, { backgroundColor: colors[0], borderRadius: sizeStyles.borderRadius, paddingVertical: sizeStyles.paddingVertical, paddingHorizontal: sizeStyles.paddingHorizontal }]}>
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text style={[styles.filledText, { fontSize: sizeStyles.fontSize }, textStyle]}>{title}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  filled: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', elevation: 3 },
  filledText: { color: '#fff', fontWeight: '700' },
  icon: { fontSize: 16, marginRight: 8 },
  outlineBtn: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', borderWidth: 2, backgroundColor: 'transparent' },
});
