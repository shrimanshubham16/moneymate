import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../api_client.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key, required this.api});
  final ApiClient api;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/dashboard'),
        ),
      ),
      body: ListView(
        children: [
          _buildSettingsTile(
            context,
            'Account',
            'Manage your account details',
            Icons.person,
            Colors.blue,
            () => context.push('/settings/account'),
          ),
          _buildSettingsTile(
            context,
            'About',
            'Learn about MoneyMate',
            Icons.info,
            Colors.teal,
            () => context.push('/settings/about'),
          ),
          _buildSettingsTile(
            context,
            'Plan Finances',
            'Manage your financial planning',
            Icons.account_balance_wallet,
            Colors.green,
            () => context.push('/settings/plan-finances'),
          ),
          _buildSettingsTile(
            context,
            'Income',
            'Manage your income sources',
            Icons.attach_money,
            Colors.lightGreen,
            () => context.push('/income'),
          ),
          _buildSettingsTile(
            context,
            'Sharing',
            'Share finances with others',
            Icons.share,
            Colors.purple,
            () => context.push('/sharing'),
          ),
          _buildSettingsTile(
            context,
            'Export Data',
            'Export your financial data',
            Icons.download,
            Colors.orange,
            () => context.push('/export'),
          ),
          _buildSettingsTile(
            context,
            'Themes',
            'Customize your app theme',
            Icons.palette,
            Colors.deepPurple,
            () => context.push('/settings/themes'),
          ),
          _buildSettingsTile(
            context,
            'Support',
            'Get help and support',
            Icons.help,
            Colors.red,
            () => context.push('/settings/support'),
          ),
        ],
      ),
    );
  }

  Widget _buildSettingsTile(
    BuildContext context,
    String title,
    String subtitle,
    IconData icon,
    Color color,
    VoidCallback onTap,
  ) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
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

