import 'package:flutter/material.dart';

class SupportScreen extends StatelessWidget {
  const SupportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Support'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(Icons.support_agent, size: 80, color: Colors.blue.shade700),
            const SizedBox(height: 24),
            Text(
              'How can we help you?',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Colors.blue.shade700,
                  ),
            ),
            const SizedBox(height: 32),
            _buildSupportCard(
              context,
              'Frequently Asked Questions',
              'Find answers to common questions',
              Icons.quiz,
              Colors.blue,
              () {
                // TODO: Navigate to FAQ
              },
            ),
            _buildSupportCard(
              context,
              'Contact Support',
              'Get help from our team',
              Icons.email,
              Colors.green,
              () {
                // TODO: Open contact form
              },
            ),
            _buildSupportCard(
              context,
              'Report a Bug',
              'Help us improve MoneyMate',
              Icons.bug_report,
              Colors.orange,
              () {
                // TODO: Open bug report form
              },
            ),
            _buildSupportCard(
              context,
              'Feature Request',
              'Suggest new features',
              Icons.lightbulb,
              Colors.purple,
              () {
                // TODO: Open feature request form
              },
            ),
            const SizedBox(height: 24),
            Card(
              elevation: 2,
              color: Colors.blue.shade50,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Icon(Icons.info_outline, color: Colors.blue.shade700, size: 32),
                    const SizedBox(height: 12),
                    Text(
                      'Need Immediate Help?',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.blue.shade900,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Visit our documentation at docs.moneymate.app or reach out to shriman.shubham@gmail.com',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.blue.shade800),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSupportCard(
    BuildContext context,
    String title,
    String subtitle,
    IconData icon,
    Color color,
    VoidCallback onTap,
  ) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.2),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: color),
        ),
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Text(subtitle),
        trailing: Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey.shade400),
        onTap: onTap,
      ),
    );
  }
}

