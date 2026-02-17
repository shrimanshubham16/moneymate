import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaUsers, FaPaperPlane, FaInbox, FaHandshake, FaTimesCircle, FaUserPlus } from "react-icons/fa";
import { useEncryptedApiCalls } from "../hooks/useEncryptedApiCalls";
import { useAppModal } from "../hooks/useAppModal";
import { AppModalRenderer } from "../components/AppModalRenderer";
import { PageInfoButton } from "../components/PageInfoButton";
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
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({ username: "" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqRes, memRes] = await Promise.all([
        api.fetchSharingRequests(token),
        api.fetchSharingMembers(token)
      ]);
      setRequests(reqRes.data);
      setMembers(memRes.data);
    } catch (e) {
      console.error("Failed to load sharing data:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    showConfirm(
      `You're about to request "${inviteForm.username}" to share finances. If they accept, you'll both see each other's data in the Combined view. Continue?`,
      async () => {
        try {
          await api.sendInvite(token, {
            username: inviteForm.username,
            role: "viewer",
            merge_finances: true
          });
          setShowInviteForm(false);
          setInviteForm({ username: "" });
          showAlert("Invite sent! They'll see your request when they visit their Sharing page.", "Invite Sent");
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
      `Approve sharing with "${inviterUsername}"? You'll both be able to see each other's financial data in the Combined view on your Dashboard.`,
      async () => {
        try {
          await api.approveRequest(token, id);
          showAlert("Request approved! Switch to the Combined view on your Dashboard to see merged finances.", "Success");
          await loadData();
        } catch (err: any) {
          showAlert(err.message);
        }
      },
      "Approve Request?"
    );
  };

  const handleReject = async (id: string, inviterUsername: string) => {
    showConfirm(
      `Decline the sharing request from "${inviterUsername}"? They will be notified.`,
      async () => {
        try {
          await api.rejectRequest(token, id);
          showAlert("Request declined.", "Done");
          await loadData();
        } catch (err: any) {
          showAlert(err.message);
        }
      },
      "Decline Request?"
    );
  };

  const handleCancelOutgoing = async (id: string, inviteeUsername: string) => {
    showConfirm(
      `Cancel your pending invite to "${inviteeUsername}"? The request will be withdrawn.`,
      async () => {
        try {
          await api.cancelSharingRequest(token, id);
          showAlert("Invite withdrawn.", "Done");
          await loadData();
        } catch (err: any) {
          showAlert(err.message);
        }
      },
      "Withdraw Invite?"
    );
  };

  const handleRevoke = async (memberId: string, sharedAccountId: string, username: string) => {
    showConfirm(
      `Revoke sharing with "${username}"? Both of you will lose access to each other's finances in the Combined view. This cannot be undone.`,
      async () => {
        try {
          await api.revokeSharing(token, sharedAccountId);
          showAlert("Sharing revoked. The combined view has been removed.", "Sharing Ended");
          await loadData();
        } catch (err: any) {
          showAlert(err.message);
        }
      },
      "Revoke Sharing?"
    );
  };

  const hasAnyContent = requests.incoming.length > 0 || requests.outgoing.length > 0 || members.members.length > 0;

  return (
    <div className="sharing-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/settings")}>← Back</button>
        <h1>
          <FaUsers style={{ marginRight: 8, color: 'var(--accent-cyan, #22d3ee)' }} />Sharing
          <PageInfoButton
            title="Share Finances with Family"
            description="Invite your partner, spouse, or family member to share financial visibility. Once accepted, you'll both see a Combined view on the dashboard showing everyone's income, expenses, and investments together."
            impact="Sharing doesn't expose passwords or recovery keys — only financial data. You can revoke access anytime. The Combined view gives families a unified picture of household finances."
            howItWorks={[
              "Invite a companion by their FinFlow username",
              "They'll see the request in their Notifications and can accept or decline",
              "Once accepted, both users can switch to the 'Combined' view on the dashboard",
              "You can revoke sharing at any time from this page",
              "Comments on activities let shared members discuss spending in context"
            ]}
          />
        </h1>
        <button className="add-button" onClick={() => setShowInviteForm(true)}>
          <FaUserPlus style={{ marginRight: 6 }} />Invite Companion
        </button>
      </div>

      {/* Invite Modal */}
      {showInviteForm && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowInviteForm(false)}
        >
          <motion.div
            className="modal-content"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
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
                  placeholder="Enter their username"
                  autoFocus
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

      {/* Loading */}
      {loading ? (
        <div className="sharing-loading">
          {[1, 2, 3].map(i => <div key={i} className="sharing-skeleton" />)}
        </div>
      ) : !hasAnyContent ? (
        /* Empty State */
        <div className="sharing-empty-state">
          <div className="sharing-empty-icon">
            <FaUsers size={36} />
          </div>
          <h3>No Sharing Activity</h3>
          <p>
            Invite a companion to share your financial journey. You'll be able to view a combined picture of incomes, expenses, and health.
          </p>
          <button className="primary-btn" onClick={() => setShowInviteForm(true)}>
            <FaUserPlus style={{ marginRight: 6 }} />Invite Companion
          </button>
        </div>
      ) : (
        <div className="sharing-sections">
          {/* Incoming Pending Requests */}
          {requests.incoming.length > 0 && (
            <motion.section
              className="sharing-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2>
                <FaInbox className="section-icon" />
                Pending Requests ({requests.incoming.length})
              </h2>
              <div className="requests-list">
                {requests.incoming.map((req) => (
                  <div key={req.id} className="request-card incoming">
                    <div className="request-info">
                      <h3>From: {req.inviterUsername || 'Unknown'}</h3>
                      <div className="request-meta">
                        <span className={`role-badge ${req.role}`}>{req.role}</span>
                        {req.mergeFinances && <span className="merge-badge">Merge Finances</span>}
                        <span className="status-badge">{req.status}</span>
                      </div>
                    </div>
                    <div className="request-actions">
                      <button
                        onClick={() => handleApprove(req.id, req.inviterUsername || 'Unknown')}
                        className="approve-btn"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(req.id, req.inviterUsername || 'Unknown')}
                        className="reject-btn"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {/* Outgoing Pending Requests */}
          {requests.outgoing.length > 0 && (
            <motion.section
              className="sharing-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2>
                <FaPaperPlane className="section-icon" />
                Sent Invites — Awaiting Response ({requests.outgoing.length})
              </h2>
              <div className="requests-list">
                {requests.outgoing.map((req) => (
                  <div key={req.id} className="request-card outgoing">
                    <div className="request-info">
                      <h3>To: {req.inviteeUsername || 'Unknown'}</h3>
                      <div className="request-meta">
                        <span className={`role-badge ${req.role}`}>{req.role}</span>
                        {req.mergeFinances && <span className="merge-badge">Merge Finances</span>}
                        <span className="status-badge">{req.status}</span>
                      </div>
                    </div>
                    <div className="request-actions">
                      <button
                        onClick={() => handleCancelOutgoing(req.id, req.inviteeUsername || 'Unknown')}
                        className="cancel-btn"
                      >
                        <FaTimesCircle style={{ marginRight: 4 }} />
                        Withdraw
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {/* Active Sharing Members */}
          {members.members.length > 0 && (
            <motion.section
              className="sharing-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2>
                <FaHandshake className="section-icon" />
                Currently Sharing With ({members.members.length})
              </h2>
              <div className="members-list">
                {members.members.map((member) => (
                  <div key={member.userId || member.user_id} className="member-card">
                    <div className="member-avatar">
                      {member.username?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="member-info">
                      <h3>{member.username || "User"}</h3>
                      <div className="member-meta">
                        <span className={`role-badge ${member.role}`}>{member.role}</span>
                        {member.merge_finances && <span className="merge-badge">Merged</span>}
                      </div>
                    </div>
                    <button
                      className="revoke-btn"
                      onClick={() => handleRevoke(member.userId || member.user_id, member.shared_account_id, member.username || 'User')}
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            </motion.section>
          )}
        </div>
      )}

      <AppModalRenderer modal={modal} closeModal={closeModal} confirmAndClose={confirmAndClose} />
    </div>
  );
}
