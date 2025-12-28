import 'package:flutter/material.dart';
import '../api_client.dart';

class CurrentMonthExpensesScreen extends StatelessWidget {
  const CurrentMonthExpensesScreen({super.key, required this.api});
  final ApiClient api;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Current Month Expenses')),
      body: const Center(child: Text('Current Month Expenses - Coming Soon')),
    );
  }
}
