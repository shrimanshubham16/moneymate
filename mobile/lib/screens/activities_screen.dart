import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../api_client.dart';

class ActivitiesScreen extends StatefulWidget {
  const ActivitiesScreen({super.key, required this.api});
  final ApiClient api;

  @override
  State<ActivitiesScreen> createState() => _ActivitiesScreenState();
}

class _ActivitiesScreenState extends State<ActivitiesScreen> {
  bool loading = true;
  List<dynamic> activities = [];
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
      activities = await widget.api.fetchActivity();
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      setState(() => loading = false);
    }
  }

  IconData _getIcon(String entity) {
    switch (entity.toLowerCase()) {
      case 'income':
        return Icons.attach_money;
      case 'fixed_expense':
        return Icons.repeat;
      case 'variable_expense':
        return Icons.receipt;
      case 'investment':
        return Icons.trending_up;
      case 'credit_card':
        return Icons.credit_card;
      case 'loan':
        return Icons.account_balance;
      case 'future_bomb':
        return Icons.warning;
      default:
        return Icons.notes;
    }
  }

  Color _getColor(String action) {
    if (action.contains('create') || action.contains('add')) return Colors.green;
    if (action.contains('delete') || action.contains('remove')) return Colors.red;
    if (action.contains('update') || action.contains('edit')) return Colors.blue;
    if (action.contains('pay')) return Colors.purple;
    return Colors.grey;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Activity Log'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: load,
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
              : activities.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.history, size: 80, color: Colors.grey.shade300),
                          const SizedBox(height: 16),
                          Text('No activities yet', style: TextStyle(color: Colors.grey.shade600)),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: load,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: activities.length,
                        itemBuilder: (context, index) {
                          final activity = activities[index];
                          final entity = activity['entity'] ?? 'unknown';
                          final action = activity['action'] ?? 'unknown';
                          final createdAt = activity['created_at'] != null
                              ? DateTime.parse(activity['created_at'])
                              : DateTime.now();
                          
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            elevation: 1,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            child: ListTile(
                              leading: Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: _getColor(action).withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Icon(_getIcon(entity), color: _getColor(action), size: 20),
                              ),
                              title: Text(
                                action,
                                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                              ),
                              subtitle: Text(
                                entity.replaceAll('_', ' ').toUpperCase(),
                                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                              ),
                              trailing: Text(
                                DateFormat('MMM dd, HH:mm').format(createdAt),
                                style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}
