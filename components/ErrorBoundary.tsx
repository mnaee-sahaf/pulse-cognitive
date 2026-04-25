import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, Pressed } from '../constants/theme';
import { log } from '../lib/devLog';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message ?? 'Unknown error' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    log.warn('uncaught error in render tree', {
      message: error.message,
      stack: error.stack?.slice(0, 800),
      componentStack: info.componentStack?.slice(0, 800),
    });
  }

  reset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container} accessibilityRole="alert">
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          Pulse hit an unexpected error. Your training data is safe — try again.
        </Text>
        {__DEV__ && this.state.errorMessage ? (
          <Text style={styles.devMessage} selectable>
            {this.state.errorMessage}
          </Text>
        ) : null}
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && Pressed]}
          onPress={this.reset}
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <Text style={styles.ctaText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.pagePadding,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontFamily: 'serif',
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 22,
  },
  devMessage: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: Colors.warning,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.warning + '12',
    borderRadius: Spacing.badgeRadius,
    maxWidth: 320,
  },
  cta: {
    marginTop: 16,
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: Spacing.cardRadius,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
