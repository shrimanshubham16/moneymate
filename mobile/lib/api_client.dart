import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'models.dart';

class ApiClient {
  ApiClient({http.Client? client, this.baseUrl = 'http://localhost:12022'}) : _client = client ?? http.Client();

  final http.Client _client;
  final String baseUrl;
  String? _token;

  void setTokenForTest(String token) {
    _token = token;
  }

  bool get hasToken => _token != null;

  Future<void> loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('token');
  }

  Future<void> saveToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
  }

  Future<void> clearToken() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
  }

  Map<String, String> _headers() => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  Future<Map<String, dynamic>> _request(String path, {String method = 'GET', Map<String, dynamic>? body, Map<String, String>? query}) async {
    final uri = Uri.parse('$baseUrl$path').replace(queryParameters: query);
    final req = http.Request(method, uri)..headers.addAll(_headers());
    if (body != null) req.body = jsonEncode(body);
    final res = await _client.send(req);
    final text = await res.stream.bytesToString();
    if (res.statusCode >= 400) {
      throw Exception('Request failed ${res.statusCode}: $text');
    }
    if (text.isEmpty) return {};
    return jsonDecode(text) as Map<String, dynamic>;
  }

  Future<void> signup(String username, String password, String _) async {
    final json = await _request('/auth/signup', method: 'POST', body: {'username': username, 'password': password});
    await saveToken(json['access_token']);
  }

  Future<void> login(String username, String password) async {
    final json = await _request('/auth/login', method: 'POST', body: {'username': username, 'password': password});
    await saveToken(json['access_token']);
  }

  Future<Map<String, dynamic>> fetchUser() async {
    final json = await _request('/auth/me');
    return json['user'];
  }

  Future<DashboardData> fetchDashboard({String? asOf}) async {
    final json = await _request('/dashboard', query: asOf != null ? {'today': asOf} : null);
    return DashboardData.fromJson(json['data']);
  }

  Future<void> createIncome(String source, int amount, String frequency) async {
    await _request('/planning/income', method: 'POST', body: {'source': source, 'amount': amount, 'frequency': frequency});
  }

  Future<void> deleteIncome(String id) async {
    await _request('/planning/income/$id', method: 'DELETE');
  }

  Future<List<FixedExpense>> fetchFixedExpenses() async {
    final json = await _request('/planning/fixed-expenses');
    return (json['data'] as List).map((e) => FixedExpense.fromJson(e)).toList();
  }

  Future<void> createFixedExpense(String name, int amount, String frequency, String category, {bool isSipFlag = false}) async {
    await _request('/planning/fixed-expenses',
        method: 'POST', body: {'name': name, 'amount': amount, 'frequency': frequency, 'category': category, 'is_sip_flag': isSipFlag});
  }

  Future<void> createVariablePlan(String name, int planned, String category) async {
    await _request('/planning/variable-expenses',
        method: 'POST', body: {'name': name, 'planned': planned, 'category': category, 'start_date': '2025-01-01'});
  }

  Future<void> updateVariablePlan(String id, {String? name, int? planned, String? category}) async {
    await _request('/planning/variable-expenses/$id',
        method: 'PUT',
        body: {
          if (name != null) 'name': name,
          if (planned != null) 'planned': planned,
          if (category != null) 'category': category,
          'start_date': '2025-01-01'
        });
  }

  Future<void> deleteVariablePlan(String id) async {
    await _request('/planning/variable-expenses/$id', method: 'DELETE');
  }

  Future<void> updateFixedExpense(String id, {String? name, int? amount, String? frequency, String? category}) async {
    await _request('/planning/fixed-expenses/$id',
        method: 'PUT',
        body: {
          if (name != null) 'name': name,
          if (amount != null) 'amount': amount,
          if (frequency != null) 'frequency': frequency,
          if (category != null) 'category': category
        });
  }

  Future<void> deleteFixedExpense(String id) async {
    await _request('/planning/fixed-expenses/$id', method: 'DELETE');
  }

  Future<void> addVariableActual(String planId, int amount, {String? justification}) async {
    await _request('/planning/variable-expenses/$planId/actuals',
        method: 'POST', body: {'amount': amount, 'incurred_at': '2025-01-15T00:00:00Z', if (justification != null) 'justification': justification});
  }

  Future<List<Investment>> fetchInvestments() async {
    final json = await _request('/planning/investments');
    return (json['data'] as List).map((e) => Investment.fromJson(e)).toList();
  }

  Future<void> createInvestment(String name, String goal, int monthlyAmount) async {
    await _request('/planning/investments',
        method: 'POST', body: {'name': name, 'goal': goal, 'monthly_amount': monthlyAmount});
  }

  Future<void> deleteInvestment(String id) async {
    await _request('/planning/investments/$id', method: 'DELETE');
  }

  Future<void> updateInvestmentStatus(String id, String status) async {
    await _request('/planning/investments/$id/status', method: 'PATCH', body: {'status': status});
  }

  Future<List<CreditCard>> fetchCreditCards() async {
    final json = await _request('/debts/credit-cards');
    return (json['data'] as List).map((e) => CreditCard.fromJson(e)).toList();
  }

  Future<void> payCreditCard(String id, int amount) async {
    await _request('/debts/credit-cards/$id/payments', method: 'POST', body: {'amount': amount});
  }

  Future<List<Loan>> fetchLoans() async {
    final json = await _request('/debts/loans');
    return (json['data'] as List).map((e) => Loan.fromJson(e)).toList();
  }

  Future<List<dynamic>> fetchActivity() async {
    final json = await _request('/activity');
    return json['data'] as List<dynamic>;
  }

  Future<Map<String, dynamic>> fetchSharingRequests() async {
    final json = await _request('/sharing/requests');
    return json['data'] as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> fetchSharingMembers() async {
    final json = await _request('/sharing/members');
    return json['data'] as Map<String, dynamic>;
  }

  Future<void> sendInvite(String email, String role, bool merge) async {
    await _request('/sharing/invite', method: 'POST', body: {'email_or_username': email, 'role': role, 'merge_finances': merge});
  }

  Future<void> approveRequest(String id) async {
    await _request('/sharing/requests/$id/approve', method: 'POST');
  }

  Future<void> rejectRequest(String id) async {
    await _request('/sharing/requests/$id/reject', method: 'POST');
  }

  Future<void> removeMember(String memberId) async {
    await _request('/sharing/members/$memberId', method: 'DELETE');
  }

  Future<Map<String, dynamic>> fetchThemeState() async {
    final json = await _request('/themes/state');
    return json['data'] as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> updateThemeState({
    String? mode,
    String? selectedTheme,
    bool? constraintTierEffect,
  }) async {
    final body = <String, dynamic>{};
    if (mode != null) body['mode'] = mode;
    if (selectedTheme != null) body['selected_theme'] = selectedTheme;
    if (constraintTierEffect != null) body['constraint_tier_effect'] = constraintTierEffect;
    final json = await _request('/themes/state', method: 'PATCH', body: body);
    return json['data'] as Map<String, dynamic>;
  }

  // Payment Tracking
  Future<void> markAsPaid(String itemId, String itemType, double amount) async {
    await _request('/payments/mark-paid', method: 'POST', body: {
      'item_id': itemId,
      'item_type': itemType,
      'amount': amount,
    });
  }

  Future<void> markAsUnpaid(String itemId, String itemType) async {
    await _request('/payments/mark-unpaid', method: 'POST', body: {
      'item_id': itemId,
      'item_type': itemType,
    });
  }

  Future<Map<String, dynamic>> getPaymentStatus(String month) async {
    return _request('/payments/status', query: {'month': month});
  }

  Future<Map<String, dynamic>> getPaymentsSummary(String month) async {
    return _request('/payments/summary', query: {'month': month});
  }

  // User Preferences
  Future<Map<String, dynamic>> getUserPreferences() async {
    return _request('/preferences');
  }

  Future<void> updateUserPreferences({int? monthStartDay, String? currency, String? timezone}) async {
    await _request('/preferences', method: 'PATCH', body: {
      if (monthStartDay != null) 'month_start_day': monthStartDay,
      if (currency != null) 'currency': currency,
      if (timezone != null) 'timezone': timezone,
    });
  }
}

