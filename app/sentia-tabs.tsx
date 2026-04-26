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
import {
  getIntlLocale,
  getResponseOptionLabel,
  getTaskPrompt,
  isLocale,
  localizeServerError,
  translate,
  type Locale,
} from "@/lib/i18n";
import { isMockAdminEnabled, isMockAdminUser } from "@/lib/mock-admin";
import {
  ChevronDown,
  ListChecks,
  UserRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

const tabs = ["Feed", "Earnings", "Profile"] as const;
type Tab = (typeof tabs)[number];

const tabItems: Record<
  Tab,
  { Icon: LucideIcon; labelKey: "feed" | "earn" | "profile" }
> = {
  Feed: { Icon: ListChecks, labelKey: "feed" },
  Earnings: { Icon: WalletCards, labelKey: "earn" },
  Profile: { Icon: UserRound, labelKey: "profile" },
};
const companyLogoPaths: Record<string, string> = {
  adahealth: "/demo/feed-cards/company-profile-pics/ada-health.png",
  airbnb: "/demo/feed-cards/company-profile-pics/airbnb.png",
  amazon: "/demo/feed-cards/company-profile-pics/amazon.png",
  anthropic: "/demo/feed-cards/company-profile-pics/anthropic.png",
  appstore: "/demo/feed-cards/company-profile-pics/app-store.png",
  arbitrumdao: "/demo/feed-cards/company-profile-pics/arbitrum-dao.png",
  behance: "/demo/feed-cards/company-profile-pics/behance.png",
  canva: "/demo/feed-cards/company-profile-pics/canva.png",
  changeorg: "/demo/feed-cards/company-profile-pics/change-org.png",
  characterai: "/demo/feed-cards/company-profile-pics/character-ai.png",
  citizen: "/demo/feed-cards/company-profile-pics/citizen.png",
  cocacola: "/demo/feed-cards/company-profile-pics/coca-cola.png",
  coursera: "/demo/feed-cards/company-profile-pics/coursera.png",
  discord: "/demo/feed-cards/company-profile-pics/discord.png",
  doordash: "/demo/feed-cards/company-profile-pics/doordash.png",
  duolingo: "/demo/feed-cards/company-profile-pics/duolingo.png",
  ebay: "/demo/feed-cards/company-profile-pics/ebay.png",
  epicgames: "/demo/feed-cards/company-profile-pics/epic-games.png",
  etsy: "/demo/feed-cards/company-profile-pics/etsy.png",
  gitcoin: "/demo/feed-cards/company-profile-pics/gitcoin.png",
  googledeepmind: "/demo/feed-cards/company-profile-pics/google-deepmind.png",
  googlemaps: "/demo/feed-cards/company-profile-pics/google-maps.png",
  googlesearch: "/demo/feed-cards/company-profile-pics/google-search.png",
  huel: "/demo/feed-cards/company-profile-pics/huel.png",
  huggingface: "/demo/feed-cards/company-profile-pics/hugging-face.png",
  instagram: "/demo/feed-cards/company-profile-pics/instagram.png",
  intercom: "/demo/feed-cards/company-profile-pics/intercom.png",
  khanacademy: "/demo/feed-cards/company-profile-pics/khan-academy.png",
  layer3: "/demo/feed-cards/company-profile-pics/layer3.png",
  linear: "/demo/feed-cards/company-profile-pics/linear.png",
  linkedin: "/demo/feed-cards/company-profile-pics/linkedin.png",
  metaads: "/demo/feed-cards/company-profile-pics/meta-ads.png",
  metaai: "/demo/feed-cards/company-profile-pics/meta-ai.png",
  mistral: "/demo/feed-cards/company-profile-pics/mistral.png",
  mistralai: "/demo/feed-cards/company-profile-pics/mistral-ai.png",
  niketrainingclub: "/demo/feed-cards/company-profile-pics/nike-training-club.png",
  notion: "/demo/feed-cards/company-profile-pics/notion.png",
  openai: "/demo/feed-cards/company-profile-pics/openai.png",
  perplexity: "/demo/feed-cards/company-profile-pics/perplexity.png",
  reddit: "/demo/feed-cards/company-profile-pics/reddit.png",
  reuters: "/demo/feed-cards/company-profile-pics/reuters.png",
  revolut: "/demo/feed-cards/company-profile-pics/revolut.png",
  roblox: "/demo/feed-cards/company-profile-pics/roblox.png",
  runway: "/demo/feed-cards/company-profile-pics/runway.png",
  scaleai: "/demo/feed-cards/company-profile-pics/scale-ai.png",
  shopify: "/demo/feed-cards/company-profile-pics/shopify.png",
  spotify: "/demo/feed-cards/company-profile-pics/spotify.png",
  stackoverflow: "/demo/feed-cards/company-profile-pics/stack-overflow.png",
  strava: "/demo/feed-cards/company-profile-pics/strava.png",
  stripe: "/demo/feed-cards/company-profile-pics/stripe.png",
  teslaai: "/demo/feed-cards/company-profile-pics/tesla-ai.png",
  tiktok: "/demo/feed-cards/company-profile-pics/tiktok.png",
  twitch: "/demo/feed-cards/company-profile-pics/twitch.png",
  webflow: "/demo/feed-cards/company-profile-pics/webflow.png",
  worldapp: "/demo/feed-cards/company-profile-pics/world-app.png",
  worldcoin: "/demo/feed-cards/company-profile-pics/worldcoin.png",
  youtubekids: "/demo/feed-cards/company-profile-pics/youtube-kids.png",
  zendesk: "/demo/feed-cards/company-profile-pics/zendesk.png",
};

type FeedTask = {
  id: string;
  demoSourceId: number | null;
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

type PayoutMode = "mock" | "real";

type PaidOperation = {
  id: string;
  amount: string;
  token: string;
  paidAt: string;
  payoutMode?: PayoutMode;
  mockTxId?: string | null;
  txHash?: string | null;
  worldscanUrl?: string | null;
  requesterName: string | null;
};

type EarningsData = {
  payoutMode: PayoutMode;
  summary: EarningsSummary;
  paidOperations: PaidOperation[];
};

type ClaimIntentResponse =
  | {
      claimRequired: false;
      payoutMode: "real";
      claim: null;
      message: null;
    }
  | {
      claimRequired: true;
      intentId: string;
      message: string;
      claim: {
        earningIds: string[];
        earningIdsHash: string;
        amountWei: string;
        amountFormatted: string;
        nonce: string | number;
        deadline: number;
        vaultAddress: string;
        chainId: number;
        tokenAddress: string;
      };
    };

type SignMessageSuccess = {
  status: "success";
  signature: string;
  address: string;
};

type ErrorResponse = {
  error?: unknown;
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

type ProfileStats = {
  completedTasks: number;
  reliabilityPercent: number;
  streakDays: number;
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

type MockAdminAction = "reset_users" | "reset_tasks" | "pay_tasks";
type TFunction = (
  key: Parameters<typeof translate>[1],
  values?: Parameters<typeof translate>[2],
) => string;
type ServerErrorFunction = (
  message: unknown,
  fallbackKey: Parameters<typeof translate>[1],
) => string;

function isSignMessageSuccess(value: unknown): value is SignMessageSuccess {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    value.status === "success" &&
    "signature" in value &&
    typeof value.signature === "string" &&
    "address" in value &&
    typeof value.address === "string"
  );
}

function getErrorCode(value: unknown) {
  return typeof value === "object" && value !== null && "error" in value
    ? value.error
    : undefined;
}

function isClaimWalletError(error: unknown) {
  return (
    error === "invalid_claim_signature" ||
    error === "claim_signer_wallet_mismatch" ||
    error === "claim_wallet_changed"
  );
}

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
  const [locale, setLocale] = useState<Locale>("en");
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null);
  const [previewProfile, setPreviewProfile] =
    useState<MiniKitPreviewProfile | null>(null);
  const [worldConfig, setWorldConfig] = useState<WorldConfig | null>(null);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [status, setStatus] = useState<ProfileStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [earningsRefreshKey, setEarningsRefreshKey] = useState(0);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const t = useCallback(
    (
      key: Parameters<typeof translate>[1],
      values?: Parameters<typeof translate>[2],
    ) => translate(locale, key, values),
    [locale],
  );
  const serverError = useCallback(
    (message: unknown, fallbackKey: Parameters<typeof translate>[1]) =>
      localizeServerError(locale, message, fallbackKey),
    [locale],
  );

  useEffect(() => {
    const savedLocale = window.localStorage.getItem("sentia-locale");

    if (isLocale(savedLocale)) {
      setLocale(savedLocale);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("sentia-locale", locale);
    document.documentElement.lang = locale === "ko" ? "ko" : "en";
  }, [locale]);

  const refreshEarnings = useCallback(() => {
    setEarningsRefreshKey((currentKey) => currentKey + 1);
  }, []);

  const handleTabChange = useCallback(
    (tab: Tab) => {
      if (tab === activeTab) {
        return;
      }

      void MiniKit.sendHapticFeedback({
        hapticsType: "selection-changed",
        fallback: () => {
          navigator.vibrate?.(10);

          return {
            status: "success",
            version: 1,
            timestamp: new Date().toISOString(),
          };
        },
      }).catch(() => {
        // Haptics are optional; tab navigation should never wait on them.
      });

      setActiveTab(tab);
    },
    [activeTab],
  );

  const markTaskCompleted = useCallback(() => {
    refreshEarnings();
  }, [refreshEarnings]);

  const refreshFeed = useCallback(() => {
    setFeedRefreshKey((currentKey) => currentKey + 1);
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
        throw new Error(serverError(profile.error, "errorLoadProfile"));
      }

      if (!configResponse.ok) {
        throw new Error(serverError(config.error, "errorLoadWorldConfig"));
      }

      setUser(profile.user);
      setProfileStats(profile.stats);
      setWorldConfig(config);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t("errorLoadProfile"),
      );
    } finally {
      setStatus("idle");
    }
  }, [serverError, t]);

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
          ? t("errorWorldConnecting")
          : t("errorOpenWorldApp"),
      );
      setStatus("idle");
      return;
    }

    try {
      const nonceResponse = await fetch("/api/auth/nonce", { method: "POST" });
      const { nonce, error: nonceError } = await nonceResponse.json();

      if (!nonceResponse.ok) {
        throw new Error(serverError(nonceError, "errorCreateNonce"));
      }

      const result = await MiniKit.walletAuth({
        nonce,
        statement: WALLET_AUTH_STATEMENT,
        expirationTime: new Date(Date.now() + 1000 * 60 * 10),
        fallback: () => null,
      });

      if (result.executedWith === "fallback") {
        throw new Error(t("errorWalletAuthWorldApp"));
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
        throw new Error(serverError(data.error, "errorCompleteWalletAuth"));
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
          : t("errorConnectWallet"),
      );
    } finally {
      setStatus("idle");
    }
  }, [isInstalled, loadProfile, serverError, t]);

  const logout = useCallback(async () => {
    setError(null);
    setStatus("logging_out");

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(serverError(data.error, "errorLogOut"));
      }

      setUser(null);
      setProfileStats(null);
      setPreviewProfile(null);
      setRpContext(null);
      setIsVerifyOpen(false);
    } catch (logoutError) {
      setError(
        logoutError instanceof Error ? logoutError.message : t("errorLogOut"),
      );
    } finally {
      setStatus("idle");
    }
  }, [serverError, t]);

  const runMockAdminAction = useCallback(
    async (action: MockAdminAction) => {
      const response = await fetch("/api/mock-admin/actions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(serverError(data.error, "errorMockAdmin"));
      }

      if (action === "reset_users") {
        setUser(null);
        setProfileStats(null);
        setPreviewProfile(null);
        setRpContext(null);
        setIsVerifyOpen(false);
        refreshEarnings();
        refreshFeed();
        return t("usersReset");
      }

      if (action === "reset_tasks") {
        await loadProfile();
        refreshEarnings();
        refreshFeed();
        return t("userTasksReset");
      }

      await loadProfile();
      refreshEarnings();
      return t("processingTasksPaid");
    },
    [loadProfile, refreshEarnings, refreshFeed, serverError, t],
  );

  const startVerification = useCallback(async () => {
    setError(null);

    if (!user) {
      setError(t("errorConnectBeforeVerify"));
      return;
    }

    if (!worldConfig?.appId || !worldConfig.rpId) {
      setError(t("errorMissingWorldConfig"));
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
        throw new Error(serverError(signature.error, "errorPrepareVerification"));
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
          : t("errorStartVerification"),
      );
    }
  }, [serverError, t, user, worldConfig]);

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
      throw new Error(serverError(data.error, "errorVerificationFailed"));
    }

    setUser(data.user);
    setStatus("idle");
  }, [serverError]);

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
          throw new Error(serverError(data.error, "errorUnlockBuilder"));
        }

        setUser(data.user);
        void loadProfile();
      } catch (builderError) {
        setError(
          builderError instanceof Error
            ? builderError.message
            : t("errorUnlockBuilder"),
        );
        throw builderError;
      } finally {
        setStatus("idle");
      }
    },
    [loadProfile, serverError, t],
  );

  return (
    <main className="app-shell" data-active-tab={activeTab}>
      <section className="tab-panel" aria-labelledby="active-tab-title">
        {activeTab === "Feed" ? (
          <FeedPanel
            key={feedRefreshKey}
            locale={locale}
            t={t}
            serverError={serverError}
            onBuilderAccess={unlockBuilderAccess}
            onEarningsChanged={refreshEarnings}
            onTaskCompleted={markTaskCompleted}
          />
        ) : activeTab === "Profile" ? (
          <ProfilePanel
            user={user}
            stats={profileStats}
            previewProfile={previewProfile}
            miniKitInstallState={isInstalled}
            status={status}
            error={error}
            locale={locale}
            t={t}
            onLocaleChange={setLocale}
            onConnectWallet={connectWallet}
            onVerify={startVerification}
            onLogout={logout}
            onMockAdminAction={runMockAdminAction}
          />
        ) : (
          <EarningsPanel
            isActive={activeTab === "Earnings"}
            locale={locale}
            t={t}
            serverError={serverError}
            refreshKey={earningsRefreshKey}
            onClaimed={refreshEarnings}
          />
        )}
      </section>

      <nav className="tab-bar" aria-label={t("primaryNavigation")}>
        {tabs.map((tab) => {
          const { Icon, labelKey } = tabItems[tab];
          const label = t(labelKey);

          return (
            <button
              key={tab}
              type="button"
              className="tab-button"
              data-active={activeTab === tab}
              aria-current={activeTab === tab ? "page" : undefined}
              onClick={() => handleTabChange(tab)}
            >
              <Icon className="tab-icon" aria-hidden="true" />
              <span className="tab-label">{label}</span>
            </button>
          );
        })}
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
            setError(null);
            console.warn("World ID verification failed", errorCode);
          }}
        />
      ) : null}
    </main>
  );
}

function FeedPanel({
  locale,
  t,
  serverError,
  onBuilderAccess,
  onEarningsChanged,
  onTaskCompleted,
}: {
  locale: Locale;
  t: TFunction;
  serverError: ServerErrorFunction;
  onBuilderAccess: (code: string) => void;
  onEarningsChanged: () => void;
  onTaskCompleted: () => void;
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
        throw new Error(serverError(data.error, "errorLoadFeed"));
      }

      setTasks(data.tasks ?? []);
    } catch (error) {
      setFeedError(
        error instanceof Error ? error.message : t("errorLoadFeed"),
      );
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [serverError, t]);

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
            : t("errorUnlockBuilder"),
        );
      } finally {
        setIsBuilderAccessSubmitting(false);
      }
    },
    [
      builderAccessCode,
      loadAvailableBalance,
      loadFeedTasks,
      onBuilderAccess,
      t,
    ],
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
            throw new Error(t("errorVerifyBeforeAnswer"));
          }

          throw new Error(serverError(data.error, "errorSubmitAnswer"));
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
          onTaskCompleted();
          void loadAvailableBalance();
        }, 260);
      } catch (error) {
        setFeedError(
          error instanceof Error ? error.message : t("errorSubmitAnswer"),
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
      onTaskCompleted,
      removeTask,
      scrollFeedToStart,
      scrollToFeedItem,
      serverError,
      t,
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
          {t("feed")}
        </h1>

        {isLoading ? (
          <FeedStatusCard message={t("loadingFeed")} t={t} />
        ) : feedError ? (
          <FeedStatusCard
            message={feedError}
            showBuilderAccess={
              feedError === t("errorVerifyBeforeAnswer")
            }
            t={t}
            isBuilderAccessOpen={isBuilderAccessOpen}
            builderAccessCode={builderAccessCode}
            isBuilderAccessSubmitting={isBuilderAccessSubmitting}
            onOpenBuilderAccess={() => setIsBuilderAccessOpen(true)}
            onBuilderAccessCodeChange={setBuilderAccessCode}
            onSubmitBuilderAccess={submitBuilderAccess}
          />
        ) : tasks.length === 0 ? (
          <FeedStatusCard message={t("noTasks")} t={t} />
        ) : (
          <>
            {tasks.map((task) => (
              <FeedTaskCard
                key={task.id}
                task={task}
                locale={locale}
                t={t}
                availableBalance={availableBalance}
                selectedAnswer={selectedAnswers[task.id] ?? null}
                isSubmitting={submittingTaskIds[task.id] === true}
                earnedBump={
                  earnedBump?.taskId === task.id ? earnedBump : null
                }
                onToggleAnswer={toggleAnswer}
              />
            ))}
            <FeedStatusCard message={t("noTasks")} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

function FeedStatusCard({
  message,
  t,
  showBuilderAccess = false,
  isBuilderAccessOpen = false,
  builderAccessCode = "",
  isBuilderAccessSubmitting = false,
  onOpenBuilderAccess,
  onBuilderAccessCodeChange,
  onSubmitBuilderAccess,
}: {
  message: string;
  t: TFunction;
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
              aria-label={t("builderPassword")}
              placeholder={t("password")}
              onChange={(event) =>
                onBuilderAccessCodeChange?.(event.target.value)
              }
            />
            <button
              type="submit"
              className="secondary-action"
              disabled={isBuilderAccessSubmitting || builderAccessCode.length === 0}
            >
              {isBuilderAccessSubmitting ? t("checking") : t("access")}
            </button>
          </form>
        ) : (
          <button
            type="button"
            className="secondary-action"
            onClick={onOpenBuilderAccess}
          >
            {t("builderAccessCta")}
          </button>
        )
      ) : null}
    </article>
  );
}

function FeedTaskCard({
  task,
  locale,
  t,
  availableBalance,
  selectedAnswer,
  isSubmitting,
  earnedBump,
  onToggleAnswer,
}: {
  task: FeedTask;
  locale: Locale;
  t: TFunction;
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
        <div className="feed-requester-lockup">
          <span className="feed-card-logo" aria-hidden="true">
            {companyLogoPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={companyLogoPath} alt="" />
            ) : (
              requesterInitial
            )}
          </span>
          <div className="feed-card-meta">
            <p>{task.requesterName}</p>
            <span className="feed-reward-line">
              {t("reward", {
                amount: formatTokenAmount(task.rewardAmount),
                token: task.rewardToken,
              })}
            </span>
          </div>
        </div>

        <div className="feed-claim-total" aria-live="polite">
          <span>{t("toClaim")}</span>
          <strong>{formatTokenAmount(availableBalance)} WLD</strong>
          {earnedBump ? (
            <span key={earnedBump.animationKey} className="feed-balance-bump">
              +{formatTokenAmount(earnedBump.amount)} {earnedBump.token}
            </span>
          ) : null}
        </div>
      </header>

      <section className="feed-card-question" aria-label={t("taskQuestion")}>
        <p>{getTaskPrompt(locale, task.demoSourceId, task.prompt)}</p>
      </section>

      <div className="feed-card-image-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={task.imagePath} alt="" className="feed-card-image-blur" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={task.imagePath} alt="" className="feed-card-image" />
      </div>

      <section className="feed-card-answer" aria-label={t("taskAnswer")}>
        <div className="feed-answer-buttons">
          {getVisibleResponseOptions(task, locale).map((option) => (
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
        <p>{t("submitHint")}</p>
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

function getVisibleResponseOptions(task: FeedTask, locale: Locale) {
  if (task.responseType === "thumbs") {
    return task.responseOptions.map((option) => ({
      value: option,
      label: option === "thumbs_down" ? "👎" : "👍",
    }));
  }

  return task.responseOptions.map((option) => ({
    value: option,
    label: getResponseOptionLabel(locale, option),
  }));
}

function EarningsPanel({
  isActive,
  locale,
  t,
  serverError,
  refreshKey,
  onClaimed,
}: {
  isActive: boolean;
  locale: Locale;
  t: TFunction;
  serverError: ServerErrorFunction;
  refreshKey: number;
  onClaimed: () => void;
}) {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [earningsError, setEarningsError] = useState<string | null>(null);
  const [arePaidOperationsExpanded, setArePaidOperationsExpanded] =
    useState(true);

  const loadEarnings = useCallback(async () => {
    setIsLoading(true);
    setEarningsError(null);

    try {
      const response = await fetch("/api/earnings");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(serverError(data.error, "errorLoadEarnings"));
      }

      setEarnings(data);
    } catch (error) {
      setEarningsError(
        error instanceof Error ? error.message : t("errorLoadEarnings"),
      );
      setEarnings(null);
    } finally {
      setIsLoading(false);
    }
  }, [serverError, t]);

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
      if (earnings?.payoutMode === "real") {
        const intentResponse = await fetch("/api/earnings/claim/intent");
        const intentData = (await intentResponse.json()) as
          | ClaimIntentResponse
          | ErrorResponse;
        const intentError = getErrorCode(intentData);

        if (!intentResponse.ok) {
          if (
            intentResponse.status === 401 ||
            intentError === "verification_required"
          ) {
            throw new Error(t("errorVerifyBeforeClaim"));
          }

          throw new Error(serverError(intentError, "errorClaimEarnings"));
        }

        if (!("claimRequired" in intentData) || !intentData.claimRequired) {
          onClaimed();
          await loadEarnings();
          return;
        }

        const signatureResult = await MiniKit.signMessage({
          message: intentData.message,
        });

        if (!isSignMessageSuccess(signatureResult.data)) {
          setEarningsError(t("claimSignatureCancelled"));
          return;
        }

        const response = await fetch("/api/earnings/claim", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            intentId: intentData.intentId,
            message: intentData.message,
            signature: signatureResult.data.signature,
            address: signatureResult.data.address,
          }),
        });
        const data = await response.json();
        const claimError = getErrorCode(data);

        if (!response.ok) {
          if (claimError === "verification_required") {
            throw new Error(t("errorVerifyBeforeClaim"));
          }

          if (isClaimWalletError(claimError)) {
            throw new Error(t("errorClaimWalletMismatch"));
          }

          throw new Error(serverError(claimError, "errorClaimEarnings"));
        }

        onClaimed();
        await loadEarnings();
        return;
      }

      const response = await fetch("/api/earnings/claim", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 || data.error === "verification_required") {
          throw new Error(t("errorVerifyBeforeClaim"));
        }

        throw new Error(serverError(data.error, "errorClaimEarnings"));
      }

      onClaimed();
      await loadEarnings();
    } catch (error) {
      setEarningsError(
        error instanceof Error ? error.message : t("errorClaimEarnings"),
      );
    } finally {
      setIsClaiming(false);
    }
  }, [earnings?.payoutMode, loadEarnings, onClaimed, serverError, t]);

  const summary = earnings?.summary ?? {
    available: "0",
    processing: "0",
    totalPaid: "0",
  };
  const canClaim = Number(summary.available) > 0 && !isClaiming;

  return (
    <div className="earnings-panel">
      <p className="eyebrow" id="active-tab-title">
        {t("earnings")}
      </p>

      <section className="earnings-summary" aria-label={t("earnings")}>
        <EarningsMetric
          label={t("toClaim")}
          value={formatTokenAmount(summary.available)}
          detail="WLD"
        />
        <EarningsMetric
          label={t("processing")}
          value={formatTokenAmount(summary.processing)}
          detail="WLD"
        />
        <EarningsMetric
          label={t("paid")}
          value={formatTokenAmount(summary.totalPaid)}
          detail="WLD"
        />
      </section>

      <button
        type="button"
        className="primary-action earnings-claim-action"
        disabled={!canClaim || isLoading}
        onClick={claimEarnings}
      >
        {isClaiming ? t("claiming") : t("claim")}
      </button>

      {earningsError ? <p className="profile-error">{earningsError}</p> : null}

      <section className="paid-operations" aria-label={t("paidOperations")}>
        <button
          type="button"
          className="paid-operations-toggle"
          aria-expanded={arePaidOperationsExpanded}
          aria-controls="paid-operations-content"
          onClick={() =>
            setArePaidOperationsExpanded((isExpanded) => !isExpanded)
          }
        >
          <span>{t("paidOperations")}</span>
          <ChevronDown aria-hidden="true" className="paid-operations-icon" />
        </button>
        {arePaidOperationsExpanded ? (
          <div id="paid-operations-content" className="paid-operations-content">
            {isLoading ? (
              <p className="earnings-muted">{t("loadingEarnings")}</p>
            ) : earnings?.paidOperations.length ? (
              <ul>
                {earnings.paidOperations.map((operation) => (
                  <li key={operation.id}>
                    <span>
                      {formatTokenAmount(operation.amount)} {operation.token}
                      {operation.requesterName
                        ? ` (${operation.requesterName})`
                        : ""}
                    </span>
                    <time dateTime={operation.paidAt}>
                      {formatOperationDate(operation.paidAt, locale)}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="earnings-muted">{t("noPaidOperations")}</p>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function EarningsMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="earnings-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function formatOperationDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function ProfilePanel({
  user,
  stats,
  previewProfile,
  miniKitInstallState,
  status,
  error,
  locale,
  t,
  onLocaleChange,
  onConnectWallet,
  onVerify,
  onLogout,
  onMockAdminAction,
}: {
  user: ProfileUser | null;
  stats: ProfileStats | null;
  previewProfile: MiniKitPreviewProfile | null;
  miniKitInstallState: boolean | undefined;
  status: ProfileStatus;
  error: string | null;
  locale: Locale;
  t: TFunction;
  onLocaleChange: (locale: Locale) => void;
  onConnectWallet: () => void;
  onVerify: () => void;
  onLogout: () => void;
  onMockAdminAction: (action: MockAdminAction) => Promise<string>;
}) {
  const [mockAdminTapCount, setMockAdminTapCount] = useState(0);
  const [isMockAdminOpen, setIsMockAdminOpen] = useState(false);
  const [mockAdminAction, setMockAdminAction] =
    useState<MockAdminAction | null>(null);
  const [mockAdminMessage, setMockAdminMessage] = useState<string | null>(null);
  const [mockAdminError, setMockAdminError] = useState<string | null>(null);
  const isVerified = user?.verification_status === "verified";
  const hasBuilderAccess = user?.builder_access_status === "granted";
  const canUseMockAdmin = isMockAdminEnabled() && isMockAdminUser(user);
  const displayName =
    user?.world_username ??
    user?.display_name ??
    previewProfile?.username ??
    t("guest");
  const avatarUrl = user?.avatar_url ?? previewProfile?.profilePictureUrl;
  const initials = useMemo(() => getInitials(displayName), [displayName]);
  const completedTasks = stats?.completedTasks ?? 0;
  const reliabilityPercent = stats?.reliabilityPercent ?? 0;
  const streakDays = stats?.streakDays ?? 0;
  const rank = getProfileRank(completedTasks);
  const isBusy =
    status === "loading" ||
    status === "authenticating" ||
    status === "verifying" ||
    status === "builder_access";
  const isMiniKitInitializing = miniKitInstallState === undefined;
  const isWorldApp = miniKitInstallState === true;
  const handleProfileNameClick = useCallback(() => {
    if (!canUseMockAdmin) {
      return;
    }

    setMockAdminTapCount((currentCount) => {
      const nextCount = currentCount + 1;

      if (nextCount >= 10) {
        setIsMockAdminOpen(true);
        setMockAdminMessage(null);
        setMockAdminError(null);
        return 0;
      }

      return nextCount;
    });
  }, [canUseMockAdmin]);
  const runMockAction = useCallback(
    async (action: MockAdminAction) => {
      setMockAdminAction(action);
      setMockAdminMessage(null);
      setMockAdminError(null);

      try {
        const message = await onMockAdminAction(action);
        setMockAdminMessage(message);

        if (action === "reset_users") {
          setIsMockAdminOpen(false);
        }
      } catch (actionError) {
        setMockAdminError(
          actionError instanceof Error
            ? actionError.message
            : t("errorMockAdmin"),
        );
      } finally {
        setMockAdminAction(null);
      }
    },
    [onMockAdminAction, t],
  );

  return (
    <div className="profile-panel" data-authenticated={user ? "true" : "false"}>
      <div className="profile-topbar">
        <p className="eyebrow">{t("profile")}</p>
        <div className="profile-topbar-actions">
          <LanguageSwitch locale={locale} t={t} onChange={onLocaleChange} />
          {user ? (
            <button
              type="button"
              className="logout-button"
              disabled={isBusy}
              onClick={onLogout}
              aria-label={t("logOut")}
            >
              {status === "logging_out" ? t("loggingOut") : t("logOut")}
            </button>
          ) : null}
        </div>
      </div>

      {!user ? (
        <div className="profile-logged-out-state">
          <div className="profile-logged-out-lockup">
            <h1 id="active-tab-title">SENTIA</h1>
            <p>{t("loggedOutTagline")}</p>
          </div>

          <button
            type="button"
            className="primary-action profile-connect-action"
            disabled={isBusy || isMiniKitInitializing || !isWorldApp}
            onClick={onConnectWallet}
          >
            {status === "authenticating" || isMiniKitInitializing
              ? t("connecting")
              : t("connectWorldWallet")}
          </button>
        </div>
      ) : (
        <>
          <div className="profile-identity-row">
            <div className="avatar" aria-hidden="true">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            <div className="profile-heading">
              <h1 id="active-tab-title" onClick={handleProfileNameClick}>
                {displayName}
              </h1>
              <p className="profile-level-copy">
                {t("levelLine", { level: rank.level })}
                <span>
                  {t("tasksToLevel", {
                    tasks: rank.tasksToNextLevel,
                    level: rank.nextLevel,
                  })}
                </span>
              </p>
            </div>
          </div>

          <section
            className="profile-progress"
            aria-label={t("levelProgress", {
              progress: rank.progressPercent,
            })}
          >
            <div className="profile-progress-copy">
              <span>{t("progressToNextLevel")}</span>
              <strong>{rank.progressPercent}%</strong>
            </div>
            <div className="profile-progress-track">
              <div
                className="profile-progress-fill"
                style={{ width: `${rank.progressPercent}%` }}
              />
            </div>
          </section>

          <section className="profile-metric-grid" aria-label={t("profileMetrics")}>
            <ProfileMetric
              label={t("tasks")}
              value={String(completedTasks)}
              detail={t("completed")}
            />
            <ProfileMetric
              label={t("reliability")}
              value={`${reliabilityPercent}%`}
              detail={t("accepted")}
            />
            <ProfileMetric
              label={t("streak")}
              value={String(streakDays)}
              detail={streakDays === 1 ? t("day") : t("days")}
            />
          </section>

          {isVerified ? (
            <div className="verified-status" role="status">
              <span aria-hidden="true">✓</span>
              {t("verified")}
            </div>
          ) : (
            <div className="profile-actions">
              <button
                type="button"
                className="primary-action"
                disabled={isBusy}
                onClick={onVerify}
              >
                {status === "verifying" ? t("verifying") : t("verifyIdentity")}
              </button>

              {hasBuilderAccess ? (
                <div className="builder-status" role="status">
                  <span aria-hidden="true">✓</span>
                  {t("world3Hacker")}
                </div>
              ) : null}
            </div>
          )}
        </>
      )}

      {error ? <p className="profile-error">{error}</p> : null}

      {canUseMockAdmin && isMockAdminOpen ? (
        <div className="mock-admin-sheet-backdrop" role="presentation">
          <section
            className="mock-admin-sheet"
            aria-label={t("mockAdminActions")}
          >
            <button
              type="button"
              className="mock-admin-close"
              disabled={mockAdminAction !== null}
              onClick={() => setIsMockAdminOpen(false)}
            >
              {t("close")}
            </button>
            <h2>{t("mockAdmin")}</h2>
            <div className="mock-admin-actions">
              <button
                type="button"
                disabled={mockAdminAction !== null}
                onClick={() => void runMockAction("reset_users")}
              >
                {mockAdminAction === "reset_users"
                  ? t("resetting")
                  : t("resetUsers")}
              </button>
              <button
                type="button"
                disabled={mockAdminAction !== null}
                onClick={() => void runMockAction("reset_tasks")}
              >
                {mockAdminAction === "reset_tasks"
                  ? t("resetting")
                  : t("resetUserTasks")}
              </button>
              <button
                type="button"
                disabled={mockAdminAction !== null}
                onClick={() => void runMockAction("pay_tasks")}
              >
                {mockAdminAction === "pay_tasks" ? t("paying") : t("payTasks")}
              </button>
            </div>
            {mockAdminMessage ? (
              <p className="mock-admin-message">{mockAdminMessage}</p>
            ) : null}
            {mockAdminError ? (
              <p className="mock-admin-error">{mockAdminError}</p>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function ProfileMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="profile-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function LanguageSwitch({
  locale,
  t,
  onChange,
}: {
  locale: Locale;
  t: TFunction;
  onChange: (locale: Locale) => void;
}) {
  return (
    <div className="language-switch" aria-label={t("language")}>
      {(["en", "ko"] as const).map((option) => (
        <button
          key={option}
          type="button"
          className="language-switch-option"
          data-active={locale === option}
          aria-pressed={locale === option}
          onClick={() => onChange(option)}
        >
          {option === "en" ? t("english") : t("korean")}
        </button>
      ))}
    </div>
  );
}

function getProfileRank(completedTasks: number) {
  const normalizedTasks = Math.max(0, completedTasks);
  const level = Math.floor(normalizedTasks / 10) + 1;
  const tasksIntoLevel = normalizedTasks % 10;

  return {
    level,
    nextLevel: level + 1,
    tasksToNextLevel: 10 - tasksIntoLevel,
    progressPercent: tasksIntoLevel * 10,
  };
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
