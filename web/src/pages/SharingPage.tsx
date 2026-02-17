import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useAppModal } from "../hooks/useAppModal";
import { AppModalRenderer } from "../components/AppModalRenderer";
import "./SharingPage.css";

interface SharingPageProps {
  token: string;
}

export function SharingPage({ token }: SharingPageProps) {
  const navigate = useNavigate();
  const api = useEncryptedApiCalls();
  const { modal, showAlert, showConfirm, closeModal, confirmAndClose } = useAppModal();
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
        api.fetchSharingRequests(token),
        api.fetchSharingMembers(token)
      ]);
      setRequests(reqRes.data);
      setMembers(memRes.data);
    } catch (e) {
      console.error("Failed to load sharing data:", e);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    showConfirm(
      `You're about to request ${inviteForm.username} to share finances. If they accept, they will see your finances. Continue?`,
      async () => {
        try {
          await api.sendInvite(token, {
            username: inviteForm.username,
            role: "viewer",
            merge_finances: true
          });
          setShowInviteForm(false);
          setInviteForm({ username: "" });
          await loadData();
        } catch (err: any) {
          showAlert(err.message);
        }
      },
      "Send Invite?"
    );
  };

  const handleApprove = async (id: string, inviterUsername: string) => {
    showConfirm(
      `Are you sure you want to approve this sharing request from "${inviterUsername}"? This will allow both of you to see each other's financial data in the Combined view.`,
      async () => {
        try {
          await api.approveRequest(token, id);
          showAlert("Request approved! You can now see each other's finances in the Combined (Shared) view on your Dashboard.", "Success");
          await loadData();
        } catch (err: any) {
          showAlert(err.message);
        }
      },
      "Approve Request?"
    );
  };

  const handleReject = async (id: string) => {
    try {
      await api.rejectRequest(token, id);
      await loadData();
    } catch (e: any) {
      showAlert(e.message);
    }
  };

  const handleRevoke = async (memberId: string, sharedAccountId: string, username: string) => {
    showConfirm(
      `Are you sure you want to revoke sharing with "${username}"? This will remove the shared access for both of you.`,
      async () => {
        try {
          const result = await fetch(`${api.getBaseUrl()}/sharing/revoke`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ sharedAccountId })
          });
          
          if (!result.ok) {
            const errData = await result.json();
            throw new Error(errData.message || 'Failed to revoke');
          }
          
          showAlert('Sharing revoked successfully', 'Success');
          await loadData();
        } catch (err: any) {
          showAlert(err.message);
        }
      },
      "Revoke Sharing?"
    );
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
                    <h3>From: {req.inviterUsername || req.ownerId || 'Unknown'}</h3>
                    <div className="request-meta">
                      <span className={`role-badge ${req.role}`}>{req.role}</span>
                      {req.mergeFinances && <span className="merge-badge">Merge Finances</span>}
                      <span className="status-badge">{req.status}</span>
                    </div>
                  </div>
                  <div className="request-actions">
                    <button onClick={() => handleApprove(req.id, req.inviterUsername || 'Unknown')} className="approve-btn">Approve</button>
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
                    <h3>To: {req.inviteeUsername || req.inviteeId || 'Unknown'}</h3>
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
            <h2>Sharing With ({members.members.length})</h2>
            <div className="members-list">
              {members.members.map((member) => (
                <div key={member.userId || member.user_id} className="member-card">
                  <div className="member-avatar">
                    {member.username?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="member-info">
                    <h3>{member.username || "User"}</h3>
                    <p className="member-role-text">{member.role || "member"}</p>
                    <div className="member-meta">
                      <span className={`role-badge ${member.role}`}>{member.role}</span>
                      {member.merge_finances && <span className="merge-badge">Merged</span>}
                    </div>
                  </div>
                  <button 
                    className="revoke-btn"
                    onClick={() => handleRevoke(member.userId || member.user_id, member.shared_account_id, member.username || 'User')}
                    title="Revoke sharing access"
                  >
                    Revoke
                  </button>
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
      <AppModalRenderer modal={modal} closeModal={closeModal} confirmAndClose={confirmAndClose} />
    </div>
  );
}
