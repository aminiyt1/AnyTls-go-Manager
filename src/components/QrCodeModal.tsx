import React, { useState, useEffect, useRef } from 'react';
import { X, Copy, Check, Download, QrCode, FileCode, Layers } from 'lucide-react';
import QRCodeLib from 'qrcode';
import { AnyTlsConfig } from '../types';
import {
  generateAnyTlsLink,
  generateSingBoxJson,
  generateClashYaml,
} from '../lib/formatters';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AnyTlsConfig | null;
  serverIp: string;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  isOpen,
  onClose,
  config,
  serverIp,
}) => {
  const [activeTab, setActiveTab] = useState<'link' | 'singbox' | 'clash'>('link');
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const anytlsLink = config ? generateAnyTlsLink(config, serverIp) : '';
  const singboxJson = config ? generateSingBoxJson(config, serverIp) : '';
  const clashYaml = config ? generateClashYaml(config, serverIp) : '';

  useEffect(() => {
    if (isOpen && config && anytlsLink) {
      QRCodeLib.toDataURL(anytlsLink, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR generation error:', err));
    }
  }, [isOpen, config, anytlsLink]);

  if (!isOpen || !config) return null;

  const currentContent =
    activeTab === 'link'
      ? anytlsLink
      : activeTab === 'singbox'
      ? singboxJson
      : clashYaml;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `anytls-${config.remark}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#151515] shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-amber-500 border border-white/5">
              <QrCode className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-medium text-white tracking-wide">
                Connection & QR Code: {config.remark}
              </h2>
              <p className="text-xs text-white/40 font-mono">Port: {config.port}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-white/40 hover:bg-white/5 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* High-Contrast QR Code Card */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-[#0d0d0d] p-4">
            {qrDataUrl ? (
              <div className="rounded-xl bg-white p-3 shadow-md">
                <img
                  src={qrDataUrl}
                  alt="AnyTLS QR Code"
                  className="h-52 w-52 object-contain"
                />
              </div>
            ) : (
              <div className="flex h-52 w-52 items-center justify-center text-xs text-white/40">
                Generating QR Code...
              </div>
            )}

            <button
              onClick={downloadQr}
              disabled={!qrDataUrl}
              className="mt-3 flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <Download className="h-3.5 w-3.5 text-amber-500" />
              <span>Download QR Image (PNG)</span>
            </button>
          </div>

          {/* Configuration Formats Tab */}
          <div>
            <div className="flex items-center gap-1 rounded-xl bg-[#0d0d0d] p-1 border border-white/5 mb-2">
              <button
                onClick={() => setActiveTab('link')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition ${
                  activeTab === 'link'
                    ? 'bg-amber-500 text-black font-bold'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                AnyTLS Link
              </button>
              <button
                onClick={() => setActiveTab('singbox')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition ${
                  activeTab === 'singbox'
                    ? 'bg-amber-500 text-black font-bold'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                Sing-box JSON
              </button>
              <button
                onClick={() => setActiveTab('clash')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition ${
                  activeTab === 'clash'
                    ? 'bg-amber-500 text-black font-bold'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                Clash / Mihomo
              </button>
            </div>

            {/* Code Box */}
            <div className="relative rounded-xl border border-white/5 bg-[#0d0d0d] p-3">
              <pre className="max-h-36 overflow-y-auto font-mono text-[11px] leading-relaxed text-amber-400/90 whitespace-pre-wrap break-all select-all">
                {currentContent}
              </pre>

              <button
                onClick={handleCopy}
                className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/80 shadow hover:bg-white/10 transition"
              >
                {copied ? (
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
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-white/5 bg-white/[0.01] px-6 py-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/5 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
