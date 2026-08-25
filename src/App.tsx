import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FrostedApp } from "./components/frosted/FrostedApp";
import { SettingsProvider } from "./lib/settings";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <FrostedApp />
      </SettingsProvider>
    </QueryClientProvider>
  );
}

export default App;
