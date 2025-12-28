import 'package:flutter/material.dart';
import '../api_client.dart';
import '../models.dart';

class IncomeScreen extends StatefulWidget {
  const IncomeScreen({super.key, required this.api});
  final ApiClient api;

  @override
  State<IncomeScreen> createState() => _IncomeScreenState();
}

class _IncomeScreenState extends State<IncomeScreen> {
  bool loading = true;
  List<Income> incomes = [];
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
      incomes = dashboard.incomes;
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      setState(() => loading = false);
    }
  }

  Future<void> deleteIncome(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Income'),
        content: const Text('Are you sure you want to delete this income source?'),
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
        await widget.api.deleteIncome(id);
        _showSuccess('Income source deleted');
        await load();
      } catch (e) {
        _showError(e.toString());
      }
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
      builder: (context) => _AddIncomeDialog(
        api: widget.api,
        onSuccess: () {
          load();
          _showSuccess('Income source added');
        },
        onError: _showError,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Income Sources'),
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
              : incomes.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.account_balance_wallet, size: 80, color: Colors.grey.shade300),
                          const SizedBox(height: 16),
                          Text('No income sources yet', style: TextStyle(color: Colors.grey.shade600)),
                          const SizedBox(height: 24),
                          ElevatedButton.icon(
                            onPressed: _showAddDialog,
                            icon: const Icon(Icons.add),
                            label: const Text('Add Income Source'),
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: load,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: incomes.length,
                        itemBuilder: (context, index) {
                          final income = incomes[index];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 16),
                            elevation: 2,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            child: ListTile(
                              contentPadding: const EdgeInsets.all(16),
                              leading: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.green.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Icon(Icons.attach_money, color: Colors.green.shade700),
                              ),
                              title: Text(
                                income.source,
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const SizedBox(height: 4),
                                  Text('₹${income.amount} / ${income.frequency}'),
                                ],
                              ),
                              trailing: IconButton(
                                icon: Icon(Icons.delete, color: Colors.red.shade400),
                                onPressed: () => deleteIncome(income.id),
                              ),
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

class _AddIncomeDialog extends StatefulWidget {
  const _AddIncomeDialog({
    required this.api,
    required this.onSuccess,
    required this.onError,
  });
  final ApiClient api;
  final VoidCallback onSuccess;
  final Function(String) onError;

  @override
  State<_AddIncomeDialog> createState() => _AddIncomeDialogState();
}

class _AddIncomeDialogState extends State<_AddIncomeDialog> {
  final sourceCtrl = TextEditingController();
  final amountCtrl = TextEditingController();
  String frequency = 'monthly';
  bool loading = false;

  Future<void> submit() async {
    if (sourceCtrl.text.isEmpty || amountCtrl.text.isEmpty) {
      widget.onError('Please fill all fields');
      return;
    }

    setState(() => loading = true);
    try {
      await widget.api.createIncome(
        sourceCtrl.text,
        int.parse(amountCtrl.text),
        frequency,
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
      title: const Text('Add Income Source'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: sourceCtrl,
              decoration: const InputDecoration(labelText: 'Source (e.g., Salary, Freelance)'),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: amountCtrl,
              decoration: const InputDecoration(labelText: 'Amount'),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: frequency,
              decoration: const InputDecoration(labelText: 'Frequency'),
              items: const [
                DropdownMenuItem(value: 'monthly', child: Text('Monthly')),
                DropdownMenuItem(value: 'quarterly', child: Text('Quarterly')),
                DropdownMenuItem(value: 'yearly', child: Text('Yearly')),
              ],
              onChanged: (value) => setState(() => frequency = value!),
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
