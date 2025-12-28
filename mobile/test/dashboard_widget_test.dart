import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:moneymate_mobile/api_client.dart';
import 'package:moneymate_mobile/screens/dashboard_screen.dart';

void main() {
  testWidgets('Dashboard renders with financial data and widgets', (tester) async {
    final mock = MockClient((req) async {
      if (req.url.path == '/dashboard') {
        return http.Response(
            jsonEncode({
              "data": {
                "incomes": [
                  {"id": "1", "source": "Salary", "amount": 100000, "frequency": "monthly"}
                ],
                "fixed": [
                  {"id": "1", "name": "Rent", "amount": 30000, "frequency": "monthly", "category": "Housing"}
                ],
                "variable": [
                  {"id": "1", "name": "Groceries", "planned": 10000, "actualTotal": 8000, "actuals": []}
                ],
                "investments": [
                  {"id": "1", "name": "Mutual Fund", "goal": "Retirement", "monthlyAmount": 10000, "status": "active"}
                ],
                "futureBombs": [],
                "constraint": {"score": 80, "tier": "green"},
                "remaining": 15000.0,
                "healthCategory": "good",
                "alerts": []
              }
            }),
            200);
      }
      return http.Response('not found', 404);
    });

    final api = ApiClient(client: mock, baseUrl: 'http://localhost:12022');
    api.setTokenForTest('test-token');

    await tester.pumpWidget(MaterialApp(home: DashboardScreen(api: api, onToggleTheme: () {})));
    await tester.pumpAndSettle(const Duration(seconds: 2));

    // Verify core dashboard widgets appear
    expect(find.text('Variable Expenses'), findsOneWidget);
    expect(find.text('Fixed Expenses'), findsOneWidget);
    expect(find.text('Investments'), findsOneWidget);
  });

  testWidgets('Dashboard shows error state with retry button on API failure', (tester) async {
    final mock = MockClient((req) async {
      return http.Response('Server error', 500);
    });

    final api = ApiClient(client: mock, baseUrl: 'http://localhost:12022');
    api.setTokenForTest('test-token');

    await tester.pumpWidget(MaterialApp(home: DashboardScreen(api: api, onToggleTheme: () {})));
    await tester.pumpAndSettle(const Duration(seconds: 2));

    // Should show error state with retry button
    expect(find.byIcon(Icons.error_outline), findsOneWidget);
    expect(find.text('Retry'), findsOneWidget);
  });
}
