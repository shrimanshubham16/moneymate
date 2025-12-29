import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaFileExcel, FaCheckCircle, FaLightbulb, FaTable } from "react-icons/fa";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "./ExportPage.css";

interface ExportPageProps {
  token: string;
}

export function ExportPage({ token }: ExportPageProps) {
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null); // Added error state

  const handleExport = async () => { // Renamed function
    setExporting(true);
    setError(null); // Reset error state
    try {
      const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:12022"; // Added BASE_URL
      const response = await fetch(`${BASE_URL}/export/finances`, { // Used BASE_URL
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const data = await response.json(); // Keep this line as the server returns JSON data for client-side XLSX processing

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Summary Sheet with calculations
      const summaryData = [
        ["FinFlow Financial Report"],
        ["Export Date", new Date().toLocaleDateString()],
        ["Username", data.user.username],
        [],
        ["FINANCIAL SUMMARY"],
        ["Total Monthly Income", data.summary.totalIncome],
        ["Total Fixed Expenses", data.summary.totalFixedExpenses],
        ["Total Variable Actual", data.summary.totalVariableActual],
        ["Total Investments", data.summary.totalInvestments],
        ["Net Remaining", data.summary.remainingBalance],
        [],
        ["Health Status", data.summary.healthCategory.toUpperCase()],
        ["Constraint Score", data.constraintScore.score],
        ["Constraint Tier", data.constraintScore.tier.toUpperCase()],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      wsSummary["!cols"] = [{ wch: 25 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

      // Income Sheet
      if (data.incomes && data.incomes.length > 0) {
        const incomeData = data.incomes.map((inc: any) => ({
          Source: inc.source,
          Amount: inc.amount,
          Frequency: inc.frequency,
          "Monthly Equivalent": inc.frequency === "monthly" ? inc.amount : inc.amount / 12
        }));
        const wsIncome = XLSX.utils.json_to_sheet(incomeData);
        wsIncome["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 18 }];
        XLSX.utils.book_append_sheet(wb, wsIncome, "Income");
      }

      // Fixed Expenses Sheet
      if (data.fixedExpenses && data.fixedExpenses.length > 0) {
        const fixedData = data.fixedExpenses.map((exp: any) => ({
          Name: exp.name,
          Amount: exp.amount,
          Frequency: exp.frequency,
          Category: exp.category,
          "Monthly Equivalent": exp.monthlyEquivalent,
          "SIP Enabled": exp.is_sip_flag ? "Yes" : "No"
        }));
        const wsFixed = XLSX.utils.json_to_sheet(fixedData);
        wsFixed["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, wsFixed, "Fixed Expenses");
      }

      // Variable Expenses Sheet
      if (data.variableExpenses && data.variableExpenses.length > 0) {
        const variableData = data.variableExpenses.map((exp: any) => ({
          Name: exp.name,
          Planned: exp.planned,
          Actual: exp.actualTotal,
          Difference: exp.actualTotal - exp.planned,
          "% of Plan": ((exp.actualTotal / exp.planned) * 100).toFixed(1) + "%",
          Category: exp.category,
          Status: exp.actualTotal > exp.planned ? "OVERSPEND" : "OK"
        }));
        const wsVariable = XLSX.utils.json_to_sheet(variableData);
        wsVariable["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, wsVariable, "Variable Expenses");
      }

      // Investments Sheet
      if (data.investments && data.investments.length > 0) {
        const investmentData = data.investments.map((inv: any) => ({
          Name: inv.name,
          Goal: inv.goal,
          "Monthly Amount": inv.monthlyAmount,
          "Annual Amount": inv.monthlyAmount * 12,
          Status: inv.status.toUpperCase()
        }));
        const wsInvestments = XLSX.utils.json_to_sheet(investmentData);
        wsInvestments["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }];
        XLSX.utils.book_append_sheet(wb, wsInvestments, "Investments");
      }

      // Future Bombs Sheet
      if (data.futureBombs && data.futureBombs.length > 0) {
        const bombData = data.futureBombs.map((bomb: any) => ({
          Name: bomb.name,
          "Due Date": new Date(bomb.dueDate).toLocaleDateString(),
          "Total Amount": bomb.totalAmount,
          "Saved Amount": bomb.savedAmount,
          "Remaining": bomb.totalAmount - bomb.savedAmount,
          "Preparedness %": (bomb.preparednessRatio * 100).toFixed(1) + "%",
          "Monthly Target": bomb.monthlyEquivalent
        }));
        const wsBombs = XLSX.utils.json_to_sheet(bombData);
        wsBombs["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, wsBombs, "Future Bombs");
      }

      // Credit Cards Sheet
      if (data.creditCards && data.creditCards.length > 0) {
        const cardData = data.creditCards.map((card: any) => ({
          Name: card.name,
          "Bill Amount": card.billAmount,
          "Paid Amount": card.paidAmount,
          "Remaining": card.billAmount - card.paidAmount,
          "Due Date": new Date(card.dueDate).toLocaleDateString(),
          Status: (card.billAmount - card.paidAmount) === 0 ? "PAID" : "PENDING"
        }));
        const wsCards = XLSX.utils.json_to_sheet(cardData);
        wsCards["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
        XLSX.utils.book_append_sheet(wb, wsCards, "Credit Cards");
      }

      // Loans Sheet
      if (data.loans && data.loans.length > 0) {
        const loanData = data.loans.map((loan: any) => ({
          Name: loan.name,
          Principal: loan.principal,
          "Monthly EMI": loan.emi,
          "Remaining Months": loan.remainingTenureMonths,
          "Total Remaining": loan.emi * loan.remainingTenureMonths
        }));
        const wsLoans = XLSX.utils.json_to_sheet(loanData);
        wsLoans["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
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
          "% of Total": ((amount / data.summary.totalFixedExpenses + data.summary.totalVariableActual) * 100).toFixed(1) + "%"
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
      alert("Export failed: " + e.message);
    } finally {
      setExporting(false);
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

