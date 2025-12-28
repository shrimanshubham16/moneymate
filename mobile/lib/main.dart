import 'package:flutter/material.dart';
import 'api_client.dart';
import 'router.dart';
import 'theme.dart';

void main() {
  runApp(const MoneyMateApp());
}

class MoneyMateApp extends StatefulWidget {
  const MoneyMateApp({super.key});

  @override
  State<MoneyMateApp> createState() => _MoneyMateAppState();
}

class _MoneyMateAppState extends State<MoneyMateApp> {
  final apiClient = ApiClient();
  ThemeMode mode = ThemeMode.light;

  @override
  void initState() {
    super.initState();
    apiClient.loadToken();
  }

  void toggleTheme() {
    setState(() {
      mode = mode == ThemeMode.light ? ThemeMode.dark : ThemeMode.light;
    });
  }

  @override
  Widget build(BuildContext context) {
    final appRouter = AppRouter(apiClient: apiClient, onToggleTheme: toggleTheme);

    return MaterialApp.router(
      title: 'MoneyMate',
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: mode,
      routerConfig: appRouter.router,
      debugShowCheckedModeBanner: false,
    );
  }
}
