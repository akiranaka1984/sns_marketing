import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Streamdown } from 'streamdown';

/**
 * All content in this page are only for example, replace with your own feature implementation
 * When building pages, remember your instructions in Frontend Workflow, Frontend Best Practices, Design Guide and Common Pitfalls
 */
export default function Home() {
  // The userAuth hooks provides authentication state
  // To implement login/logout functionality, simply call logout() or redirect to getLoginUrl()
  let { user, loading, error, isAuthenticated, logout } = useAuth();

  // If theme is switchable in App.tsx, we can implement theme toggling like this:
  // const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950">
      <main className="p-8">
        {/* Example: lucide-react for icons */}
        <div className="mb-4 p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-lg inline-block">
          <Loader2 className="animate-spin text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Example Page</h1>
        {/* Example: Streamdown for markdown rendering */}
        <div className="mb-4 p-4 bg-neutral-900 border border-white/[0.06] rounded-lg">
          <Streamdown>Any **markdown** content</Streamdown>
        </div>
        <Button variant="default" className="bg-emerald-500 hover:bg-emerald-500 text-white border border-white/[0.06] rounded-lg hover:translate-x-[2px] hover:translate-y-[2px] font-bold">Example Button</Button>
      </main>
    </div>
  );
}
