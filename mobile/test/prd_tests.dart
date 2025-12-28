import 'package:flutter_test/flutter_test.dart';
import 'package:moneymate_mobile/main.dart';
import 'package:moneymate_mobile/api_client.dart';

// Test credentials
const testUsername = 'shrimati_shivangi';
const testPassword = 'c0nsT@nt';

void main() {
  group('MoneyMate PRD Compliance Tests - Mobile App', () {
    
    testWidgets('1. Login Page - should render login screen', (WidgetTester tester) async {
      await tester.pumpWidget(const MoneyMateApp());
      
      expect(find.text('MoneyMate'), findsOneWidget);
      expect(find.text('Login'), findsOneWidget);
      expect(find.text('Sign Up'), findsOneWidget);
    });

    testWidgets('1. Login Page - should allow signup', (WidgetTester tester) async {
      await tester.pumpWidget(const MoneyMateApp());
      
      // Tap signup
      await tester.tap(find.text('Sign Up'));
      await tester.pumpAndSettle();
      
      // Fill form
      await tester.enterText(find.byType(TextField).first, 'test_mobile_user');
      await tester.enterText(find.byType(TextField).last, 'testpass123');
      
      // Submit
      await tester.tap(find.text('Sign Up'));
      await tester.pumpAndSettle();
      
      // Should navigate to dashboard
      expect(find.text('Dashboard'), findsOneWidget);
    });

    testWidgets('1. Login Page - should allow login with test credentials', (WidgetTester tester) async {
      await tester.pumpWidget(const MoneyMateApp());
      
      // Enter test credentials
      await tester.enterText(find.byType(TextField).first, testUsername);
      await tester.enterText(find.byType(TextField).last, testPassword);
      
      // Login
      await tester.tap(find.text('Login'));
      await tester.pumpAndSettle();
      
      // Should navigate to dashboard
      expect(find.text('Dashboard'), findsOneWidget);
    });

    testWidgets('2. Dashboard - should display after login', (WidgetTester tester) async {
      await tester.pumpWidget(const MoneyMateApp());
      
      // Login
      await tester.enterText(find.byType(TextField).first, testUsername);
      await tester.enterText(find.byType(TextField).last, testPassword);
      await tester.tap(find.text('Login'));
      await tester.pumpAndSettle();
      
      // Verify dashboard elements
      expect(find.text('Dashboard'), findsOneWidget);
      expect(find.text('Health'), findsWidgets);
    });

    testWidgets('2. Dashboard - should show financial health indicator', (WidgetTester tester) async {
      await tester.pumpWidget(const MoneyMateApp());
      
      // Login and wait for dashboard
      await tester.enterText(find.byType(TextField).first, testUsername);
      await tester.enterText(find.byType(TextField).last, testPassword);
      await tester.tap(find.text('Login'));
      await tester.pumpAndSettle();
      
      // Should display health indicator
      expect(find.textContaining(RegExp(r'Good|OK|Not well|Worrisome', caseSensitive: false)), findsOneWidget);
    });

    testWidgets('2.2 Dashboard Widgets - should display all widgets', (WidgetTester tester) async {
      await tester.pumpWidget(const MoneyMateApp());
      
      // Login
      await tester.enterText(find.byType(TextField).first, testUsername);
      await tester.enterText(find.byType(TextField).last, testPassword);
      await tester.tap(find.text('Login'));
      await tester.pumpAndSettle();
      
      // Verify widgets
      expect(find.textContaining('Variable'), findsWidgets);
      expect(find.textContaining('Fixed'), findsWidgets);
      expect(find.textContaining('Investment'), findsWidgets);
      expect(find.textContaining('Credit'), findsWidgets);
    });

    testWidgets('2.2.1 Variable Expenses - should navigate on widget tap', (WidgetTester tester) async {
      await tester.pumpWidget(const MoneyMateApp());
      
      // Login
      await tester.enterText(find.byType(TextField).first, testUsername);
      await tester.enterText(find.byType(TextField).last, testPassword);
      await tester.tap(find.text('Login'));
      await tester.pumpAndSettle();
      
      // Tap variable expenses widget
      await tester.tap(find.textContaining('Variable').first);
      await tester.pumpAndSettle();
      
      // Should navigate to variable expenses page
      expect(find.text('Variable Plans'), findsOneWidget);
    });

    testWidgets('2.2.1 Variable Expenses - should add actual with justification', (WidgetTester tester) async {
      await tester.pumpWidget(const MoneyMateApp());
      
      // Login and navigate to variable expenses
      await tester.enterText(find.byType(TextField).first, testUsername);
      await tester.enterText(find.byType(TextField).last, testPassword);
      await tester.tap(find.text('Login'));
      await tester.pumpAndSettle();
      
      await tester.tap(find.textContaining('Variable').first);
      await tester.pumpAndSettle();
      
      // Add actual (if plan exists)
      // This requires specific UI interactions
      // TODO: Complete implementation
    });

    testWidgets('3. Settings - should display settings menu', (WidgetTester tester) async {
      await tester.pumpWidget(const MoneyMateApp());
      
      // Login
      await tester.enterText(find.byType(TextField).first, testUsername);
      await tester.enterText(find.byType(TextField).last, testPassword);
      await tester.tap(find.text('Login'));
      await tester.pumpAndSettle();
      
      // Open settings
      await tester.tap(find.byIcon(Icons.settings));
      await tester.pumpAndSettle();
      
      // Verify settings options
      expect(find.text('Account'), findsOneWidget);
      expect(find.text('Sharing'), findsOneWidget);
      expect(find.text('Plan Finances'), findsOneWidget);
      expect(find.text('About'), findsOneWidget);
    });

    testWidgets('3.3 Plan Finances - should list fixed expenses with CRUD', (WidgetTester tester) async {
      await tester.pumpWidget(const MoneyMateApp());
      
      // Login and navigate to plan finances
      await tester.enterText(find.byType(TextField).first, testUsername);
      await tester.enterText(find.byType(TextField).last, testPassword);
      await tester.tap(find.text('Login'));
      await tester.pumpAndSettle();
      
      await tester.tap(find.byIcon(Icons.settings));
      await tester.pumpAndSettle();
      
      await tester.tap(find.text('Plan Finances'));
      await tester.pumpAndSettle();
      
      // Should show planning options
      expect(find.text('Income'), findsWidgets);
      expect(find.text('Fixed'), findsWidgets);
      expect(find.text('Variable'), findsWidgets);
    });

    testWidgets('3.4 Income - should display "Hurray New Income" button', (WidgetTester tester) async {
      await tester.pumpWidget(const MoneyMateApp());
      
      // Navigate to income section
      await tester.enterText(find.byType(TextField).first, testUsername);
      await tester.enterText(find.byType(TextField).last, testPassword);
      await tester.tap(find.text('Login'));
      await tester.pumpAndSettle();
      
      // Navigate to income (via settings or direct)
      // TODO: Complete navigation path
      
      // Verify button exists
      // expect(find.textContaining('Hurray'), findsOneWidget);
    });

    testWidgets('3.5 Sharing - should send invite', (WidgetTester tester) async {
      await tester.pumpWidget(const MoneyMateApp());
      
      // Login and navigate to sharing
      await tester.enterText(find.byType(TextField).first, testUsername);
      await tester.enterText(find.byType(TextField).last, testPassword);
      await tester.tap(find.text('Login'));
      await tester.pumpAndSettle();
      
      await tester.tap(find.byIcon(Icons.settings));
      await tester.pumpAndSettle();
      
      await tester.tap(find.text('Sharing'));
      await tester.pumpAndSettle();
      
      // Verify sharing UI
      expect(find.text('Pending Requests'), findsWidgets);
      expect(find.textContaining('Invite'), findsWidgets);
    });

    testWidgets('3.5 Sharing - should approve/reject requests', (WidgetTester tester) async {
      await tester.pumpWidget(const MoneyMateApp());
      
      // Login and navigate to sharing
      await tester.enterText(find.byType(TextField).first, testUsername);
      await tester.enterText(find.byType(TextField).last, testPassword);
      await tester.tap(find.text('Login'));
      await tester.pumpAndSettle();
      
      await tester.tap(find.byIcon(Icons.settings));
      await tester.pumpAndSettle();
      
      await tester.tap(find.text('Sharing'));
      await tester.pumpAndSettle();
      
      // Check for approve/reject buttons
      expect(find.text('Approve'), findsWidgets);
      expect(find.text('Reject'), findsWidgets);
    });

    testWidgets('3.6 Themes - should toggle theme', (WidgetTester tester) async {
      await tester.pumpWidget(const MoneyMateApp());
      
      // Login
      await tester.enterText(find.byType(TextField).first, testUsername);
      await tester.enterText(find.byType(TextField).last, testPassword);
      await tester.tap(find.text('Login'));
      await tester.pumpAndSettle();
      
      // Open settings
      await tester.tap(find.byIcon(Icons.settings));
      await tester.pumpAndSettle();
      
      // Find theme toggle
      final themeToggle = find.byType(Switch);
      await tester.tap(themeToggle);
      await tester.pumpAndSettle();
      
      // Theme should have changed
      // Verify by checking widget tree colors/styling
    });

    testWidgets('4. Alerts - should display overspend alerts', (WidgetTester tester) async {
      await tester.pumpWidget(const MoneyMateApp());
      
      // Login
      await tester.enterText(find.byType(TextField).first, testUsername);
      await tester.enterText(find.byType(TextField).last, testPassword);
      await tester.tap(find.text('Login'));
      await tester.pumpAndSettle();
      
      // Check for alerts section (if any alerts exist)
      // expect(find.text('Alerts'), findsWidgets);
    });

    testWidgets('Backend Connection - should connect to localhost:12022', (WidgetTester tester) async {
      // Test that API client is configured correctly
      final api = ApiClient(baseUrl: 'http://localhost:12022');
      
      // Verify health endpoint
      final health = await api.health();
      expect(health, isNotNull);
    });

    testWidgets('Credit Cards - should create and pay', (WidgetTester tester) async {
      await tester.pumpWidget(const MoneyMateApp());
      
      // Login and navigate to credit cards
      await tester.enterText(find.byType(TextField).first, testUsername);
      await tester.enterText(find.byType(TextField).last, testPassword);
      await tester.tap(find.text('Login'));
      await tester.pumpAndSettle();
      
      // Navigate to credit cards section
      // TODO: Complete navigation
      
      // Verify create and payment functionality
    });

    testWidgets('Activity Log - should display activities', (WidgetTester tester) async {
      await tester.pumpWidget(const MoneyMateApp());
      
      // Login and navigate to activity
      await tester.enterText(find.byType(TextField).first, testUsername);
      await tester.enterText(find.byType(TextField).last, testPassword);
      await tester.tap(find.text('Login'));
      await tester.pumpAndSettle();
      
      // Navigate to activity
      // TODO: Complete navigation
      
      // Verify activity log displays
    });

    testWidgets('Performance - should load dashboard quickly', (WidgetTester tester) async {
      final stopwatch = Stopwatch()..start();
      
      await tester.pumpWidget(const MoneyMateApp());
      
      await tester.enterText(find.byType(TextField).first, testUsername);
      await tester.enterText(find.byType(TextField).last, testPassword);
      await tester.tap(find.text('Login'));
      await tester.pumpAndSettle();
      
      stopwatch.stop();
      
      // Should load in reasonable time (< 3 seconds)
      expect(stopwatch.elapsedMilliseconds, lessThan(3000));
    });
  });
}
