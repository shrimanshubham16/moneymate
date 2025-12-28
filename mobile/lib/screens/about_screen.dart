import 'package:flutter/material.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('About MoneyMate'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Column(
                children: [
                  Icon(Icons.account_balance_wallet, size: 80, color: Colors.blue.shade700),
                  const SizedBox(height: 16),
                  Text(
                    'MoneyMate',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Colors.blue.shade700,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Your Personal Finance Partner',
                    style: TextStyle(color: Colors.grey.shade600),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            _buildSection(
              context,
              'Purpose',
              'MoneyMate helps you take control of your finances by tracking income, expenses, investments, and future financial obligations. Make informed decisions and achieve financial wellness.',
            ),
            const SizedBox(height: 24),
            _buildSection(
              context,
              'Key Features',
              '• Track fixed and variable expenses\n'
                  '• Manage investments with SIP support\n'
                  '• Monitor credit cards and loans\n'
                  '• Prepare for future financial bombs\n'
                  '• Share finances with partners\n'
                  '• Real-time health indicators\n'
                  '• Smart constraint scoring\n'
                  '• Activity logging',
            ),
            const SizedBox(height: 24),
            _buildSection(
              context,
              'Health Categories',
              '🟢 Good: > ₹10k surplus after month\n'
                  '🔵 OK: ₹1-10k surplus\n'
                  '🟠 Not Well: ₹1-3k short\n'
                  '🔴 Worrisome: > ₹3k short',
            ),
            const SizedBox(height: 24),
            _buildSection(
              context,
              'Constraint Tiers',
              'Green Tier: Financially healthy\n'
                  'Yellow Tier: Needs attention\n'
                  'Red Tier: Critical - requires justification for overspend',
            ),
            const SizedBox(height: 24),
            _buildSection(
              context,
              'Usage Guide',
              '1. Set up your income sources\n'
                  '2. Plan fixed and variable expenses\n'
                  '3. Add investments and SIPs\n'
                  '4. Monitor your financial health\n'
                  '5. Share finances with trusted partners\n'
                  '6. Export data for detailed analysis',
            ),
            const SizedBox(height: 32),
            Center(
              child: Text(
                'Version 1.0.0',
                style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(BuildContext context, String title, String content) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Colors.blue.shade700,
                  ),
            ),
            const SizedBox(height: 12),
            Text(
              content,
              style: TextStyle(color: Colors.grey.shade700, height: 1.5),
            ),
          ],
        ),
      ),
    );
  }
}

