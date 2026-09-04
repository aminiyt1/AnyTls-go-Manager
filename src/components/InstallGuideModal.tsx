import React, { useState } from 'react';
import {
  X,
  Terminal,
  Download,
  Copy,
  Check,
  Server,
  ShieldCheck,
  AlertCircle,
  FolderArchive,
} from 'lucide-react';

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverIp: string;
  panelPort: number;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({
  isOpen,
  onClose,
  serverIp,
  panelPort,
}) => {
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedManual, setCopiedManual] = useState(false);
  const [activeTab, setActiveTab] = useState<'zip' | 'curl'>('zip');

  if (!isOpen) return null;

  const quickCurlCommand = `curl -sSL https://raw.githubusercontent.com/anytls/anytls-panel/main/install.sh | bash`;

  const manualSteps = `# 1. Upload anytls-panel-ubuntu.zip to your server's root folder
# 2. Login as root to your Ubuntu server and run:

apt-get update && apt-get install -y unzip
unzip anytls-panel-ubuntu.zip -d anytls-panel
cd anytls-panel
chmod +x install.sh
./install.sh`;

  const handleCopyQuick = () => {
    navigator.clipboard.writeText(quickCurlCommand);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleCopyManual = () => {
    navigator.clipboard.writeText(manualSteps);
    setCopiedManual(true);
    setTimeout(() => setCopiedManual(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[#151515] shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-amber-500 border border-white/5">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-medium text-white tracking-wide">
                Ubuntu Installation Guide (Ubuntu 22.04+ LTS)
              </h2>
              <p className="text-xs text-white/40">
                Automated setup with Systemd, anytls-go binary, and web management panel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-white/40 hover:bg-white/5 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-white/5 bg-[#0d0d0d] px-6 pt-3">
          <button
            onClick={() => setActiveTab('zip')}
            className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-medium transition ${
              activeTab === 'zip'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-white/40 hover:text-white'
            }`}
          >
            <FolderArchive className="h-4 w-4" />
            <span>ZIP Package Method (Recommended)</span>
          </button>

          <button
            onClick={() => setActiveTab('curl')}
            className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-medium transition ${
              activeTab === 'curl'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-white/40 hover:text-white'
            }`}
          >
            <Terminal className="h-4 w-4" />
            <span>One-Line Script (Quick Install)</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 text-sm">
          {activeTab === 'zip' ? (
            <div className="space-y-4">
              {/* Download Box */}
              <div className="rounded-2xl border border-white/5 bg-[#0d0d0d] p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-white text-sm">
                      Download Complete AnyTLS Server Package (ZIP)
                    </h3>
                    <p className="text-xs text-white/40 mt-1">
                      Includes panel source code, automated installer <code className="text-amber-400 font-mono">install.sh</code>, and systemd service
                    </p>
                  </div>
                  <a
                    href="/api/download-zip"
                    download="anytls-panel-ubuntu.zip"
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black px-4 py-2.5 text-xs font-bold shadow-lg transition shrink-0"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download ZIP</span>
                  </a>
                </div>
              </div>

              {/* Instructions */}
              <div>
                <h4 className="text-xs font-medium text-white/80 mb-2">
                  Installation Steps on Ubuntu Server:
                </h4>
                <ol className="list-decimal list-inside text-xs text-white/60 space-y-2 leading-relaxed">
                  <li>
                    Upload the downloaded ZIP file via <strong className="text-white">FileZilla / WinSCP</strong> or using <code className="font-mono text-amber-400">scp</code> to the <code className="font-mono text-amber-400">/root/</code> directory of your Ubuntu server.
                  </li>
                  <li>
                    Connect to your server via SSH terminal (PuTTY, Terminal, or VSCode SSH).
                  </li>
                  <li>
                    Copy and execute the following commands in sequence:
                  </li>
                </ol>
              </div>

              {/* Command Code block */}
              <div className="relative rounded-xl border border-white/5 bg-[#090909] p-3.5">
                <pre className="font-mono text-xs text-emerald-400 leading-relaxed overflow-x-auto whitespace-pre-wrap select-all">
                  {manualSteps}
                </pre>
                <button
                  onClick={handleCopyManual}
                  className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/80 hover:bg-white/10 transition"
                >
                  {copiedManual ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 text-amber-500" />
                      <span>Copy Commands</span>
                    </>
                  )}
                </button>
              </div>

              {/* Interactive prompt explanation */}
              <div className="rounded-xl border border-white/5 bg-[#0d0d0d] p-3.5 text-xs text-white/60 space-y-1.5">
                <div className="font-medium text-white flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  What happens during installation?
                </div>
                <p>
                  1. Prompts for <strong>Panel Port</strong> (default: 3000, or any port of your choice).
                </p>
                <p>
                  2. Prompts for <strong>Admin Username</strong> and <strong>Password</strong> (press Enter for auto-generated strong password).
                </p>
                <p>
                  3. Automatically installs precompiled AnyTLS binary for your server CPU (amd64 / arm64).
                </p>
                <p>
                  4. Registers and starts <code className="font-mono text-amber-400">anytls-panel</code> as a background Systemd service that automatically restarts on server reboot.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-white/60 leading-relaxed mb-3">
                  To install directly without uploading a ZIP file, run this command in your Ubuntu SSH terminal:
                </p>
                <div className="relative rounded-xl border border-white/5 bg-[#090909] p-3.5">
                  <pre className="font-mono text-xs text-amber-400 leading-relaxed overflow-x-auto whitespace-pre-wrap select-all">
                    {quickCurlCommand}
                  </pre>
                  <button
                    onClick={handleCopyQuick}
                    className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/80 hover:bg-white/10 transition"
                  >
                    {copiedScript ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 text-amber-500" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-400 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Tip: If your server has network restrictions to raw GitHub endpoints, method 1 (uploading the downloaded ZIP) is recommended.
                </span>
              </div>
            </div>
          )}

          {/* Interactive CLI Console Highlight */}
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                <Terminal className="h-4 w-4" />
                Terminal Management Menu:
              </span>
              <span className="font-mono text-[11px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded">
                anytls
              </span>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              Whenever you connect to your server SSH, simply type <code className="font-mono text-cyan-300 font-bold">anytls</code> to open the interactive management console where you can monitor live ports, restart the panel, view logs, change password, or completely uninstall.
            </p>
          </div>

          {/* Useful Systemd Commands Table */}
          <div>
            <h4 className="text-xs font-medium text-white/80 mb-2">Alternative Systemd Commands:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              <div className="rounded-lg bg-[#0d0d0d] p-2.5 border border-white/5">
                <div className="text-white/40 text-[11px] mb-1 font-sans">Check panel status:</div>
                <div className="text-amber-400">systemctl status anytls-panel</div>
              </div>
              <div className="rounded-lg bg-[#0d0d0d] p-2.5 border border-white/5">
                <div className="text-white/40 text-[11px] mb-1 font-sans">Restart panel:</div>
                <div className="text-amber-400">systemctl restart anytls-panel</div>
              </div>
              <div className="rounded-lg bg-[#0d0d0d] p-2.5 border border-white/5">
                <div className="text-white/40 text-[11px] mb-1 font-sans">View live logs:</div>
                <div className="text-amber-400">journalctl -u anytls-panel -f</div>
              </div>
              <div className="rounded-lg bg-[#0d0d0d] p-2.5 border border-white/5">
                <div className="text-white/40 text-[11px] mb-1 font-sans">Open firewall port:</div>
                <div className="text-amber-400">ufw allow 3000/tcp</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-white/5 bg-white/[0.01] px-6 py-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/5 bg-white/5 px-5 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
