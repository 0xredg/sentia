"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  IDKitRequestWidget,
  orbLegacy,
  type IDKitResult,
  type RpContext,
} from "@worldcoin/idkit";
import { MiniKit } from "@worldcoin/minikit-js";
import { useMiniKit } from "@worldcoin/minikit-js/minikit-provider";
import {
  PROFILE_VERIFICATION_ACTION,
  WALLET_AUTH_STATEMENT,
} from "@/lib/constants";

const tabs = ["Feed", "Earnings", "Profile"] as const;
const mockRewardAmount = 0.01;
const companyLogoPaths: Record<string, string> = {
  ebay: "/demo/feed-cards/company-profile-pics/ebay.png",
  mistral: "/demo/feed-cards/company-profile-pics/mistral.png",
  mistralai: "/demo/feed-cards/company-profile-pics/mistral.png",
  notion: "/demo/feed-cards/company-profile-pics/notion.png",
  openai: "/demo/feed-cards/company-profile-pics/openai.png",
  reddit: "/demo/feed-cards/company-profile-pics/reddit.png",
  stripe: "/demo/feed-cards/company-profile-pics/stripe.png",
};

type Tab = (typeof tabs)[number];

type FeedTask = {
  id: string;
  requesterName: string;
  prompt: string;
  taskType:
    | "sentiment_judgment"
    | "content_safety"
    | "qualitative_feedback"
    | "one_human_decision";
  imagePath: string;
  responseType:
    | "thumbs"
    | "binary"
    | "choice_number"
    | "choice_text"
    | "rating"
    | "emoji";
  responseOptions: string[];
};

type ProfileUser = {
  id: string;
  wallet_address: string | null;
  world_username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  verification_status: "unverified" | "verified" | "blocked";
  verified_at: string | null;
};

type WorldConfig = {
  appId?: `app_${string}`;
  rpId?: string;
  isConfigured: boolean;
};

type ProfileStatus =
  | "idle"
  | "loading"
  | "authenticating"
  | "verifying"
  | "logging_out";

type MiniKitPreviewProfile = {
  username: string | null;
  profilePictureUrl: string | null;
};

async function resolveWorldProfile(walletAddress: string) {
  const immediateProfile = {
    username: MiniKit.user.username ?? null,
    profilePictureUrl: MiniKit.user.profilePictureUrl ?? null,
  };

  if (immediateProfile.username || immediateProfile.profilePictureUrl) {
    return immediateProfile;
  }

  try {
    const worldUser = await MiniKit.getUserByAddress(walletAddress);

    return {
      username: worldUser.username ?? null,
      profilePictureUrl: worldUser.profilePictureUrl ?? null,
    };
  } catch {
    return immediateProfile;
  }
}

export function SentiaTabs() {
  const { isInstalled } = useMiniKit();
  const [activeTab, setActiveTab] = useState<Tab>("Feed");
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [previewProfile, setPreviewProfile] =
    useState<MiniKitPreviewProfile | null>(null);
  const [worldConfig, setWorldConfig] = useState<WorldConfig | null>(null);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [status, setStatus] = useState<ProfileStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setError(null);
    setStatus("loading");

    try {
      const [profileResponse, configResponse] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/world/config"),
      ]);

      const profile = await profileResponse.json();
      const config = await configResponse.json();

      if (!profileResponse.ok) {
        throw new Error(profile.error ?? "Could not load profile.");
      }

      if (!configResponse.ok) {
        throw new Error(config.error ?? "Could not load World config.");
      }

      setUser(profile.user);
      setWorldConfig(config);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load profile.",
      );
    } finally {
      setStatus("idle");
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!isInstalled || user) {
      return;
    }

    const username = MiniKit.user.username ?? null;
    const profilePictureUrl = MiniKit.user.profilePictureUrl ?? null;
    const walletAddress = MiniKit.user.walletAddress;

    if (username || profilePictureUrl) {
      setPreviewProfile({ username, profilePictureUrl });
      return;
    }

    if (!walletAddress) {
      return;
    }

    let isCancelled = false;

    MiniKit.getUserByAddress(walletAddress)
      .then((worldUser) => {
        if (isCancelled) {
          return;
        }

        setPreviewProfile({
          username: worldUser.username ?? null,
          profilePictureUrl: worldUser.profilePictureUrl ?? null,
        });
      })
      .catch(() => {
        if (!isCancelled) {
          setPreviewProfile(null);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isInstalled, user]);

  const connectWallet = useCallback(async () => {
    setError(null);
    setStatus("authenticating");

    if (isInstalled !== true) {
      setError(
        isInstalled === undefined
          ? "Sentia is still connecting to World App. Try again in a moment."
          : "Open Sentia inside World App to connect your World wallet.",
      );
      setStatus("idle");
      return;
    }

    try {
      const nonceResponse = await fetch("/api/auth/nonce", { method: "POST" });
      const { nonce, error: nonceError } = await nonceResponse.json();

      if (!nonceResponse.ok) {
        throw new Error(nonceError ?? "Could not create auth nonce.");
      }

      const result = await MiniKit.walletAuth({
        nonce,
        statement: WALLET_AUTH_STATEMENT,
        expirationTime: new Date(Date.now() + 1000 * 60 * 10),
        fallback: () => null,
      });

      if (result.executedWith === "fallback") {
        throw new Error("Wallet Auth must be completed inside World App.");
      }

      const profile = await resolveWorldProfile(result.data.address);
      setPreviewProfile(profile);

      const response = await fetch("/api/auth/complete-siwe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          payload: result.data,
          nonce,
          profile,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not complete Wallet Auth.");
      }

      setUser(data.user);
      if (data.user?.world_username || data.user?.avatar_url) {
        setPreviewProfile(null);
      }
      void loadProfile();
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "Could not connect World wallet.",
      );
    } finally {
      setStatus("idle");
    }
  }, [isInstalled, loadProfile]);

  const logout = useCallback(async () => {
    setError(null);
    setStatus("logging_out");

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not log out.");
      }

      setUser(null);
      setPreviewProfile(null);
      setRpContext(null);
      setIsVerifyOpen(false);
    } catch (logoutError) {
      setError(
        logoutError instanceof Error ? logoutError.message : "Could not log out.",
      );
    } finally {
      setStatus("idle");
    }
  }, []);

  const startVerification = useCallback(async () => {
    setError(null);

    if (!user) {
      setError("Connect your World wallet before verifying your identity.");
      return;
    }

    if (!worldConfig?.appId || !worldConfig.rpId) {
      setError("World app id or RP id is missing from the server config.");
      return;
    }

    try {
      const response = await fetch("/api/world/rp-signature", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: PROFILE_VERIFICATION_ACTION }),
      });
      const signature = await response.json();

      if (!response.ok) {
        throw new Error(signature.error ?? "Could not prepare verification.");
      }

      setRpContext({
        rp_id: worldConfig.rpId,
        nonce: signature.nonce,
        created_at: signature.created_at,
        expires_at: signature.expires_at,
        signature: signature.sig,
      });
      setIsVerifyOpen(true);
    } catch (verificationError) {
      setError(
        verificationError instanceof Error
          ? verificationError.message
          : "Could not start verification.",
      );
    }
  }, [user, worldConfig]);

  const verifyProof = useCallback(async (idkitResponse: IDKitResult) => {
    setStatus("verifying");
    const response = await fetch("/api/world/verify-proof", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idkitResponse }),
    });
    const data = await response.json();

    if (!response.ok) {
      setStatus("idle");
      throw new Error(data.error ?? "Verification failed.");
    }

    setUser(data.user);
    setStatus("idle");
  }, []);

  return (
    <main className="app-shell" data-active-tab={activeTab}>
      <section className="tab-panel" aria-labelledby="active-tab-title">
        {activeTab === "Feed" ? (
          <FeedPanel />
        ) : activeTab === "Profile" ? (
          <ProfilePanel
            user={user}
            previewProfile={previewProfile}
            miniKitInstallState={isInstalled}
            status={status}
            error={error}
            onConnectWallet={connectWallet}
            onVerify={startVerification}
            onLogout={logout}
          />
        ) : (
          <>
            <p className="eyebrow">Sentia</p>
            <h1 id="active-tab-title">Earnings</h1>
          </>
        )}
      </section>

      <nav className="tab-bar" aria-label="Primary navigation">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className="tab-button"
            data-active={activeTab === tab}
            aria-current={activeTab === tab ? "page" : undefined}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {worldConfig?.appId && rpContext ? (
        <IDKitRequestWidget
          open={isVerifyOpen}
          onOpenChange={setIsVerifyOpen}
          app_id={worldConfig.appId}
          action={PROFILE_VERIFICATION_ACTION}
          rp_context={rpContext}
          allow_legacy_proofs={true}
          preset={orbLegacy({ signal: user?.id ?? "sentia-profile" })}
          handleVerify={verifyProof}
          onSuccess={() => {
            setError(null);
          }}
          onError={(errorCode) => {
            setStatus("idle");
            setError(`World ID verification failed: ${errorCode}`);
          }}
        />
      ) : null}
    </main>
  );
}

function FeedPanel() {
  const feedRef = useRef<HTMLDivElement>(null);
  const loopRef = useRef<HTMLDivElement>(null);
  const activeTaskIdRef = useRef<string | null>(null);
  const selectedAnswersRef = useRef<Record<string, string | null>>({});
  const [tasks, setTasks] = useState<FeedTask[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string | null>
  >({});
  const [mockBalance, setMockBalance] = useState(0);
  const [balanceBump, setBalanceBump] = useState<{
    taskId: string;
    animationKey: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);

  const scrollToStart = useCallback(() => {
    feedRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const toggleAnswer = useCallback((taskId: string, answer: string) => {
    setSelectedAnswers((currentAnswers) => {
      const nextAnswer =
        currentAnswers[taskId] === answer ? null : answer;
      return {
        ...currentAnswers,
        [taskId]: nextAnswer,
      };
    });
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadFeedTasks() {
      setIsLoading(true);
      setFeedError(null);

      try {
        const response = await fetch("/api/tasks/feed");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Could not load feed tasks.");
        }

        if (!isCancelled) {
          setTasks(data.tasks ?? []);
        }
      } catch (error) {
        if (!isCancelled) {
          setFeedError(
            error instanceof Error ? error.message : "Could not load feed tasks.",
          );
          setTasks([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadFeedTasks();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    const feed = feedRef.current;
    const loopSentinel = loopRef.current;

    if (!feed || !loopSentinel || tasks.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          scrollToStart();
        }
      },
      {
        root: feed,
        threshold: 0.8,
      },
    );

    observer.observe(loopSentinel);

    return () => {
      observer.disconnect();
    };
  }, [scrollToStart, tasks.length]);

  useEffect(() => {
    selectedAnswersRef.current = selectedAnswers;
  }, [selectedAnswers]);

  useEffect(() => {
    const feed = feedRef.current;

    if (!feed || tasks.length === 0) {
      return;
    }

    const taskCards = Array.from(
      feed.querySelectorAll<HTMLElement>("[data-feed-task-id]"),
    );

    const observer = new IntersectionObserver(
      (entries) => {
        const activeEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => {
            return second.intersectionRatio - first.intersectionRatio;
          })[0];

        const nextTaskId = activeEntry?.target.getAttribute("data-feed-task-id");

        if (!nextTaskId || activeTaskIdRef.current === nextTaskId) {
          return;
        }

        const previousTaskId = activeTaskIdRef.current;
        activeTaskIdRef.current = nextTaskId;

        if (!previousTaskId || !selectedAnswersRef.current[previousTaskId]) {
          return;
        }

        const previousTaskIndex = tasks.findIndex(
          (task) => task.id === previousTaskId,
        );
        const nextTaskIndex = tasks.findIndex((task) => task.id === nextTaskId);

        if (nextTaskIndex <= previousTaskIndex) {
          return;
        }

        setMockBalance((currentBalance) => currentBalance + mockRewardAmount);
        setBalanceBump({
          taskId: nextTaskId,
          animationKey: Date.now(),
        });
      },
      {
        root: feed,
        threshold: [0.65],
      },
    );

    taskCards.forEach((card) => observer.observe(card));

    return () => {
      observer.disconnect();
    };
  }, [tasks]);

  useEffect(() => {
    if (!balanceBump) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setBalanceBump(null);
    }, 1100);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [balanceBump]);

  return (
    <div className="feed-shell">
      <div className="feed-panel" ref={feedRef}>
        <h1 id="active-tab-title" className="sr-only">
          Feed
        </h1>

        {isLoading ? (
          <FeedStatusCard message="Loading feed..." />
        ) : feedError ? (
          <FeedStatusCard message={feedError} />
        ) : tasks.length === 0 ? (
          <FeedStatusCard message="No open tasks yet." />
        ) : (
          <>
            {tasks.map((task) => (
              <FeedTaskCard
                key={task.id}
                task={task}
                selectedAnswer={selectedAnswers[task.id] ?? null}
                mockBalance={mockBalance}
                balanceBumpKey={
                  balanceBump?.taskId === task.id
                    ? balanceBump.animationKey
                    : null
                }
                onToggleAnswer={toggleAnswer}
              />
            ))}

            <div
              ref={loopRef}
              className="feed-loop-sentinel"
              aria-hidden="true"
            />
          </>
        )}
      </div>

    </div>
  );
}

function FeedStatusCard({ message }: { message: string }) {
  return (
    <article className="feed-card feed-status-card">
      <p>{message}</p>
    </article>
  );
}

function FeedTaskCard({
  task,
  selectedAnswer,
  mockBalance,
  balanceBumpKey,
  onToggleAnswer,
}: {
  task: FeedTask;
  selectedAnswer: string | null;
  mockBalance: number;
  balanceBumpKey: number | null;
  onToggleAnswer: (taskId: string, answer: string) => void;
}) {
  const requesterInitial = task.requesterName[0]?.toUpperCase() ?? "S";
  const companyLogoPath = getCompanyLogoPath(task.requesterName);

  return (
    <article
      className="feed-card feed-task-card"
      data-feed-task-id={task.id}
    >
      <header className="feed-card-header">
        <div className="feed-card-requester">
          <p>
            <span>From:</span>
            <span className="feed-card-logo" aria-hidden="true">
            {companyLogoPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={companyLogoPath} alt="" />
            ) : (
              requesterInitial
            )}
          </span>
          </p>
        </div>

        <div className="feed-balance-wrap" aria-live="polite">
          <div className="feed-balance-pill">{formatWldBalance(mockBalance)}</div>
          {balanceBumpKey ? (
            <span key={balanceBumpKey} className="feed-balance-bump">
              +0.01
            </span>
          ) : null}
        </div>
      </header>

      <div className="feed-card-image-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={task.imagePath} alt="" className="feed-card-image" />
      </div>

      <section className="feed-card-prompt" aria-label="Task question">
        <p>{task.prompt}</p>

        <div className="feed-answer-buttons">
          {getVisibleResponseOptions(task).map((option) => (
            <button
              key={option.value}
              type="button"
              className="feed-answer-button"
              aria-pressed={selectedAnswer === option.value}
              data-selected={selectedAnswer === option.value}
              onClick={() => onToggleAnswer(task.id, option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>
    </article>
  );
}

function getCompanyLogoPath(requesterName: string) {
  const normalizedRequesterName = requesterName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  return companyLogoPaths[normalizedRequesterName] ?? null;
}

function formatWldBalance(balance: number) {
  return `${balance.toFixed(2)} WLD`;
}

function getVisibleResponseOptions(task: FeedTask) {
  if (task.responseType === "thumbs") {
    return task.responseOptions.map((option) => ({
      value: option,
      label: option === "thumbs_down" ? "👎" : "👍",
    }));
  }

  return task.responseOptions.map((option) => ({
    value: option,
    label: option,
  }));
}

function ProfilePanel({
  user,
  previewProfile,
  miniKitInstallState,
  status,
  error,
  onConnectWallet,
  onVerify,
  onLogout,
}: {
  user: ProfileUser | null;
  previewProfile: MiniKitPreviewProfile | null;
  miniKitInstallState: boolean | undefined;
  status: ProfileStatus;
  error: string | null;
  onConnectWallet: () => void;
  onVerify: () => void;
  onLogout: () => void;
}) {
  const isVerified = user?.verification_status === "verified";
  const displayName =
    user?.world_username ??
    user?.display_name ??
    previewProfile?.username ??
    "Guest";
  const avatarUrl = user?.avatar_url ?? previewProfile?.profilePictureUrl;
  const initials = useMemo(() => getInitials(displayName), [displayName]);
  const isBusy =
    status === "loading" ||
    status === "authenticating" ||
    status === "verifying";
  const isMiniKitInitializing = miniKitInstallState === undefined;
  const isWorldApp = miniKitInstallState === true;

  return (
    <div className="profile-panel">
      {user ? (
        <button
          type="button"
          className="logout-button"
          disabled={isBusy}
          onClick={onLogout}
          aria-label="Log out"
        >
          {status === "logging_out" ? "..." : "Log out"}
        </button>
      ) : null}

      <p className="eyebrow">Profile</p>

      <div className="avatar" aria-hidden="true">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      <div className="profile-heading">
        <h1 id="active-tab-title">{displayName}</h1>
        <p>
          {user
            ? isVerified
              ? "Verified human"
              : "Identity not verified yet"
            : isMiniKitInitializing
              ? "Connecting to World App..."
            : "Connect your World wallet to start"}
        </p>
      </div>

      {isVerified ? (
        <div className="verified-status" role="status">
          <span aria-hidden="true">✓</span>
          Verified
        </div>
      ) : user ? (
        <button
          type="button"
          className="primary-action"
          disabled={isBusy}
          onClick={onVerify}
        >
          {status === "verifying" ? "Verifying..." : "Verify identity"}
        </button>
      ) : (
        <button
          type="button"
          className="primary-action"
          disabled={isBusy || isMiniKitInitializing || !isWorldApp}
          onClick={onConnectWallet}
        >
          {status === "authenticating" || isMiniKitInitializing
            ? "Connecting..."
            : "Connect World wallet"}
        </button>
      )}

      {miniKitInstallState === false ? (
        <p className="profile-note">
          Open Sentia inside World App to connect and verify.
        </p>
      ) : null}

      {error ? <p className="profile-error">{error}</p> : null}
    </div>
  );
}

function getInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "S";
}
