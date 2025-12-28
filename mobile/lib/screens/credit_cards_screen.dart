import 'package:flutter/material.dart';
import '../api_client.dart';
import '../models.dart';

class CreditCardsScreen extends StatefulWidget {
  const CreditCardsScreen({super.key, required this.api});
  final ApiClient api;

  @override
  State<CreditCardsScreen> createState() => _CreditCardsScreenState();
}

class _CreditCardsScreenState extends State<CreditCardsScreen> {
  bool loading = true;
  List<CreditCard> cards = [];
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
      cards = await widget.api.fetchCreditCards();
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      setState(() => loading = false);
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

  void _showPaymentDialog(CreditCard card) {
    showDialog(
      context: context,
      builder: (context) => _PaymentDialog(
        api: widget.api,
        card: card,
        onSuccess: () {
          load();
          _showSuccess('Payment recorded');
        },
        onError: _showError,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Credit Cards'),
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
              : cards.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.credit_card, size: 80, color: Colors.grey.shade300),
                          const SizedBox(height: 16),
                          Text('No credit cards', style: TextStyle(color: Colors.grey.shade600)),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: load,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: cards.length,
                        itemBuilder: (context, index) {
                          final card = cards[index];
                          final remaining = card.billAmount - card.paidAmount;
                          final isPaid = remaining <= 0;
                          
                          return Card(
                            margin: const EdgeInsets.only(bottom: 16),
                            elevation: 2,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            child: ListTile(
                              contentPadding: const EdgeInsets.all(16),
                              leading: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: isPaid ? Colors.green.withOpacity(0.2) : Colors.red.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Icon(
                                  Icons.credit_card,
                                  color: isPaid ? Colors.green.shade700 : Colors.red.shade700,
                                ),
                              ),
                              title: Text(
                                card.name,
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const SizedBox(height: 4),
                                  Text('Due: ${card.dueDate}'),
                                  Text('Bill: ₹${card.billAmount}'),
                                  Text(
                                    'Remaining: ₹$remaining',
                                    style: TextStyle(
                                      color: isPaid ? Colors.green : Colors.red,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                              trailing: !isPaid
                                  ? ElevatedButton(
                                      onPressed: () => _showPaymentDialog(card),
                                      child: const Text('Pay'),
                                    )
                                  : Icon(Icons.check_circle, color: Colors.green.shade600),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}

class _PaymentDialog extends StatefulWidget {
  const _PaymentDialog({
    required this.api,
    required this.card,
    required this.onSuccess,
    required this.onError,
  });
  final ApiClient api;
  final CreditCard card;
  final VoidCallback onSuccess;
  final Function(String) onError;

  @override
  State<_PaymentDialog> createState() => _PaymentDialogState();
}

class _PaymentDialogState extends State<_PaymentDialog> {
  final amountCtrl = TextEditingController();
  bool loading = false;

  @override
  void initState() {
    super.initState();
    final remaining = widget.card.billAmount - widget.card.paidAmount;
    amountCtrl.text = remaining.toString();
  }

  Future<void> submit() async {
    if (amountCtrl.text.isEmpty) {
      widget.onError('Please enter amount');
      return;
    }

    setState(() => loading = true);
    try {
      await widget.api.payCreditCard(widget.card.id, int.parse(amountCtrl.text));
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
    final remaining = widget.card.billAmount - widget.card.paidAmount;
    
    return AlertDialog(
      title: Text('Pay ${widget.card.name}'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Bill Amount: ₹${widget.card.billAmount}'),
          Text('Already Paid: ₹${widget.card.paidAmount}'),
          Text('Remaining: ₹$remaining', style: const TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          TextField(
            controller: amountCtrl,
            decoration: const InputDecoration(labelText: 'Payment Amount'),
            keyboardType: TextInputType.number,
          ),
        ],
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
              : const Text('Pay'),
        ),
      ],
    );
  }
}
