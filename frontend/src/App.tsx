import { AppShell } from "./components/AppShell";
import { AuthScreen } from "./components/AuthScreen";
import { ChatStoreProvider, useChatStore } from "./state/useChatStore";

function Root() {
  const { currentUser, authLoading } = useChatStore();
  if (authLoading) return null;
  return currentUser ? <AppShell /> : <AuthScreen />;
}

function App() {
  return (
    <ChatStoreProvider>
      <Root />
    </ChatStoreProvider>
  );
}

export default App;
