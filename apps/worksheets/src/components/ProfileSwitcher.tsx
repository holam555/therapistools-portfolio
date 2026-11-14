import { useState } from 'react';
import { Check, ChevronDown, Plus, Trash2, UserRound } from 'lucide-react';
import { useProfiles } from '@/hooks/use-profiles';
import { NICKNAMES, Nickname, nextNickname, nicknameIcon } from '@/lib/persistence';
import { AGE_BANDS, AgeBand, ageBandConfig } from '@/lib/defaultConfig';
import { EMOJI_THEMES, EmojiTheme } from '@/lib/shapes';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const INTEREST_CHOICES: EmojiTheme[] = ['animals', 'food', 'dinosaurs', 'space', 'ocean', 'cars'];

/**
 * Compact child-profile switcher for the site header. Selecting a child applies
 * their age (→ difficulty) and preferred theme to every worksheet opened.
 * Profiles use a nickname from a fixed list, never a real name: child names are
 * not stored (see persistence.ts). All data is on-device.
 */
export default function ProfileSwitcher() {
  const { profiles, activeProfile, setActive, addProfile, deleteProfile } = useProfiles();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [label, setLabel] = useState<Nickname>(nextNickname([]));
  const [ageBand, setAgeBand] = useState<AgeBand>('5-6');
  const [interests, setInterests] = useState<EmojiTheme[]>([]);

  const openAdd = () => {
    setLabel(nextNickname(profiles.map((p) => p.label)));
    setAgeBand('5-6');
    setInterests([]);
    setDialogOpen(true);
  };

  const toggleInterest = (t: EmojiTheme) =>
    setInterests((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const save = () => {
    addProfile({ label, ageBand, interests });
    setDialogOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="no-print gap-1.5 font-display">
            <UserRound className="w-4 h-4" />
            <span className="max-w-[8rem] truncate">{activeProfile ? `${nicknameIcon(activeProfile.label)} ${activeProfile.label}` : 'Add child'}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Children</DropdownMenuLabel>
          {profiles.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">No profiles yet. Add one to save a child’s age and preferences under a nickname.</p>
          )}
          {profiles.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onClick={() => setActive(p.id)}
              className="flex items-center justify-between gap-2"
            >
              <span className="flex items-center gap-2 truncate">
                {activeProfile?.id === p.id ? <Check className="w-4 h-4 text-primary shrink-0" /> : <span className="w-4" />}
                <span className="truncate">{nicknameIcon(p.label)} {p.label}</span>
                <span className="text-[10px] text-muted-foreground">{p.ageBand}</span>
              </span>
              <button
                type="button"
                aria-label={`Remove ${p.label}`}
                onClick={(e) => { e.stopPropagation(); deleteProfile(p.id); }}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuItem>
          ))}
          {activeProfile && (
            <DropdownMenuItem onClick={() => setActive(null)} className="text-xs text-muted-foreground">
              Use without a profile
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={openAdd} className="gap-2 font-semibold">
            <Plus className="w-4 h-4" /> Add child
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Add a child</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="font-display font-semibold text-sm">Nickname</Label>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Nickname">
                {NICKNAMES.map((n) => {
                  const taken = profiles.some((p) => p.label === n.label);
                  return (
                    <button key={n.label} type="button" role="radio" aria-checked={label === n.label} disabled={taken}
                      onClick={() => setLabel(n.label)}
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-35 ${
                        label === n.label ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/40'
                      }`}>
                      {n.icon} {n.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">We never save a child’s real name. Type the name on a worksheet when you print it.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="font-display font-semibold text-sm">Age</Label>
              <div className="grid grid-cols-3 gap-2">
                {AGE_BANDS.map((b) => (
                  <Button key={b.value} type="button" variant={ageBand === b.value ? 'default' : 'outline'} size="sm"
                    onClick={() => setAgeBand(b.value)} className="font-display text-xs">
                    {b.label}
                  </Button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">Sets the default difficulty for this child.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="font-display font-semibold text-sm">Interests <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <div className="flex flex-wrap gap-1.5">
                {INTEREST_CHOICES.map((t) => (
                  <button key={t} type="button" onClick={() => toggleInterest(t)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                      interests.includes(t) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/40'
                    }`}>
                    {EMOJI_THEMES[t].icon} {EMOJI_THEMES[t].label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">Used to pick a favourite emoji theme.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
