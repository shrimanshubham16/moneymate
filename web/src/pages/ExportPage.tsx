import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaFileExcel, FaCheckCircle, FaLightbulb, FaTable } from "react-icons/fa";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useAppModal } from "../hooks/useAppModal";
import { AppModalRenderer } from "../components/AppModalRenderer";
import { PageInfoButton } from "../components/PageInfoButton";
import { feedbackStar, feedbackBump } from "../utils/haptics";
import { calculateHealthScore } from "../utils/healthCalculation";
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
  const { modal, showAlert, closeModal, confirmAndClose } = useAppModal();
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only load when in shared view; isSharedView/loadSharingMembers intentionally excluded to avoid re-runs
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
        healthThresholds: dashRes.data.healthThresholds,
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

      // Recalculate variable actuals after decryption (for display)
      const variableExpensesWithActuals = (data.variableExpenses || []).map((exp: any) => {
        const recalcActualTotal = (exp.actuals || []).reduce((sum: number, a: any) => sum + (parseFloat(a.amount) || 0), 0);
        return { ...exp, actualTotal: recalcActualTotal };
      });

      // Use the shared health calculation utility (single source of truth)
      const healthResult = calculateHealthScore({
        incomes: data.incomes || [],
        fixedExpenses: data.fixedExpenses || [],
        variablePlans: variableExpensesWithActuals,
        investments: data.investments || [],
        creditCards: data.creditCards || [],
        futureBombs: data.futureBombs || [],
        sharedAggregates: [],
        healthThresholds: data.healthThresholds,
        currentUserId,
        selectedView: 'me',
      });

      const bd = healthResult.breakdown;
      data.summary = {
        ...data.summary,
        totalIncome: Math.round(bd.totalIncome),
        totalFixedExpenses: Math.round(bd.totalFixed),
        totalVariableActual: Math.round(bd.totalVariable),
        totalInvestments: Math.round(bd.totalInvestments),
        creditCardBill: Math.round(bd.totalCcBill),
        bombDefusalSip: Math.round(bd.bombSip),
        remainingBalance: Math.round(healthResult.remaining || 0),
        healthRemaining: Math.round(healthResult.remaining || 0),
        healthPercentage: Math.round(healthResult.healthPct * 100) / 100,
        healthCategory: healthResult.category,
      };

      data.variableExpenses = variableExpensesWithActuals;
      setStatus("Building workbook...");

      // ── Style Definitions ──
      const brand = { rgb: "0D9488" };
      const headerFill = { fgColor: { rgb: "1E293B" }, patternType: "solid" } as any;
      const headerFont = { bold: true, color: { rgb: "FFFFFF" }, sz: 11 } as any;
      const headerBorder = { bottom: { style: "thin", color: { rgb: "475569" } } } as any;
      const sectionFill = { fgColor: { rgb: "F1F5F9" }, patternType: "solid" } as any;
      const sectionFont = { bold: true, color: { rgb: "1E293B" }, sz: 11 } as any;
      const titleFont = { bold: true, color: { rgb: "0D9488" }, sz: 16 } as any;
      const subtitleFont = { bold: true, color: { rgb: "334155" }, sz: 12 } as any;
      const currFmt = "₹#,##0";
      const pctFmt = "0.0%";
      const labelStyle = { font: { bold: true, color: { rgb: "475569" }, sz: 10 } };
      const positiveStyle = { font: { bold: true, color: { rgb: "10B981" } }, numFmt: currFmt };
      const negativeStyle = { font: { bold: true, color: { rgb: "EF4444" } }, numFmt: currFmt };
      const neutralNum = { numFmt: currFmt };

      const styleHeaders = (ws: any, colCount: number) => {
        for (let c = 0; c < colCount; c++) {
          const ref = XLSX.utils.encode_cell({ r: 0, c });
          if (!ws[ref]) continue;
          ws[ref].s = { fill: headerFill, font: headerFont, border: headerBorder, alignment: { horizontal: "center" } };
        }
      };

      const styleCurrencyCols = (ws: any, cols: number[], rowCount: number) => {
        for (const c of cols) {
          for (let r = 1; r <= rowCount; r++) {
            const ref = XLSX.utils.encode_cell({ r, c });
            if (ws[ref] && typeof ws[ref].v === "number") ws[ref].s = { ...ws[ref].s, numFmt: currFmt };
          }
        }
      };

      const wb = XLSX.utils.book_new();

      // ── Summary Sheet ──
      const s = data.summary;
      const totalOutflow = (s?.totalFixedExpenses || 0) + (s?.totalVariableActual || 0) +
        (s?.totalInvestments || 0) + (s?.creditCardBill || 0) + (s?.bombDefusalSip || 0);
      const summaryRows: any[][] = [
        [isSharedView ? "FinFlow Combined Financial Report" : "FinFlow Financial Report"],
        ["Export Date", new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })],
        isSharedView ? ["View", "Combined (Shared Finances)"] : ["Username", data.user?.username || "User"],
        [],
        ["INCOME"],
        ["Total Monthly Income", s?.totalIncome || 0],
        [],
        ["OUTFLOW BREAKDOWN"],
        ["Fixed Expenses", s?.totalFixedExpenses || 0],
        ["Variable Expenses", s?.totalVariableActual || 0],
        ["Active Investments", s?.totalInvestments || 0],
        ["Credit Card Bills", s?.creditCardBill || 0],
        ["Bomb Defusal SIP", s?.bombDefusalSip || 0],
        ["Total Outflow", totalOutflow],
        [],
        ["HEALTH SCORE"],
        ["Remaining Balance", s?.healthRemaining || 0],
        ["Health %", (s?.healthPercentage || 0) / 100],
        ["Health Status", (s?.healthCategory || "good").toUpperCase()],
        [],
        ["FORMULA"],
        ["Health = Income − (Fixed + max(Prorated, Actual) Variable + Investments + CC Bill + Bomb SIP)"],
        [],
        ["OVERSPEND RISK"],
        ["Score", data.constraintScore?.score || 0],
        ["Tier", (data.constraintScore?.tier || "green").toUpperCase()],
      ];
      if (isSharedView) summaryRows.push([], ["Note: This report includes combined finances from shared members."]);

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      wsSummary["!cols"] = [{ wch: 42 }, { wch: 22 }];
      wsSummary["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

      // Style the title
      if (wsSummary["A1"]) wsSummary["A1"].s = { font: titleFont };
      // Style section headers
      [4, 7, 15, 20, 23].forEach(r => {
        const ref = XLSX.utils.encode_cell({ r, c: 0 });
        if (wsSummary[ref]) wsSummary[ref].s = { font: sectionFont, fill: sectionFill };
        const ref2 = XLSX.utils.encode_cell({ r, c: 1 });
        if (wsSummary[ref2]) wsSummary[ref2].s = { fill: sectionFill };
      });
      // Style labels (left column)
      [1, 2, 5, 8, 9, 10, 11, 12, 13, 16, 17, 18, 24, 25].forEach(r => {
        const ref = XLSX.utils.encode_cell({ r, c: 0 });
        if (wsSummary[ref]) wsSummary[ref].s = { ...wsSummary[ref].s, ...labelStyle };
      });
      // Style currency values
      [5, 8, 9, 10, 11, 12, 16].forEach(r => {
        const ref = XLSX.utils.encode_cell({ r, c: 1 });
        if (wsSummary[ref]) {
          const val = wsSummary[ref].v;
          wsSummary[ref].s = val >= 0 ? positiveStyle : negativeStyle;
        }
      });
      // Total outflow row (bold red)
      const totRef = XLSX.utils.encode_cell({ r: 13, c: 0 });
      if (wsSummary[totRef]) wsSummary[totRef].s = { font: { bold: true, color: { rgb: "1E293B" } } };
      const totVal = XLSX.utils.encode_cell({ r: 13, c: 1 });
      if (wsSummary[totVal]) wsSummary[totVal].s = negativeStyle;
      // Health remaining
      const hrRef = XLSX.utils.encode_cell({ r: 16, c: 1 });
      if (wsSummary[hrRef]) wsSummary[hrRef].s = (s?.healthRemaining || 0) >= 0 ? positiveStyle : negativeStyle;
      // Health %
      const hpRef = XLSX.utils.encode_cell({ r: 17, c: 1 });
      if (wsSummary[hpRef]) wsSummary[hpRef].s = { numFmt: "0.0%" };
      // Formula row
      const fRef = XLSX.utils.encode_cell({ r: 21, c: 0 });
      if (wsSummary[fRef]) wsSummary[fRef].s = { font: { italic: true, color: { rgb: "64748B" }, sz: 9 } };

      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

      // ── Helper: create a styled data sheet ──
      const addDataSheet = (name: string, rows: any[], colWidths: number[], currencyCols: number[]) => {
        if (!rows.length) return;
        const ws = XLSX.utils.json_to_sheet(rows);
        ws["!cols"] = colWidths.map(w => ({ wch: w }));
        styleHeaders(ws, colWidths.length);
        styleCurrencyCols(ws, currencyCols, rows.length);
        XLSX.utils.book_append_sheet(wb, ws, name);
      };

      // ── Income Sheet ──
      const incomeRows = (data.incomes || []).map((inc: any) => {
        const amount = parseFloat(inc.amount) || 0;
        const row: any = {
          Source: inc.source || inc.name || '[No Source]',
          Amount: amount,
          Frequency: inc.frequency || 'monthly',
          "Monthly Eq.": inc.frequency === "monthly" ? amount : inc.frequency === "quarterly" ? amount / 3 : amount / 12
        };
        if (isSharedView) row.Owner = getOwnerName(inc.userId || inc.user_id);
        return row;
      });
      addDataSheet("Income", incomeRows, isSharedView ? [22, 14, 12, 14, 14] : [22, 14, 12, 14], [1, 3]);

      // ── Fixed Expenses Sheet ──
      const fixedRows = (data.fixedExpenses || []).map((exp: any) => {
        const amount = parseFloat(exp.amount) || 0;
        const row: any = {
          Name: exp.name || '[No Name]',
          Amount: amount,
          Frequency: exp.frequency || 'monthly',
          Category: exp.category || '',
          "Monthly Eq.": exp.frequency === 'monthly' ? amount : exp.frequency === 'quarterly' ? amount / 3 : amount / 12,
          Type: (exp.is_sip_flag || exp.is_sip) ? "SIP" : "Fixed"
        };
        if (isSharedView) row.Owner = getOwnerName(exp.userId || exp.user_id);
        return row;
      });
      addDataSheet("Fixed Expenses", fixedRows, isSharedView ? [22, 14, 12, 14, 14, 8, 14] : [22, 14, 12, 14, 14, 8], [1, 4]);

      // ── Variable Expenses Sheet ──
      const variableRows = (data.variableExpenses || []).map((exp: any) => {
        const planned = parseFloat(exp.planned) || 0;
        const actualTotal = parseFloat(exp.actualTotal) || 0;
        const diff = actualTotal - planned;
        const row: any = {
          Name: exp.name || '[No Name]',
          Planned: planned,
          Actual: actualTotal,
          Difference: diff,
          "% Used": planned > 0 ? actualTotal / planned : 0,
          Category: exp.category || '',
          Status: actualTotal > planned ? "OVERSPEND" : "OK"
        };
        if (isSharedView) row.Owner = getOwnerName(exp.userId || exp.user_id);
        return row;
      });
      if (variableRows.length > 0) {
        const ws = XLSX.utils.json_to_sheet(variableRows);
        const cols = isSharedView ? [22, 14, 14, 14, 10, 14, 12, 14] : [22, 14, 14, 14, 10, 14, 12];
        ws["!cols"] = cols.map(w => ({ wch: w }));
        styleHeaders(ws, cols.length);
        styleCurrencyCols(ws, [1, 2, 3], variableRows.length);
        // Format % column and status
        for (let r = 1; r <= variableRows.length; r++) {
          const pctRef = XLSX.utils.encode_cell({ r, c: 4 });
          if (ws[pctRef]) ws[pctRef].s = { numFmt: pctFmt };
          const statusRef = XLSX.utils.encode_cell({ r, c: 6 });
          if (ws[statusRef]?.v === "OVERSPEND") {
            ws[statusRef].s = { font: { bold: true, color: { rgb: "EF4444" } }, alignment: { horizontal: "center" } };
          } else if (ws[statusRef]) {
            ws[statusRef].s = { font: { color: { rgb: "10B981" } }, alignment: { horizontal: "center" } };
          }
        }
        XLSX.utils.book_append_sheet(wb, ws, "Variable Expenses");
      }

      // ── Investments Sheet ──
      const investRows = (data.investments || []).map((inv: any) => {
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
      addDataSheet("Investments", investRows, isSharedView ? [22, 18, 14, 14, 10, 14] : [22, 18, 14, 14, 10], [2, 3]);

      // ── Future Bombs Sheet ──
      const bombRows = (data.futureBombs || []).map((bomb: any) => {
        const totalAmount = parseFloat(bomb.totalAmount || bomb.total_amount) || 0;
        const savedAmount = parseFloat(bomb.savedAmount || bomb.saved_amount) || 0;
        const remaining = totalAmount - savedAmount;
        const row: any = {
          Name: bomb.name || '[No Name]',
          "Due Date": bomb.dueDate || bomb.due_date ? new Date(bomb.dueDate || bomb.due_date).toLocaleDateString() : 'N/A',
          "Total": totalAmount,
          "Saved": savedAmount,
          "Remaining": remaining,
          "Ready %": totalAmount > 0 ? savedAmount / totalAmount : 0,
        };
        if (isSharedView) row.Owner = getOwnerName(bomb.userId || bomb.user_id);
        return row;
      });
      if (bombRows.length > 0) {
        const ws = XLSX.utils.json_to_sheet(bombRows);
        const cols = isSharedView ? [22, 12, 14, 14, 14, 10, 14] : [22, 12, 14, 14, 14, 10];
        ws["!cols"] = cols.map(w => ({ wch: w }));
        styleHeaders(ws, cols.length);
        styleCurrencyCols(ws, [2, 3, 4], bombRows.length);
        for (let r = 1; r <= bombRows.length; r++) {
          const pRef = XLSX.utils.encode_cell({ r, c: 5 });
          if (ws[pRef]) ws[pRef].s = { numFmt: pctFmt };
        }
        XLSX.utils.book_append_sheet(wb, ws, "Future Bombs");
      }

      // ── Credit Cards Sheet ──
      const cardRows = (data.creditCards || []).map((card: any) => {
        const billAmount = parseFloat(card.billAmount || card.bill_amount) || 0;
        const paidAmount = parseFloat(card.paidAmount || card.paid_amount) || 0;
        const remaining = billAmount - paidAmount;
        const row: any = {
          Name: card.name || '[No Name]',
          "Bill Amount": billAmount,
          "Paid": paidAmount,
          "Remaining": remaining,
          Status: remaining <= 0 ? "PAID" : "PENDING"
        };
        if (isSharedView) row.Owner = getOwnerName(card.userId || card.user_id);
        return row;
      });
      if (cardRows.length > 0) {
        const ws = XLSX.utils.json_to_sheet(cardRows);
        const cols = isSharedView ? [22, 14, 14, 14, 10, 14] : [22, 14, 14, 14, 10];
        ws["!cols"] = cols.map(w => ({ wch: w }));
        styleHeaders(ws, cols.length);
        styleCurrencyCols(ws, [1, 2, 3], cardRows.length);
        for (let r = 1; r <= cardRows.length; r++) {
          const stRef = XLSX.utils.encode_cell({ r, c: 4 });
          if (ws[stRef]?.v === "PAID") {
            ws[stRef].s = { font: { bold: true, color: { rgb: "10B981" } }, alignment: { horizontal: "center" } };
          } else if (ws[stRef]) {
            ws[stRef].s = { font: { bold: true, color: { rgb: "F59E0B" } }, alignment: { horizontal: "center" } };
          }
        }
        XLSX.utils.book_append_sheet(wb, ws, "Credit Cards");
      }

      // ── Loans Sheet ──
      const loanRows = (data.loans || []).map((loan: any) => {
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
      addDataSheet("Loans", loanRows, isSharedView ? [22, 14, 14, 16, 16, 14] : [22, 14, 14, 16, 16], [1, 2, 4]);

      // ── Category Breakdown Sheet ──
      const categoryMap = new Map<string, number>();
      data.fixedExpenses?.forEach((exp: any) => {
        const cat = exp.category || 'Uncategorized';
        const amount = parseFloat(exp.amount) || 0;
        const monthly = exp.frequency === 'monthly' ? amount : exp.frequency === 'quarterly' ? amount / 3 : amount / 12;
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + monthly);
      });
      data.variableExpenses?.forEach((exp: any) => {
        const cat = exp.category || 'Uncategorized';
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + (parseFloat(exp.actualTotal) || 0));
      });

      const totalCategorySpend = Array.from(categoryMap.values()).reduce((sum, v) => sum + v, 0);
      if (categoryMap.size > 0) {
        const catRows = Array.from(categoryMap.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([category, amount]) => ({
            Category: category || 'Uncategorized',
            "Total Spend": Math.round(amount),
            "% of Total": totalCategorySpend > 0 ? amount / totalCategorySpend : 0
          }));
        const ws = XLSX.utils.json_to_sheet(catRows);
        ws["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 12 }];
        styleHeaders(ws, 3);
        styleCurrencyCols(ws, [1], catRows.length);
        for (let r = 1; r <= catRows.length; r++) {
          const pRef = XLSX.utils.encode_cell({ r, c: 2 });
          if (ws[pRef]) ws[pRef].s = { numFmt: pctFmt };
        }
        XLSX.utils.book_append_sheet(wb, ws, "Category Breakdown");
      }

      // Write file
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      saveAs(blob, `finflow-export-${new Date().toISOString().split('T')[0]}.xlsx`);

      feedbackStar();
      showAlert("Excel export successful! Check your downloads folder.", "Success");
    } catch (e: any) {
      feedbackBump();
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
        <h1>
          Export Finances
          <PageInfoButton
            title="Export Your Data"
            description="Download your entire financial picture as a professional Excel spreadsheet — perfect for sharing with a financial advisor, backing up your data, or doing custom analysis in Excel or Google Sheets."
            impact="Your data is encrypted on our servers. The export decrypts it on your device and packages everything into a clean, organised workbook. Nothing leaves your device unencrypted."
            howItWorks={[
              "Click Export to download a .xlsx file with multiple sheets",
              "Sheets include: Summary, Income, Fixed Expenses, Variable Expenses, Investments, Credit Cards, Loans, Future Bombs, and Category Breakdown",
              "In shared view, each row shows the owner so you can see combined data",
              "Health score is recalculated from your decrypted data for accuracy"
            ]}
          />
        </h1>
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
      <AppModalRenderer modal={modal} closeModal={closeModal} confirmAndClose={confirmAndClose} />
    </div>
  );
}
