import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'api_client.dart';
import 'screens/auth_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/account_screen.dart';
import 'screens/about_screen.dart';
import 'screens/support_screen.dart';
import 'screens/plan_finances_screen.dart';
import 'screens/fixed_expenses_screen.dart';
import 'screens/variable_expenses_screen.dart';
import 'screens/investments_screen.dart';
import 'screens/income_screen.dart';
import 'screens/credit_cards_screen.dart';
import 'screens/loans_screen.dart';
import 'screens/future_bombs_screen.dart';
import 'screens/activities_screen.dart';
import 'screens/sharing_screen.dart';
import 'screens/dues_screen.dart';
import 'screens/current_month_expenses_screen.dart';
import 'screens/sip_expenses_screen.dart';
import 'screens/export_screen.dart';
import 'screens/themes_screen.dart';

class AppRouter {
  final ApiClient apiClient;
  final VoidCallback onToggleTheme;

  AppRouter({required this.apiClient, required this.onToggleTheme});

  late final GoRouter router = GoRouter(
    initialLocation: '/auth',
    routes: [
      GoRoute(
        path: '/auth',
        builder: (context, state) => AuthScreen(
          api: apiClient,
          onAuthed: () => context.go('/dashboard'),
        ),
      ),
      GoRoute(
        path: '/dashboard',
        builder: (context, state) => DashboardScreen(
          api: apiClient,
          onToggleTheme: onToggleTheme,
        ),
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => SettingsScreen(api: apiClient),
      ),
      GoRoute(
        path: '/settings/account',
        builder: (context, state) => AccountScreen(api: apiClient),
      ),
      GoRoute(
        path: '/settings/about',
        builder: (context, state) => const AboutScreen(),
      ),
      GoRoute(
        path: '/settings/support',
        builder: (context, state) => const SupportScreen(),
      ),
      GoRoute(
        path: '/settings/plan-finances',
        builder: (context, state) => PlanFinancesScreen(api: apiClient),
      ),
      GoRoute(
        path: '/fixed-expenses',
        builder: (context, state) => FixedExpensesScreen(api: apiClient),
      ),
      GoRoute(
        path: '/variable-expenses',
        builder: (context, state) => VariableExpensesScreen(api: apiClient),
      ),
      GoRoute(
        path: '/investments',
        builder: (context, state) => InvestmentsScreen(api: apiClient),
      ),
      GoRoute(
        path: '/income',
        builder: (context, state) => IncomeScreen(api: apiClient),
      ),
      GoRoute(
        path: '/credit-cards',
        builder: (context, state) => CreditCardsScreen(api: apiClient),
      ),
      GoRoute(
        path: '/loans',
        builder: (context, state) => LoansScreen(api: apiClient),
      ),
      GoRoute(
        path: '/future-bombs',
        builder: (context, state) => FutureBombsScreen(api: apiClient),
      ),
      GoRoute(
        path: '/activities',
        builder: (context, state) => ActivitiesScreen(api: apiClient),
      ),
      GoRoute(
        path: '/sharing',
        builder: (context, state) => SharingScreen(api: apiClient),
      ),
      GoRoute(
        path: '/dues',
        builder: (context, state) => DuesScreen(api: apiClient),
      ),
      GoRoute(
        path: '/current-month-expenses',
        builder: (context, state) => CurrentMonthExpensesScreen(api: apiClient),
      ),
      GoRoute(
        path: '/sip-expenses',
        builder: (context, state) => SipExpensesScreen(api: apiClient),
      ),
      GoRoute(
        path: '/export',
        builder: (context, state) => ExportScreen(api: apiClient),
      ),
      GoRoute(
        path: '/settings/themes',
        builder: (context, state) => ThemesScreen(
          api: apiClient,
          onThemeChanged: (mode, theme) {
            // Theme change will be handled by main app
          },
        ),
      ),
    ],
    redirect: (context, state) {
      final isAuth = apiClient.hasToken;
      final isGoingToAuth = state.matchedLocation == '/auth';

      if (!isAuth && !isGoingToAuth) {
        return '/auth';
      }
      if (isAuth && isGoingToAuth) {
        return '/dashboard';
      }
      return null;
    },
  );
}

