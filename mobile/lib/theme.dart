import 'package:flutter/material.dart';

class AppTheme {
  static ThemeData light() {
    return ThemeData(
      brightness: Brightness.light,
      primarySwatch: Colors.blue,
      cardTheme: const CardThemeData(elevation: 2),
    );
  }

  static ThemeData dark() {
    return ThemeData(
      brightness: Brightness.dark,
      primarySwatch: Colors.blue,
      cardTheme: const CardThemeData(elevation: 2),
    );
  }

  // Thunderstorms Theme - For Worrisome Financial Health
  static ThemeData thunderstorms() {
    return ThemeData(
      brightness: Brightness.dark,
      primaryColor: const Color(0xFF1A1A2E),
      scaffoldBackgroundColor: const Color(0xFF0F0F1E),
      colorScheme: const ColorScheme.dark(
        primary: Color(0xFF4A5568),
        secondary: Color(0xFF718096),
        surface: Color(0xFF1A1A2E),
        error: Color(0xFFFC8181),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF1A1A2E),
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        color: const Color(0xFF1A1A2E),
        elevation: 4,
        shadowColor: Colors.black.withOpacity(0.5),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF4A5568),
          foregroundColor: Colors.white,
        ),
      ),
    );
  }

  // Dark Knight Theme - For Not Well Financial Health
  static ThemeData darkKnight() {
    return ThemeData(
      brightness: Brightness.dark,
      primaryColor: const Color(0xFF2D1B1B),
      scaffoldBackgroundColor: const Color(0xFF1A0F0F),
      colorScheme: const ColorScheme.dark(
        primary: Color(0xFF8B1E1E),
        secondary: Color(0xFFC53030),
        surface: Color(0xFF2D1B1B),
        error: Color(0xFFFC8181),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF2D1B1B),
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        color: const Color(0xFF2D1B1B),
        elevation: 4,
        shadowColor: const Color(0xFF8B1E1E).withOpacity(0.5),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF8B1E1E),
          foregroundColor: Colors.white,
        ),
      ),
    );
  }

  // Green Zone Theme - For Good/OK Financial Health
  static ThemeData greenZone() {
    return ThemeData(
      brightness: Brightness.dark,
      primaryColor: const Color(0xFF1B3A2F),
      scaffoldBackgroundColor: const Color(0xFF0F2419),
      colorScheme: const ColorScheme.dark(
        primary: Color(0xFF2D5F4C),
        secondary: Color(0xFF48BB78),
        surface: Color(0xFF1B3A2F),
        error: Color(0xFFFC8181),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF1B3A2F),
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        color: const Color(0xFF1B3A2F),
        elevation: 4,
        shadowColor: const Color(0xFF48BB78).withOpacity(0.3),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF48BB78),
          foregroundColor: Colors.white,
        ),
      ),
    );
  }

  // Get theme based on health and mode
  static ThemeData getThemeForHealth(String health, String mode, String selectedTheme) {
    if (mode == 'manual') {
      return _getThemeByName(selectedTheme);
    }

    // Health auto mode
    switch (health) {
      case 'worrisome':
        return thunderstorms();
      case 'not_well':
        return darkKnight();
      case 'ok':
      case 'good':
        return greenZone();
      default:
        return light();
    }
  }

  static ThemeData _getThemeByName(String name) {
    switch (name) {
      case 'thunderstorms':
        return thunderstorms();
      case 'dark_knight':
        return darkKnight();
      case 'green_zone':
        return greenZone();
      default:
        return light();
    }
  }

  // Badge colors based on health
  static Color badgeColor(String health) {
    switch (health) {
      case 'good':
        return Colors.green;
      case 'ok':
        return Colors.blue;
      case 'not_well':
        return Colors.orange;
      case 'worrisome':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  static Color badgeTextColor(String health) {
    return Colors.white;
  }
}
