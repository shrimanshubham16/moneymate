import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaFileExcel, FaCheckCircle, FaLightbulb, FaTable } from "react-icons/fa";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import "./ExportPage.css";

interface ExportPageProps {
  token: string;
}

// Helper to extract user ID from JWT token
function getUserIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Token may use 'userId' (camelCase), 'user_id' (snake_case), or 'sub'
    return payload.userId || payload.user_id || payload.sub || null;
  } catch {
    return null;
  }
}

export function ExportPage({ token }: ExportPageProps) {
  const navigate = useNavigate();
  const api = useEncryptedApiCalls();
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [sharingMembers, setSharingMembers] = useState<any[]>([]);

  // Get current user ID and selected view for sharing
  const currentUserId = useMemo(() => getUserIdFromToken(token), [token]);
  const selectedView = localStorage.getItem('finflow_selected_view') || 'me';
  const isSharedView = selectedView !== 'me';

  useEffect(() => {
    if (isSharedView) {
      loadSharingMembers();
    }
  }, []);

  const loadSharingMembers = async () => {
    try {
      const res = await api.fetchSharingMembers(token);
      setSharingMembers(res.data?.members || []);
    } catch (e) {
      console.error("Failed to load sharing members:", e);
    }
  };

  // Helper to get owner name for shared items
  const getOwnerName = (itemUserId: string): string => {
    if (itemUserId === currentUserId) return "You";
    const member = sharingMembers.find((m: any) => m.userId === itemUserId);
    return member?.username || "Shared User";
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setStatus(isSharedView ? "Fetching combined finances..." : "Preparing your export (decrypting data)...");
    try {
      // ALWAYS use Dashboard data for health calculation (has `paid` field)
      // Export endpoint doesn't include paid status, so dashboard is required for accurate health score
      let data: any;
      const viewParam = isSharedView ? selectedView : undefined;
      const dashRes = await api.fetchDashboard(token, new Date().toISOString(), viewParam);
      data = {
        incomes: dashRes.data.incomes || [],
        fixedExpenses: dashRes.data.fixedExpenses || [],
        variableExpenses: dashRes.data.variablePlans || [],
        investments: dashRes.data.investments || [],
        futureBombs: dashRes.data.futureBombs || [],
        creditCards: [],
        loans: [],
        constraintScore: dashRes.data.constraintScore,
        user: dashRes.data.user
      };
      // Fetch credit cards and loans separately
      try {
        const cardsRes = await api.fetchCreditCards(token);
        data.creditCards = cardsRes.data || [];
      } catch {}
      try {
        const loansRes = await api.fetchLoans(token);
        data.loans = loansRes.data || [];
      } catch {}

      // Recalculate totals after decryption - MATCHING HEALTH PAGE LOGIC
      const recalcTotalIncome = (data.incomes || []).reduce((sum: number, i: any) => {
        const amount = parseFloat(i.amount) || 0;
        const monthly = i.frequency === 'monthly' ? amount : i.frequency === 'quarterly' ? amount / 3 : amount / 12;
        return sum + monthly;
      }, 0);
      
      // Only count UNPAID fixed expenses (matching health page)
      const recalcTotalFixed = (data.fixedExpenses || []).reduce((sum: number, e: any) => {
        if (e.paid) return sum; // Skip paid expenses
        const amount = parseFloat(e.amount) || 0;
        const monthly = e.frequency === 'monthly' ? amount : e.frequency === 'quarterly' ? amount / 3 : amount / 12;
        return sum + monthly;
      }, 0);
      
      // All fixed for display (both paid and unpaid)
      const totalFixedForDisplay = (data.fixedExpenses || []).reduce((sum: number, e: any) => {
        const amount = parseFloat(e.amount) || 0;
        const monthly = e.frequency === 'monthly' ? amount : e.frequency === 'quarterly' ? amount / 3 : amount / 12;
        return sum + monthly;
      }, 0);
      
      // Recalculate variable actuals after decryption
      const variableExpensesWithActuals = (data.variableExpenses || []).map((exp: any) => {
        const recalcActualTotal = (exp.actuals || []).reduce((sum: number, a: any) => sum + (parseFloat(a.amount) || 0), 0);
        return { ...exp, actualTotal: recalcActualTotal };
      });
      
      // Variable: use max of actual vs prorated planned (matching health page EXACTLY)
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const daysPassed = today.getDate();
      const monthProgress = daysPassed / daysInMonth;
      const remainingDaysRatio = 1 - monthProgress; // FIXED: Use REMAINING ratio, not passed ratio
      
      const recalcTotalVariableActual = variableExpensesWithActuals.reduce((sum: number, e: any) => {
        const actual = e.actualTotal || 0;
        const planned = parseFloat(e.planned) || 0;
        const prorated = planned * remainingDaysRatio;
        return sum + Math.max(actual, prorated);
      }, 0);
      
      // Only count UNPAID active investments (matching health page)
      const recalcTotalInvestments = (data.investments || []).reduce((sum: number, inv: any) => {
        if (inv.paid || inv.status === 'paused') return sum; // Skip paid or paused
        return sum + (parseFloat(inv.monthlyAmount || inv.monthly_amount) || 0);
      }, 0);
      
      // All investments for display
      const totalInvestmentsForDisplay = (data.investments || []).reduce((sum: number, inv: any) => {
        return sum + (parseFloat(inv.monthlyAmount || inv.monthly_amount) || 0);
      }, 0);
      
      // Credit card dues (matching health page)
      const creditCardDues = (data.creditCards || []).reduce((sum: number, c: any) => {
        const bill = parseFloat(c.billAmount || c.bill_amount) || 0;
        const paid = parseFloat(c.paidAmount || c.paid_amount) || 0;
        return sum + Math.max(0, bill - paid);
      }, 0);
      
      // Health score calculation (matching health page exactly)
      const healthRemaining = recalcTotalIncome - (recalcTotalFixed + recalcTotalVariableActual + recalcTotalInvestments + creditCardDues);
      
      // For backward compatibility - simple remaining without credit cards
      const recalcRemaining = recalcTotalIncome - (totalFixedForDisplay + recalcTotalVariableActual + totalInvestmentsForDisplay);
      
      
      // Determine health category (matching health page thresholds)
      let healthCategory: string;
      if (healthRemaining > 10000) healthCategory = "good";
      else if (healthRemaining >= 0) healthCategory = "ok";
      else if (healthRemaining >= -3000) healthCategory = "not_well";
      else healthCategory = "worrisome";
      
      // Update summary with recalculated values
      data.summary = {
        ...data.summary,
        totalIncome: recalcTotalIncome,
        totalFixedExpenses: totalFixedForDisplay,
        unpaidFixedExpenses: recalcTotalFixed,
        totalVariableActual: recalcTotalVariableActual,
        totalInvestments: totalInvestmentsForDisplay,
        unpaidInvestments: recalcTotalInvestments,
        creditCardDues: creditCardDues,
        remainingBalance: Math.round(recalcRemaining),
        healthScore: Math.round(healthRemaining), // Always integer
        healthCategory: healthCategory,
      };
      
      // Use recalculated variable expenses
      data.variableExpenses = variableExpensesWithActuals;
      setStatus("Building workbook...");

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Summary Sheet with calculations matching health page
      const summaryData = [
        [isSharedView ? "FinFlow Combined Financial Report" : "FinFlow Financial Report"],
        ["Export Date", new Date().toLocaleDateString()],
        isSharedView ? ["View", "Combined (Shared Finances)"] : ["Username", data.user?.username || "User"],
        [],
        ["FINANCIAL SUMMARY"],
        ["Total Monthly Income", data.summary?.totalIncome],
        [],
        ["OUTFLOW BREAKDOWN"],
        ["Fixed Expenses (Total)", data.summary?.totalFixedExpenses],
        ["Fixed Expenses (Unpaid)", data.summary?.unpaidFixedExpenses],
        ["Variable Expenses (Prorated)", data.summary?.totalVariableActual],
        ["Investments (Total)", data.summary?.totalInvestments],
        ["Investments (Unpaid)", data.summary?.unpaidInvestments],
        ["Credit Card Dues", data.summary?.creditCardDues],
        [],
        ["HEALTH SCORE (Matching /health page)"],
        ["Health Score", data.summary?.healthScore],
        ["Health Status", (data.summary?.healthCategory || "good").toUpperCase()],
        ["Note", "Health = Income - (Unpaid Fixed + Prorated Variable + Unpaid Investments + CC Dues)"],
        [],
        ["CONSTRAINT SCORE"],
        ["Score", data.constraintScore?.score || 0],
        ["Tier", (data.constraintScore?.tier || "green").toUpperCase()],
      ];
      if (isSharedView) {
        summaryData.push([], ["Note: This report includes combined finances from shared members."]);
      }
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      wsSummary["!cols"] = [{ wch: 25 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

      // Income Sheet (with Owner column for shared views)
      if (data.incomes && data.incomes.length > 0) {
        const incomeData = data.incomes.map((inc: any) => {
          const amount = parseFloat(inc.amount) || 0;
          const row: any = {
            Source: inc.source || inc.name || '[No Source]',
            Amount: amount,
            Frequency: inc.frequency || 'monthly',
            "Monthly Equivalent": inc.frequency === "monthly" ? amount : inc.frequency === "quarterly" ? amount / 3 : amount / 12
          };
          if (isSharedView) row.Owner = getOwnerName(inc.userId || inc.user_id);
          return row;
        });
        const wsIncome = XLSX.utils.json_to_sheet(incomeData);
        wsIncome["!cols"] = isSharedView 
          ? [{ wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 15 }]
          : [{ wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 18 }];
        XLSX.utils.book_append_sheet(wb, wsIncome, "Income");
      }

      // Fixed Expenses Sheet (with Owner column for shared views)
      if (data.fixedExpenses && data.fixedExpenses.length > 0) {
        const fixedData = data.fixedExpenses.map((exp: any) => {
          const amount = parseFloat(exp.amount) || 0;
          const monthlyEquiv = exp.frequency === 'monthly' ? amount : exp.frequency === 'quarterly' ? amount / 3 : amount / 12;
          const row: any = {
            Name: exp.name || '[No Name]',
            Amount: amount,
            Frequency: exp.frequency || 'monthly',
            Category: exp.category || '',
            "Monthly Equivalent": monthlyEquiv,
            "SIP Enabled": (exp.is_sip_flag || exp.is_sip) ? "Yes" : "No"
          };
          if (isSharedView) row.Owner = getOwnerName(exp.userId || exp.user_id);
          return row;
        });
        const wsFixed = XLSX.utils.json_to_sheet(fixedData);
        wsFixed["!cols"] = isSharedView
          ? [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 15 }]
          : [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, wsFixed, "Fixed Expenses");
      }

      // Variable Expenses Sheet (with Owner column for shared views)
      if (data.variableExpenses && data.variableExpenses.length > 0) {
        const variableData = data.variableExpenses.map((exp: any) => {
          const planned = parseFloat(exp.planned) || 0;
          const actualTotal = parseFloat(exp.actualTotal) || 0;
          const diff = actualTotal - planned;
          const pctOfPlan = planned > 0 ? ((actualTotal / planned) * 100).toFixed(1) + "%" : "N/A";
          const row: any = {
            Name: exp.name || '[No Name]',
            Planned: planned,
            Actual: actualTotal,
            Difference: diff,
            "% of Plan": pctOfPlan,
            Category: exp.category || '',
            Status: actualTotal > planned ? "OVERSPEND" : "OK"
          };
          if (isSharedView) row.Owner = getOwnerName(exp.userId || exp.user_id);
          return row;
        });
        const wsVariable = XLSX.utils.json_to_sheet(variableData);
        wsVariable["!cols"] = isSharedView
          ? [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 }]
          : [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, wsVariable, "Variable Expenses");
      }

      // Investments Sheet (with Owner column for shared views)
      if (data.investments && data.investments.length > 0) {
        const investmentData = data.investments.map((inv: any) => {
          const monthlyAmt = parseFloat(inv.monthlyAmount || inv.monthly_amount) || 0;
          const row: any = {
            Name: inv.name || '[No Name]',
            Goal: inv.goal || '',
            "Monthly Amount": monthlyAmt,
            "Annual Amount": monthlyAmt * 12,
            Status: (inv.status || 'active').toUpperCase()
          };
          if (isSharedView) row.Owner = getOwnerName(inv.userId || inv.user_id);
          return row;
        });
        const wsInvestments = XLSX.utils.json_to_sheet(investmentData);
        wsInvestments["!cols"] = isSharedView
          ? [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }]
          : [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }];
        XLSX.utils.book_append_sheet(wb, wsInvestments, "Investments");
      }

      // Future Bombs Sheet (with Owner column for shared views)
      if (data.futureBombs && data.futureBombs.length > 0) {
        const bombData = data.futureBombs.map((bomb: any) => {
          const totalAmount = parseFloat(bomb.totalAmount || bomb.total_amount) || 0;
          const savedAmount = parseFloat(bomb.savedAmount || bomb.saved_amount) || 0;
          const remaining = totalAmount - savedAmount;
          const prepRatio = totalAmount > 0 ? (savedAmount / totalAmount) : 0;
          const row: any = {
            Name: bomb.name || '[No Name]',
            "Due Date": bomb.dueDate || bomb.due_date ? new Date(bomb.dueDate || bomb.due_date).toLocaleDateString() : 'N/A',
            "Total Amount": totalAmount,
            "Saved Amount": savedAmount,
            "Remaining": remaining,
            "Preparedness %": (prepRatio * 100).toFixed(1) + "%",
            "Monthly Target": parseFloat(bomb.monthlyEquivalent || bomb.monthly_equivalent) || 0
          };
          if (isSharedView) row.Owner = getOwnerName(bomb.userId || bomb.user_id);
          return row;
        });
        const wsBombs = XLSX.utils.json_to_sheet(bombData);
        wsBombs["!cols"] = isSharedView
          ? [{ wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }]
          : [{ wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, wsBombs, "Future Bombs");
      }

      // Credit Cards Sheet
      if (data.creditCards && data.creditCards.length > 0) {
        const cardData = data.creditCards.map((card: any) => {
          const billAmount = parseFloat(card.billAmount || card.bill_amount) || 0;
          const paidAmount = parseFloat(card.paidAmount || card.paid_amount) || 0;
          const remaining = billAmount - paidAmount;
          const row: any = {
            Name: card.name || '[No Name]',
            "Bill Amount": billAmount,
            "Paid Amount": paidAmount,
            "Remaining": remaining,
            "Due Date": card.dueDate || card.due_date ? new Date(card.dueDate || card.due_date).toLocaleDateString() : 'N/A',
            Status: remaining === 0 ? "PAID" : "PENDING"
          };
          if (isSharedView) row.Owner = getOwnerName(card.userId || card.user_id);
          return row;
        });
        const wsCards = XLSX.utils.json_to_sheet(cardData);
        wsCards["!cols"] = isSharedView
          ? [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 15 }]
          : [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
        XLSX.utils.book_append_sheet(wb, wsCards, "Credit Cards");
      }

      // Loans Sheet (with Owner column for shared views)
      if (data.loans && data.loans.length > 0) {
        const loanData = data.loans.map((loan: any) => {
          const row: any = {
            Name: loan.name,
            Principal: loan.principal,
            "Monthly EMI": loan.emi,
            "Remaining Months": loan.remainingTenureMonths,
            "Total Remaining": loan.emi * loan.remainingTenureMonths
          };
          if (isSharedView) row.Owner = getOwnerName(loan.userId || loan.user_id);
          return row;
        });
        const wsLoans = XLSX.utils.json_to_sheet(loanData);
        wsLoans["!cols"] = isSharedView
          ? [{ wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }]
          : [{ wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, wsLoans, "Loans");
      }

      // Category-wise Breakdown Sheet
      const categoryMap = new Map<string, number>();
      data.fixedExpenses?.forEach((exp: any) => {
        const current = categoryMap.get(exp.category) || 0;
        categoryMap.set(exp.category, current + exp.monthlyEquivalent);
      });
      data.variableExpenses?.forEach((exp: any) => {
        const current = categoryMap.get(exp.category) || 0;
        categoryMap.set(exp.category, current + exp.actualTotal);
      });

      if (categoryMap.size > 0) {
        const categoryData = Array.from(categoryMap.entries()).map(([category, amount]) => ({
          Category: category,
          "Total Spend": amount,
          "% of Total": (((amount) / Math.max(1, data.summary.totalFixedExpenses + data.summary.totalVariableActual)) * 100).toFixed(1) + "%"
        }));
        const wsCategory = XLSX.utils.json_to_sheet(categoryData);
        wsCategory["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, wsCategory, "Category Breakdown");
      }

      // Write file
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      saveAs(blob, `finflow-export-${new Date().toISOString().split('T')[0]}.xlsx`);

      alert("Excel export successful! Check your downloads folder.");
    } catch (e: any) {
      setError(e.message || "Export failed");
    } finally {
      setExporting(false);
      setStatus(null);
    }
  };

  return (
    <div className="export-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/dashboard")}>← Back</button>
        <h1>Export Finances</h1>
      </div>

      <motion.div
        className="export-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="export-card">
          <div className="export-icon"><FaFileExcel size={80} color="#10b981" /></div>
          <h2>Export Your Complete Financial Data</h2>
          <p>
            Download a comprehensive Excel file with charts and analysis containing all your financial data including:
          </p>
          <ul className="export-features">
            <li><FaCheckCircle style={{ marginRight: '8px', color: '#10b981' }} />Income sources</li>
            <li><FaCheckCircle style={{ marginRight: '8px', color: '#10b981' }} />Fixed and variable expenses</li>
            <li><FaCheckCircle style={{ marginRight: '8px', color: '#10b981' }} />Investments and goals</li>
            <li><FaCheckCircle style={{ marginRight: '8px', color: '#10b981' }} />Credit cards and loans</li>
            <li><FaCheckCircle style={{ marginRight: '8px', color: '#10b981' }} />Future bombs and preparedness</li>
            <li><FaCheckCircle style={{ marginRight: '8px', color: '#10b981' }} />Activity log (last 50 entries)</li>
            <li><FaCheckCircle style={{ marginRight: '8px', color: '#10b981' }} />Health and constraint scores</li>
            <li><FaCheckCircle style={{ marginRight: '8px', color: '#10b981' }} />Alerts and notifications</li>
            <li><FaCheckCircle style={{ marginRight: '8px', color: '#10b981' }} />Financial summary with calculations</li>
          </ul>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="export-button"
          >
            <FaFileExcel style={{ marginRight: '8px' }} />
            {exporting ? "Exporting..." : "Export to Excel"}
          </button>
          {status && <div className="export-status">{status}</div>}
          {error && <div className="export-error">Export failed: {error}</div>}

          <div className="export-info">
            <h3><FaLightbulb style={{ marginRight: '8px', color: '#f59e0b' }} />What can you do with the export?</h3>
            <ul>
              <li><strong>Backup:</strong> Keep a backup of your financial data</li>
              <li><strong>Analysis:</strong> Import into Excel/Google Sheets for custom analysis</li>
              <li><strong>Migration:</strong> Transfer data to another system</li>
              <li><strong>Sharing:</strong> Share with financial advisors or accountants</li>
              <li><strong>Archiving:</strong> Keep historical records for tax purposes</li>
            </ul>
          </div>

          <div className="export-format">
            <h3><FaTable style={{ marginRight: '8px', color: '#3b82f6' }} />Export Format</h3>
            <p>
              The export is in Excel (.xlsx) format with:
            </p>
            <ul>
              <li><FaCheckCircle style={{ marginRight: '8px', color: '#10b981' }} />Multiple sheets for each category</li>
              <li><FaCheckCircle style={{ marginRight: '8px', color: '#10b981' }} />Automatic calculations and formulas</li>
              <li><FaCheckCircle style={{ marginRight: '8px', color: '#10b981' }} />Category-wise breakdown analysis</li>
              <li><FaCheckCircle style={{ marginRight: '8px', color: '#10b981' }} />Formatted tables with proper columns</li>
              <li><FaCheckCircle style={{ marginRight: '8px', color: '#10b981' }} />Summary sheet with key metrics</li>
              <li><FaCheckCircle style={{ marginRight: '8px', color: '#10b981' }} />Ready for charts and pivot tables</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

