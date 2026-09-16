import React, { Component, ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = { children: ReactNode };
type State = { error: Error | null; retryKey: number };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null, retryKey: 0 };

  static getDerivedStateFromError(error: Error): Pick<State, 'error'> {
    return { error };
  }

  handleRetry = () => {
    this.setState((state) => ({ error: null, retryKey: state.retryKey + 1 }));
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>HomeHuddle needs to restart this screen</Text>
          <Text style={styles.copy}>Your household data is safe. Please try again.</Text>
          <TouchableOpacity accessibilityRole="button" onPress={this.handleRetry} style={styles.button}>
            <Text style={styles.buttonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#F8FAFC', gap: 12 },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  copy: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  button: { marginTop: 8, borderRadius: 12, backgroundColor: '#4F46E5', paddingHorizontal: 20, paddingVertical: 12 },
  buttonText: { color: '#FFFFFF', fontWeight: '800' },
});
