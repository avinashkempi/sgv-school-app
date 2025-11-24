import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleTryAgain = () => {
    // Attempt to recover by resetting state
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <MaterialIcons name="error" size={64} color="#FF6B6B" />
            <Text style={styles.title}>Oops! Something went wrong.</Text>
            <Text style={styles.subtitle}>
              We're sorry, but an unexpected error occurred. Please try again.
            </Text>
            
            <TouchableOpacity style={styles.button} onPress={this.handleTryAgain}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>

            {/* Optional: Show error details in development */}
            {__DEV__ && this.state.error && (
              <ScrollView style={styles.debugBox}>
                <Text style={styles.debugText}>{this.state.error.toString()}</Text>
              </ScrollView>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  debugBox: {
    marginTop: 30,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
    width: '100%',
    maxHeight: 200,
  },
  debugText: {
    color: '#d63031',
    fontFamily: 'monospace',
    fontSize: 12,
  },
});

export default ErrorBoundary;
