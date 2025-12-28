import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../api_client.dart';
import '../models.dart';

class VariableExpensesScreen extends StatefulWidget {
  const VariableExpensesScreen({super.key, required this.api});
  final ApiClient api;

  @override
  State<VariableExpensesScreen> createState() => _VariableExpensesScreenState();
}

class _VariableExpensesScreenState extends State<VariableExpensesScreen> {
  bool loading = true;
  List<VariablePlan> plans = [];
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
      plans = dashboard.variable;
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      setState(() => loading = false);
    }
  }

  Future<void> deletePlan(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Variable Plan'),
        content: const Text('Are you sure you want to delete this plan?'),
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
        await widget.api.deleteVariablePlan(id);
        _showSuccess('Plan deleted');
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

  void _showAddPlanDialog() {
    showDialog(
      context: context,
      builder: (context) => _AddVariablePlanDialog(
        api: widget.api,
        onSuccess: () {
          load();
          _showSuccess('Plan added');
        },
        onError: _showError,
      ),
    );
  }

  void _showAddActualDialog(VariablePlan plan) {
    showDialog(
      context: context,
      builder: (context) => _AddActualDialog(
        api: widget.api,
        plan: plan,
        onSuccess: () {
          load();
          _showSuccess('Actual expense added');
        },
        onError: _showError,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Variable Expenses'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: _showAddPlanDialog,
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
              : plans.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.receipt, size: 80, color: Colors.grey.shade300),
                          const SizedBox(height: 16),
                          Text('No variable expense plans yet', style: TextStyle(color: Colors.grey.shade600)),
                          const SizedBox(height: 24),
                          ElevatedButton.icon(
                            onPressed: _showAddPlanDialog,
                            icon: const Icon(Icons.add),
                            label: const Text('Add Variable Plan'),
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: load,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: plans.length,
                        itemBuilder: (context, index) {
                          final plan = plans[index];
                          final isOverspend = plan.actualTotal > plan.planned;
                          final percentage = plan.planned > 0 ? (plan.actualTotal / plan.planned * 100).toInt() : 0;
                          
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
                                      color: isOverspend ? Colors.red.withOpacity(0.2) : Colors.purple.withOpacity(0.2),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Icon(
                                      Icons.attach_money,
                                      color: isOverspend ? Colors.red.shade700 : Colors.purple.shade700,
                                    ),
                                  ),
                                  title: Text(
                                    plan.name,
                                    style: const TextStyle(fontWeight: FontWeight.bold),
                                  ),
                                  subtitle: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const SizedBox(height: 4),
                                      Text('Planned: ₹${plan.planned}'),
                                      Text(
                                        'Actual: ₹${plan.actualTotal} ($percentage%)',
                                        style: TextStyle(
                                          color: isOverspend ? Colors.red : Colors.green,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      LinearProgressIndicator(
                                        value: plan.planned > 0 ? plan.actualTotal / plan.planned : 0,
                                        backgroundColor: Colors.grey.shade200,
                                        color: isOverspend ? Colors.red : Colors.purple,
                                      ),
                                    ],
                                  ),
                                  trailing: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      IconButton(
                                        icon: Icon(Icons.add_circle, color: Colors.green.shade600),
                                        onPressed: () => _showAddActualDialog(plan),
                                        tooltip: 'Add Actual',
                                      ),
                                      IconButton(
                                        icon: Icon(Icons.delete, color: Colors.red.shade400),
                                        onPressed: () => deletePlan(plan.id),
                                      ),
                                    ],
                                  ),
                                ),
                                if (plan.actuals.isNotEmpty) ...[
                                  const Divider(height: 1),
                                  ExpansionTile(
                                    title: Text('${plan.actuals.length} actual expenses'),
                                    children: plan.actuals.map((actual) {
                                      return ListTile(
                                        dense: true,
                                        leading: const Icon(Icons.receipt_long, size: 20),
                                        title: Text('₹${actual.amount}'),
                                        subtitle: Text(DateFormat('MMM dd, yyyy').format(DateTime.parse(actual.incurredAt))),
                                        trailing: actual.justification != null
                                            ? Icon(Icons.comment, size: 16, color: Colors.orange.shade700)
                                            : null,
                                      );
                                    }).toList(),
                                  ),
                                ],
                              ],
                            ),
                          );
                        },
                      ),
                    ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddPlanDialog,
        child: const Icon(Icons.add),
      ),
    );
  }
}

class _AddVariablePlanDialog extends StatefulWidget {
  const _AddVariablePlanDialog({
    required this.api,
    required this.onSuccess,
    required this.onError,
  });
  final ApiClient api;
  final VoidCallback onSuccess;
  final Function(String) onError;

  @override
  State<_AddVariablePlanDialog> createState() => _AddVariablePlanDialogState();
}

class _AddVariablePlanDialogState extends State<_AddVariablePlanDialog> {
  final nameCtrl = TextEditingController();
  final amountCtrl = TextEditingController();
  final categoryCtrl = TextEditingController(text: 'General');
  bool loading = false;

  Future<void> submit() async {
    if (nameCtrl.text.isEmpty || amountCtrl.text.isEmpty) {
      widget.onError('Please fill all fields');
      return;
    }

    setState(() => loading = true);
    try {
      await widget.api.createVariablePlan(
        nameCtrl.text,
        int.parse(amountCtrl.text),
        categoryCtrl.text,
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
      title: const Text('Add Variable Plan'),
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
              decoration: const InputDecoration(labelText: 'Planned Amount'),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: categoryCtrl,
              decoration: const InputDecoration(labelText: 'Category'),
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

class _AddActualDialog extends StatefulWidget {
  const _AddActualDialog({
    required this.api,
    required this.plan,
    required this.onSuccess,
    required this.onError,
  });
  final ApiClient api;
  final VariablePlan plan;
  final VoidCallback onSuccess;
  final Function(String) onError;

  @override
  State<_AddActualDialog> createState() => _AddActualDialogState();
}

class _AddActualDialogState extends State<_AddActualDialog> {
  final amountCtrl = TextEditingController();
  final justificationCtrl = TextEditingController();
  bool loading = false;

  Future<void> submit() async {
    if (amountCtrl.text.isEmpty) {
      widget.onError('Please enter amount');
      return;
    }

    final amount = int.parse(amountCtrl.text);
    final newTotal = widget.plan.actualTotal + amount;
    final isOverspend = newTotal > widget.plan.planned;

    // Red tier check - require justification if overspending
    if (isOverspend && justificationCtrl.text.isEmpty) {
      widget.onError('Justification required for overspending');
      return;
    }

    setState(() => loading = true);
    try {
      await widget.api.addVariableActual(
        widget.plan.id,
        amount,
        justification: justificationCtrl.text.isNotEmpty ? justificationCtrl.text : null,
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
    final amount = int.tryParse(amountCtrl.text) ?? 0;
    final newTotal = widget.plan.actualTotal + amount;
    final isOverspend = newTotal > widget.plan.planned;

    return AlertDialog(
      title: Text('Add Actual for ${widget.plan.name}'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Planned: ₹${widget.plan.planned}'),
            Text('Current: ₹${widget.plan.actualTotal}'),
            const SizedBox(height: 16),
            TextField(
              controller: amountCtrl,
              decoration: const InputDecoration(labelText: 'Amount'),
              keyboardType: TextInputType.number,
              onChanged: (_) => setState(() {}),
            ),
            if (amount > 0) ...[
              const SizedBox(height: 8),
              Text(
                'New Total: ₹$newTotal',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: isOverspend ? Colors.red : Colors.green,
                ),
              ),
            ],
            if (isOverspend) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Row(
                  children: [
                    Icon(Icons.warning, color: Colors.red.shade700),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Overspend! Justification required.',
                        style: TextStyle(color: Colors.red.shade700),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: justificationCtrl,
                decoration: const InputDecoration(
                  labelText: 'Justification *',
                  hintText: 'Explain why you\'re overspending',
                ),
                maxLines: 3,
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
