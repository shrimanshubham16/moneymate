import 'package:flutter/material.dart';
import '../api_client.dart';
import '../models.dart';

class InvestmentsScreen extends StatefulWidget {
  const InvestmentsScreen({super.key, required this.api});
  final ApiClient api;

  @override
  State<InvestmentsScreen> createState() => _InvestmentsScreenState();
}

class _InvestmentsScreenState extends State<InvestmentsScreen> {
  bool loading = true;
  List<Investment> investments = [];
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
      investments = await widget.api.fetchInvestments();
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      setState(() => loading = false);
    }
  }

  Future<void> deleteInvestment(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Investment'),
        content: const Text('Are you sure you want to delete this investment?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await widget.api.deleteInvestment(id);
        _showSuccess('Investment deleted');
        await load();
      } catch (e) {
        _showError(e.toString());
      }
    }
  }

  Future<void> togglePauseResume(Investment investment) async {
    final newStatus = investment.status == 'active' ? 'paused' : 'active';
    final action = newStatus == 'paused' ? 'pause' : 'resume';
    
    try {
      await widget.api.updateInvestmentStatus(investment.id, newStatus);
      _showSuccess('Investment ${action}d');
      await load();
    } catch (e) {
      _showError(e.toString());
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: Colors.red.shade700),
    );
  }

  void _showSuccess(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  void _showAddDialog() {
    showDialog(
      context: context,
      builder: (context) => _AddInvestmentDialog(
        api: widget.api,
        onSuccess: () {
          load();
          _showSuccess('Investment added');
        },
        onError: _showError,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Investments'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: _showAddDialog,
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
              : investments.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.trending_up, size: 80, color: Colors.grey.shade300),
                          const SizedBox(height: 16),
                          Text('No investments yet', style: TextStyle(color: Colors.grey.shade600)),
                          const SizedBox(height: 24),
                          ElevatedButton.icon(
                            onPressed: _showAddDialog,
                            icon: const Icon(Icons.add),
                            label: const Text('Add Investment'),
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: load,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: investments.length,
                        itemBuilder: (context, index) {
                          final investment = investments[index];
                          final isActive = investment.status == 'active';
                          
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
                                      color: isActive ? Colors.green.withOpacity(0.2) : Colors.grey.withOpacity(0.2),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Icon(
                                      isActive ? Icons.trending_up : Icons.pause_circle,
                                      color: isActive ? Colors.green.shade700 : Colors.grey.shade700,
                                    ),
                                  ),
                                  title: Text(
                                    investment.name,
                                    style: const TextStyle(fontWeight: FontWeight.bold),
                                  ),
                                  subtitle: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const SizedBox(height: 4),
                                      Text('Goal: ${investment.goal}'),
                                      Text('₹${investment.monthlyAmount} / month'),
                                      const SizedBox(height: 4),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: isActive ? Colors.green.withOpacity(0.2) : Colors.grey.withOpacity(0.2),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(
                                              isActive ? Icons.play_arrow : Icons.pause,
                                              size: 14,
                                              color: isActive ? Colors.green.shade700 : Colors.grey.shade700,
                                            ),
                                            const SizedBox(width: 4),
                                            Text(
                                              isActive ? 'Active' : 'Paused',
                                              style: TextStyle(
                                                fontSize: 12,
                                                fontWeight: FontWeight.bold,
                                                color: isActive ? Colors.green.shade900 : Colors.grey.shade900,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                  trailing: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      IconButton(
                                        icon: Icon(
                                          isActive ? Icons.pause_circle : Icons.play_circle,
                                          color: isActive ? Colors.orange.shade600 : Colors.green.shade600,
                                        ),
                                        onPressed: () => togglePauseResume(investment),
                                        tooltip: isActive ? 'Pause' : 'Resume',
                                      ),
                                      IconButton(
                                        icon: Icon(Icons.delete, color: Colors.red.shade400),
                                        onPressed: () => deleteInvestment(investment.id),
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
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddDialog,
        child: const Icon(Icons.add),
      ),
    );
  }
}

class _AddInvestmentDialog extends StatefulWidget {
  const _AddInvestmentDialog({
    required this.api,
    required this.onSuccess,
    required this.onError,
  });
  final ApiClient api;
  final VoidCallback onSuccess;
  final Function(String) onError;

  @override
  State<_AddInvestmentDialog> createState() => _AddInvestmentDialogState();
}

class _AddInvestmentDialogState extends State<_AddInvestmentDialog> {
  final nameCtrl = TextEditingController();
  final goalCtrl = TextEditingController();
  final amountCtrl = TextEditingController();
  bool loading = false;

  Future<void> submit() async {
    if (nameCtrl.text.isEmpty || goalCtrl.text.isEmpty || amountCtrl.text.isEmpty) {
      widget.onError('Please fill all fields');
      return;
    }

    setState(() => loading = true);
    try {
      await widget.api.createInvestment(
        nameCtrl.text,
        goalCtrl.text,
        int.parse(amountCtrl.text),
      );
      if (mounted) {
        Navigator.of(context).pop();
        widget.onSuccess();
      }
    } catch (e) {
      setState(() => loading = false);
      widget.onError(e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Add Investment'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameCtrl,
              decoration: const InputDecoration(labelText: 'Name'),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: goalCtrl,
              decoration: const InputDecoration(labelText: 'Goal'),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: amountCtrl,
              decoration: const InputDecoration(labelText: 'Monthly Amount'),
              keyboardType: TextInputType.number,
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: loading ? null : submit,
          child: loading
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Add'),
        ),
      ],
    );
  }
}
