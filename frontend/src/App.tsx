import { AppShell } from "./components/AppShell";
import { JoinScreen } from "./components/JoinScreen";
import { ChatStoreProvider, useChatStore } from "./state/useChatStore";

function Root() {
  const { currentUser } = useChatStore();
  return currentUser ? <AppShell /> : <JoinScreen />;
}

function App() {
  return (
    <ChatStoreProvider>
      <Root />
    </ChatStoreProvider>
  );
}

export default App;
