import { Icon } from '@/components/icons';

export const metadata = { title: 'Acceptable Use - OTF' };

export default function LegalPage() {
  return (
    <div className="prose mx-auto max-w-2xl">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--color-ink)]">
        <Icon.shield size={22} /> Acceptable Use & Safety
      </h1>
      <p>
        OTF is a training range. Every target on this platform is a simulation running in an
        isolated sandbox. Nothing you do here touches real equipment.
      </p>
      <h2>The one rule that matters</h2>
      <p>
        The techniques you learn here are for <strong>authorised testing only</strong>. Do not point
        them at any equipment you do not own and have explicit written permission to test. On a real
        plant, a misplaced packet is not a finding - it is an incident, and potentially a fatality.
        OT security exists because the consequences are physical.
      </p>
      <h2>What we simulate, and what we do not</h2>
      <ul>
        <li>All scenarios are purpose-built simulations. We ship no vendor firmware, no proprietary
          software, and no real project files.</li>
        <li>Scenarios inspired by real incidents are fictional recreations. Their captures, network
          addresses and equipment are synthesised for teaching.</li>
        <li>We ship no zero-days. Vulnerabilities are inherent protocol weaknesses or documented
          weakness classes reimplemented in our own code.</li>
      </ul>
      <h2>Fair play</h2>
      <ul>
        <li>Flags are unique to your account. Sharing them is pointless (they will not validate for
          anyone else) and traceable.</li>
        <li>Do not attack the platform itself, other users, or the lab infrastructure outside the
          scope of a room's objective.</li>
        <li>Lab environments are capped and time-limited. Do not attempt to use them for computation
          unrelated to the exercises.</li>
      </ul>
      <p className="text-sm text-[var(--color-ink-faint)]">
        By using OTF you agree to use what you learn lawfully and ethically. Break the plant here so
        you never have to break - or fail to defend - a real one.
      </p>
    </div>
  );
}
