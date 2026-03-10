import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, XCircle, Loader2, ExternalLink, Save, Eye, EyeOff, BarChart3 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function Settings() {
  // OpenAI state
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);

  // Anthropic state
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);

  // LLM provider state
  const [llmProvider, setLlmProvider] = useState<"openai" | "anthropic">("openai");

  // X API state
  const [xBearerToken, setXBearerToken] = useState("");
  const [showXBearerToken, setShowXBearerToken] = useState(false);

  // X API OAuth 1.0a state (for posting via API v2)
  const [xApiKey, setXApiKey] = useState("");
  const [xApiSecret, setXApiSecret] = useState("");
  const [xAccessToken, setXAccessToken] = useState("");
  const [xAccessTokenSecret, setXAccessTokenSecret] = useState("");
  const [xApiTier, setXApiTier] = useState<"free" | "basic" | "pro" | "enterprise">("free");
  const [showXOAuthFields, setShowXOAuthFields] = useState(false);

  // Get API status
  const { data: apiStatus, isLoading: statusLoading, refetch: refetchStatus } = trpc.settings.getApiStatus.useQuery();

  // Get saved API keys from database
  const { data: savedApiKeys, isLoading: keysLoading } = trpc.settings.getApiKeys.useQuery();

  // Get X API settings
  const { data: xApiSettings, isLoading: xApiLoading, refetch: refetchXApi } = trpc.xApiSettings.get.useQuery();

  // Load saved API keys when data is available
  useEffect(() => {
    if (savedApiKeys) {
      if (savedApiKeys.openaiApiKey && !openaiApiKey) {
        setOpenaiApiKey(savedApiKeys.openaiApiKey);
      }
      if (savedApiKeys.anthropicApiKey && !anthropicApiKey) {
        setAnthropicApiKey(savedApiKeys.anthropicApiKey);
      }
      if (savedApiKeys.llmProvider) {
        setLlmProvider(savedApiKeys.llmProvider);
      }
    }
  }, [savedApiKeys]);

  // Load X API settings
  useEffect(() => {
    if (xApiSettings) {
      if (xApiSettings.bearerToken && !xBearerToken) {
        setXBearerToken(xApiSettings.bearerToken);
      }
      if (xApiSettings.apiKey && !xApiKey) setXApiKey(xApiSettings.apiKey);
      if (xApiSettings.apiSecret && !xApiSecret) setXApiSecret(xApiSettings.apiSecret);
      if (xApiSettings.accessToken && !xAccessToken) setXAccessToken(xApiSettings.accessToken);
      if (xApiSettings.accessTokenSecret && !xAccessTokenSecret) setXAccessTokenSecret(xApiSettings.accessTokenSecret);
      if (xApiSettings.apiTier) setXApiTier(xApiSettings.apiTier as typeof xApiTier);
    }
  }, [xApiSettings]);

  // Save API keys
  const saveApiKeys = trpc.settings.saveApiKeys.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchStatus();
    },
    onError: (error) => {
      toast.error("\u30A8\u30E9\u30FC: " + error.message);
    },
  });

  // Save X API settings
  const saveXApiSettings = trpc.xApiSettings.save.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchXApi();
    },
    onError: (error) => {
      toast.error("\u30A8\u30E9\u30FC: " + error.message);
    },
  });

  // Test X API connection
  const testXApiConnection = trpc.xApiSettings.testConnection.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error("\u30A8\u30E9\u30FC: " + error.message);
    },
  });

  const testOpenAI = trpc.settings.testOpenAIConnection.useQuery(
    { apiKey: openaiApiKey || undefined },
    { enabled: false }
  );

  const testAnthropic = trpc.settings.testAnthropicConnection.useQuery(
    { apiKey: anthropicApiKey || undefined },
    { enabled: false }
  );

  const handleSaveOpenAI = () => {
    if (!openaiApiKey) {
      toast.warning("API\u30AD\u30FC\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");
      return;
    }
    saveApiKeys.mutate({ openaiApiKey });
  };

  const handleSaveAnthropic = () => {
    if (!anthropicApiKey) {
      toast.warning("API\u30AD\u30FC\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");
      return;
    }
    saveApiKeys.mutate({ anthropicApiKey });
  };

  const handleProviderChange = (provider: "openai" | "anthropic") => {
    setLlmProvider(provider);
    saveApiKeys.mutate({ llmProvider: provider });
  };

  // Test X API OAuth connection
  const testOAuthConnection = trpc.xApiSettings.testOAuthConnection.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
      refetchXApi();
    },
    onError: (error) => {
      toast.error("\u30A8\u30E9\u30FC: " + error.message);
    },
  });

  // API usage queries
  const { data: apiUsage } = trpc.xApiSettings.getApiUsage.useQuery();
  const { data: monthlyLimit } = trpc.xApiSettings.getMonthlyLimit.useQuery();

  const handleSaveXApi = () => {
    if (!xBearerToken) {
      toast.warning("Bearer Token\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");
      return;
    }
    saveXApiSettings.mutate({ bearerToken: xBearerToken });
  };

  const handleSaveXOAuth = () => {
    if (!xApiKey || !xApiSecret || !xAccessToken || !xAccessTokenSecret) {
      toast.warning("\u5168\u3066\u306EOAuth\u30D5\u30A3\u30FC\u30EB\u30C9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");
      return;
    }
    saveXApiSettings.mutate({
      apiKey: xApiKey,
      apiSecret: xApiSecret,
      accessToken: xAccessToken,
      accessTokenSecret: xAccessTokenSecret,
      apiTier: xApiTier,
    });
  };

  const handleTestOAuth = () => {
    testOAuthConnection.mutate();
  };

  const handleTestOpenAI = () => {
    testOpenAI.refetch();
  };

  const handleTestAnthropic = () => {
    testAnthropic.refetch();
  };

  const handleTestXApi = () => {
    if (!xBearerToken) {
      toast.warning("Bearer Token\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");
      return;
    }
    testXApiConnection.mutate({ bearerToken: xBearerToken });
  };

  if (statusLoading || keysLoading || xApiLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-[#1A1A1A]" />
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* Page Title - Neobrutalism */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-lg bg-[#FFD700] border-2 border-[#1A1A1A] flex items-center justify-center shadow-[4px_4px_0_#1A1A1A]">
            <span className="text-[28px]">{"\u2699\uFE0F"}</span>
          </div>
          <div>
            <h1 className="text-[26px] font-bold text-[#1A1A1A] tracking-tight">API{"\u8A2D\u5B9A"}</h1>
            <p className="text-[13px] text-[#6B6B6B] font-bold">
              API{"\u30AD\u30FC\u306E\u8A2D\u5B9A\u3068\u63A5\u7D9A\u30C6\u30B9\u30C8"}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* LLM Provider Selection */}
        <div className="bg-[#FFFDF7] border-2 border-[#1A1A1A] rounded-lg overflow-hidden shadow-[4px_4px_0_#1A1A1A]">
          <div className="bg-[#FFD700] px-5 py-4 border-b-2 border-[#1A1A1A]">
            <h3 className="text-[14px] font-bold text-[#1A1A1A]">LLM{"\u30D7\u30ED\u30D0\u30A4\u30C0\u30FC\u9078\u629E"}</h3>
            <p className="text-[12px] text-[#6B6B6B] font-bold mt-1">AI{"\u6A5F\u80FD\u3067\u4F7F\u7528\u3059\u308B\u30E2\u30C7\u30EB\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044"}</p>
          </div>
          <div className="p-5">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleProviderChange("openai")}
                className={`flex-1 p-4 rounded-lg border-2 border-[#1A1A1A] transition-all text-left font-bold shadow-[4px_4px_0_#1A1A1A] ${
                  llmProvider === "openai"
                    ? "bg-[#4ECDC4] hover:shadow-[2px_2px_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px]"
                    : "bg-[#FFFDF7] hover:bg-[#FFF8DC] hover:shadow-[2px_2px_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-lg border-2 border-[#1A1A1A] flex items-center justify-center ${
                    llmProvider === "openai" ? "bg-[#1A1A1A]" : "bg-[#FFFDF7]"
                  }`}>
                    {llmProvider === "openai" && (
                      <div className="w-2 h-2 rounded-lg bg-[#FFFDF7]" />
                    )}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[#1A1A1A]">OpenAI</p>
                    <p className="text-[11px] text-[#6B6B6B] font-bold">GPT-4o-mini</p>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleProviderChange("anthropic")}
                className={`flex-1 p-4 rounded-lg border-2 border-[#1A1A1A] transition-all text-left font-bold shadow-[4px_4px_0_#1A1A1A] ${
                  llmProvider === "anthropic"
                    ? "bg-[#4ECDC4] hover:shadow-[2px_2px_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px]"
                    : "bg-[#FFFDF7] hover:bg-[#FFF8DC] hover:shadow-[2px_2px_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-lg border-2 border-[#1A1A1A] flex items-center justify-center ${
                    llmProvider === "anthropic" ? "bg-[#1A1A1A]" : "bg-[#FFFDF7]"
                  }`}>
                    {llmProvider === "anthropic" && (
                      <div className="w-2 h-2 rounded-lg bg-[#FFFDF7]" />
                    )}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[#1A1A1A]">Anthropic</p>
                    <p className="text-[11px] text-[#6B6B6B] font-bold">Claude Sonnet 4.5</p>
                  </div>
                </div>
              </button>
            </div>
            {saveApiKeys.isPending && (
              <div className="mt-3 flex items-center gap-2 text-[12px] text-[#6B6B6B] font-bold">
                <Loader2 className="h-3 w-3 animate-spin" />
                {"\u4FDD\u5B58\u4E2D..."}
              </div>
            )}
          </div>
        </div>

        {/* OpenAI API Settings */}
        <div className="bg-[#FFFDF7] border-2 border-[#1A1A1A] rounded-lg overflow-hidden shadow-[4px_4px_0_#1A1A1A]">
          <div className="bg-[#A8E6CF] px-5 py-4 border-b-2 border-[#1A1A1A]">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-[#1A1A1A]">OpenAI API</h3>
              <div className="flex items-center gap-2">
                {llmProvider === "openai" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#FFD700] text-[#1A1A1A] border-2 border-[#1A1A1A]">
                    {"\u4F7F\u7528\u4E2D"}
                  </span>
                )}
                {apiStatus?.openai.configured ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#A8E6CF] text-[#1A1A1A] border-2 border-[#1A1A1A]">
                    <span className="w-[5px] h-[5px] rounded-lg bg-[#1A1A1A]" />
                    {"\u8A2D\u5B9A\u6E08\u307F"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#FF6B6B] text-[#1A1A1A] border-2 border-[#1A1A1A]">
                    <span className="w-[5px] h-[5px] rounded-lg bg-[#1A1A1A]" />
                    {"\u672A\u8A2D\u5B9A"}
                  </span>
                )}
              </div>
            </div>
            <p className="text-[12px] text-[#6B6B6B] font-bold mt-1">AI{"\u6295\u7A3F\u5185\u5BB9\u751F\u6210\u3068\u6226\u7565\u4F5C\u6210\u306B\u4F7F\u7528"}</p>
          </div>

          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openai-key" className="text-[13px] font-bold text-[#1A1A1A]">API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="openai-key"
                    type={showOpenaiKey ? "text" : "password"}
                    placeholder="sk-..."
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                    className="pr-10 border-2 border-[#1A1A1A] text-[13px] rounded-lg font-bold bg-[#FFFDF7] focus:ring-2 focus:ring-[#1A1A1A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
                  >
                    {showOpenaiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {!apiStatus?.openai.configured && (
              <div className="p-4 rounded-lg bg-[#FFD700] border-2 border-[#1A1A1A] text-[12px] text-[#1A1A1A] font-bold shadow-[2px_2px_0_#1A1A1A]">
                OpenAI API{"\u30AD\u30FC\u3092\u8A2D\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002"}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 ml-2 text-[#1A1A1A] hover:underline font-bold"
                >
                  API{"\u30AD\u30FC\u3092\u53D6\u5F97"}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleTestOpenAI}
                disabled={!openaiApiKey || testOpenAI.isFetching}
                variant="outline"
                size="sm"
                className="text-[13px] font-bold border-2 border-[#1A1A1A] bg-[#FFFDF7] hover:bg-[#FFF8DC] rounded-lg transition-all shadow-[4px_4px_0_#1A1A1A] hover:shadow-[2px_2px_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px]"
              >
                {testOpenAI.isFetching && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                {"\u63A5\u7D9A\u30C6\u30B9\u30C8"}
              </Button>
              <Button
                onClick={handleSaveOpenAI}
                disabled={!openaiApiKey || saveApiKeys.isPending}
                size="sm"
                className="text-[13px] font-bold bg-[#FFD700] hover:bg-[#FFD700] text-[#1A1A1A] border-2 border-[#1A1A1A] rounded-lg shadow-[4px_4px_0_#1A1A1A] hover:shadow-[2px_2px_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                {saveApiKeys.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                <Save className="mr-2 h-3.5 w-3.5" />
                {"\u4FDD\u5B58"}
              </Button>
            </div>

            {testOpenAI.data && (
              <div className={`p-4 rounded-lg text-[12px] flex items-center gap-2 font-bold border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] ${
                testOpenAI.data.success ? 'bg-[#A8E6CF] text-[#1A1A1A]' : 'bg-[#FF6B6B] text-[#1A1A1A]'
              }`}>
                {testOpenAI.data.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {testOpenAI.data.message}
              </div>
            )}
          </div>
        </div>

        {/* Anthropic API Settings */}
        <div className="bg-[#FFFDF7] border-2 border-[#1A1A1A] rounded-lg overflow-hidden shadow-[4px_4px_0_#1A1A1A]">
          <div className="bg-[#DDA0DD] px-5 py-4 border-b-2 border-[#1A1A1A]">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-[#1A1A1A]">Anthropic API</h3>
              <div className="flex items-center gap-2">
                {llmProvider === "anthropic" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#FFD700] text-[#1A1A1A] border-2 border-[#1A1A1A]">
                    {"\u4F7F\u7528\u4E2D"}
                  </span>
                )}
                {apiStatus?.anthropic?.configured ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#A8E6CF] text-[#1A1A1A] border-2 border-[#1A1A1A]">
                    <span className="w-[5px] h-[5px] rounded-lg bg-[#1A1A1A]" />
                    {"\u8A2D\u5B9A\u6E08\u307F"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#FF6B6B] text-[#1A1A1A] border-2 border-[#1A1A1A]">
                    <span className="w-[5px] h-[5px] rounded-lg bg-[#1A1A1A]" />
                    {"\u672A\u8A2D\u5B9A"}
                  </span>
                )}
              </div>
            </div>
            <p className="text-[12px] text-[#6B6B6B] font-bold mt-1">Claude Sonnet 4.5{"\u3092\u4F7F\u7528\u3057\u305FAI\u6A5F\u80FD"}</p>
          </div>

          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="anthropic-key" className="text-[13px] font-bold text-[#1A1A1A]">API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="anthropic-key"
                    type={showAnthropicKey ? "text" : "password"}
                    placeholder="sk-ant-..."
                    value={anthropicApiKey}
                    onChange={(e) => setAnthropicApiKey(e.target.value)}
                    className="pr-10 border-2 border-[#1A1A1A] text-[13px] rounded-lg font-bold bg-[#FFFDF7] focus:ring-2 focus:ring-[#1A1A1A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
                  >
                    {showAnthropicKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {!apiStatus?.anthropic?.configured && (
              <div className="p-4 rounded-lg bg-[#FFD700] border-2 border-[#1A1A1A] text-[12px] text-[#1A1A1A] font-bold shadow-[2px_2px_0_#1A1A1A]">
                Anthropic API{"\u30AD\u30FC\u3092\u8A2D\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002"}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 ml-2 text-[#1A1A1A] hover:underline font-bold"
                >
                  API{"\u30AD\u30FC\u3092\u53D6\u5F97"}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleTestAnthropic}
                disabled={!anthropicApiKey || testAnthropic.isFetching}
                variant="outline"
                size="sm"
                className="text-[13px] font-bold border-2 border-[#1A1A1A] bg-[#FFFDF7] hover:bg-[#FFF8DC] rounded-lg transition-all shadow-[4px_4px_0_#1A1A1A] hover:shadow-[2px_2px_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px]"
              >
                {testAnthropic.isFetching && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                {"\u63A5\u7D9A\u30C6\u30B9\u30C8"}
              </Button>
              <Button
                onClick={handleSaveAnthropic}
                disabled={!anthropicApiKey || saveApiKeys.isPending}
                size="sm"
                className="text-[13px] font-bold bg-[#FFD700] hover:bg-[#FFD700] text-[#1A1A1A] border-2 border-[#1A1A1A] rounded-lg shadow-[4px_4px_0_#1A1A1A] hover:shadow-[2px_2px_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                {saveApiKeys.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                <Save className="mr-2 h-3.5 w-3.5" />
                {"\u4FDD\u5B58"}
              </Button>
            </div>

            {testAnthropic.data && (
              <div className={`p-4 rounded-lg text-[12px] flex items-center gap-2 font-bold border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] ${
                testAnthropic.data.success ? 'bg-[#A8E6CF] text-[#1A1A1A]' : 'bg-[#FF6B6B] text-[#1A1A1A]'
              }`}>
                {testAnthropic.data.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {testAnthropic.data.message}
              </div>
            )}
          </div>
        </div>

        {/* X API Settings */}
        <div className="bg-[#FFFDF7] border-2 border-[#1A1A1A] rounded-lg overflow-hidden shadow-[4px_4px_0_#1A1A1A]">
          <div className="bg-[#87CEEB] px-5 py-4 border-b-2 border-[#1A1A1A]">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-[#1A1A1A]">X (Twitter) API</h3>
              {xApiSettings?.configured ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#A8E6CF] text-[#1A1A1A] border-2 border-[#1A1A1A]">
                  <span className="w-[5px] h-[5px] rounded-lg bg-[#1A1A1A]" />
                  {"\u8A2D\u5B9A\u6E08\u307F"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#FF6B6B] text-[#1A1A1A] border-2 border-[#1A1A1A]">
                  <span className="w-[5px] h-[5px] rounded-lg bg-[#1A1A1A]" />
                  {"\u672A\u8A2D\u5B9A"}
                </span>
              )}
            </div>
            <p className="text-[12px] text-[#6B6B6B] font-bold mt-1">{"\u30C4\u30A4\u30FC\u30C8\u53D6\u5F97\u3001\u30E6\u30FC\u30B6\u30FC\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u53D6\u5F97\u306B\u4F7F\u7528"}</p>
          </div>

          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="x-bearer-token" className="text-[13px] font-bold text-[#1A1A1A]">Bearer Token</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="x-bearer-token"
                    type={showXBearerToken ? "text" : "password"}
                    placeholder="AAAA..."
                    value={xBearerToken}
                    onChange={(e) => setXBearerToken(e.target.value)}
                    className="pr-10 border-2 border-[#1A1A1A] text-[13px] rounded-lg font-bold bg-[#FFFDF7] focus:ring-2 focus:ring-[#1A1A1A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowXBearerToken(!showXBearerToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
                  >
                    {showXBearerToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-[#6B6B6B] font-bold">
                X Developer Portal{"\u3067\u53D6\u5F97\u3067\u304D\u308BBearer Token\uFF08App-only\u8A8D\u8A3C\u7528\uFF09"}
              </p>
            </div>

            {!xApiSettings?.configured && (
              <div className="p-4 rounded-lg bg-[#FFD700] border-2 border-[#1A1A1A] text-[12px] text-[#1A1A1A] font-bold shadow-[2px_2px_0_#1A1A1A]">
                X API Bearer Token{"\u3092\u8A2D\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002"}
                <a
                  href="https://developer.twitter.com/en/portal/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 ml-2 text-[#1A1A1A] hover:underline font-bold"
                >
                  Developer Portal{"\u3078"}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleTestXApi}
                disabled={!xBearerToken || testXApiConnection.isPending}
                variant="outline"
                size="sm"
                className="text-[13px] font-bold border-2 border-[#1A1A1A] bg-[#FFFDF7] hover:bg-[#FFF8DC] rounded-lg transition-all shadow-[4px_4px_0_#1A1A1A] hover:shadow-[2px_2px_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px]"
              >
                {testXApiConnection.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                {"\u63A5\u7D9A\u30C6\u30B9\u30C8"}
              </Button>
              <Button
                onClick={handleSaveXApi}
                disabled={!xBearerToken || saveXApiSettings.isPending}
                size="sm"
                className="text-[13px] font-bold bg-[#FFD700] hover:bg-[#FFD700] text-[#1A1A1A] border-2 border-[#1A1A1A] rounded-lg shadow-[4px_4px_0_#1A1A1A] hover:shadow-[2px_2px_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                {saveXApiSettings.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                <Save className="mr-2 h-3.5 w-3.5" />
                {"\u4FDD\u5B58"}
              </Button>
            </div>

            {xApiSettings?.lastTestedAt && (
              <p className="text-[11px] text-[#6B6B6B] font-bold">
                {"\u6700\u7D42\u30C6\u30B9\u30C8: "}{new Date(xApiSettings.lastTestedAt).toLocaleString('ja-JP')}
                {xApiSettings.testResult && ` (${xApiSettings.testResult})`}
              </p>
            )}
          </div>
        </div>

        {/* X API OAuth 1.0a Settings (for posting via API v2) */}
        <div className="bg-[#FFFDF7] border-2 border-[#1A1A1A] rounded-lg overflow-hidden shadow-[4px_4px_0_#1A1A1A]">
          <div className="bg-[#4ECDC4] px-5 py-4 border-b-2 border-[#1A1A1A]">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-[#1A1A1A]">X API v2 OAuth 1.0a</h3>
              <div className="flex items-center gap-2">
                {xApiSettings?.oauthConfigured ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#A8E6CF] text-[#1A1A1A] border-2 border-[#1A1A1A]">
                    <span className="w-[5px] h-[5px] rounded-lg bg-[#1A1A1A]" />
                    {"\u8A2D\u5B9A\u6E08\u307F"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#FF6B6B] text-[#1A1A1A] border-2 border-[#1A1A1A]">
                    <span className="w-[5px] h-[5px] rounded-lg bg-[#1A1A1A]" />
                    {"\u672A\u8A2D\u5B9A"}
                  </span>
                )}
              </div>
            </div>
            <p className="text-[12px] text-[#6B6B6B] font-bold mt-1">{"API\u7D4C\u7531\u3067\u306E\u6295\u7A3F\u306B\u4F7F\u7528\uFF08Playwright\u4EE3\u66FF\uFF09"}</p>
          </div>

          <div className="p-5 space-y-4">
            <div className="p-3 rounded-lg bg-[#FFF8DC] border-2 border-[#1A1A1A] text-[12px] text-[#1A1A1A] font-bold">
              {"X Developer Portal\u306E\u300CKeys and tokens\u300D\u304B\u3089\u4EE5\u4E0B4\u3064\u306E\u30AD\u30FC\u3092\u53D6\u5F97\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u3053\u308C\u3089\u306F\u30C4\u30A4\u30FC\u30C8\u6295\u7A3F\u306B\u5FC5\u8981\u3067\u3059\u3002"}
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="x-api-key" className="text-[13px] font-bold text-[#1A1A1A]">API Key (Consumer Key)</Label>
              <div className="relative">
                <Input
                  id="x-api-key"
                  type={showXOAuthFields ? "text" : "password"}
                  placeholder="API Key..."
                  value={xApiKey}
                  onChange={(e) => setXApiKey(e.target.value)}
                  className="border-2 border-[#1A1A1A] text-[13px] rounded-lg font-bold bg-[#FFFDF7] focus:ring-2 focus:ring-[#1A1A1A]"
                />
              </div>
            </div>

            {/* API Secret */}
            <div className="space-y-2">
              <Label htmlFor="x-api-secret" className="text-[13px] font-bold text-[#1A1A1A]">API Secret (Consumer Secret)</Label>
              <div className="relative">
                <Input
                  id="x-api-secret"
                  type={showXOAuthFields ? "text" : "password"}
                  placeholder="API Secret..."
                  value={xApiSecret}
                  onChange={(e) => setXApiSecret(e.target.value)}
                  className="border-2 border-[#1A1A1A] text-[13px] rounded-lg font-bold bg-[#FFFDF7] focus:ring-2 focus:ring-[#1A1A1A]"
                />
              </div>
            </div>

            {/* Access Token */}
            <div className="space-y-2">
              <Label htmlFor="x-access-token" className="text-[13px] font-bold text-[#1A1A1A]">Access Token</Label>
              <div className="relative">
                <Input
                  id="x-access-token"
                  type={showXOAuthFields ? "text" : "password"}
                  placeholder="Access Token..."
                  value={xAccessToken}
                  onChange={(e) => setXAccessToken(e.target.value)}
                  className="border-2 border-[#1A1A1A] text-[13px] rounded-lg font-bold bg-[#FFFDF7] focus:ring-2 focus:ring-[#1A1A1A]"
                />
              </div>
            </div>

            {/* Access Token Secret */}
            <div className="space-y-2">
              <Label htmlFor="x-access-token-secret" className="text-[13px] font-bold text-[#1A1A1A]">Access Token Secret</Label>
              <div className="relative">
                <Input
                  id="x-access-token-secret"
                  type={showXOAuthFields ? "text" : "password"}
                  placeholder="Access Token Secret..."
                  value={xAccessTokenSecret}
                  onChange={(e) => setXAccessTokenSecret(e.target.value)}
                  className="border-2 border-[#1A1A1A] text-[13px] rounded-lg font-bold bg-[#FFFDF7] focus:ring-2 focus:ring-[#1A1A1A]"
                />
              </div>
            </div>

            {/* Show/Hide toggle */}
            <button
              type="button"
              onClick={() => setShowXOAuthFields(!showXOAuthFields)}
              className="text-[12px] font-bold text-[#6B6B6B] hover:text-[#1A1A1A] flex items-center gap-1.5 transition-colors"
            >
              {showXOAuthFields ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showXOAuthFields ? "\u30AD\u30FC\u3092\u96A0\u3059" : "\u30AD\u30FC\u3092\u8868\u793A"}
            </button>

            {/* API Tier */}
            <div className="space-y-2">
              <Label className="text-[13px] font-bold text-[#1A1A1A]">API{"\u30D7\u30E9\u30F3"}</Label>
              <div className="flex gap-2">
                {(["free", "basic", "pro", "enterprise"] as const).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setXApiTier(tier)}
                    className={`px-3 py-1.5 rounded-lg border-2 border-[#1A1A1A] text-[12px] font-bold transition-all shadow-[2px_2px_0_#1A1A1A] ${
                      xApiTier === tier
                        ? "bg-[#4ECDC4] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                        : "bg-[#FFFDF7] hover:bg-[#FFF8DC] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                    }`}
                  >
                    {tier.charAt(0).toUpperCase() + tier.slice(1)}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[#6B6B6B] font-bold">
                Free: {"17\u6295\u7A3F/24h"} | Basic: {"100\u6295\u7A3F/24h"} | Pro: {"300K/\u6708"} | Enterprise: {"\u7121\u5236\u9650"}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleTestOAuth}
                disabled={!xApiSettings?.oauthConfigured || testOAuthConnection.isPending}
                variant="outline"
                size="sm"
                className="text-[13px] font-bold border-2 border-[#1A1A1A] bg-[#FFFDF7] hover:bg-[#FFF8DC] rounded-lg transition-all shadow-[4px_4px_0_#1A1A1A] hover:shadow-[2px_2px_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px]"
              >
                {testOAuthConnection.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                {"OAuth\u63A5\u7D9A\u30C6\u30B9\u30C8"}
              </Button>
              <Button
                onClick={handleSaveXOAuth}
                disabled={!xApiKey || !xApiSecret || !xAccessToken || !xAccessTokenSecret || saveXApiSettings.isPending}
                size="sm"
                className="text-[13px] font-bold bg-[#FFD700] hover:bg-[#FFD700] text-[#1A1A1A] border-2 border-[#1A1A1A] rounded-lg shadow-[4px_4px_0_#1A1A1A] hover:shadow-[2px_2px_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                {saveXApiSettings.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                <Save className="mr-2 h-3.5 w-3.5" />
                {"\u4FDD\u5B58"}
              </Button>
            </div>
          </div>
        </div>

        {/* API Usage Dashboard */}
        <div className="bg-[#FFFDF7] border-2 border-[#1A1A1A] rounded-lg overflow-hidden shadow-[4px_4px_0_#1A1A1A]">
          <div className="bg-[#4ECDC4] px-5 py-4 border-b-2 border-[#1A1A1A]">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#1A1A1A]" />
              <h3 className="text-[14px] font-bold text-[#1A1A1A]">{"API使用量"}</h3>
            </div>
            <p className="text-[12px] text-[#6B6B6B] font-bold mt-1">{"今月のX API v2投稿使用量"}</p>
          </div>
          <div className="p-5 space-y-5">
            {/* Monthly total progress bar */}
            {(() => {
              const used = apiUsage?.totalTweets ?? 0;
              const limit = monthlyLimit?.monthlyLimit ?? (xApiTier === 'free' ? 500 : xApiTier === 'basic' ? 3000 : xApiTier === 'pro' ? 300000 : 1000000);
              const percent = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0;
              const barColor = percent > 85 ? 'bg-[#FF6B6B]' : percent > 60 ? 'bg-[#FFDAB9]' : 'bg-[#A8E6CF]';
              const labelColor = percent > 85 ? 'text-[#FF6B6B]' : percent > 60 ? 'text-[#6B6B6B]' : 'text-[#1A1A1A]';
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">{"月間API使用量"}</p>
                    <span className={`text-[12px] font-bold ${labelColor}`}>{percent}%</span>
                  </div>
                  <div className="h-4 w-full rounded-lg bg-[#E5E7EB] border-2 border-[#1A1A1A] overflow-hidden">
                    <div
                      className={`h-full rounded-lg transition-all ${barColor}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-bold text-[#1A1A1A]">
                      {used.toLocaleString()} / {limit.toLocaleString()} ツイート
                    </p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border-2 border-[#1A1A1A] ${
                      percent > 85 ? 'bg-[#FF6B6B]' : percent > 60 ? 'bg-[#FFDAB9]' : 'bg-[#A8E6CF]'
                    } text-[#1A1A1A]`}>
                      {percent > 85 ? "警告" : percent > 60 ? "注意" : "正常"}
                    </span>
                  </div>
                  {apiUsage?.month && (
                    <p className="text-[11px] font-bold text-[#6B6B6B]">
                      {"対象月: "}{apiUsage.month}
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Per-account breakdown table */}
            {apiUsage?.perAccount && apiUsage.perAccount.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">{"アカウント別使用量"}</p>
                <div className="rounded-lg border-2 border-[#1A1A1A] overflow-hidden">
                  <table className="w-full text-[12px] font-bold">
                    <thead>
                      <tr className="bg-[#FFF8DC] border-b-2 border-[#1A1A1A]">
                        <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-[#6B6B6B]">{"アカウント"}</th>
                        <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider text-[#6B6B6B]">{"今月の投稿数"}</th>
                        <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider text-[#6B6B6B]">{"割合"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apiUsage.perAccount.map((row: { accountId: number; tweetCount: number | null; lastPostedAt: string | null }, idx: number) => {
                        const total = apiUsage?.totalTweets ?? 1;
                        const count = row.tweetCount ?? 0;
                        const rowPercent = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                          <tr
                            key={row.accountId}
                            className={`border-b border-[#1A1A1A] last:border-b-0 ${idx % 2 === 0 ? 'bg-[#FFFDF7]' : 'bg-[#FFF8DC]'}`}
                          >
                            <td className="px-3 py-2 text-[#1A1A1A]">
                              <span className="font-bold">ID: {row.accountId}</span>
                            </td>
                            <td className="px-3 py-2 text-right text-[#1A1A1A]">
                              {count.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-lg border-2 border-[#1A1A1A] text-[10px] font-bold ${
                                rowPercent > 50 ? 'bg-[#FFDAB9]' : 'bg-[#A8E6CF]'
                              } text-[#1A1A1A]`}>
                                {rowPercent}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Empty state */}
            {(!apiUsage || (apiUsage.perAccount && apiUsage.perAccount.length === 0)) && (
              <div className="flex items-center justify-center py-6 rounded-lg bg-[#FFF8DC] border-2 border-[#1A1A1A]">
                <div className="text-center">
                  <BarChart3 className="w-8 h-8 text-[#6B6B6B] mx-auto mb-2" />
                  <p className="text-[12px] font-bold text-[#6B6B6B]">{"今月のAPI投稿データがありません"}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* API Setup Guide */}
        <div className="bg-[#FFFDF7] border-2 border-[#1A1A1A] rounded-lg overflow-hidden shadow-[4px_4px_0_#1A1A1A]">
          <div className="bg-[#FFDAB9] px-5 py-4 border-b-2 border-[#1A1A1A]">
            <h3 className="text-[14px] font-bold text-[#1A1A1A]">API{"\u8A2D\u5B9A\u65B9\u6CD5"}</h3>
          </div>
          <div className="p-5 space-y-5 text-[13px]">
            <div>
              <h4 className="font-bold text-[#1A1A1A] mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-[#A8E6CF] border-2 border-[#1A1A1A] flex items-center justify-center text-[10px] font-bold text-[#1A1A1A]">1</span>
                OpenAI API
              </h4>
              <ol className="list-decimal list-inside text-[#6B6B6B] font-bold space-y-1.5 ml-7">
                <li><a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-[#1A1A1A] hover:underline font-bold">OpenAI Platform</a>{"\u3067API\u30AD\u30FC\u3092\u4F5C\u6210"}</li>
                <li>{"\u4E0A\u306E\u30D5\u30A9\u30FC\u30E0\u306B\u5165\u529B\u3057\u3066\u300C\u63A5\u7D9A\u30C6\u30B9\u30C8\u300D\u3067\u78BA\u8A8D"}</li>
                <li>{"\u300C\u4FDD\u5B58\u300D\u30DC\u30BF\u30F3\u3067\u8A2D\u5B9A\u3092\u4FDD\u5B58"}</li>
              </ol>
            </div>
            <div className="border-t-2 border-[#1A1A1A] pt-5">
              <h4 className="font-bold text-[#1A1A1A] mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-[#DDA0DD] border-2 border-[#1A1A1A] flex items-center justify-center text-[10px] font-bold text-[#1A1A1A]">2</span>
                Anthropic API
              </h4>
              <ol className="list-decimal list-inside text-[#6B6B6B] font-bold space-y-1.5 ml-7">
                <li><a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-[#1A1A1A] hover:underline font-bold">Anthropic Console</a>{"\u3067API\u30AD\u30FC\u3092\u4F5C\u6210"}</li>
                <li>{"\u4E0A\u306E\u30D5\u30A9\u30FC\u30E0\u306B\u5165\u529B\u3057\u3066\u300C\u63A5\u7D9A\u30C6\u30B9\u30C8\u300D\u3067\u78BA\u8A8D"}</li>
                <li>{"\u300C\u4FDD\u5B58\u300D\u30DC\u30BF\u30F3\u3067\u8A2D\u5B9A\u3092\u4FDD\u5B58"}</li>
              </ol>
            </div>
            <div className="border-t-2 border-[#1A1A1A] pt-5">
              <h4 className="font-bold text-[#1A1A1A] mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-[#87CEEB] border-2 border-[#1A1A1A] flex items-center justify-center text-[10px] font-bold text-[#1A1A1A]">3</span>
                X (Twitter) API Bearer Token
              </h4>
              <ol className="list-decimal list-inside text-[#6B6B6B] font-bold space-y-1.5 ml-7">
                <li><a href="https://developer.twitter.com/en/portal/dashboard" target="_blank" rel="noopener noreferrer" className="text-[#1A1A1A] hover:underline font-bold">X Developer Portal</a>{"\u3067\u30A2\u30D7\u30EA\u3092\u4F5C\u6210"}</li>
                <li>{"\u300CKeys and tokens\u300D\u304B\u3089Bearer Token\u3092\u53D6\u5F97"}</li>
                <li>{"\u4E0A\u306E\u30D5\u30A9\u30FC\u30E0\u306B\u5165\u529B\u3057\u3066\u300C\u63A5\u7D9A\u30C6\u30B9\u30C8\u300D\u3067\u78BA\u8A8D"}</li>
              </ol>
            </div>
            <div className="border-t-2 border-[#1A1A1A] pt-5">
              <h4 className="font-bold text-[#1A1A1A] mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-[#4ECDC4] border-2 border-[#1A1A1A] flex items-center justify-center text-[10px] font-bold text-[#1A1A1A]">4</span>
                X API v2 OAuth 1.0a{"\uFF08\u6295\u7A3F\u7528\uFF09"}
              </h4>
              <ol className="list-decimal list-inside text-[#6B6B6B] font-bold space-y-1.5 ml-7">
                <li>{"X Developer Portal\u3067\u300CUser authentication settings\u300D\u3092\u6709\u52B9\u5316"}</li>
                <li>{"Read and write\u6A29\u9650\u3092\u8A2D\u5B9A"}</li>
                <li>{"\u300CKeys and tokens\u300D\u304B\u3089API Key, API Secret, Access Token, Access Token Secret\u3092\u53D6\u5F97"}</li>
                <li>{"\u4E0A\u306E\u30D5\u30A9\u30FC\u30E0\u306B\u5165\u529B\u3057\u3066\u300COAuth\u63A5\u7D9A\u30C6\u30B9\u30C8\u300D\u3067\u78BA\u8A8D"}</li>
                <li>{"\u30A2\u30AB\u30A6\u30F3\u30C8\u8A73\u7D30\u753B\u9762\u3067\u6295\u7A3F\u65B9\u5F0F\u3092\u300CAPI v2\u300D\u306B\u5207\u66FF"}</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
