import 'package:flutter/material.dart';
import 'package:excel/excel.dart' hide Border;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'dart:io';
import 'package:intl/intl.dart';
import '../api_client.dart';

class ExportScreen extends StatefulWidget {
  const ExportScreen({super.key, required this.api});
  final ApiClient api;

  @override
  State<ExportScreen> createState() => _ExportScreenState();
}

class _ExportScreenState extends State<ExportScreen> {
  bool loading = false;
  String? error;
  String? lastExportPath;

  Future<void> exportData() async {
    setState(() {
      loading = true;
      error = null;
    });

    try {
      // Fetch all data
      final dashboard = await widget.api.fetchDashboard(asOf: DateFormat('yyyy-MM-ddTHH:mm:ssZ').format(DateTime.now()));
      final cards = await widget.api.fetchCreditCards();
      final loans = await widget.api.fetchLoans();
      final activities = await widget.api.fetchActivity();
      
      // Create Excel workbook
      final excel = Excel.createExcel();
      
      // Remove default sheet
      excel.delete('Sheet1');
      
      // Create Summary Sheet
      _createSummarySheet(excel, dashboard);
      
      // Create Income Sheet
      _createIncomeSheet(excel, dashboard.incomes);
      
      // Create Fixed Expenses Sheet
      _createFixedExpensesSheet(excel, dashboard.fixed);
      
      // Create Variable Expenses Sheet
      _createVariableExpensesSheet(excel, dashboard.variable);
      
      // Create Investments Sheet
      _createInvestmentsSheet(excel, dashboard.investments);
      
      // Create Credit Cards Sheet
      _createCreditCardsSheet(excel, cards);
      
      // Create Loans Sheet
      _createLoansSheet(excel, loans);
      
      // Create Future Bombs Sheet
      _createFutureBombsSheet(excel, dashboard.futureBombs);
      
      // Create Activity Log Sheet
      _createActivitySheet(excel, activities);
      
      // Save file
      final bytes = excel.encode();
      if (bytes == null) {
        throw Exception('Failed to generate Excel file');
      }
      
      final directory = await getApplicationDocumentsDirectory();
      final timestamp = DateFormat('yyyyMMdd_HHmmss').format(DateTime.now());
      final filePath = '${directory.path}/MoneyMate_Export_$timestamp.xlsx';
      final file = File(filePath);
      await file.writeAsBytes(bytes);
      
      setState(() {
        lastExportPath = filePath;
        loading = false;
      });
      
      // Share the file
      await Share.shareXFiles([XFile(filePath)], text: 'MoneyMate Financial Data Export');
      
      _showSuccess('Export successful! File saved and shared.');
    } catch (e) {
      setState(() {
        error = e.toString();
        loading = false;
      });
      _showError(e.toString());
    }
  }

  void _createSummarySheet(Excel excel, dynamic dashboard) {
    final sheet = excel['Summary'];
    
    // Header
    sheet.cell(CellIndex.indexByString('A1')).value = TextCellValue('MoneyMate Financial Summary');
    sheet.cell(CellIndex.indexByString('A2')).value = TextCellValue('Generated: ${DateFormat('yyyy-MM-dd HH:mm').format(DateTime.now())}');
    
    // Health
    sheet.cell(CellIndex.indexByString('A4')).value = TextCellValue('Financial Health');
    sheet.cell(CellIndex.indexByString('B4')).value = TextCellValue(dashboard.healthCategory.toUpperCase());
    
    // Constraint
    sheet.cell(CellIndex.indexByString('A5')).value = TextCellValue('Constraint Score');
    sheet.cell(CellIndex.indexByString('B5')).value = IntCellValue(dashboard.constraint.score);
    sheet.cell(CellIndex.indexByString('C5')).value = TextCellValue('(${dashboard.constraint.tier})');
    
    // Remaining
    sheet.cell(CellIndex.indexByString('A6')).value = TextCellValue('Remaining Amount');
    sheet.cell(CellIndex.indexByString('B6')).value = DoubleCellValue(dashboard.remaining);
    
    // Counts
    sheet.cell(CellIndex.indexByString('A8')).value = TextCellValue('Category');
    sheet.cell(CellIndex.indexByString('B8')).value = TextCellValue('Count');
    
    sheet.cell(CellIndex.indexByString('A9')).value = TextCellValue('Income Sources');
    sheet.cell(CellIndex.indexByString('B9')).value = IntCellValue(dashboard.incomes.length);
    
    sheet.cell(CellIndex.indexByString('A10')).value = TextCellValue('Fixed Expenses');
    sheet.cell(CellIndex.indexByString('B10')).value = IntCellValue(dashboard.fixed.length);
    
    sheet.cell(CellIndex.indexByString('A11')).value = TextCellValue('Variable Plans');
    sheet.cell(CellIndex.indexByString('B11')).value = IntCellValue(dashboard.variable.length);
    
    sheet.cell(CellIndex.indexByString('A12')).value = TextCellValue('Investments');
    sheet.cell(CellIndex.indexByString('B12')).value = IntCellValue(dashboard.investments.length);
    
    sheet.cell(CellIndex.indexByString('A13')).value = TextCellValue('Future Bombs');
    sheet.cell(CellIndex.indexByString('B13')).value = IntCellValue(dashboard.futureBombs.length);
    
    sheet.cell(CellIndex.indexByString('A14')).value = TextCellValue('Alerts');
    sheet.cell(CellIndex.indexByString('B14')).value = IntCellValue(dashboard.alerts.length);
  }

  void _createIncomeSheet(Excel excel, List<dynamic> incomes) {
    final sheet = excel['Income'];
    
    // Headers
    sheet.cell(CellIndex.indexByString('A1')).value = TextCellValue('Source');
    sheet.cell(CellIndex.indexByString('B1')).value = TextCellValue('Amount');
    sheet.cell(CellIndex.indexByString('C1')).value = TextCellValue('Frequency');
    
    // Data
    for (var i = 0; i < incomes.length; i++) {
      final income = incomes[i];
      sheet.cell(CellIndex.indexByString('A${i + 2}')).value = TextCellValue(income.source);
      sheet.cell(CellIndex.indexByString('B${i + 2}')).value = IntCellValue(income.amount);
      sheet.cell(CellIndex.indexByString('C${i + 2}')).value = TextCellValue(income.frequency);
    }
  }

  void _createFixedExpensesSheet(Excel excel, List<dynamic> expenses) {
    final sheet = excel['Fixed Expenses'];
    
    // Headers
    sheet.cell(CellIndex.indexByString('A1')).value = TextCellValue('Name');
    sheet.cell(CellIndex.indexByString('B1')).value = TextCellValue('Amount');
    sheet.cell(CellIndex.indexByString('C1')).value = TextCellValue('Frequency');
    sheet.cell(CellIndex.indexByString('D1')).value = TextCellValue('Category');
    sheet.cell(CellIndex.indexByString('E1')).value = TextCellValue('SIP Enabled');
    
    // Data
    for (var i = 0; i < expenses.length; i++) {
      final expense = expenses[i];
      sheet.cell(CellIndex.indexByString('A${i + 2}')).value = TextCellValue(expense.name);
      sheet.cell(CellIndex.indexByString('B${i + 2}')).value = IntCellValue(expense.amount);
      sheet.cell(CellIndex.indexByString('C${i + 2}')).value = TextCellValue(expense.frequency);
      sheet.cell(CellIndex.indexByString('D${i + 2}')).value = TextCellValue(expense.category);
      sheet.cell(CellIndex.indexByString('E${i + 2}')).value = TextCellValue(expense.isSipFlag == true ? 'Yes' : 'No');
    }
  }

  void _createVariableExpensesSheet(Excel excel, List<dynamic> plans) {
    final sheet = excel['Variable Expenses'];
    
    // Headers
    sheet.cell(CellIndex.indexByString('A1')).value = TextCellValue('Name');
    sheet.cell(CellIndex.indexByString('B1')).value = TextCellValue('Planned');
    sheet.cell(CellIndex.indexByString('C1')).value = TextCellValue('Actual');
    sheet.cell(CellIndex.indexByString('D1')).value = TextCellValue('Difference');
    sheet.cell(CellIndex.indexByString('E1')).value = TextCellValue('Status');
    
    // Data
    for (var i = 0; i < plans.length; i++) {
      final plan = plans[i];
      final diff = plan.actualTotal - plan.planned;
      sheet.cell(CellIndex.indexByString('A${i + 2}')).value = TextCellValue(plan.name);
      sheet.cell(CellIndex.indexByString('B${i + 2}')).value = IntCellValue(plan.planned);
      sheet.cell(CellIndex.indexByString('C${i + 2}')).value = IntCellValue(plan.actualTotal);
      sheet.cell(CellIndex.indexByString('D${i + 2}')).value = IntCellValue(diff);
      sheet.cell(CellIndex.indexByString('E${i + 2}')).value = TextCellValue(diff > 0 ? 'Overspend' : 'Within Limit');
    }
  }

  void _createInvestmentsSheet(Excel excel, List<dynamic> investments) {
    final sheet = excel['Investments'];
    
    // Headers
    sheet.cell(CellIndex.indexByString('A1')).value = TextCellValue('Name');
    sheet.cell(CellIndex.indexByString('B1')).value = TextCellValue('Goal');
    sheet.cell(CellIndex.indexByString('C1')).value = TextCellValue('Monthly Amount');
    sheet.cell(CellIndex.indexByString('D1')).value = TextCellValue('Status');
    
    // Data
    for (var i = 0; i < investments.length; i++) {
      final investment = investments[i];
      sheet.cell(CellIndex.indexByString('A${i + 2}')).value = TextCellValue(investment.name);
      sheet.cell(CellIndex.indexByString('B${i + 2}')).value = TextCellValue(investment.goal);
      sheet.cell(CellIndex.indexByString('C${i + 2}')).value = IntCellValue(investment.monthlyAmount);
      sheet.cell(CellIndex.indexByString('D${i + 2}')).value = TextCellValue(investment.status);
    }
  }

  void _createCreditCardsSheet(Excel excel, List<dynamic> cards) {
    final sheet = excel['Credit Cards'];
    
    // Headers
    sheet.cell(CellIndex.indexByString('A1')).value = TextCellValue('Name');
    sheet.cell(CellIndex.indexByString('B1')).value = TextCellValue('Bill Amount');
    sheet.cell(CellIndex.indexByString('C1')).value = TextCellValue('Paid Amount');
    sheet.cell(CellIndex.indexByString('D1')).value = TextCellValue('Remaining');
    sheet.cell(CellIndex.indexByString('E1')).value = TextCellValue('Due Date');
    
    // Data
    for (var i = 0; i < cards.length; i++) {
      final card = cards[i];
      final remaining = card.billAmount - card.paidAmount;
      sheet.cell(CellIndex.indexByString('A${i + 2}')).value = TextCellValue(card.name);
      sheet.cell(CellIndex.indexByString('B${i + 2}')).value = IntCellValue(card.billAmount);
      sheet.cell(CellIndex.indexByString('C${i + 2}')).value = IntCellValue(card.paidAmount);
      sheet.cell(CellIndex.indexByString('D${i + 2}')).value = IntCellValue(remaining);
      sheet.cell(CellIndex.indexByString('E${i + 2}')).value = TextCellValue(card.dueDate);
    }
  }

  void _createLoansSheet(Excel excel, List<dynamic> loans) {
    final sheet = excel['Loans'];
    
    // Headers
    sheet.cell(CellIndex.indexByString('A1')).value = TextCellValue('Name');
    sheet.cell(CellIndex.indexByString('B1')).value = TextCellValue('EMI');
    sheet.cell(CellIndex.indexByString('C1')).value = TextCellValue('Remaining Months');
    sheet.cell(CellIndex.indexByString('D1')).value = TextCellValue('Total Remaining');
    
    // Data
    for (var i = 0; i < loans.length; i++) {
      final loan = loans[i];
      final total = loan.emi * loan.remainingTenureMonths;
      sheet.cell(CellIndex.indexByString('A${i + 2}')).value = TextCellValue(loan.name);
      sheet.cell(CellIndex.indexByString('B${i + 2}')).value = IntCellValue(loan.emi);
      sheet.cell(CellIndex.indexByString('C${i + 2}')).value = IntCellValue(loan.remainingTenureMonths);
      sheet.cell(CellIndex.indexByString('D${i + 2}')).value = IntCellValue(total);
    }
  }

  void _createFutureBombsSheet(Excel excel, List<dynamic> bombs) {
    final sheet = excel['Future Bombs'];
    
    // Headers
    sheet.cell(CellIndex.indexByString('A1')).value = TextCellValue('Name');
    sheet.cell(CellIndex.indexByString('B1')).value = TextCellValue('Due Date');
    sheet.cell(CellIndex.indexByString('C1')).value = TextCellValue('Monthly Equivalent');
    sheet.cell(CellIndex.indexByString('D1')).value = TextCellValue('Preparedness %');
    sheet.cell(CellIndex.indexByString('E1')).value = TextCellValue('Status');
    
    // Data
    for (var i = 0; i < bombs.length; i++) {
      final bomb = bombs[i];
      final percentage = (bomb.preparednessRatio * 100).toInt();
      String status;
      if (bomb.preparednessRatio >= 1.0) status = 'Ready';
      else if (bomb.preparednessRatio >= 0.7) status = 'On Track';
      else if (bomb.preparednessRatio >= 0.4) status = 'Behind';
      else status = 'Critical';
      
      sheet.cell(CellIndex.indexByString('A${i + 2}')).value = TextCellValue(bomb.name);
      sheet.cell(CellIndex.indexByString('B${i + 2}')).value = TextCellValue(bomb.dueDate);
      sheet.cell(CellIndex.indexByString('C${i + 2}')).value = IntCellValue(bomb.monthlyEquivalent);
      sheet.cell(CellIndex.indexByString('D${i + 2}')).value = IntCellValue(percentage);
      sheet.cell(CellIndex.indexByString('E${i + 2}')).value = TextCellValue(status);
    }
  }

  void _createActivitySheet(Excel excel, List<dynamic> activities) {
    final sheet = excel['Activity Log'];
    
    // Headers
    sheet.cell(CellIndex.indexByString('A1')).value = TextCellValue('Entity');
    sheet.cell(CellIndex.indexByString('B1')).value = TextCellValue('Action');
    sheet.cell(CellIndex.indexByString('C1')).value = TextCellValue('Timestamp');
    
    // Data
    for (var i = 0; i < activities.length && i < 1000; i++) { // Limit to 1000 activities
      final activity = activities[i];
      sheet.cell(CellIndex.indexByString('A${i + 2}')).value = TextCellValue(activity['entity']?.toString() ?? 'unknown');
      sheet.cell(CellIndex.indexByString('B${i + 2}')).value = TextCellValue(activity['action']?.toString() ?? 'unknown');
      sheet.cell(CellIndex.indexByString('C${i + 2}')).value = TextCellValue(activity['created_at']?.toString() ?? '');
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: Colors.red.shade700),
    );
  }

  void _showSuccess(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: Colors.green.shade700),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Export Data'),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.download,
                size: 80,
                color: loading ? Colors.grey.shade400 : Colors.blue.shade700,
              ),
              const SizedBox(height: 24),
              Text(
                'Export Your Financial Data',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Text(
                'Export includes:\n• Summary with health & constraint\n• Income sources\n• Fixed & Variable expenses\n• Investments & Future bombs\n• Credit cards & Loans\n• Activity log',
                style: TextStyle(color: Colors.grey.shade700),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              if (loading)
                Column(
                  children: [
                    const CircularProgressIndicator(),
                    const SizedBox(height: 16),
                    Text(
                      'Generating Excel file...',
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                  ],
                )
              else
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton.icon(
                    onPressed: exportData,
                    icon: const Icon(Icons.file_download),
                    label: const Text(
                      'Export to Excel',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue.shade700,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              if (error != null) ...[
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
                      Icon(Icons.error_outline, color: Colors.red.shade700),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          error!,
                          style: TextStyle(color: Colors.red.shade700),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              if (lastExportPath != null) ...[
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.green.shade200),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.check_circle, color: Colors.green.shade700),
                          const SizedBox(width: 8),
                          Text(
                            'Export Successful!',
                            style: TextStyle(
                              color: Colors.green.shade700,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'File saved to:\n${lastExportPath!.split('/').last}',
                        style: TextStyle(
                          color: Colors.green.shade900,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
