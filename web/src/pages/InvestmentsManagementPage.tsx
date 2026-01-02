import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaEdit, FaPause, FaPlay, FaTrashAlt, FaWallet } from "react-icons/fa";
import { fetchDashboard, createInvestment, updateInvestment, deleteInvestment, pauseInvestment, resumeInvestment } from "../api";
import { SkeletonLoader } from "../components/SkeletonLoader";
import "./InvestmentsManagementPage.css";

interface InvestmentsManagementPageProps {
  token: string;
}

export function InvestmentsManagementPage({ token }: InvestmentsManagementPageProps) {
  const navigate = useNavigate();
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    goal: "",
    monthlyAmount: "",
    status: "active" as "active" | "paused"
  });

  useEffect(() => {
    loadInvestments();
  }, []);

  const loadInvestments = async () => {
    try {
      const res = await fetchDashboard(token, "2025-01-15T00:00:00Z");
      setInvestments(res.data.investments || []);
    } catch (e) {
      console.error("Failed to load investments:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/620c30bd-a4ac-4892-8325-a941881cbeee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvestmentsManagementPage.tsx:41',message:'handleSubmit started',data:{editingId,formData},timestamp:Date.now(),sessionId:'debug-session',runId:'invest-create',hypothesisId:'C'}}).catch(()=>{});
    // #endregion
    try {
      if (editingId) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/620c30bd-a4ac-4892-8325-a941881cbeee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvestmentsManagementPage.tsx:45',message:'Calling updateInvestment',data:{editingId,payload:{name:formData.name,goal:formData.goal,monthlyAmount:Number(formData.monthlyAmount),status:formData.status}},timestamp:Date.now(),sessionId:'debug-session',runId:'invest-update',hypothesisId:'A'}}).catch(()=>{});
        // #endregion
        await updateInvestment(token, editingId, {
          name: formData.name,
          goal: formData.goal,
          monthlyAmount: Number(formData.monthlyAmount),
          status: formData.status
        });
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/620c30bd-a4ac-4892-8325-a941881cbeee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvestmentsManagementPage.tsx:52',message:'updateInvestment succeeded',data:{editingId},timestamp:Date.now(),sessionId:'debug-session',runId:'invest-update',hypothesisId:'A'}}).catch(()=>{});
        // #endregion
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/620c30bd-a4ac-4892-8325-a941881cbeee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvestmentsManagementPage.tsx:55',message:'Calling createInvestment',data:{payload:{name:formData.name,goal:formData.goal,monthlyAmount:Number(formData.monthlyAmount),status:formData.status}},timestamp:Date.now(),sessionId:'debug-session',runId:'invest-create',hypothesisId:'C'}}).catch(()=>{});
        // #endregion
        await createInvestment(token, {
          name: formData.name,
          goal: formData.goal,
          monthlyAmount: Number(formData.monthlyAmount),
          status: formData.status
        });
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/620c30bd-a4ac-4892-8325-a941881cbeee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvestmentsManagementPage.tsx:62',message:'createInvestment succeeded',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'invest-create',hypothesisId:'C'}}).catch(()=>{});
        // #endregion
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: "", goal: "", monthlyAmount: "", status: "active" });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/620c30bd-a4ac-4892-8325-a941881cbeee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvestmentsManagementPage.tsx:66',message:'Calling loadInvestments after create/update',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'invest-create',hypothesisId:'C'}}).catch(()=>{});
      // #endregion
      await loadInvestments();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/620c30bd-a4ac-4892-8325-a941881cbeee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvestmentsManagementPage.tsx:68',message:'loadInvestments completed',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'invest-create',hypothesisId:'C'}}).catch(()=>{});
      // #endregion
    } catch (e: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/620c30bd-a4ac-4892-8325-a941881cbeee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvestmentsManagementPage.tsx:69',message:'handleSubmit error',data:{error:e?.message,stack:e?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'invest-create',hypothesisId:'C'}}).catch(()=>{});
      // #endregion
      alert(e.message);
    }
  };

  const handleEdit = (investment: any) => {
    setEditingId(investment.id);
    setFormData({
      name: investment.name,
      goal: investment.goal,
      monthlyAmount: investment.monthlyAmount.toString(),
      status: investment.status
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this investment?")) return;
    try {
      await deleteInvestment(token, id);
      await loadInvestments();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleTogglePause = async (inv: any) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/620c30bd-a4ac-4892-8325-a941881cbeee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvestmentsManagementPage.tsx:89',message:'handleTogglePause started',data:{invId:inv.id,currentStatus:inv.status},timestamp:Date.now(),sessionId:'debug-session',runId:'invest-pause',hypothesisId:'A'}}).catch(()=>{});
    // #endregion
    try {
      if (inv.status === "active") {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/620c30bd-a4ac-4892-8325-a941881cbeee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvestmentsManagementPage.tsx:92',message:'Calling pauseInvestment',data:{invId:inv.id},timestamp:Date.now(),sessionId:'debug-session',runId:'invest-pause',hypothesisId:'A'}}).catch(()=>{});
        // #endregion
        await pauseInvestment(token, inv.id);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/620c30bd-a4ac-4892-8325-a941881cbeee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvestmentsManagementPage.tsx:94',message:'pauseInvestment succeeded',data:{invId:inv.id},timestamp:Date.now(),sessionId:'debug-session',runId:'invest-pause',hypothesisId:'A'}}).catch(()=>{});
        // #endregion
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/620c30bd-a4ac-4892-8325-a941881cbeee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvestmentsManagementPage.tsx:96',message:'Calling resumeInvestment',data:{invId:inv.id},timestamp:Date.now(),sessionId:'debug-session',runId:'invest-resume',hypothesisId:'A'}}).catch(()=>{});
        // #endregion
        await resumeInvestment(token, inv.id);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/620c30bd-a4ac-4892-8325-a941881cbeee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvestmentsManagementPage.tsx:98',message:'resumeInvestment succeeded',data:{invId:inv.id},timestamp:Date.now(),sessionId:'debug-session',runId:'invest-resume',hypothesisId:'A'}}).catch(()=>{});
        // #endregion
      }
      await loadInvestments();
    } catch (e: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/620c30bd-a4ac-4892-8325-a941881cbeee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvestmentsManagementPage.tsx:100',message:'handleTogglePause error',data:{error:e?.message,stack:e?.stack,invId:inv.id},timestamp:Date.now(),sessionId:'debug-session',runId:'invest-pause',hypothesisId:'A'}}).catch(()=>{});
      // #endregion
      alert(e.message);
    }
  };

  return (
    <div className="investments-management-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/settings/plan-finances")}>
          ← Back
        </button>
        <h1>Manage Investments</h1>
        <button className="add-button" onClick={() => {
          setEditingId(null);
          setFormData({ name: "", goal: "", monthlyAmount: "", status: "active" });
          setShowForm(true);
        }}>
          + Add Investment
        </button>
      </div>

      {showForm && (
        <motion.div
          className="form-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowForm(false)}
        >
          <div className="form-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? "Update" : "Add"} Investment</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Investment Name *</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Mutual Fund SIP"
                />
              </div>
              <div className="form-group">
                <label>Goal *</label>
                <input
                  value={formData.goal}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                  required
                  placeholder="Retirement, Education, etc."
                />
              </div>
              <div className="form-group">
                <label>Monthly Amount *</label>
                <input
                  type="number"
                  value={formData.monthlyAmount}
                  onChange={(e) => setFormData({ ...formData, monthlyAmount: e.target.value })}
                  required
                  min="0"
                  placeholder="10000"
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "paused" })}
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary">
                  {editingId ? "Update" : "Add"} Investment
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      )}

      {loading ? (
        <SkeletonLoader type="card" count={3} />
      ) : (
        <div className="investments-list">
          {investments.length === 0 ? (
            <div className="empty-state">No investments. Add one to get started!</div>
          ) : (
            investments.map((inv, index) => (
              <motion.div
                key={inv.id}
                className="investment-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="investment-info">
                  <h3>{inv.name}</h3>
                  <div className="investment-details">
                    <span>Goal: {inv.goal}</span>
                    <span>₹{inv.monthlyAmount.toLocaleString("en-IN")}/month</span>
                    {(inv.accumulatedFunds || inv.accumulated_funds || 0) > 0 && (
                      <span className="accumulated-funds">
                        Saved: ₹{Math.round(inv.accumulatedFunds || inv.accumulated_funds || 0).toLocaleString("en-IN")}
                      </span>
                    )}
                    <span className={`status ${inv.status}`}>
                      {inv.status === "active" ? "● Active" : "⏸ Paused"}
                    </span>
                    {inv.paid && <span className="paid-badge">✓ Paid This Month</span>}
                    {!inv.paid && <span className="unpaid-badge">⚠ Not Paid</span>}
                  </div>
                </div>
                <div className="investment-actions">
                  <button 
                    className="icon-btn wallet-btn" 
                    onClick={async () => {
                      const newAmount = prompt(`Update available fund for ${inv.name}:\nCurrent: ₹${Math.round(inv.accumulatedFunds || inv.accumulated_funds || 0).toLocaleString("en-IN")}\n\nEnter new amount:`);
                      if (newAmount !== null && !isNaN(parseFloat(newAmount))) {
                        try {
                          await updateInvestment(token, inv.id, { accumulatedFunds: parseFloat(newAmount) });
                          await loadInvestments();
                        } catch (e: any) {
                          alert("Failed to update: " + e.message);
                        }
                      }
                    }}
                    title="Update Available Fund"
                  >
                    <FaWallet />
                  </button>
                  <button 
                    className="icon-btn edit-btn" 
                    onClick={() => handleEdit(inv)}
                    title="Edit"
                  >
                    <FaEdit />
                  </button>
                  <button 
                    className="icon-btn pause-btn" 
                    onClick={() => handleTogglePause(inv)}
                    title={inv.status === "active" ? "Pause" : "Resume"}
                  >
                    {inv.status === "active" ? <FaPause /> : <FaPlay />}
                  </button>
                  <button 
                    className="icon-btn delete-btn" 
                    onClick={() => handleDelete(inv.id)}
                    title="Delete"
                  >
                    <FaTrashAlt />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

