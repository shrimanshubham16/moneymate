import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fetchSharingRequests, fetchSharingMembers, sendInvite, approveRequest, rejectRequest } from "../api";
import "./SharingPage.css";

interface SharingPageProps {
  token: string;
}

export function SharingPage({ token }: SharingPageProps) {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<{ incoming: any[]; outgoing: any[] }>({ incoming: [], outgoing: [] });
  const [members, setMembers] = useState<{ members: any[]; accounts: any[] }>({ members: [], accounts: [] });
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    username: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [reqRes, memRes] = await Promise.all([
        fetchSharingRequests(token),
        fetchSharingMembers(token)
      ]);
      setRequests(reqRes.data);
      setMembers(memRes.data);
    } catch (e) {
      console.error("Failed to load sharing data:", e);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Always merge finances when sharing (simplified model)
      await sendInvite(token, {
        username: inviteForm.username,
        role: "viewer", // Role not used anymore, but backend still expects it
        merge_finances: true
      });
      setShowInviteForm(false);
      setInviteForm({ username: "" });
      await loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveRequest(token, id);
      await loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectRequest(token, id);
      await loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="sharing-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/settings")}>← Back</button>
        <h1>Sharing</h1>
        <button className="add-button" onClick={() => setShowInviteForm(true)}>
          + Bring Aboard a Companion
        </button>
      </div>

      {showInviteForm && (
        <motion.div className="modal-overlay" onClick={() => setShowInviteForm(false)}>
          <motion.div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Share Your Finances</h2>
            <p className="share-description">
              Invite someone to merge finances with you. You'll share a combined view of income, expenses, and financial health.
            </p>
            <form onSubmit={handleSendInvite}>
              <div className="form-group">
                <label>Username *</label>
                <input
                  value={inviteForm.username}
                  onChange={(e) => setInviteForm({ ...inviteForm, username: e.target.value })}
                  required
                  placeholder="their_username"
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowInviteForm(false)}>Cancel</button>
                <button type="submit">Send Invite</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      <div className="sharing-sections">
        {requests.incoming.length > 0 && (
          <motion.section
            className="sharing-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2>Pending Requests ({requests.incoming.length})</h2>
            <div className="requests-list">
              {requests.incoming.map((req) => (
                <div key={req.id} className="request-card">
                  <div className="request-info">
                    <h3>From: {req.ownerEmail || req.ownerId}</h3>
                    <div className="request-meta">
                      <span className={`role-badge ${req.role}`}>{req.role}</span>
                      {req.mergeFinances && <span className="merge-badge">Merge Finances</span>}
                    </div>
                  </div>
                  <div className="request-actions">
                    <button onClick={() => handleApprove(req.id)} className="approve-btn">Approve</button>
                    <button onClick={() => handleReject(req.id)} className="reject-btn">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {requests.outgoing.length > 0 && (
          <motion.section
            className="sharing-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2>Sent Requests ({requests.outgoing.length})</h2>
            <div className="requests-list">
              {requests.outgoing.map((req) => (
                <div key={req.id} className="request-card outgoing">
                  <div className="request-info">
                    <h3>To: {req.inviteeEmail || req.inviteeId}</h3>
                    <div className="request-meta">
                      <span className={`role-badge ${req.role}`}>{req.role}</span>
                      {req.mergeFinances && <span className="merge-badge">Merge Finances</span>}
                      <span className="status-badge">{req.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {members.members.length > 0 && (
          <motion.section
            className="sharing-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2>Members ({members.members.length})</h2>
            <div className="members-list">
              {members.members.map((member) => (
                <div key={member.userId} className="member-card">
                  <div className="member-avatar">
                    {member.username?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="member-info">
                    <h3>{member.username || "User"}</h3>
                    <p>{member.email || "No email"}</p>
                    <span className={`role-badge ${member.role}`}>{member.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {requests.incoming.length === 0 && requests.outgoing.length === 0 && members.members.length === 0 && (
          <div className="empty-state">
            No sharing activity yet. Click "Bring Aboard a Companion" to share your finances!
          </div>
        )}
      </div>
    </div>
  );
}

