import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../api_client.dart';

class PlanFinancesScreen extends StatelessWidget {
  const PlanFinancesScreen({super.key, required this.api});
  final ApiClient api;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Plan Finances'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Manage Your Financial Planning',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade800,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Set up and manage all your financial plans in one place',
            style: TextStyle(color: Colors.grey.shade600),
          ),
          const SizedBox(height: 24),
          _buildPlanCard(
            context,
            'Fixed Expenses',
            'Manage recurring fixed expenses',
            Icons.repeat,
            Colors.blue,
            () => context.push('/fixed-expenses'),
          ),
          _buildPlanCard(
            context,
            'Variable Expenses',
            'Plan and track variable expenses',
            Icons.attach_money,
            Colors.purple,
            () => context.push('/variable-expenses'),
          ),
          _buildPlanCard(
            context,
            'Investments',
            'Manage your investment portfolio',
            Icons.trending_up,
            Colors.green,
            () => context.push('/investments'),
          ),
          _buildPlanCard(
            context,
            'Income Sources',
            'Track all your income sources',
            Icons.account_balance_wallet,
            Colors.lightGreen,
            () => context.push('/income'),
          ),
        ],
      ),
    );
  }

  Widget _buildPlanCard(
    BuildContext context,
    String title,
    String subtitle,
    IconData icon,
    Color color,
    VoidCallback onTap,
  ) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 3,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [color.withOpacity(0.1), color.withOpacity(0.05)],
          ),
        ),
        child: ListTile(
          contentPadding: const EdgeInsets.all(16),
          leading: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 32),
          ),
          title: Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(subtitle),
          ),
          trailing: Icon(Icons.arrow_forward_ios, size: 20, color: color),
          onTap: onTap,
        ),
      ),
    );
  }
}

