import 'package:flutter/material.dart';
import '../api_client.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key, required this.api, required this.onAuthed});
  final ApiClient api;
  final VoidCallback onAuthed;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final usernameCtrl = TextEditingController();
  final passCtrl = TextEditingController();
  bool loading = false;
  String mode = 'login';
  String? err;
  String? passwordError;
  int failedAttempts = 0;

  // Strong password validation
  String? validatePassword(String password) {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!password.contains(RegExp(r'[A-Z]'))) {
      return 'Password must contain at least 1 uppercase letter';
    }
    if (!password.contains(RegExp(r'[a-z]'))) {
      return 'Password must contain at least 1 lowercase letter';
    }
    if (!password.contains(RegExp(r'[0-9]'))) {
      return 'Password must contain at least 1 number';
    }
    if (!password.contains(RegExp(r'[!@#$%^&*(),.?":{}|<>]'))) {
      return 'Password must contain at least 1 special character';
    }
    return null;
  }

  Future<void> submit() async {
    setState(() {
      loading = true;
      err = null;
      passwordError = null;
    });

    // Validate password for signup
    if (mode == 'signup') {
      final pwError = validatePassword(passCtrl.text);
      if (pwError != null) {
        setState(() {
          passwordError = pwError;
          loading = false;
        });
        return;
      }
    }

    try {
      if (mode == 'login') {
        await widget.api.login(usernameCtrl.text, passCtrl.text);
        // Reset failed attempts on successful login
        failedAttempts = 0;
      } else {
        await widget.api.signup(usernameCtrl.text, passCtrl.text, usernameCtrl.text);
      }
      widget.onAuthed();
    } catch (e) {
      final errorStr = e.toString();
      
      // Check for account lockout
      if (errorStr.contains('locked')) {
        setState(() => err = errorStr);
      } else if (mode == 'login') {
        // Increment failed attempts
        failedAttempts++;
        final remaining = 3 - failedAttempts;
        if (remaining > 0) {
          setState(() => err = 'Invalid credentials. $remaining attempts remaining.');
        } else {
          setState(() => err = 'Account locked for 10 minutes due to too many failed attempts.');
        }
      } else {
        setState(() => err = errorStr);
      }
    } finally {
      setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: mode == 'login'
                ? [Colors.blue.shade700, Colors.purple.shade900]
                : [Colors.green.shade700, Colors.teal.shade900],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Card(
                elevation: 8,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.account_balance_wallet,
                        size: 64,
                        color: mode == 'login' ? Colors.blue.shade700 : Colors.green.shade700,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'MoneyMate',
                        style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: Colors.grey.shade800,
                            ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        mode == 'login' ? 'Welcome back!' : 'Create your account',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey.shade600),
                      ),
                      const SizedBox(height: 24),
                      TextField(
                        controller: usernameCtrl,
                        decoration: InputDecoration(
                          labelText: 'Username',
                          prefixIcon: const Icon(Icons.person),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          filled: true,
                          fillColor: Colors.grey.shade50,
                          helperText: mode == 'signup' ? 'Username is permanent and cannot be changed' : null,
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: passCtrl,
                        decoration: InputDecoration(
                          labelText: 'Password',
                          prefixIcon: const Icon(Icons.lock),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          filled: true,
                          fillColor: Colors.grey.shade50,
                          errorText: passwordError,
                        ),
                        obscureText: true,
                      ),
                      if (mode == 'signup') ...[
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.blue.shade50,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Password Requirements:',
                                style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue.shade900),
                              ),
                              const SizedBox(height: 4),
                              _buildRequirement('At least 8 characters'),
                              _buildRequirement('1 uppercase letter'),
                              _buildRequirement('1 lowercase letter'),
                              _buildRequirement('1 number'),
                              _buildRequirement('1 special character (!@#\$%^&*)'),
                            ],
                          ),
                        ),
                      ],
                      if (err != null) ...[
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
                                  err!,
                                  style: TextStyle(color: Colors.red.shade700, fontWeight: FontWeight.w500),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          onPressed: loading ? null : submit,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: mode == 'login' ? Colors.blue.shade700 : Colors.green.shade700,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            elevation: 4,
                          ),
                          child: loading
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                )
                              : Text(
                                  mode == 'login' ? 'Login' : 'Sign Up',
                                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextButton(
                        onPressed: () => setState(() {
                          mode = mode == 'login' ? 'signup' : 'login';
                          err = null;
                          passwordError = null;
                          failedAttempts = 0;
                        }),
                        child: Text(
                          mode == 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Login',
                          style: TextStyle(color: Colors.grey.shade700),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRequirement(String text) {
    return Padding(
      padding: const EdgeInsets.only(top: 2),
      child: Row(
        children: [
          Icon(Icons.check_circle_outline, size: 16, color: Colors.blue.shade700),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              text,
              style: TextStyle(fontSize: 12, color: Colors.blue.shade900),
            ),
          ),
        ],
      ),
    );
  }
}

