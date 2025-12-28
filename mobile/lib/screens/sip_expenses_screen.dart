import 'package:flutter/material.dart';
import '../api_client.dart';

class SipExpensesScreen extends StatelessWidget {
  const SipExpensesScreen({super.key, required this.api});
  final ApiClient api;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('SIP Expenses')),
      body: const Center(child: Text('SIP Expenses - Coming Soon')),
    );
  }
}
