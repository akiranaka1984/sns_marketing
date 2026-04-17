import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import LoadingSpinner from "./components/LoadingSpinner";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import DashboardLayout from "./components/DashboardLayout";
import { CommandPalette } from "./components/CommandPalette";
import Login from "./pages/Login";
import { FeatureFlagDevTools } from "./components/FeatureFlagDevTools";
import { useFeatureFlag } from "./hooks/useFeatureFlags";

// Lazy-loaded pages for route-based code splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CommandCenter = lazy(() => import("./pages/v2/CommandCenter"));
const Accounts = lazy(() => import("./pages/Accounts"));
const NewAccount = lazy(() => import("./pages/NewAccount"));
const Strategies = lazy(() => import("./pages/Strategies"));
const NewStrategy = lazy(() => import("./pages/NewStrategy"));
const Projects = lazy(() => import("./pages/Projects"));
const NewProject = lazy(() => import("./pages/NewProject"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const ProjectEdit = lazy(() => import("./pages/ProjectEdit"));
const Logs = lazy(() => import("./pages/Logs"));
const Settings = lazy(() => import("./pages/Settings"));
const AccountDetail = lazy(() => import("./pages/AccountDetail"));
const Automation = lazy(() => import("./pages/Automation"));
const ScheduledPosts = lazy(() => import("./pages/ScheduledPosts"));
const FreezeDetection = lazy(() => import("./pages/FreezeDetection"));
const Engagement = lazy(() => import("./pages/Engagement"));
const Analytics = lazy(() =>
  import("./pages/Analytics").then((m) => ({ default: m.Analytics })),
);
const Agents = lazy(() => import("./pages/Agents"));
const AgentDetail = lazy(() => import("./pages/AgentDetail"));
const WeeklyReview = lazy(() => import("./pages/WeeklyReview"));
const AIOptimization = lazy(() => import("./pages/AIOptimization"));
const ABTesting = lazy(() => import("./pages/ABTesting"));
const PostReview = lazy(() => import("./pages/PostReview"));
const ModelAccounts = lazy(() => import("./pages/ModelAccounts"));
const BuzzAnalysis = lazy(() => import("./pages/BuzzAnalysis"));
const LearningInsights = lazy(() => import("./pages/LearningInsights"));
const HashtagAnalytics = lazy(() => import("./pages/HashtagAnalytics"));
const CompetitorBenchmark = lazy(() => import("./pages/CompetitorBenchmark"));
const Inbox = lazy(() => import("./pages/Inbox"));
const ContentCalendarPage = lazy(() => import("./pages/ContentCalendarPage"));
const TeamManagement = lazy(() => import("./pages/TeamManagement"));

function Router() {
  const { isAuthenticated, loading, refresh } = useAuth();
  const newDashboard = useFeatureFlag("new_dashboard");

  if (loading) {
    return <LoadingSpinner fullScreen showLabel />;
  }

  if (!isAuthenticated) {
    return <Login onSuccess={() => refresh()} />;
  }

  const HomePage = newDashboard ? CommandCenter : Dashboard;

  return (
    <DashboardLayout>
      <CommandPalette />
      <Suspense fallback={<LoadingSpinner fullScreen={false} showLabel />}>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/today" component={CommandCenter} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/projects" component={Projects} />
          <Route path="/projects/new" component={NewProject} />
          <Route path="/projects/:id/edit" component={ProjectEdit} />
          <Route path="/projects/:id" component={ProjectDetail} />
          <Route path="/accounts" component={Accounts} />
          <Route path="/accounts/new" component={NewAccount} />
          <Route path="/accounts/add" component={NewAccount} />
          <Route path="/accounts/:id" component={AccountDetail} />
          <Route path="/strategies" component={Strategies} />
          <Route path="/strategies/new" component={NewStrategy} />
          <Route path="/logs" component={Logs} />
          <Route path="/automation" component={Automation} />
          <Route path="/scheduled-posts" component={ScheduledPosts} />
          <Route path="/freeze-detection" component={FreezeDetection} />
          <Route path="/engagement" component={Engagement} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/model-accounts" component={ModelAccounts} />
          <Route path="/buzz-analysis" component={BuzzAnalysis} />
          <Route path="/learning-insights" component={LearningInsights} />
          <Route path="/hashtag-analytics" component={HashtagAnalytics} />
          <Route path="/competitor-benchmark" component={CompetitorBenchmark} />
          <Route path="/agents" component={Agents} />
          <Route path="/agents/:id" component={AgentDetail} />
          <Route path="/weekly-review" component={WeeklyReview} />
          <Route path="/ai-optimization" component={AIOptimization} />
          <Route path="/ab-testing" component={ABTesting} />
          <Route path="/post-review" component={PostReview} />
          <Route path="/ab-testing/:id" component={ABTesting} />
          <Route path="/inbox" component={Inbox} />
          <Route path="/content-calendar" component={ContentCalendarPage} />
          <Route path="/team" component={TeamManagement} />
          <Route path="/settings" component={Settings} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={true}>
        <TooltipProvider>
          <Toaster />
          <Router />
          {import.meta.env.DEV && <FeatureFlagDevTools />}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
