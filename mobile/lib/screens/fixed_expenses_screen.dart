import 'package:flutter/material.dart';
import '../api_client.dart';
import '../models.dart';

class FixedExpensesScreen extends StatefulWidget {
  const FixedExpensesScreen({super.key, required this.api});
  final ApiClient api;

  @override
  State<FixedExpensesScreen> createState() => _FixedExpensesScreenState();
}

class _FixedExpensesScreenState extends State<FixedExpensesScreen> {
  bool loading = true;
  List<FixedExpense> expenses = [];
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
      expenses = await widget.api.fetchFixedExpenses();
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      setState(() => loading = false);
    }
  }

  Future<void> deleteExpense(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Expense'),
        content: const Text('Are you sure you want to delete this expense?'),
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
        await widget.api.deleteFixedExpense(id);
        _showSuccess('Expense deleted');
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
      builder: (context) => _AddFixedExpenseDialog(
        api: widget.api,
        onSuccess: () {
          load();
          _showSuccess('Expense added');
        },
        onError: _showError,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Fixed Expenses'),
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
              : expenses.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.receipt_long, size: 80, color: Colors.grey.shade300),
                          const SizedBox(height: 16),
                          Text('No fixed expenses yet', style: TextStyle(color: Colors.grey.shade600)),
                          const SizedBox(height: 24),
                          ElevatedButton.icon(
                            onPressed: _showAddDialog,
                            icon: const Icon(Icons.add),
                            label: const Text('Add Fixed Expense'),
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: load,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: expenses.length,
                        itemBuilder: (context, index) {
                          final expense = expenses[index];
                          final isSip = expense.isSipFlag ?? false;
                          return Card(
                            margin: const EdgeInsets.only(bottom: 16),
                            elevation: 2,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            child: ListTile(
                              contentPadding: const EdgeInsets.all(16),
                              leading: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: isSip ? Colors.amber.withOpacity(0.2) : Colors.blue.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Icon(
                                  isSip ? Icons.savings : Icons.repeat,
                                  color: isSip ? Colors.amber.shade700 : Colors.blue.shade700,
                                ),
                              ),
                              title: Text(
                                expense.name,
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const SizedBox(height: 4),
                                  Text('₹${expense.amount} / ${expense.frequency}'),
                                  Text('Category: ${expense.category}'),
                                  if (isSip)
                                    Container(
                                      margin: const EdgeInsets.only(top: 4),
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: Colors.amber.withOpacity(0.2),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(Icons.savings, size: 14, color: Colors.amber.shade700),
                                          const SizedBox(width: 4),
                                          Text(
                                            'SIP Enabled',
                                            style: TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.amber.shade900,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                ],
                              ),
                              trailing: IconButton(
                                icon: Icon(Icons.delete, color: Colors.red.shade400),
                                onPressed: () => deleteExpense(expense.id),
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

class _AddFixedExpenseDialog extends StatefulWidget {
  const _AddFixedExpenseDialog({
    required this.api,
    required this.onSuccess,
    required this.onError,
  });
  final ApiClient api;
  final VoidCallback onSuccess;
  final Function(String) onError;

  @override
  State<_AddFixedExpenseDialog> createState() => _AddFixedExpenseDialogState();
}

class _AddFixedExpenseDialogState extends State<_AddFixedExpenseDialog> {
  final nameCtrl = TextEditingController();
  final amountCtrl = TextEditingController();
  final categoryCtrl = TextEditingController(text: 'General');
  String frequency = 'monthly';
  bool isSip = false;
  bool loading = false;

  Future<void> submit() async {
    if (nameCtrl.text.isEmpty || amountCtrl.text.isEmpty) {
      widget.onError('Please fill all fields');
      return;
    }

    setState(() => loading = true);
    try {
      await widget.api.createFixedExpense(
        nameCtrl.text,
        int.parse(amountCtrl.text),
        frequency,
        categoryCtrl.text,
        isSipFlag: isSip,
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
    final showSipToggle = frequency == 'quarterly' || frequency == 'yearly';

    return AlertDialog(
      title: const Text('Add Fixed Expense'),
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
            const SizedBox(height: 16),
            TextField(
              controller: categoryCtrl,
              decoration: const InputDecoration(labelText: 'Category'),
            ),
            if (showSipToggle) ...[
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.amber.shade100, Colors.amber.shade50],
                  ),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.amber.shade300),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Enable SIP',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.amber.shade900,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Accumulate funds monthly with potential growth',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.amber.shade800,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Switch(
                          value: isSip,
                          onChanged: (value) => setState(() => isSip = value),
                          activeColor: Colors.green,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
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

