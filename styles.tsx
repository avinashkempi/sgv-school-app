// styles.ts

import { StyleSheet } from 'react-native';

export const COLORS = {
  background: '#f5f5f5',
  primary: '#2F6CD4',
  text: '#333',
  muted: '#666',
  white: '#ffffff',
};

export const GLOBAL = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingTop: 80,
  },
  heading: {
    fontSize: 30,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 6,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 16,
    color: COLORS.muted,
    marginBottom: 40,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.white,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    marginBottom: 16,
  },
  cardText: {
    fontSize: 18,
    color: COLORS.text,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  text: {
    fontSize: 15,
    color: COLORS.muted,
    lineHeight: 22,
  },
  link: {
    fontSize: 15,
    color: COLORS.primary,
    marginTop: 4,
  },
  socialContainer: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 20,
  },
  iconBox: {
    alignItems: 'center',
  },
  iconLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});
