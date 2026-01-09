import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { SkeletonLoader } from "../components/SkeletonLoader";
import "./LoansPage.css";

interface LoansPageProps {
  token: string;
}

export function LoansPage({ token }: LoansPageProps) {
  const navigate = useNavigate();
  const api = useEncryptedApiCalls();
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLoans();
  }, []);

  const loadLoans = async () => {
    try {
      const res = await api.fetchLoans(token);
      // #region agent log - H5: Debug loan EMI calculation
      fetch('http://127.0.0.1:7242/ingest/620c30bd-a4ac-4892-8325-a941881cbeee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LoansPage:loadLoans',message:'Loans loaded',data:{loanCount:res.data?.length,sampleLoan:res.data?.[0]},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5-LOAN-EMI'})}).catch(()=>{});
      // #endregion
      setLoans(res.data);
    } catch (e) {
      console.error("Failed to load loans:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="loans-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/dashboard")}>← Back</button>
        <h1>Loans</h1>
        <p className="page-subtitle">Auto-fetched from fixed expenses with category=Loan</p>
      </div>
      {loading ? <SkeletonLoader type="card" count={3} /> : loans.length === 0 ? (
        <div className="empty-state">No loans found. Add a fixed expense with category=Loan to see it here.</div>
      ) : (
        <div className="loans-list">
          {loans.map((loan, index) => (
            <motion.div
              key={loan.id}
              className="loan-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <h3>{loan.name}</h3>
              <div className="loan-details">
                <div className="detail-item">
                  <span className="label">EMI</span>
                  <span className="value">₹{(loan.emi || 0).toLocaleString("en-IN")}/month</span>
                </div>
                <div className="detail-item">
                  <span className="label">Remaining Tenure</span>
                  <span className="value">{loan.remainingTenureMonths || 0} months</span>
                </div>
                <div className="detail-item">
                  <span className="label">Principal</span>
                  <span className="value">₹{(loan.principal || 0).toLocaleString("en-IN")}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

