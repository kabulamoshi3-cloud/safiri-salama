import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

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
  title, onPress, colors = ['#1a73e8', '#1565c0'],
  style, textStyle, icon, disabled = false,
  size = 'large', variant = 'filled',
}: AnimatedButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 0.94, friction: 5, tension: 100, useNativeDriver: true }),
      Animated.timing(shadowAnim, { toValue: 0.5, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
      Animated.timing(shadowAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const sizeStyles = {
    small: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, fontSize: 13 },
    medium: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, fontSize: 15 },
    large: { paddingVertical: 17, paddingHorizontal: 32, borderRadius: 14, fontSize: 17 },
  }[size];

  if (variant === 'outline') {
    return (
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
        <TouchableOpacity
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          disabled={disabled}
          activeOpacity={1}
          style={[styles.outlineBtn, { borderRadius: sizeStyles.borderRadius, paddingVertical: sizeStyles.paddingVertical, paddingHorizontal: sizeStyles.paddingHorizontal, borderColor: colors[0] }]}
        >
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text style={[styles.outlineText, { fontSize: sizeStyles.fontSize, color: colors[0] }, textStyle]}>{title}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  if (variant === 'ghost') {
    return (
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
        <TouchableOpacity onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={handlePress} disabled={disabled} activeOpacity={1}>
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text style={[styles.ghostText, { fontSize: sizeStyles.fontSize, color: colors[0] }, textStyle]}>{title}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }], opacity: disabled ? 0.5 : shadowAnim }, style]}>
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={1}
      >
        <LinearGradient
          colors={disabled ? ['#bbb', '#999'] : colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, { borderRadius: sizeStyles.borderRadius, paddingVertical: sizeStyles.paddingVertical, paddingHorizontal: sizeStyles.paddingHorizontal }]}
        >
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text style={[styles.text, { fontSize: sizeStyles.fontSize }, textStyle]}>{title}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  gradient: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  text: { color: '#fff', fontWeight: '700', letterSpacing: 0.3 },
  icon: { fontSize: 18, marginRight: 8 },
  outlineBtn: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', borderWidth: 2, backgroundColor: 'transparent' },
  outlineText: { fontWeight: '700' },
  ghostText: { fontWeight: '600', textAlign: 'center' },
});
