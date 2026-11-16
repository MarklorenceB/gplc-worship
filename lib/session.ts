import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { codeMatches, fingerprint, signToken, verifyToken } from "./token";
import { forgetCurrentPhone } from "./notifications/device";

const SESSION_COOKIE = "gplc_session";
const PASS_COOKIE = "gplc_pass";
const SESSION_MAX_AGE = 60 * 60 * 24 * 180;
const PASS_MAX_AGE = 60 * 30;

function setting(name: string, devDefault: string) {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === "production") throw new Error(`${name} is not set`);
  return devDefault;
}

const secret = () => setting("SESSION_SECRET", "dev-only-session-secret");
const teamCode = () => setting("TEAM_CODE", "gplc");
const leaderCode = () => setting("LEADER_CODE", "leader");

type SessionToken = { memberId: number; team: string; lead?: string };
type PassToken = { team: string; exp: number };

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function getSession(): Promise<{ memberId: number; leader: boolean } | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const token = verifyToken<SessionToken>(raw, secret());
  if (!token || token.team !== fingerprint(teamCode(), secret())) return null;
  return {
    memberId: token.memberId,
    leader: token.lead === fingerprint(leaderCode(), secret()),
  };
}

async function writeSession(memberId: number, leader: boolean) {
  const token: SessionToken = { memberId, team: fingerprint(teamCode(), secret()) };
  if (leader) token.lead = fingerprint(leaderCode(), secret());
  (await cookies()).set(SESSION_COOKIE, signToken(token, secret()), {
    ...cookieOptions,
    maxAge: SESSION_MAX_AGE,
  });
}

export async function startSession(memberId: number) {
  await forgetCurrentPhone();
  await writeSession(memberId, false);
  (await cookies()).delete(PASS_COOKIE);
}

export async function endSession() {
  await forgetCurrentPhone();
  (await cookies()).delete(SESSION_COOKIE);
}

export async function unlockLeader(memberId: number, code: string) {
  if (!codeMatches(code, leaderCode())) return false;
  await writeSession(memberId, true);
  return true;
}

export async function lockLeader(memberId: number) {
  await writeSession(memberId, false);
}

/** The team code was entered recently, so the name list may be shown. */
export async function hasTeamPass() {
  const raw = (await cookies()).get(PASS_COOKIE)?.value;
  if (!raw) return false;
  const token = verifyToken<PassToken>(raw, secret());
  await connection();
  return !!token && token.exp > Date.now() && token.team === fingerprint(teamCode(), secret());
}

export async function grantTeamPass(code: string) {
  if (!codeMatches(code, teamCode())) return false;
  const token: PassToken = {
    team: fingerprint(teamCode(), secret()),
    exp: Date.now() + PASS_MAX_AGE * 1000,
  };
  (await cookies()).set(PASS_COOKIE, signToken(token, secret()), {
    ...cookieOptions,
    maxAge: PASS_MAX_AGE,
  });
  return true;
}

export async function clearTeamPass() {
  (await cookies()).delete(PASS_COOKIE);
}
