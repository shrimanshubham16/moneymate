import 'package:flutter/material.dart';
import '../api_client.dart';

class DuesScreen extends StatelessWidget {
  const DuesScreen({super.key, required this.api});
  final ApiClient api;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Dues')),
      body: const Center(child: Text('Dues - Coming Soon')),
    );
  }
}
