// Core models aligned with backend/web

enum Frequency { monthly, quarterly, yearly }

class User {
  final String id;
  final String email;
  final String username;
  User({required this.id, required this.email, required this.username});
  factory User.fromJson(Map<String, dynamic> j) =>
      User(id: j["id"], email: j["email"], username: j["username"]);
}

class Income {
  final String id;
  final String source;
  final int amount;
  final String frequency;
  Income({required this.id, required this.source, required this.amount, required this.frequency});
  factory Income.fromJson(Map<String, dynamic> j) =>
      Income(id: j["id"], source: j["source"], amount: j["amount"], frequency: j["frequency"]);
}

class FixedExpense {
  final String id;
  final String name;
  final int amount;
  final String frequency;
  final String category;
  final bool? isSipFlag;
  FixedExpense({required this.id, required this.name, required this.amount, required this.frequency, required this.category, this.isSipFlag});
  factory FixedExpense.fromJson(Map<String, dynamic> j) => FixedExpense(
      id: j["id"], name: j["name"], amount: j["amount"], frequency: j["frequency"], category: j["category"], isSipFlag: j["is_sip_flag"]);
}

class VariablePlan {
  final String id;
  final String name;
  final int planned;
  final int actualTotal;
  final List<VariableActual> actuals;
  VariablePlan({required this.id, required this.name, required this.planned, required this.actualTotal, required this.actuals});
  factory VariablePlan.fromJson(Map<String, dynamic> j) => VariablePlan(
      id: j["id"],
      name: j["name"],
      planned: j["planned"],
      actualTotal: j["actualTotal"] ?? 0,
      actuals: (j["actuals"] as List? ?? []).map((a) => VariableActual.fromJson(a)).toList());
}

class VariableActual {
  final String id;
  final int amount;
  final String incurredAt;
  final String? justification;
  VariableActual({required this.id, required this.amount, required this.incurredAt, this.justification});
  factory VariableActual.fromJson(Map<String, dynamic> j) =>
      VariableActual(id: j["id"], amount: j["amount"], incurredAt: j["incurredAt"], justification: j["justification"]);
}

class Investment {
  final String id;
  final String name;
  final String goal;
  final int monthlyAmount;
  final String status;
  Investment({required this.id, required this.name, required this.goal, required this.monthlyAmount, required this.status});
  factory Investment.fromJson(Map<String, dynamic> j) =>
      Investment(id: j["id"], name: j["name"], goal: j["goal"], monthlyAmount: j["monthlyAmount"], status: j["status"]);
}

class FutureBomb {
  final String id;
  final String name;
  final String dueDate;
  final int monthlyEquivalent;
  final double preparednessRatio;
  FutureBomb({required this.id, required this.name, required this.dueDate, required this.monthlyEquivalent, required this.preparednessRatio});
  factory FutureBomb.fromJson(Map<String, dynamic> j) => FutureBomb(
      id: j["id"],
      name: j["name"],
      dueDate: j["dueDate"],
      monthlyEquivalent: j["monthlyEquivalent"],
      preparednessRatio: (j["preparednessRatio"] as num).toDouble());
}

class CreditCard {
  final String id;
  final String name;
  final String dueDate;
  final int billAmount;
  final int paidAmount;
  CreditCard({required this.id, required this.name, required this.dueDate, required this.billAmount, required this.paidAmount});
  factory CreditCard.fromJson(Map<String, dynamic> j) => CreditCard(
      id: j["id"], name: j["name"], dueDate: j["dueDate"], billAmount: j["billAmount"], paidAmount: j["paidAmount"]);
}

class Loan {
  final String id;
  final String name;
  final int emi;
  final int remainingTenureMonths;
  Loan({required this.id, required this.name, required this.emi, required this.remainingTenureMonths});
  factory Loan.fromJson(Map<String, dynamic> j) =>
      Loan(id: j["id"], name: j["name"], emi: j["emi"], remainingTenureMonths: j["remainingTenureMonths"]);
}

class Alert {
  final String id;
  final String type;
  final String severity;
  final String message;
  Alert({required this.id, required this.type, required this.severity, required this.message});
  factory Alert.fromJson(Map<String, dynamic> j) =>
      Alert(id: j["id"], type: j["type"], severity: j["severity"], message: j["message"]);
}

class Activity {
  final String id;
  final String entity;
  final String action;
  final DateTime createdAt;
  Activity({required this.id, required this.entity, required this.action, required this.createdAt});
  factory Activity.fromJson(Map<String, dynamic> j) =>
      Activity(id: j["id"], entity: j["entity"], action: j["action"], createdAt: DateTime.parse(j["createdAt"]));
}

class ConstraintScore {
  final int score;
  final String tier;
  ConstraintScore({required this.score, required this.tier});
  factory ConstraintScore.fromJson(Map<String, dynamic> j) => ConstraintScore(score: j["score"], tier: j["tier"]);
}

class DashboardData {
  final List<Income> incomes;
  final List<FixedExpense> fixed;
  final List<VariablePlan> variable;
  final List<Investment> investments;
  final List<FutureBomb> futureBombs;
  final ConstraintScore constraint;
  final double remaining;
  final String healthCategory;
  final List<Alert> alerts;
  DashboardData(
      {required this.incomes,
      required this.fixed,
      required this.variable,
      required this.investments,
      required this.futureBombs,
      required this.constraint,
      required this.remaining,
      required this.healthCategory,
      required this.alerts});
  factory DashboardData.fromJson(Map<String, dynamic> j) => DashboardData(
        incomes: (j["incomes"] as List).map((e) => Income.fromJson(e)).toList(),
        fixed: (j["fixedExpenses"] as List).map((e) => FixedExpense.fromJson(e)).toList(),
        variable: (j["variablePlans"] as List).map((e) => VariablePlan.fromJson(e)).toList(),
        investments: (j["investments"] as List).map((e) => Investment.fromJson(e)).toList(),
        futureBombs: (j["futureBombs"] as List).map((e) => FutureBomb.fromJson(e)).toList(),
        constraint: ConstraintScore.fromJson(j["constraintScore"]),
        remaining: (j["health"]["remaining"] as num).toDouble(),
        healthCategory: j["health"]["category"],
        alerts: (j["alerts"] as List).map((e) => Alert.fromJson(e)).toList(),
      );
}

