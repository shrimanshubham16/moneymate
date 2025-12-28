import 'package:flutter/material.dart';
import '../api_client.dart';
import '../models.dart';

class FutureBombsScreen extends StatefulWidget {
  const FutureBombsScreen({super.key, required this.api});
  final ApiClient api;

  @override
  State<FutureBombsScreen> createState() => _FutureBombsScreenState();
}

class _FutureBombsScreenState extends State<FutureBombsScreen> {
  bool loading = true;
  List<FutureBomb> bombs = [];
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
      final dashboard = await widget.api.fetchDashboard(asOf: '2025-01-15T00:00:00Z');
      bombs = dashboard.futureBombs;
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      setState(() => loading = false);
    }
  }

  Color _getPreparednessColor(double ratio) {
    if (ratio >= 1.0) return Colors.green;
    if (ratio >= 0.7) return Colors.blue;
    if (ratio >= 0.4) return Colors.orange;
    return Colors.red;
  }

  String _getPreparednessLabel(double ratio) {
    if (ratio >= 1.0) return 'Ready';
    if (ratio >= 0.7) return 'On Track';
    if (ratio >= 0.4) return 'Behind';
    return 'Critical';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Future Bombs'),
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
              : bombs.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.check_circle, size: 80, color: Colors.green.shade300),
                          const SizedBox(height: 16),
                          Text('No future bombs!', style: TextStyle(color: Colors.green.shade600)),
                          const SizedBox(height: 8),
                          Text('You\'re prepared for upcoming expenses', style: TextStyle(color: Colors.grey.shade600)),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: load,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: bombs.length,
                        itemBuilder: (context, index) {
                          final bomb = bombs[index];
                          final color = _getPreparednessColor(bomb.preparednessRatio);
                          final label = _getPreparednessLabel(bomb.preparednessRatio);
                          
                          return Card(
                            margin: const EdgeInsets.only(bottom: 16),
                            elevation: 2,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            child: Column(
                              children: [
                                ListTile(
                                  contentPadding: const EdgeInsets.all(16),
                                  leading: Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: color.withOpacity(0.2),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Icon(Icons.warning, color: color),
                                  ),
                                  title: Text(
                                    bomb.name,
                                    style: const TextStyle(fontWeight: FontWeight.bold),
                                  ),
                                  subtitle: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const SizedBox(height: 4),
                                      Text('Due: ${bomb.dueDate}'),
                                      Text('Monthly: ₹${bomb.monthlyEquivalent}'),
                                      const SizedBox(height: 8),
                                      LinearProgressIndicator(
                                        value: bomb.preparednessRatio > 1.0 ? 1.0 : bomb.preparednessRatio,
                                        backgroundColor: Colors.grey.shade200,
                                        color: color,
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        '$label (${(bomb.preparednessRatio * 100).toInt()}%)',
                                        style: TextStyle(
                                          color: color,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}
