import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function CustomerLandingPage() {
  const [issueText, setIssueText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const navigate = useNavigate();

  const handleStartResolution = (prompt?: string) => {
    const textToSend = prompt || issueText;
    if (!textToSend.trim()) return;
    navigate('/chat', { state: { initialMessage: textToSend } });
  };

  const suggestedRequests = [
    'I was charged twice for Order #84920 ($120.00)',
    'Upgrade my subscription to Enterprise tier',
    'Missing item in my recent express delivery',
    'Request refund for delayed service',
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 max-w-4xl mx-auto w-full">
      {/* Hero Header */}
      <div className="text-center space-y-3 mb-8 max-w-2xl">
        <h1 className="text-3xl md:text-4xl font-bold text-on-surface tracking-tight leading-tight">
          Tell us what went wrong. We'll work on the resolution.
        </h1>
        <p className="text-base text-on-surface-variant max-w-lg mx-auto">
          Our autonomous AI engine quickly understands, investigates, and resolves your issues with transparent, policy-grounded decisions.
        </p>
      </div>

      {/* Bento Grid / Interaction Card */}
      <div className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 md:p-8 shadow-sm flex flex-col gap-6">
        <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[22px]">help_center</span>
          How can we help you today?
        </h2>

        {/* Input Box */}
        <div className="w-full input-glow border border-outline-variant/80 rounded-xl transition-all duration-200 bg-surface flex flex-col overflow-hidden">
          <textarea
            value={issueText}
            onChange={(e) => setIssueText(e.target.value)}
            placeholder="Briefly describe your issue (e.g. I noticed a double charge on my account)..."
            rows={4}
            className="w-full bg-transparent border-none focus:ring-0 resize-none text-base p-4 text-on-surface placeholder:text-on-surface-variant/50 outline-none"
          />

          <div className="flex justify-between items-center px-4 py-3 border-t border-outline-variant/40 bg-surface-bright">
            <label htmlFor="file-upload" className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary cursor-pointer transition-colors text-xs font-medium">
              <span className="material-symbols-outlined text-[18px]">attachment</span>
              <span>{attachedFiles.length > 0 ? `${attachedFiles.length} attached` : 'Attach files'}</span>
              <input
                type="file"
                multiple
                className="hidden"
                id="file-upload"
                onChange={(e) => {
                  if (e.target.files) {
                    setAttachedFiles(Array.from(e.target.files).map((f) => f.name));
                  }
                }}
              />
            </label>

            <button
              onClick={() => handleStartResolution()}
              disabled={!issueText.trim()}
              className="bg-primary-container text-on-primary-container font-semibold rounded-lg px-5 py-2 text-xs hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
            >
              Start Resolution
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Suggested Requests */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
            Suggested Requests
          </span>
          <div className="flex flex-wrap gap-2">
            {suggestedRequests.map((req, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setIssueText(req);
                  handleStartResolution(req);
                }}
                className="bg-transparent border border-outline-variant/60 text-on-surface rounded-full px-3.5 py-1.5 text-xs font-medium hover:bg-surface-container hover:border-primary transition-colors text-left"
              >
                {req}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Trust Items */}
      <div className="w-full mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-3 p-4 rounded-xl border border-outline-variant/30 bg-surface-bright shadow-2xs">
          <span className="material-symbols-outlined text-primary text-[24px]">gavel</span>
          <div>
            <div className="text-xs font-bold text-on-surface">Policy Grounded</div>
            <div className="text-[11px] text-on-surface-variant">Validated against company rules</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-xl border border-outline-variant/30 bg-surface-bright shadow-2xs">
          <span className="material-symbols-outlined text-primary text-[24px]">verified</span>
          <div>
            <div className="text-xs font-bold text-on-surface">Actions Verified</div>
            <div className="text-[11px] text-on-surface-variant">API post-checks & ledger audit</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-xl border border-outline-variant/30 bg-surface-bright shadow-2xs">
          <span className="material-symbols-outlined text-primary text-[24px]">support_agent</span>
          <div>
            <div className="text-xs font-bold text-on-surface">Human Escalation</div>
            <div className="text-[11px] text-on-surface-variant">Seamless agent takeover if needed</div>
          </div>
        </div>
      </div>
    </div>
  );
}
