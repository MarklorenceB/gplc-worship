import type { Metadata } from "next";
import { Suspense } from "react";
import { SubmitButton } from "@/components/client";
import {
  Card,
  Chip,
  cx,
  inputClass,
  labelClass,
  Notice,
  PageHeader,
  PageSkeleton,
  SectionTitle,
} from "@/components/ui";
import { requireLeader } from "@/lib/auth";
import { listMembers, type Member } from "@/lib/data";
import { BAND_SLOTS, ROLE_LABELS } from "@/lib/lineup";
import { addMember, updateMember } from "../actions";

export const metadata: Metadata = { title: "Team" };

export default function TeamPage(props: PageProps<"/lead/team">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Team searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Team({ searchParams }: { searchParams: PageProps<"/lead/team">["searchParams"] }) {
  await requireLeader();
  const params = await searchParams;
  const all = await listMembers();
  const active = all.filter((m) => m.active);
  const inactive = all.filter((m) => !m.active);
  const added = all.find((m) => String(m.id) === params.added);

  return (
    <>
      <PageHeader
        back={{ href: "/lead", label: "Lineups" }}
        eyebrow="Leader tools"
        title="Team roster"
      >
        <p className="mt-1 text-[15px] text-muted">
          {active.length} active. Only active people can sign in and be added to lineups.
        </p>
      </PageHeader>

      <div className="screen-grid">
        {params.exists && <Notice tone="danger">Someone on the team already has that name.</Notice>}
        {added && <Notice tone="ok">Added {added.name}. They can sign in now.</Notice>}

        <Card>
          <SectionTitle>Add someone</SectionTitle>
          <form action={addMember} className="space-y-3">
            <div>
              <label htmlFor="new-name" className={labelClass}>
                Name as the team knows them
              </label>
              <input id="new-name" name="name" required maxLength={60} className={inputClass} />
            </div>
            <SkillFields idPrefix="new" />
            <SubmitButton className="w-full" pendingLabel="Adding…">
              Add to the team
            </SubmitButton>
          </form>
        </Card>

        <Card>
          <SectionTitle>Everyone</SectionTitle>
          <MemberList people={active} />
        </Card>

        {inactive.length > 0 && (
          <Card>
            <SectionTitle>Not active</SectionTitle>
            <MemberList people={inactive} />
          </Card>
        )}
      </div>
    </>
  );
}

function MemberList({ people }: { people: Member[] }) {
  return (
    <ul className="divide-y divide-line">
      {people.map((m) => (
        <li key={m.id}>
          <details className="group py-1">
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2">
              <span className="flex-1 text-[16px] font-bold">{m.name}</span>
              <span className="flex flex-wrap justify-end gap-1">
                {m.sings && <Chip tone="joy">Sings</Chip>}
                {m.instruments.map((slot) => (
                  <Chip key={slot}>{slot}</Chip>
                ))}
              </span>
              <span className="text-[14px] font-semibold text-primary group-open:hidden">Edit</span>
            </summary>
            <form action={updateMember} className="space-y-3 pb-3 pt-1">
              <input type="hidden" name="memberId" value={m.id} />
              <div>
                <label htmlFor={`name-${m.id}`} className={labelClass}>
                  Name
                </label>
                <input
                  id={`name-${m.id}`}
                  name="name"
                  required
                  maxLength={60}
                  defaultValue={m.name}
                  className={inputClass}
                />
              </div>
              <SkillFields idPrefix={String(m.id)} member={m} />
              <CheckRow name="active" label="Active on the team" defaultChecked={m.active} />
              <SubmitButton variant="soft" className="w-full" pendingLabel="Saving…">
                Save {m.name}
              </SubmitButton>
            </form>
          </details>
        </li>
      ))}
    </ul>
  );
}

function SkillFields({ idPrefix, member }: { idPrefix: string; member?: Member }) {
  return (
    <>
      <CheckRow name="sings" label="Sings" defaultChecked={member?.sings ?? false} />
      <fieldset>
        <legend className={labelClass}>Plays or runs</legend>
        <div className="flex flex-wrap gap-2">
          {BAND_SLOTS.map((slot) => (
            <label
              key={slot}
              htmlFor={`${idPrefix}-${slot}`}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 border-line bg-card px-3.5 text-[15px] font-semibold has-checked:border-primary has-checked:bg-primary-soft has-checked:text-primary has-focus-visible:outline-3 has-focus-visible:outline-primary"
            >
              <input
                id={`${idPrefix}-${slot}`}
                type="checkbox"
                name="instruments"
                value={slot}
                defaultChecked={member?.instruments.includes(slot)}
                className="sr-only"
              />
              {ROLE_LABELS[slot]}
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}

function CheckRow({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className={cx("flex min-h-11 cursor-pointer items-center gap-3 text-[16px] font-semibold")}>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-5 w-5 accent-[var(--color-primary)]"
      />
      {label}
    </label>
  );
}
