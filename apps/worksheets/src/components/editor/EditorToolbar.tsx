import { Button } from '@/components/ui/button';
import { Printer, RefreshCw, SlidersHorizontal, Layers, Link2 } from 'lucide-react';

interface Props {
  onPrint: () => void;
  onPrintBatch: () => void;
  onRegenerate: () => void;
  onShare: () => void;
  onToggleCustomize: () => void;
  customizeOpen: boolean;
  /** One-time gentle pulse on Print after the first Regenerate (discoverability). */
  pulsePrint?: boolean;
}

export default function EditorToolbar({ onPrint, onPrintBatch, onRegenerate, onShare, onToggleCustomize, customizeOpen, pulsePrint }: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button onClick={onPrint} className={`font-display font-bold gap-2 h-11 px-5 shadow-sm ${pulsePrint ? 'pulse-once' : ''}`}>
        <Printer className="w-4 h-4" /> Print
      </Button>
      <Button onClick={onPrintBatch} variant="outline" className="font-display font-bold gap-2 h-11" title="Print 5 different versions of this worksheet at once">
        <Layers className="w-4 h-4" /> Print 5 varied
      </Button>
      <Button onClick={onRegenerate} variant="outline" className="font-display font-bold gap-2 h-11">
        <RefreshCw className="w-4 h-4" /> Regenerate
      </Button>
      <Button onClick={onShare} variant="outline" className="font-display font-bold gap-2 h-11" title="Copy a link to this exact worksheet">
        <Link2 className="w-4 h-4" /> Share
      </Button>
      <Button
        onClick={onToggleCustomize}
        variant={customizeOpen ? 'secondary' : 'outline'}
        className="font-display font-bold gap-2 h-11 ml-auto"
      >
        <SlidersHorizontal className="w-4 h-4" /> Customize
      </Button>
    </div>
  );
}
