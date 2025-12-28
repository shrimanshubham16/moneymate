import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:moneymate_mobile/api_client.dart';

void main() {
  test('dashboard parsing works', () async {
    final mock = MockClient((req) async {
      if (req.url.path == '/dashboard') {
        return http.Response(
            jsonEncode({
              "data": {
                "incomes": [],
                "fixedExpenses": [],
                "variablePlans": [],
                "investments": [],
                "futureBombs": [],
                "health": {"remaining": 1000, "category": "good"},
                "constraintScore": {"score": 10, "tier": "green"},
                "alerts": []
              }
            }),
            200);
      }
      return http.Response('not found', 404);
    });
    final api = ApiClient(client: mock, baseUrl: 'http://localhost:12022');
    api.setTokenForTest('t');
    final dash = await api.fetchDashboard();
    expect(dash.healthCategory, 'good');
    expect(dash.constraint.score, 10);
  });
}

