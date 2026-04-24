"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
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
  rewardAmount: string;
  rewardToken: string;
};

type EarningsSummary = {
  available: string;
  processing: string;
  totalPaid: string;
};

type PaidOperation = {
  id: string;
  amount: string;
  token: string;
  paidAt: string;
};

type EarningsData = {
  summary: EarningsSummary;
  paidOperations: PaidOperation[];
};

type ProfileUser = {
  id: string;
  wallet_address: string | null;
  world_username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  verification_status: "unverified" | "verified" | "blocked";
  verified_at: string | null;
  builder_access_status: "none" | "granted";
  builder_access_granted_at: string | null;
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
  | "builder_access"
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
  const [earningsRefreshKey, setEarningsRefreshKey] = useState(0);

  const refreshEarnings = useCallback(() => {
    setEarningsRefreshKey((currentKey) => currentKey + 1);
  }, []);

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

  const unlockBuilderAccess = useCallback(
    async (code: string) => {
      setError(null);
      setStatus("builder_access");

      try {
        const response = await fetch("/api/profile/builder-access", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Could not unlock builder access.");
        }

        setUser(data.user);
        void loadProfile();
      } catch (builderError) {
        setError(
          builderError instanceof Error
            ? builderError.message
            : "Could not unlock builder access.",
        );
        throw builderError;
      } finally {
        setStatus("idle");
      }
    },
    [loadProfile],
  );

  return (
    <main className="app-shell" data-active-tab={activeTab}>
      <section className="tab-panel" aria-labelledby="active-tab-title">
        {activeTab === "Feed" ? (
          <FeedPanel
            onBuilderAccess={unlockBuilderAccess}
            onEarningsChanged={refreshEarnings}
          />
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
          <EarningsPanel
            isActive={activeTab === "Earnings"}
            refreshKey={earningsRefreshKey}
            onClaimed={refreshEarnings}
          />
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

function FeedPanel({
  onBuilderAccess,
  onEarningsChanged,
}: {
  onBuilderAccess: (code: string) => void;
  onEarningsChanged: () => void;
}) {
  const feedRef = useRef<HTMLDivElement>(null);
  const activeFeedItemIdRef = useRef<string | null>(null);
  const tasksRef = useRef<FeedTask[]>([]);
  const selectedAnswersRef = useRef<Record<string, string | null>>({});
  const submittingTaskIdsRef = useRef<Record<string, boolean>>({});
  const submittedTaskIdsRef = useRef<Record<string, boolean>>({});
  const [isBuilderAccessOpen, setIsBuilderAccessOpen] = useState(false);
  const [builderAccessCode, setBuilderAccessCode] = useState("");
  const [isBuilderAccessSubmitting, setIsBuilderAccessSubmitting] =
    useState(false);
  const [tasks, setTasks] = useState<FeedTask[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string | null>
  >({});
  const [submittingTaskIds, setSubmittingTaskIds] = useState<
    Record<string, boolean>
  >({});
  const [submittedTaskIds, setSubmittedTaskIds] = useState<
    Record<string, boolean>
  >({});
  const [earnedBump, setEarnedBump] = useState<{
    taskId: string;
    amount: string;
    token: string;
    animationKey: number;
  } | null>(null);
  const [availableBalance, setAvailableBalance] = useState("0");
  const [isLoading, setIsLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);

  const removeTask = useCallback((taskId: string) => {
    delete submittingTaskIdsRef.current[taskId];
    delete submittedTaskIdsRef.current[taskId];
    setTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== taskId),
    );
    setSelectedAnswers((currentAnswers) => {
      const nextAnswers = { ...currentAnswers };
      delete nextAnswers[taskId];
      return nextAnswers;
    });
    setSubmittedTaskIds((currentIds) => {
      const nextIds = { ...currentIds };
      delete nextIds[taskId];
      return nextIds;
    });
  }, []);

  const scrollToFeedItem = useCallback((itemId: string | null) => {
    if (!itemId) {
      return;
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const feed = feedRef.current;
        const target = feed?.querySelector<HTMLElement>(
          `[data-feed-item-id="${itemId}"]`,
        );

        target?.scrollIntoView({ block: "start", behavior: "auto" });
      });
    });
  }, []);

  const scrollFeedToStart = useCallback(() => {
    window.requestAnimationFrame(() => {
      feedRef.current?.scrollTo({ top: 0, behavior: "auto" });
    });
  }, []);

  const loadFeedTasks = useCallback(async () => {
    setIsLoading(true);
    setFeedError(null);

    try {
      const response = await fetch("/api/tasks/feed");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not load feed tasks.");
      }

      setTasks(data.tasks ?? []);
    } catch (error) {
      setFeedError(
        error instanceof Error ? error.message : "Could not load feed tasks.",
      );
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAvailableBalance = useCallback(async () => {
    try {
      const response = await fetch("/api/earnings");
      const data = await response.json();

      if (!response.ok) {
        return;
      }

      setAvailableBalance(data.summary?.available ?? "0");
    } catch {
      setAvailableBalance("0");
    }
  }, []);

  const submitBuilderAccess = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsBuilderAccessSubmitting(true);

      try {
        await onBuilderAccess(builderAccessCode);
        setBuilderAccessCode("");
        setIsBuilderAccessOpen(false);
        await loadFeedTasks();
        await loadAvailableBalance();
      } catch (error) {
        setFeedError(
          error instanceof Error
            ? error.message
            : "Could not unlock builder access.",
        );
      } finally {
        setIsBuilderAccessSubmitting(false);
      }
    },
    [builderAccessCode, loadAvailableBalance, loadFeedTasks, onBuilderAccess],
  );

  useEffect(() => {
    void loadFeedTasks();
    void loadAvailableBalance();
  }, [loadAvailableBalance, loadFeedTasks]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    selectedAnswersRef.current = selectedAnswers;
  }, [selectedAnswers]);

  useEffect(() => {
    submittingTaskIdsRef.current = submittingTaskIds;
  }, [submittingTaskIds]);

  useEffect(() => {
    submittedTaskIdsRef.current = submittedTaskIds;
  }, [submittedTaskIds]);

  const toggleAnswer = useCallback((taskId: string, answer: string) => {
    setSelectedAnswers((currentAnswers) => {
      const nextAnswer = currentAnswers[taskId] === answer ? null : answer;

      return {
        ...currentAnswers,
        [taskId]: nextAnswer,
      };
    });
  }, []);

  const submitAnswer = useCallback(
    async (task: FeedTask, answer: string, scrollTargetId: string | null) => {
      if (
        submittingTaskIdsRef.current[task.id] ||
        submittedTaskIdsRef.current[task.id]
      ) {
        return;
      }

      setFeedError(null);
      submittingTaskIdsRef.current = {
        ...submittingTaskIdsRef.current,
        [task.id]: true,
      };
      submittedTaskIdsRef.current = {
        ...submittedTaskIdsRef.current,
        [task.id]: true,
      };
      setSubmittingTaskIds((currentIds) => ({
        ...currentIds,
        [task.id]: true,
      }));
      setSubmittedTaskIds((currentIds) => ({
        ...currentIds,
        [task.id]: true,
      }));

      try {
        const response = await fetch(`/api/tasks/${task.id}/responses`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ answer }),
        });
        const data = await response.json();

        if (!response.ok) {
          if (data.error === "already_completed") {
            removeTask(task.id);
            scrollToFeedItem(scrollTargetId);
            onEarningsChanged();
            void loadAvailableBalance();
            return;
          }

          if (response.status === 401 || data.error === "verification_required") {
            throw new Error("Connect and verify your profile before answering.");
          }

          throw new Error(data.error ?? "Could not submit answer.");
        }

        setEarnedBump({
          taskId: task.id,
          amount: task.rewardAmount,
          token: task.rewardToken,
          animationKey: Date.now(),
        });
        window.setTimeout(() => {
          removeTask(task.id);
          scrollToFeedItem(scrollTargetId);
          onEarningsChanged();
          void loadAvailableBalance();
        }, 260);
      } catch (error) {
        setFeedError(
          error instanceof Error ? error.message : "Could not submit answer.",
        );
        scrollFeedToStart();
        const nextSubmittedTaskIds = { ...submittedTaskIdsRef.current };
        delete nextSubmittedTaskIds[task.id];
        submittedTaskIdsRef.current = nextSubmittedTaskIds;
        setSubmittedTaskIds((currentIds) => {
          const nextIds = { ...currentIds };
          delete nextIds[task.id];
          return nextIds;
        });
      } finally {
        const nextSubmittingTaskIds = { ...submittingTaskIdsRef.current };
        delete nextSubmittingTaskIds[task.id];
        submittingTaskIdsRef.current = nextSubmittingTaskIds;
        setSubmittingTaskIds((currentIds) => {
          const nextIds = { ...currentIds };
          delete nextIds[task.id];
          return nextIds;
        });
      }
    },
    [
      loadAvailableBalance,
      onEarningsChanged,
      removeTask,
      scrollFeedToStart,
      scrollToFeedItem,
    ],
  );

  const submitTaskIfAnswered = useCallback(
    (taskId: string | null, scrollTargetId: string | null) => {
      if (!taskId || taskId === "feed-end") {
        return;
      }

      const task = tasksRef.current.find(
        (currentTask) => currentTask.id === taskId,
      );
      const answer = selectedAnswersRef.current[taskId];

      if (!task || !answer) {
        return;
      }

      void submitAnswer(task, answer, scrollTargetId);
    },
    [submitAnswer],
  );

  useEffect(() => {
    const feed = feedRef.current;

    if (!feed || tasks.length === 0) {
      activeFeedItemIdRef.current = null;
      return;
    }

    const feedItems = Array.from(
      feed.querySelectorAll<HTMLElement>("[data-feed-item-id]"),
    );

    const observer = new IntersectionObserver(
      (entries) => {
        const activeEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (first, second) =>
              second.intersectionRatio - first.intersectionRatio,
          )[0];
        const nextItemId = activeEntry?.target.getAttribute("data-feed-item-id");

        if (!nextItemId || activeFeedItemIdRef.current === nextItemId) {
          return;
        }

        const previousItemId = activeFeedItemIdRef.current;
        activeFeedItemIdRef.current = nextItemId;

        if (!previousItemId) {
          return;
        }

        const previousTaskIndex = tasksRef.current.findIndex(
          (task) => task.id === previousItemId,
        );
        const nextTaskIndex =
          nextItemId === "feed-end"
            ? tasksRef.current.length
            : tasksRef.current.findIndex((task) => task.id === nextItemId);

        if (previousTaskIndex === -1 || nextTaskIndex <= previousTaskIndex) {
          return;
        }

        submitTaskIfAnswered(previousItemId, nextItemId);
      },
      {
        root: feed,
        threshold: [0.65],
      },
    );

    feedItems.forEach((item) => observer.observe(item));

    return () => {
      observer.disconnect();
    };
  }, [submitTaskIfAnswered, tasks]);

  useEffect(() => {
    if (!earnedBump) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setEarnedBump(null);
    }, 1100);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [earnedBump]);

  return (
    <div className="feed-shell">
      <div className="feed-panel" ref={feedRef}>
        <h1 id="active-tab-title" className="sr-only">
          Feed
        </h1>

        {isLoading ? (
          <FeedStatusCard message="Loading feed..." />
        ) : feedError ? (
          <FeedStatusCard
            message={feedError}
            showBuilderAccess={
              feedError === "Connect and verify your profile before answering."
            }
            isBuilderAccessOpen={isBuilderAccessOpen}
            builderAccessCode={builderAccessCode}
            isBuilderAccessSubmitting={isBuilderAccessSubmitting}
            onOpenBuilderAccess={() => setIsBuilderAccessOpen(true)}
            onBuilderAccessCodeChange={setBuilderAccessCode}
            onSubmitBuilderAccess={submitBuilderAccess}
          />
        ) : tasks.length === 0 ? (
          <FeedStatusCard message="No new tasks available. Come back later." />
        ) : (
          <>
            {tasks.map((task) => (
              <FeedTaskCard
                key={task.id}
                task={task}
                availableBalance={availableBalance}
                selectedAnswer={selectedAnswers[task.id] ?? null}
                isSubmitting={submittingTaskIds[task.id] === true}
                earnedBump={
                  earnedBump?.taskId === task.id ? earnedBump : null
                }
                onToggleAnswer={toggleAnswer}
              />
            ))}
            <FeedStatusCard message="No new tasks available. Come back later." />
          </>
        )}
      </div>
    </div>
  );
}

function FeedStatusCard({
  message,
  showBuilderAccess = false,
  isBuilderAccessOpen = false,
  builderAccessCode = "",
  isBuilderAccessSubmitting = false,
  onOpenBuilderAccess,
  onBuilderAccessCodeChange,
  onSubmitBuilderAccess,
}: {
  message: string;
  showBuilderAccess?: boolean;
  isBuilderAccessOpen?: boolean;
  builderAccessCode?: string;
  isBuilderAccessSubmitting?: boolean;
  onOpenBuilderAccess?: () => void;
  onBuilderAccessCodeChange?: (code: string) => void;
  onSubmitBuilderAccess?: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <article className="feed-card feed-status-card" data-feed-item-id="feed-end">
      <p>{message}</p>
      {showBuilderAccess ? (
        isBuilderAccessOpen ? (
          <form
            className="builder-access-form"
            onSubmit={onSubmitBuilderAccess}
          >
            <input
              type="password"
              value={builderAccessCode}
              disabled={isBuilderAccessSubmitting}
              autoComplete="off"
              aria-label="Builder access password"
              placeholder="Password"
              onChange={(event) =>
                onBuilderAccessCodeChange?.(event.target.value)
              }
            />
            <button
              type="submit"
              className="secondary-action"
              disabled={isBuilderAccessSubmitting || builderAccessCode.length === 0}
            >
              {isBuilderAccessSubmitting ? "Checking..." : "Access"}
            </button>
          </form>
        ) : (
          <button
            type="button"
            className="secondary-action"
            onClick={onOpenBuilderAccess}
          >
            World3 Builder? Access the app.
          </button>
        )
      ) : null}
    </article>
  );
}

function FeedTaskCard({
  task,
  availableBalance,
  selectedAnswer,
  isSubmitting,
  earnedBump,
  onToggleAnswer,
}: {
  task: FeedTask;
  availableBalance: string;
  selectedAnswer: string | null;
  isSubmitting: boolean;
  earnedBump: {
    amount: string;
    token: string;
    animationKey: number;
  } | null;
  onToggleAnswer: (taskId: string, answer: string) => void;
}) {
  const requesterInitial = task.requesterName[0]?.toUpperCase() ?? "S";
  const companyLogoPath = getCompanyLogoPath(task.requesterName);

  return (
    <article
      className="feed-card feed-task-card"
      data-feed-task-id={task.id}
      data-feed-item-id={task.id}
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
            <span className="feed-task-reward">
              +{formatTokenAmount(task.rewardAmount)} {task.rewardToken}
            </span>
          </p>
        </div>

        <div className="feed-balance-wrap" aria-live="polite">
          <div className="feed-balance-pill">
            {formatTokenAmount(availableBalance)} WLD
          </div>
          {earnedBump ? (
            <span key={earnedBump.animationKey} className="feed-balance-bump">
              +{formatTokenAmount(earnedBump.amount)} {earnedBump.token}
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
              disabled={isSubmitting}
              onClick={() => onToggleAnswer(task.id, option.value)}
            >
              {isSubmitting && selectedAnswer === option.value
                ? "..."
                : option.label}
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

function formatTokenAmount(amount: string) {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return amount;
  }

  return numericAmount.toFixed(2).replace(/\.?0+$/, "");
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

function EarningsPanel({
  isActive,
  refreshKey,
  onClaimed,
}: {
  isActive: boolean;
  refreshKey: number;
  onClaimed: () => void;
}) {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [earningsError, setEarningsError] = useState<string | null>(null);

  const loadEarnings = useCallback(async () => {
    setIsLoading(true);
    setEarningsError(null);

    try {
      const response = await fetch("/api/earnings");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not load earnings.");
      }

      setEarnings(data);
    } catch (error) {
      setEarningsError(
        error instanceof Error ? error.message : "Could not load earnings.",
      );
      setEarnings(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    void loadEarnings();
  }, [isActive, loadEarnings, refreshKey]);

  const claimEarnings = useCallback(async () => {
    setIsClaiming(true);
    setEarningsError(null);

    try {
      const response = await fetch("/api/earnings/claim", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 || data.error === "verification_required") {
          throw new Error("Connect and verify your profile before claiming.");
        }

        throw new Error(data.error ?? "Could not claim earnings.");
      }

      onClaimed();
      await loadEarnings();
    } catch (error) {
      setEarningsError(
        error instanceof Error ? error.message : "Could not claim earnings.",
      );
    } finally {
      setIsClaiming(false);
    }
  }, [loadEarnings, onClaimed]);

  const summary = earnings?.summary ?? {
    available: "0",
    processing: "0",
    totalPaid: "0",
  };
  const canClaim = Number(summary.available) > 0 && !isClaiming;

  return (
    <div className="earnings-panel">
      <p className="eyebrow">Sentia</p>
      <h1 id="active-tab-title">Earnings</h1>

      <section className="earnings-summary" aria-label="Earnings summary">
        <EarningsMetric
          label="Available to claim"
          value={`${formatTokenAmount(summary.available)} WLD`}
        />
        <EarningsMetric
          label="Processing"
          value={`${formatTokenAmount(summary.processing)} WLD`}
        />
        <EarningsMetric
          label="Total paid"
          value={`${formatTokenAmount(summary.totalPaid)} WLD`}
        />
      </section>

      <button
        type="button"
        className="primary-action"
        disabled={!canClaim || isLoading}
        onClick={claimEarnings}
      >
        {isClaiming ? "Claiming..." : "Claim"}
      </button>

      {earningsError ? <p className="profile-error">{earningsError}</p> : null}

      <section className="paid-operations" aria-label="Paid operations">
        <h2>Paid operations</h2>
        {isLoading ? (
          <p className="earnings-muted">Loading earnings...</p>
        ) : earnings?.paidOperations.length ? (
          <ul>
            {earnings.paidOperations.map((operation) => (
              <li key={operation.id}>
                <span>
                  {formatTokenAmount(operation.amount)} {operation.token}
                </span>
                <time dateTime={operation.paidAt}>
                  {formatOperationDate(operation.paidAt)}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="earnings-muted">No paid operations yet.</p>
        )}
      </section>
    </div>
  );
}

function EarningsMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="earnings-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function formatOperationDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
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
  const hasBuilderAccess = user?.builder_access_status === "granted";
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
    status === "verifying" ||
    status === "builder_access";
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
              : hasBuilderAccess
                ? "Identity not verified yet"
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
        <div className="profile-actions">
          {hasBuilderAccess ? (
            <div className="builder-status" role="status">
              <span aria-hidden="true">✓</span>
              World3 hacker
            </div>
          ) : null}

          <button
            type="button"
            className="primary-action"
            disabled={isBusy}
            onClick={onVerify}
          >
            {status === "verifying" ? "Verifying..." : "Verify identity"}
          </button>
        </div>
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
