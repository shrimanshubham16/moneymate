import 'package:flutter/material.dart';
import '../api_client.dart';

class ThemesScreen extends StatefulWidget {
  const ThemesScreen({super.key, required this.api, required this.onThemeChanged});
  final ApiClient api;
  final Function(String mode, String selectedTheme) onThemeChanged;

  @override
  State<ThemesScreen> createState() => _ThemesScreenState();
}

class _ThemesScreenState extends State<ThemesScreen> {
  bool loading = true;
  String themeMode = 'health_auto';
  String selectedTheme = 'thunderstorms';
  bool constraintTierEffect = true;
  String? error;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final themeState = await widget.api.fetchThemeState();
      setState(() {
        themeMode = themeState['mode'] ?? 'health_auto';
        selectedTheme = themeState['selected_theme'] ?? 'thunderstorms';
        constraintTierEffect = themeState['constraint_tier_effect'] ?? true;
      });
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      setState(() => loading = false);
    }
  }

  Future<void> updateTheme() async {
    try {
      await widget.api.updateThemeState(
        mode: themeMode,
        selectedTheme: selectedTheme,
        constraintTierEffect: constraintTierEffect,
      );
      widget.onThemeChanged(themeMode, selectedTheme);
      _showSuccess('Theme updated successfully');
    } catch (e) {
      _showError(e.toString());
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: Colors.red.shade700),
    );
  }

  void _showSuccess(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  Color _getThemePreviewColor(String theme) {
    switch (theme) {
      case 'thunderstorms':
        return const Color(0xFF1A1A2E);
      case 'dark_knight':
        return const Color(0xFF2D1B1B);
      case 'green_zone':
        return const Color(0xFF1B3A2F);
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Themes'),
        actions: [
          IconButton(
            icon: const Icon(Icons.save),
            onPressed: updateTheme,
          ),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline, size: 64, color: Colors.red.shade300),
                      const SizedBox(height: 16),
                      Text('Error: $error', textAlign: TextAlign.center),
                      const SizedBox(height: 24),
                      ElevatedButton(onPressed: load, child: const Text('Retry')),
                    ],
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Theme Mode',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      const SizedBox(height: 16),
                      Card(
                        elevation: 2,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        child: Column(
                          children: [
                            RadioListTile<String>(
                              title: const Text('Health Auto'),
                              subtitle: const Text('Automatically change based on financial health'),
                              value: 'health_auto',
                              groupValue: themeMode,
                              onChanged: (value) {
                                setState(() => themeMode = value!);
                              },
                            ),
                            const Divider(height: 1),
                            RadioListTile<String>(
                              title: const Text('Manual'),
                              subtitle: const Text('Choose your own theme'),
                              value: 'manual',
                              groupValue: themeMode,
                              onChanged: (value) {
                                setState(() => themeMode = value!);
                              },
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 32),
                      Text(
                        'Select Theme',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      const SizedBox(height: 8),
                      if (themeMode == 'health_auto')
                        Text(
                          'Theme will be auto-selected based on your financial health',
                          style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
                        ),
                      const SizedBox(height: 16),
                      _buildThemeCard(
                        'Thunderstorms',
                        'thunderstorms',
                        'Dark stormy theme for worrisome finances',
                        Icons.thunderstorm,
                      ),
                      _buildThemeCard(
                        'Dark Knight',
                        'dark_knight',
                        'Reddish dark anime theme for not-well finances',
                        Icons.nights_stay,
                      ),
                      _buildThemeCard(
                        'Green Zone',
                        'green_zone',
                        'Stoned green theme for good finances',
                        Icons.park,
                      ),
                      const SizedBox(height: 32),
                      Text(
                        'Additional Options',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      const SizedBox(height: 16),
                      Card(
                        elevation: 2,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        child: SwitchListTile(
                          title: const Text('Constraint Tier Effect'),
                          subtitle: const Text('Apply visual effects based on constraint tier'),
                          value: constraintTierEffect,
                          onChanged: (value) {
                            setState(() => constraintTierEffect = value);
                          },
                        ),
                      ),
                      const SizedBox(height: 32),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.blue.shade50,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(Icons.info_outline, color: Colors.blue.shade700),
                                const SizedBox(width: 8),
                                Text(
                                  'About Themes',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: Colors.blue.shade900,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Text(
                              'Health Auto Mode:\n'
                              '• Good: Green Zone\n'
                              '• OK: Green Zone (lighter)\n'
                              '• Not Well: Dark Knight\n'
                              '• Worrisome: Thunderstorms',
                              style: TextStyle(color: Colors.blue.shade800),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton.icon(
                          onPressed: updateTheme,
                          icon: const Icon(Icons.save),
                          label: const Text('Save Theme Settings'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blue.shade700,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }

  Widget _buildThemeCard(String title, String value, String description, IconData icon) {
    final isSelected = selectedTheme == value;
    final color = _getThemePreviewColor(value);
    final isEnabled = themeMode == 'manual';

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: isSelected ? 4 : 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: isSelected
            ? BorderSide(color: Colors.blue.shade700, width: 2)
            : BorderSide.none,
      ),
      child: InkWell(
        onTap: isEnabled
            ? () {
                setState(() => selectedTheme = value);
              }
            : null,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: color.withOpacity(0.5),
                      blurRadius: 8,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: Icon(icon, color: Colors.white, size: 32),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: isEnabled ? Colors.black : Colors.grey,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      description,
                      style: TextStyle(
                        fontSize: 12,
                        color: isEnabled ? Colors.grey.shade600 : Colors.grey.shade400,
                      ),
                    ),
                  ],
                ),
              ),
              if (isSelected)
                Icon(Icons.check_circle, color: Colors.blue.shade700, size: 32),
            ],
          ),
        ),
      ),
    );
  }
}

