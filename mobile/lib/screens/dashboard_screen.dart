import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../api_client.dart';
import '../models.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key, required this.api, required this.onToggleTheme});
  final ApiClient api;
  final VoidCallback onToggleTheme;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> with SingleTickerProviderStateMixin {
  bool loading = true;
  String? error;
  DashboardData? data;
  late AnimationController _animationController;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    load();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  Future<void> load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      data = await widget.api.fetchDashboard(asOf: '2025-01-15T00:00:00Z');
      _animationController.forward();
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      setState(() => loading = false);
    }
  }

  Color getHealthColor() {
    if (data == null) return Colors.grey;
    final health = data!.healthCategory;
    if (health == 'good') return Colors.green;
    if (health == 'ok') return Colors.blue;
    if (health == 'not_well') return Colors.orange;
    return Colors.red;
  }

  String getHealthLabel() {
    if (data == null) return 'Loading...';
    final health = data!.healthCategory;
    if (health == 'good') return 'Good';
    if (health == 'ok') return 'OK';
    if (health == 'not_well') return 'Not Well';
    return 'Worrisome';
  }

  String getHealthMessage() {
    if (data == null) return '';
    final health = data!.healthCategory;
    if (health == 'good') return '> ₹10k surplus';
    if (health == 'ok') return '₹1-10k surplus';
    if (health == 'not_well') return '₹1-3k short';
    return '> ₹3k short';
  }

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(),
              const SizedBox(height: 16),
              Text('Loading dashboard...', style: TextStyle(color: Colors.grey.shade600)),
            ],
          ),
        ),
      );
    }

    if (error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('MoneyMate')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 64, color: Colors.red.shade300),
              const SizedBox(height: 16),
              Text('Error: $error', textAlign: TextAlign.center),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: load,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    final healthColor = getHealthColor();

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              healthColor.withOpacity(0.1),
              healthColor.withOpacity(0.05),
            ],
          ),
        ),
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              expandedHeight: 200,
              floating: false,
              pinned: true,
              flexibleSpace: FlexibleSpaceBar(
                title: const Text('MoneyMate', style: TextStyle(fontWeight: FontWeight.bold)),
                background: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [healthColor, healthColor.withOpacity(0.7)],
                    ),
                  ),
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const SizedBox(height: 40),
                        _buildHealthIndicator(),
                      ],
                    ),
                  ),
                ),
              ),
              actions: [
                IconButton(
                  icon: const Icon(Icons.settings),
                  onPressed: () => context.push('/settings'),
                ),
              ],
            ),
            SliverPadding(
              padding: const EdgeInsets.all(16),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 1.1,
                  crossAxisSpacing: 16,
                  mainAxisSpacing: 16,
                ),
                delegate: SliverChildListDelegate([
                  _buildDashboardWidget(
                    'Variable Expenses',
                    Icons.attach_money,
                    Colors.purple,
                    data?.variable.length ?? 0,
                    () => context.push('/variable-expenses'),
                  ),
                  _buildDashboardWidget(
                    'Fixed Expenses',
                    Icons.repeat,
                    Colors.blue,
                    data?.fixed.length ?? 0,
                    () => context.push('/fixed-expenses'),
                  ),
                  _buildDashboardWidget(
                    'Investments',
                    Icons.trending_up,
                    Colors.green,
                    data?.investments.length ?? 0,
                    () => context.push('/investments'),
                  ),
                  _buildDashboardWidget(
                    'SIP Expenses',
                    Icons.savings,
                    Colors.amber,
                    0, // TODO: Calculate SIP count
                    () => context.push('/sip-expenses'),
                  ),
                  _buildDashboardWidget(
                    'Credit Cards',
                    Icons.credit_card,
                    Colors.red,
                    0, // TODO: Fetch credit cards
                    () => context.push('/credit-cards'),
                  ),
                  _buildDashboardWidget(
                    'Loans',
                    Icons.account_balance,
                    Colors.deepOrange,
                    0, // TODO: Fetch loans
                    () => context.push('/loans'),
                  ),
                  _buildDashboardWidget(
                    'Future Bombs',
                    Icons.warning,
                    Colors.orange,
                    data?.futureBombs.length ?? 0,
                    () => context.push('/future-bombs'),
                  ),
                  _buildDashboardWidget(
                    'Activities',
                    Icons.history,
                    Colors.teal,
                    0, // TODO: Fetch activities count
                    () => context.push('/activities'),
                  ),
                  _buildDashboardWidget(
                    'Dues',
                    Icons.payment,
                    Colors.pink,
                    0, // TODO: Calculate dues
                    () => context.push('/dues'),
                  ),
                  _buildDashboardWidget(
                    'This Month',
                    Icons.calendar_today,
                    Colors.indigo,
                    0, // TODO: Calculate current month expenses
                    () => context.push('/current-month-expenses'),
                  ),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHealthIndicator() {
    return FadeTransition(
      opacity: _animationController,
      child: Column(
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: getHealthColor().withOpacity(0.5),
                  blurRadius: 20,
                  spreadRadius: 5,
                ),
              ],
            ),
            child: Icon(
              data?.healthCategory == 'good' ? Icons.sentiment_very_satisfied :
              data?.healthCategory == 'ok' ? Icons.sentiment_satisfied :
              data?.healthCategory == 'not_well' ? Icons.sentiment_dissatisfied :
              Icons.sentiment_very_dissatisfied,
              size: 48,
              color: getHealthColor(),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            getHealthLabel(),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(
            getHealthMessage(),
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDashboardWidget(String title, IconData icon, Color color, int count, VoidCallback onTap) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [color.withOpacity(0.8), color.withOpacity(0.6)],
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 40, color: Colors.white),
                const SizedBox(height: 12),
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 4),
                if (count > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '$count',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

